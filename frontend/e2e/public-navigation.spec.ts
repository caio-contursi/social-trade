import { expect, test } from "@playwright/test";

test("acesso direto à descoberta mantém os projetos dentro da tela", async ({ page }) => {
  await page.goto("/?explorar=projetos#projetos");
  const panel = page.locator("[data-projects-panel]");
  await expect(page.getByRole("heading", { name: "Projetos encontrados", exact: true })).toBeVisible();
  await expect(panel.locator("article").first()).toBeVisible();
  await expect.poll(async () => Math.round((await panel.boundingBox())!.x)).toBe(0);
  await expect.poll(() => page.locator(".discovery-viewport").evaluate((element) => element.scrollLeft)).toBe(0);
});

test("chave de tema alterna entre claro e escuro e conserva a escolha", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: "Tema escuro" });
  const palette = () => page.evaluate(() => ({
    nativeControls: getComputedStyle(document.documentElement).colorScheme,
    page: getComputedStyle(document.body).backgroundColor,
    hero: getComputedStyle(document.querySelector(".discovery-viewport")!).backgroundColor,
    quiz: getComputedStyle(document.querySelector("#encontre-sua-causa > div")!).backgroundColor,
    quizIntro: getComputedStyle(document.querySelector('[data-testid="cause-quiz-intro"]')!).color,
    quizAccent: getComputedStyle(document.querySelector(".cause-quiz-card .title-mark")!).color,
    footer: getComputedStyle(document.querySelector("footer.site-footer-cream")!).backgroundColor,
  }));
  const quizContrast = () => page.evaluate(() => {
    const background = getComputedStyle(document.querySelector(".cause-quiz-card")!).backgroundColor;
    const luminance = (color: string) => {
      const [red, green, blue] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return red * 0.2126 + green * 0.7152 + blue * 0.0722;
    };
    const ratio = (foreground: string) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    return Math.min(
      ratio(getComputedStyle(document.querySelector('[data-testid="cause-quiz-intro"]')!).color),
      ratio(getComputedStyle(document.querySelector(".cause-quiz-card .title-mark")!).color),
    );
  });
  const siteHeader = page.getByRole("banner");
  const lightHeader = await siteHeader.evaluate((element) => getComputedStyle(element).backgroundColor);
  await expect(toggle).not.toBeChecked();
  const lightPalette = await palette();
  expect(lightPalette).toEqual({
    nativeControls: "light",
    page: "rgb(246, 242, 233)",
    hero: "rgb(218, 231, 208)",
    quiz: "rgb(218, 231, 208)",
    quizIntro: "rgb(64, 90, 73)",
    quizAccent: "rgb(40, 88, 66)",
    footer: "rgb(246, 239, 226)",
  });
  expect(await quizContrast()).toBeGreaterThanOrEqual(4.5);
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await palette()).toEqual({
    nativeControls: "dark",
    page: "rgb(15, 29, 26)",
    hero: "rgb(21, 36, 31)",
    quiz: "rgb(21, 36, 31)",
    quizIntro: "rgb(182, 199, 189)",
    quizAccent: "rgb(131, 214, 183)",
    footer: "rgb(23, 35, 31)",
  });
  expect(await quizContrast()).toBeGreaterThanOrEqual(4.5);
  const darkHeader = await siteHeader.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(darkHeader).not.toBe(lightHeader);
  await page.getByRole("button", { name: "Encontrar um projeto", exact: false }).click();
  await expect(page.locator(".discovery-viewport")).toHaveCSS("background-color", "rgb(9, 20, 16)");
  await expect(page.locator("#project-search")).toHaveCSS("background-color", "rgb(29, 48, 40)");
  await expect(page.locator("[data-projects-panel] article").first()).toHaveCSS("background-color", "rgb(21, 36, 31)");
  await toggle.click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  await expect(page.locator(".discovery-viewport")).toHaveCSS("background-color", "rgb(25, 60, 49)");
  await expect(page.locator("[data-projects-panel] article").first()).toHaveCSS("background-color", "rgb(218, 231, 208)");
  await toggle.click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
  await page.reload();
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("quiz recomenda uma causa disponível no filtro e explica os tipos de projeto", async ({ page }) => {
  await page.goto("/?explorar=projetos#encontre-sua-causa");
  const quiz = page.locator("#encontre-sua-causa");
  await quiz.getByRole("button", { name: /Começar quiz/ }).click();
  await expect(quiz.getByRole("button", { name: "Confirmar escolha" })).toBeDisabled();

  const foodChoices = [0, 3, 1, 0, 2, 1, 0, 1, 1, 1];
  for (let index = 0; index < 10; index += 1) {
    await quiz.locator("button[aria-pressed]").nth(foodChoices[index]).click();
    await expect(quiz.getByTestId("quiz-scenario")).toHaveText(`Dilema ${String(index + 1).padStart(2, "0")}`);
    await quiz.getByRole("button", { name: index === 9 ? "Ver meu resultado" : "Confirmar escolha" }).click();
  }

  await expect(quiz.getByTestId("cause-project-guide")).toContainText("Cozinhas comunitárias e distribuição de refeições ou cestas básicas");
  await expect(quiz.getByTestId("cause-project-guide")).toContainText("Hortas comunitárias, escolares ou urbanas");
  const exploreCause = quiz.getByRole("link", { name: /Explorar projetos de alimentação/ });
  await expect(exploreCause).toHaveAttribute("href", "/?causa=food#projetos");
  await exploreCause.click();
  await expect(page).toHaveURL(/\?causa=food#projetos$/);

  const causeFilter = page.getByRole("combobox", { name: "Causa" });
  await expect(causeFilter).toHaveValue("Alimentação");
  await causeFilter.click();
  const options = page.getByRole("listbox", { name: "Opções de causa" });
  await expect(options.getByRole("option")).toHaveCount(11);
  await expect(options.getByRole("option", { name: "Alimentação" })).toBeVisible();
  await expect(options.getByRole("option", { name: "Pessoas em situação de rua" })).toHaveCount(0);
  await expect(options.getByRole("option", { name: "Apoio emergencial" })).toHaveCount(0);
});

test("cadastro de projeto e retorno à descoberta usam o desfoco", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sou um projeto social", exact: true }).click();
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toBeVisible();
  await expect(page).toHaveURL(/\/cadastro\?tipo=project$/);
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toHaveCount(0);
  const back = isMobile
    ? page.getByRole("link", { name: "SocialTrade, página inicial" }).filter({ visible: true })
    : page.getByRole("link", { name: "Conhecer os projetos", exact: true });
  await back.click();
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toBeVisible();
  if (!isMobile) await expect(page.locator("[data-projects-panel] article").first()).toBeVisible();
});
