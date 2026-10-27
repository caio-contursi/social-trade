import { expect, test, type Locator, type Page } from "@playwright/test";
import { login } from "./fixtures";

// Cores de foco de docs/design.md: verde sobre o papel, âmbar nos blocos escuros.
const RING = "rgb(27, 105, 87)";
const ENERGY = "rgb(242, 181, 60)";

function focusStyle(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      style: style.outlineStyle,
      width: style.outlineWidth,
      color: style.outlineColor,
    };
  });
}

async function expectFocusRing(page: Page, locator: Locator, color: string) {
  await expect(locator).toBeVisible();
  // Uma tecla antes do foco programático põe o navegador no modo teclado,
  // como acontece para quem navega com Tab.
  await page.keyboard.press("Shift");
  await locator.focus();
  // Os botões animam a cor do contorno (transition-all): espera o valor final.
  await expect
    .poll(() => focusStyle(locator))
    .toEqual({ focusVisible: true, style: "solid", width: "2px", color });
}

test("foco opaco e verde nos controles sobre o papel", async ({ page }) => {
  await page.goto("/");
  await expectFocusRing(
    page,
    page.getByRole("button", { name: "Encontrar um projeto" }),
    RING,
  );
  await expectFocusRing(
    page,
    page.getByRole("link", { name: "Sou um projeto social" }),
    RING,
  );
  await page.goto("/projetos");
  await expectFocusRing(
    page,
    page.getByRole("textbox", {
      name: "Buscar projetos por nome, cidade ou palavra",
    }),
    RING,
  );
});

test("foco âmbar nos blocos escuros da página inicial", async ({ page }) => {
  await page.goto("/");
  const transparency = page.locator("#transparencia");
  await expectFocusRing(
    page,
    transparency.getByRole("link", { name: "Conhecer os projetos" }),
    ENERGY,
  );
  await expectFocusRing(
    page,
    page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Acesse sua conta" }),
    RING,
  );
});

test("foco âmbar na navegação escura do painel, no computador e no celular", async ({
  page,
  isMobile,
}) => {
  await login(page);
  // No celular a navegação fica no menu; o clique espera o painel terminar de carregar.
  if (isMobile)
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  await expectFocusRing(
    page,
    page.getByRole("button", { name: "Sair da conta", exact: true }),
    ENERGY,
  );
  await expectFocusRing(
    page,
    page
      .getByRole("navigation", { name: "Navegação do painel" })
      .getByRole("link", { name: "Avisos" }),
    ENERGY,
  );
});
