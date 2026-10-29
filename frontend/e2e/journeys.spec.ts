import { expect, test, type Locator } from "@playwright/test";
import { donorDocument, login, openWorkspaceMenu, password, projectName, projectObjective } from "./fixtures";

async function contrastRatio(text: Locator, surface: Locator) {
  const [foreground, background] = await Promise.all([
    text.evaluate((element) => getComputedStyle(element).color),
    surface.evaluate((element) => getComputedStyle(element).backgroundColor),
  ]);
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("frontend encaminha o health check ao FastAPI e confirma PostgreSQL", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    status: "ok",
    database: "ok",
    blockchain: "disabled",
  });
});

test("página 1 apresenta as três seções institucionais e a situação atual do Pix", async ({ page }) => {
  await page.goto("/");
  let navigation = page.getByRole("navigation", { name: "Navegação principal" });
  const mobile = !(await navigation.isVisible());
  if (mobile) {
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    navigation = page.getByRole("navigation", { name: "Navegação móvel" });
  }
  await expect(navigation.getByRole("link", { name: "Quem somos" })).toHaveAttribute("href", "/#quem-somos");
  await expect(navigation.getByRole("link", { name: "Como funciona" })).toHaveAttribute("href", "/#como-funciona");
  await expect(navigation.getByRole("link", { name: "Transparência" })).toHaveAttribute("href", "/#transparencia");
  if (mobile) await navigation.getByRole("link", { name: "Quem somos" }).click();
  await expect(page.getByRole("heading", { name: /Conectamos quem quer apoiar/ })).toBeVisible();
  await expect(page.getByRole("main").getByText("Pagamentos pela plataforma", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("contentinfo").getByText(/não garante abatimento no Imposto de Renda ou outro benefício fiscal/).first()).toBeVisible();
  await expect(page.getByRole("main").getByText("Conversão automatizada de Pix (BRL) para SOL por provedor", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como escolher e apoiar um projeto?" })).toBeVisible();
  await expect(page.getByRole("main").getByText(/O Pix está temporariamente suspenso enquanto a conversão BRL→SOL é integrada/)).toBeVisible();
  await expect(page.getByText(/voluntariado ou doações de itens/)).toBeVisible();
  await expect(page.getByText("Doações pela plataforma", { exact: true })).toHaveCount(0);
});

test("rolagem do menu até a transparência é gradual em desktop e mobile", async ({ page, isMobile }) => {
  await page.goto("/");
  const target = page.locator("#transparencia").first();
  const destination = await target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return bounds.top + window.scrollY - offset;
  });

  if (isMobile) {
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page.getByRole("navigation", { name: "Navegação móvel" }).getByRole("link", { name: "Transparência" }).click();
    await page.waitForTimeout(600);
  } else {
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Transparência" }).click();
    await page.waitForTimeout(250);
  }

  const intermediateScroll = await page.evaluate(() => window.scrollY);
  expect(intermediateScroll).toBeGreaterThan(0);
  expect(intermediateScroll).toBeLessThan(destination - 20);
  await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - destination), { timeout: 2000 }).toBeLessThan(2);
  await expect(page).toHaveURL(/#transparencia$/);
});

test("página 1 não reserva espaço para o painel de projetos fechado", async ({ page }) => {
  await page.goto("/");
  const header = await page.getByRole("banner").boundingBox();
  const heroTitle = await page.getByRole("heading", { level: 1, name: /Apoiar uma causa/ }).boundingBox();
  const heroPanel = await page.locator(".discovery-panel").first().boundingBox();
  const aboutPanel = await page.locator("#quem-somos .ink-panel").first().boundingBox();
  const projectsPanel = page.locator("[data-projects-panel]").first();

  expect(header && heroTitle && heroPanel && aboutPanel).toBeTruthy();
  expect(heroTitle!.y - (header!.y + header!.height)).toBeLessThanOrEqual(60);
  expect(aboutPanel!.y - (heroPanel!.y + heroPanel!.height)).toBeLessThanOrEqual(40);
  await expect.poll(() => projectsPanel.evaluate((element) => getComputedStyle(element).minHeight)).toBe("0px");
  await expect(projectsPanel).toBeHidden();

  await page.getByRole("button", { name: "Encontrar um projeto", exact: false }).click();
  await expect(projectsPanel).toBeVisible();
  await expect.poll(() => projectsPanel.evaluate((element) => Number.parseFloat(getComputedStyle(element).minHeight))).toBeGreaterThan(0);
});

test("carrossel é automático, sem controles ou contador, e troca após 5 segundos", async ({ page }) => {
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Imagens ilustrativas da SocialTrade" });
  await expect(carousel.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeVisible();
  await expect(carousel.getByText(/Imagem \d de/)).toHaveCount(0);
  await expect(carousel.getByRole("button")).toHaveCount(0);
  await page.waitForTimeout(5050);
  await expect(carousel.getByRole("img", { name: "Maçãs vermelhas frescas" })).toBeVisible();
  await expect(carousel.getByText(/Imagem \d de/)).toHaveCount(0);
});

test("carrossel troca as fotos com um crossfade gradual", async ({ page }) => {
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Imagens ilustrativas da SocialTrade" });
  await expect(carousel.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeVisible();
  await expect(carousel.locator(".hero-carousel-image")).toHaveCount(6);
  await expect(carousel.locator(".hero-carousel-image.is-active")).toHaveCSS("transition-duration", "1.2s");
  await page.waitForTimeout(5050);
  const incomingImage = carousel.locator(".hero-carousel-image.is-active");
  await page.waitForTimeout(250);
  const transitionOpacity = Number(await incomingImage.evaluate((element) => getComputedStyle(element).opacity));
  expect(transitionOpacity).toBeGreaterThan(0);
  expect(transitionOpacity).toBeLessThan(1);
  await expect(carousel.getByRole("img", { name: "Maçãs vermelhas frescas" })).toBeVisible();
  await expect(carousel.getByText(/Imagem \d de/)).toHaveCount(0);
  await page.waitForTimeout(1000);
  await expect.poll(() => incomingImage.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
});

test("números de Como funciona têm contraste legível sobre o fundo floresta", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#como-funciona");
  const numbers = section.locator("ol li span.font-display");
  await expect(numbers).toHaveCount(3);
  for (const number of await numbers.all()) {
    await expect(await contrastRatio(number, section)).toBeGreaterThanOrEqual(4.5);
  }
});

test("suporte, login e cadastro ficam visíveis no cabeçalho da página inicial", async ({ page, isMobile }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  if (isMobile) {
    await header.getByRole("button", { name: "Abrir navegação" }).click();
    const navigation = page.getByRole("navigation", { name: "Navegação móvel" });
    const supportLink = navigation.getByRole("link", { name: "Suporte" });
    await expect(supportLink).toHaveAttribute("href", "/entrar?proximo=%2Fpainel%2Fsuporte");
    await expect(supportLink.locator("svg")).toHaveClass(/lucide-headset/);
    await expect(navigation.getByRole("link", { name: "Entrar", exact: true })).toHaveAttribute("href", "/entrar");
    await expect(navigation.getByRole("link", { name: "Fazer cadastro", exact: true })).toHaveAttribute("href", "/cadastro");
  } else {
    await expect(header.getByRole("link", { name: "Suporte" })).toHaveAttribute("href", "/entrar?proximo=%2Fpainel%2Fsuporte");
    await expect(header.getByRole("link", { name: "Entrar", exact: true })).toHaveAttribute("href", "/entrar");
    await expect(header.getByRole("link", { name: "Fazer cadastro", exact: true })).toHaveAttribute("href", "/cadastro");
  }
});

test("atalho Explorar projetos do painel abre a página 2 atualizada", async ({ page, isMobile }) => {
  await login(page);
  if (isMobile) {
    const explore = page.getByRole("main").getByRole("link", { name: "Explorar projetos", exact: true });
    await expect(explore).toHaveAttribute("href", "/?explorar=projetos#projetos");
    await explore.click();
  } else {
    const explore = page.locator("aside nav a").filter({ hasText: "Explorar projetos" });
    await expect(explore).toHaveAttribute("href", "/?explorar=projetos#projetos");
    await explore.click();
  }
  await expect(page).toHaveURL(/\/?\?explorar=projetos#projetos$/);
  await expect(page.getByRole("heading", { level: 1, name: /Existe uma causa que conecta você/ })).toBeVisible();
  await expect(page.locator("#meu-projeto")).toBeVisible();
  if (!isMobile) {
    await expect(page.getByRole("banner").getByRole("link", { name: "Explorar projetos", exact: true })).toHaveCount(0);
    const publicNavigation = await page.getByRole("navigation", { name: "Navegação principal" }).boundingBox();
    expect(publicNavigation).toBeTruthy();
    expect(Math.abs(publicNavigation!.x + publicNavigation!.width / 2 - (await page.evaluate(() => window.innerWidth / 2)))).toBeLessThan(2);
    const causeMenu = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Encontre sua causa" });
    const neighboringMenu = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Meu projeto" });
    await expect.poll(() => causeMenu.evaluate((element) => getComputedStyle(element).fontFamily)).toBe(
      await neighboringMenu.evaluate((element) => getComputedStyle(element).fontFamily),
    );
    await expect.poll(() => causeMenu.evaluate((element) => getComputedStyle(element).fontWeight)).toBe(
      await neighboringMenu.evaluate((element) => getComputedStyle(element).fontWeight),
    );
  }
  const causeCard = page.locator("#encontre-sua-causa");
  await expect(causeCard.getByRole("button", { name: "Começar quiz" })).toBeVisible();
  await expect(causeCard.locator(".eyebrow")).toHaveCSS("color", "rgb(40, 88, 66)");
});

test("retorno da página 2 anima para a página 1 e preserva contraste e textos revisados", async ({ page }) => {
  await page.goto("/");
  const heroTitle = page.getByRole("heading", { level: 1, name: /Apoiar uma causa/ });
  const hero = page.getByRole("region", { name: "Apresentação da SocialTrade" });
  await expect(heroTitle).toHaveCSS("color", "rgb(23, 57, 46)");
  await expect(heroTitle).toHaveClass(/discovery-title/);
  await expect(hero.getByText(/Aproximamos empresas, pessoas e projetos sociais/)).toHaveCount(0);
  await expect(hero.getByText("Para quem quer apoiar")).toHaveCount(0);
  await expect(hero.getByText("Para projetos sociais")).toHaveCount(0);
  await page.getByRole("button", { name: "Encontrar um projeto" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Existe uma causa que conecta você/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar ao início" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar ao início" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Apoiar uma causa/ })).toBeVisible();
  await expect(page.locator("#projetos")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("heading", { name: "Como escolher e apoiar um projeto?" })).toHaveCount(1);
  const lowerLanding = page.locator(".landing-details");
  await page.waitForTimeout(100);
  expect(Number(await lowerLanding.evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(1);
  expect(await lowerLanding.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBeLessThan(-20);
  await expect.poll(() => lowerLanding.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
  await expect.poll(() => lowerLanding.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBe(0);
  const choosingProjectCopy = page.locator("#como-funciona article p");
  await expect(choosingProjectCopy).toHaveCount(2);
  for (const paragraph of await choosingProjectCopy.all()) await expect(paragraph).toHaveClass(/text-justify/);
  await expect(page.getByText("Uma ação conjunta de Caio, Bruno e Pedro. Para reafirmar o conceito de cidadania. Para promover a inclusão social. Para todos.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Deixe uma sugestão!" }).locator("svg")).toHaveCount(0);
});

test("transição entre rotas mostra indicador de carregamento", async ({ page }) => {
  await login(page);
  await page.goto("/");
  let transitionStartedAt: number;
  if (page.viewportSize()!.width < 768) {
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    transitionStartedAt = Date.now();
    await page.getByRole("navigation", { name: "Navegação móvel" }).getByRole("link", { name: "Meu painel", exact: true }).click();
  } else {
    transitionStartedAt = Date.now();
    await page.getByRole("link", { name: "Meu painel", exact: true }).click();
  }
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toBeVisible();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { level: 1, name: /Olá,/ })).toBeVisible();
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toBeHidden();
  expect(Date.now() - transitionStartedAt).toBeGreaterThanOrEqual(1450);
  if (page.viewportSize()!.width < 768) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
    transitionStartedAt = Date.now();
    await page.getByRole("navigation", { name: "Navegação do painel" }).getByRole("link", { name: "Suporte", exact: true }).click();
  } else {
    transitionStartedAt = Date.now();
    await page.locator("aside nav").getByRole("link", { name: "Suporte", exact: true }).click();
  }
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toBeVisible();
  await expect(page).toHaveURL(/\/painel\/suporte$/);
  await expect(page.getByRole("heading", { level: 1, name: "Abra um ticket com o suporte." })).toBeVisible();
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toBeHidden();
  expect(Date.now() - transitionStartedAt).toBeGreaterThanOrEqual(1450);
});

test("rodapé oferece sugestão sem atalho de contato e abre o formulário preenchido", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Contate o suporte" })).toHaveCount(0);
  await expect(footer.getByRole("link", { name: "Deixe uma sugestão!" })).toHaveAttribute(
    "href",
    "/entrar?proximo=%2Fpainel%2Fsuporte%3Ftipo%3Dsugestao",
  );
  const justified = footer.locator(".text-justify");
  await expect(justified).toHaveCount(3);
  for (const paragraph of await justified.all()) {
    await expect.poll(() => paragraph.evaluate((element) => getComputedStyle(element).textAlign)).toBe("justify");
  }

  await login(page);
  await page.goto("/");
  await footer.getByRole("link", { name: "Deixe uma sugestão!" }).click();
  await expect(page).toHaveURL(/\/painel\/suporte\?tipo=sugestao$/);
  await expect(page.getByRole("heading", { name: "Abra um ticket com sua sugestão." })).toBeVisible();
  await expect(page.getByLabel("Assunto", { exact: true })).toHaveValue("Sugestão para a SocialTrade");
  await expect(page.getByRole("heading", { name: "Novo ticket" })).toBeVisible();
  await expect(page.getByLabel("Relato")).toBeVisible();
});

test("CTA principal desliza para a tela de projetos sem recarregar a página", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Encontrar um projeto", exact: false }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /Existe uma causa que conecta você/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(200);
  await expect(page.getByRole("navigation", { name: "Navegação de projetos" })).toHaveCount(0);
  if (isMobile) await page.getByRole("button", { name: "Abrir navegação" }).click();
  const projectNavigation = page.getByRole("navigation", { name: isMobile ? "Navegação móvel" : "Navegação principal" });
  await expect(projectNavigation.getByRole("link", { name: "Procurar projeto/instituição", exact: true })).toBeVisible();
  await expect(projectNavigation.getByRole("link", { name: "Meu projeto", exact: true })).toHaveAttribute("href", "#meu-projeto");
  const causeMenuItem = projectNavigation.getByLabel("Encontre sua causa");
  await expect(causeMenuItem).toBeVisible();
  await expect(causeMenuItem).toHaveAttribute("href", "#encontre-sua-causa");
  await expect(causeMenuItem).not.toContainText("Em breve");
  if (isMobile) await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect.poll(() => page.locator(".discovery-viewport").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(25, 60, 49)");
  await expect.poll(() => page.getByRole("banner").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("color(srgb 0.964706 0.937255 0.886274 / 0.58)");
  await expect(page.locator("[data-filter-card]")).toHaveCSS("background-color", "rgb(218, 231, 208)");
  const projectCard = page.locator("[data-projects-panel] article").first();
  await expect(projectCard).toHaveCSS("background-color", "rgb(218, 231, 208)");
  await expect(await contrastRatio(projectCard.locator("p").nth(1), projectCard)).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator(".site-footer-cream")).toHaveCSS("background-color", "rgb(246, 239, 226)");
  await page.getByRole("switch", { name: "Tema escuro" }).click();
  await expect(page.getByRole("switch", { name: "Tema escuro" })).toBeChecked();
  await expect(page.locator("#project-search")).toHaveCSS("background-color", "rgb(29, 48, 40)");
  await expect(page.locator("#project-search")).toHaveCSS("color", "rgb(232, 240, 235)");
  await page.getByRole("switch", { name: "Tema escuro" }).click();
  await expect(page.getByRole("switch", { name: "Tema escuro" })).not.toBeChecked();
  await expect(page.getByRole("link", { name: /Apresentar meu projeto/ })).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Abrir navegação" }).click();
  await projectNavigation.getByRole("link", { name: "Procurar projeto/instituição", exact: true }).click();
  await expect(page).toHaveURL(/#projetos$/);
  await expect(page.getByRole("heading", { name: "Projetos encontrados" })).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Abrir navegação" }).click();
  await projectNavigation.getByRole("link", { name: "Meu projeto", exact: true }).click();
  await expect(page).toHaveURL(/#meu-projeto$/);
  await expect(page.getByRole("region", { name: "Cadastre seu projeto" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Apresentar meu projeto/ })).toHaveAttribute("href", "/cadastro?tipo=project");
  if (isMobile) await page.getByRole("button", { name: "Abrir navegação" }).click();
  await causeMenuItem.click();
  await expect(page).toHaveURL(/#encontre-sua-causa$/);
  const quizSection = page.locator("#encontre-sua-causa");
  await expect(quizSection).toBeVisible();
  await expect(quizSection.getByRole("button", { name: "Começar quiz" })).toBeVisible();
  await expect(quizSection).not.toContainText("Em construção");
  await page.getByRole("banner").getByRole("link", { name: "SocialTrade, início" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /Apoiar uma causa/ })).toBeVisible();
  await expect.poll(() => page.locator(".discovery-viewport").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(218, 231, 208)");
  await expect(page.locator("#como-funciona")).toHaveCSS("background-color", "rgb(25, 60, 49)");
  await expect(page.locator("#como-funciona article").first()).toHaveCSS("background-color", "rgb(40, 88, 66)");
  await expect(await contrastRatio(page.locator("#como-funciona article p").first(), page.locator("#como-funciona article").first())).toBeGreaterThanOrEqual(4.5);
});

test("Meu projeto aponta para o convite de cadastro na página de descoberta", async ({ page, isMobile }) => {
  await login(page, "90000001000129", "project", "SocialTrade123!");
  await page.goto("/");
  await page.getByRole("button", { name: "Encontrar um projeto", exact: false }).click();
  if (isMobile) await page.getByRole("button", { name: "Abrir navegação" }).click();
  await expect(page.getByRole("link", { name: "Meu projeto", exact: true })).toHaveAttribute(
    "href", "#meu-projeto",
  );
  await page.getByRole("link", { name: "Meu projeto", exact: true }).click();
  await expect(page).toHaveURL(/#meu-projeto$/);
  await expect(page.getByRole("link", { name: /Apresentar meu projeto/ })).toHaveAttribute("href", "/cadastro?tipo=project");
});

test("CTA da transparência abre a lista de projetos no início", async ({ page, isMobile }) => {
  await page.goto("/#transparencia");
  await page.getByRole("link", { name: "Conhecer os projetos", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /Existe uma causa que conecta você/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(200);
  await expect(page.locator("html")).toHaveAttribute("data-exploring-projects", "true");
  if (isMobile) await page.getByRole("button", { name: "Abrir navegação" }).click();
  await expect(page.getByRole("link", { name: "Meu projeto", exact: true })).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Confiança se constrói com informação/ })).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("descoberta pública, busca sem acentos e limpeza de filtros", async ({ page }) => {
  await page.goto("/projetos");
  await expect(page).toHaveURL(/\/?\?explorar=projetos#projetos$/);
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  const search = page.getByRole("textbox", { name: "Buscar projetos por nome, cidade ou palavra" });
  await search.fill("educacao aberta");
  await expect(page).toHaveURL(/busca=educacao/);
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rede Saúde Comunitária", exact: true })).toHaveCount(0);
  await search.fill("nenhum-projeto-com-este-nome");
  await expect(page.getByRole("heading", { name: "Ainda não encontramos essa combinação." })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).first().click();
  await expect(page).toHaveURL(/\/?\?explorar=projetos#projetos$/);
  await expect(page.getByRole("heading", { name: "Rede Saúde Comunitária", exact: true })).toBeVisible();
});

test("filtros pesquisáveis de causa, estado e cidade mantêm a busca sincronizada", async ({ page }) => {
  await page.route(
    "https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios",
    (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 3550308, nome: "São Paulo" }, { id: 3509502, nome: "Campinas" }]),
    }),
  );
  await page.goto("/projetos");

  const state = page.getByRole("combobox", { name: "Estado" });
  await state.fill("sao paulo");
  await page.getByRole("option", { name: "São Paulo (SP)" }).click();
  const city = page.getByRole("combobox", { name: "Cidade" });
  await city.fill("sao paulo");
  await page.getByRole("option", { name: "São Paulo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Projeto de Teste Pix", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const query = new URLSearchParams(window.location.search);
    return [query.get("estado"), query.get("cidade")];
  })).toEqual(["SP", "São Paulo"]);

  const cause = page.getByRole("combobox", { name: "Causa" });
  await cause.fill("educacao");
  await cause.press("ArrowDown");
  await cause.press("ArrowUp");
  await cause.press("ArrowDown");
  await cause.press("Enter");
  await expect(page.getByRole("heading", { name: "Instituto Mãos Unidas", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => new URLSearchParams(window.location.search).get("causa"))).toBe("education");
});

test("perfil público vem no HTML e preserva dados privados", async ({ page, request }) => {
  const projects = await request.get("/api/public/projects");
  expect(projects.ok()).toBeTruthy();
  const project = (await projects.json()).find((item: { name: string }) => item.name === projectName);
  const html = await request.get(`/projetos/${project.slug}`);
  expect(html.status()).toBe(200);
  const text = await html.text();
  expect(text).toContain(projectName);
  expect(text).toContain(projectObjective);
  expect(text).not.toContain("chave-privada-dos-testes");
  expect(text).not.toContain("11222333000181@example.org");
  await page.goto(`/projetos/${project.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: projectName })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "O que queremos transformar" })
      .getByText(projectObjective, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText(/Informações declaradas pelo próprio projeto/)).toBeVisible();
  await page.goto("/projetos/perfil-que-nao-existe");
  await expect(page.getByRole("heading", { name: "Vamos encontrar outro caminho?" })).toBeVisible();
});

test("links de projetos abrem os destinos no início sem herdar a rolagem anterior", async ({ page }) => {
  await page.goto("/projetos");
  await expect(page.getByRole("heading", { level: 1, name: /Existe uma causa que conecta você/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("link", { name: `Conhecer ${projectName}` }).click();
  await expect(page).toHaveURL(/\/projetos\/[^/]+#conteudo$/);
  await expect(page.getByRole("status", { name: "Carregando próxima página" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: projectName })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(200);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("main").getByRole("link", { name: "Procurar projeto\/instituição", exact: true }).click();
  await expect(page).toHaveURL(/\/?\?explorar=projetos#projetos$/);
  await expect(page.getByRole("heading", { level: 1, name: /Existe uma causa que conecta você/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(200);
});

test("a tela de doações confirma SOL e apresenta prévia Pix sem receber transferências ainda", async ({ page }) => {
  await login(page, "12345678000195", "donor", "SocialTrade123!");
  await page.route("**/api/solana-payments/quote", async (route) => route.fulfill({ json: { brl_per_sol: "500", updated_at: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 300, source: "CoinGecko" } }));
  let pixPostCount = 0;
  let solanaIntentCounter = 40;
  await page.route("**/api/solana-payments/intents", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    solanaIntentCounter += 1;
    const intentId = solanaIntentCounter;
    const reference = "11111111111111111111111111111111";
    const recipient = "4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry";
    await route.fulfill({ json: {
      id: intentId, target: "project", project_id: 1, cause_code: "education", amount_lamports: 50_000_000,
      reference, recipient_address: recipient,
      payment_uri: `solana:${recipient}?amount=0.05&reference=${reference}&label=SocialTrade&message=Doacao%20SocialTrade`,
      status: "pending", transaction_signature: null, expires_at: new Date(Date.now() + 600_000).toISOString(),
    } });
  });
  await page.route("**/api/solana-payments/intents/*/verify", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/intents")) return route.continue();
    await route.fulfill({ json: {
      id: Number(url.pathname.split("/").at(-2)), target: "project", project_id: 1, cause_code: "education",
      amount_lamports: 50_000_000, reference: "11111111111111111111111111111111",
      recipient_address: "4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry",
      payment_uri: "solana:4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry?amount=0.05&reference=11111111111111111111111111111111&label=SocialTrade&message=Doacao%20SocialTrade",
      status: "confirmed", transaction_signature: "5yM4signaturedeTeste", expires_at: new Date(Date.now() + 600_000).toISOString(),
    } });
  });
  await page.route("**/api/donations", async (route) => {
    if (route.request().method() === "POST") pixPostCount += 1;
    await route.continue();
  });
  await page.goto("/painel/doacoes");
  await expect(page.getByRole("heading", { name: "Contribua com uma causa." })).toBeVisible();
  await expect(page.getByTestId("solana-pay-qr")).toHaveCount(0);
  await page.getByLabel("Projeto social").selectOption({ index: 1 });
  await page.getByRole("button", { name: /SOL · Solana Pay/ }).click();
  await page.getByLabel("Valor da doação em reais", { exact: true }).fill("25,00");
  await expect(page.getByLabel("Valor da doação em SOL", { exact: true })).toHaveValue("0,05");
  await page.getByLabel("Valor da doação em SOL", { exact: true }).fill("0,1");
  await expect(page.getByLabel("Valor da doação em reais", { exact: true })).toHaveValue("50,00");
  await page.getByLabel("Valor da doação em reais", { exact: true }).fill("25,00");
  await page.getByRole("button", { name: "Visualizar QR Code" }).click();
  await expect(page.getByRole("button", { name: "Copiar endereço da carteira Solana SocialTrade" })).toContainText("4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry");
  const walletQr = page.getByTestId("solana-pay-qr");
  await expect(walletQr).toBeVisible();
  await expect(walletQr).toHaveAttribute("data-payment-uri", /^solana:4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry\?amount=0.05&reference=/);
  await expect(page.getByTestId("sol-payment-confirmed")).toContainText("Pagamento confirmado na rede Solana");
  await expect(page.getByText("5yM4signaturedeTeste")).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).first().click();
  await page.getByRole("button", { name: /Pix · BRL/ }).click();
  await expect(page.getByTestId("solana-pay-qr")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Valor da doação em reais", { exact: true }).fill("25,00");
  await page.getByRole("button", { name: "Visualizar QR Code" }).click();
  await expect(page.getByTestId("pix-demo-warning")).toContainText("não é um código Pix válido");
  await expect(page.getByTestId("pix-demo-qr").locator("svg")).toBeVisible();
  await expect(page.getByTestId("pix-demo-qr")).toHaveAttribute("data-payload", "SOCIALTRADE_PIX_DEMO|NAO_PAGAVEL|valor=25.00");
  await expect(page.getByText(/confirmação em tempo real será ativada/)).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: /Doe indiretamente/ }).click();
  await expect(page.getByRole("heading", { name: "Doação por categoria" })).toBeVisible();
  await page.getByRole("button", { name: /SOL · Solana Pay/ }).click();
  await page.getByLabel("Valor da doação em SOL").fill("0,05");
  await page.getByRole("button", { name: "Visualizar QR Code" }).click();
  await expect(page.getByTestId("solana-pay-qr")).toBeVisible();
  await expect(page.getByText(/distribuição ainda precisa ser tratada manualmente/i)).toBeVisible();
  expect(pixPostCount).toBe(0);
});

test("pedido SOL não expira e pode ser cancelado para gerar outro QR ou escolher Pix", async ({ page, isMobile }) => {
  await login(page, "12345678000195", "donor", "SocialTrade123!");
  await page.route("**/api/solana-payments/quote", async (route) => route.fulfill({ json: { brl_per_sol: "500", updated_at: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 300, source: "CoinGecko" } }));
  let latest: Record<string, unknown> = {};
  await page.route("**/api/solana-payments/intents/*/verify", async (route) => route.fulfill({ json: latest }));
  await page.goto("/painel/doacoes");
  await page.getByRole("button", { name: /SOL · Solana Pay/ }).click();
  await page.getByLabel("Valor da doação em reais", { exact: true }).fill("25,00");
  const generateButton = page.getByRole("button", { name: "Visualizar QR Code" });
  await expect(generateButton).toBeDisabled();
  await expect(generateButton).toHaveCSS("opacity", "0.5");
  if (!isMobile) {
    await page.getByTestId("payment-qr-trigger").hover();
    await expect(page.getByRole("tooltip")).toHaveText("Escolha um projeto para ajudar!");
    await expect(page.getByRole("tooltip")).toHaveCSS("opacity", "1");
  }
  await page.getByTestId("payment-qr-trigger").click();
  await expect(page.getByLabel("Projeto social")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Selecione o campo “Projeto social” para continuar.")).toBeVisible();
  await expect(page.getByLabel("Projeto social")).toBeFocused();
  await page.getByLabel("Projeto social").selectOption({ index: 1 });
  await expect(page.getByText("Selecione o campo “Projeto social” para continuar.")).toHaveCount(0);
  await expect(generateButton).toBeEnabled();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByLabel("Valor da doação em reais", { exact: true }).fill("");
  await expect(generateButton).toBeDisabled();
  await expect(generateButton).toHaveCSS("opacity", "0.5");
  if (!isMobile) {
    await page.getByTestId("payment-qr-trigger").hover();
    await expect(page.getByRole("tooltip")).toHaveText("Digite um valor válido em reais ou SOL!");
    await expect(page.getByRole("tooltip")).toHaveCSS("opacity", "1");
  }
  await page.getByLabel("Valor da doação em SOL", { exact: true }).fill("0");
  await expect(generateButton).toBeDisabled();
  await page.getByLabel("Valor da doação em SOL", { exact: true }).fill("0,05");
  await expect(generateButton).toBeEnabled();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const firstResponse = page.waitForResponse((response) => response.url().endsWith("/api/solana-payments/intents") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Visualizar QR Code" }).click();
  latest = await (await firstResponse).json();
  expect(latest.expires_at).toBeNull();
  await expect(page.getByText("O QR Code não expira.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir em carteira compatível" })).toHaveCount(0);
  await expect(page.getByText(/Utilização de outra rede pode causar perda permanente/)).toBeVisible();
  const copyAddress = page.getByRole("button", { name: "Copiar endereço da carteira Solana SocialTrade" });
  if (!isMobile) {
    await page.getByText(/ATENÇÃO! Transação somente na rede Solana/).hover();
    await expect(page.getByTestId("wallet-copy-hint")).toHaveCSS("opacity", "0");
    await copyAddress.hover();
    await expect(page.getByTestId("wallet-copy-hint")).toHaveCSS("opacity", "1");
  }
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => document.body.setAttribute("data-copied-address", value) } }));
  await copyAddress.click();
  await expect(page.locator("body")).toHaveAttribute("data-copied-address", "4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry");
  const firstReference = latest.reference;
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /SOL · Solana Pay/ }).click();
  await expect(page.getByLabel("Valor da doação em SOL", { exact: true })).toHaveValue("0.05");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(generateButton).toBeDisabled();
  await page.getByLabel("Projeto social").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Visualizar QR Code" }).click();
  await expect(page.getByTestId("solana-pay-qr")).toHaveAttribute("data-payment-uri", String(latest.payment_uri));
  await page.getByRole("button", { name: "Cancelar pagamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Valor da doação em reais", { exact: true })).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem("socialtrade_solana_payment_intent_id"))).toBeNull();
  await page.getByLabel("Projeto social").selectOption({ index: 1 });
  await page.getByLabel("Valor da doação em reais", { exact: true }).fill("25,00");
  const nextResponse = page.waitForResponse((response) => response.url().endsWith("/api/solana-payments/intents") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Visualizar QR Code" }).click();
  latest = await (await nextResponse).json();
  expect(latest.reference).not.toBe(firstReference);
  await page.getByRole("button", { name: "Cancelar pagamento" }).click();
  await page.getByRole("button", { name: /Pix · BRL/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Valor da doação em reais", { exact: true }).fill("25,00");
  await page.getByRole("button", { name: "Visualizar QR Code" }).click();
  await expect(page.getByTestId("pix-demo-qr")).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /SOL · Solana Pay/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("painel exige sessão e login inválido apresenta erro sem autenticar", async ({ page }) => {
  await page.goto("/painel/perfil");
  await expect(page).toHaveURL(/\/entrar\?proximo=/);
  await page.getByRole("radio", { name: "Empresa", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByLabel("CNPJ da empresa", { exact: true }).fill(donorDocument);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaIncorreta123!");
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Não foi possível entrar" })).toContainText("CPF/CNPJ ou senha incorretos.");
  expect(await page.evaluate(() => sessionStorage.getItem("socialtrade_token"))).toBeNull();
});

test("atalhos de demonstração autenticam projeto Pix e empresa doadora por CNPJ", async ({ page }) => {
  const donorPage = await page.context().newPage();
  const demoAccounts = [
    { page, button: "Usar acesso do projeto", kind: "project", label: "CPF ou CNPJ", cnpj: "90000001000129", greeting: "Olá, Projeto." },
    { page: donorPage, button: "Usar acesso do doador", kind: "donor", label: "CNPJ da empresa", cnpj: "12345678000195", greeting: "Olá, Empresa." },
  ] as const;

  for (const account of demoAccounts) {
    await account.page.goto("/entrar");
    await account.page.getByText("Ambiente de demonstração").click();
    await account.page.getByRole("button", { name: account.button }).click();
    await expect(account.page.getByRole("radio", { name: account.kind === "project" ? "Projeto social" : "Empresa" })).toBeChecked();
    await expect(account.page.getByLabel(account.label, { exact: true })).toHaveValue(account.cnpj);
    await expect(account.page.getByLabel("Senha", { exact: true })).toHaveValue("SocialTrade123!");
    await account.page.getByRole("button", { name: "Entrar na minha conta" }).click();
    await expect(account.page).toHaveURL(/\/painel$/);
    await expect(account.page.getByRole("heading", { name: account.greeting, exact: true })).toBeVisible();
    await expect(account.page.getByRole("link", { name: /Solicitações em aberto/ })).toBeVisible();
    await expect(account.page.getByText("Empresa cadastrada", { exact: true })).toHaveCount(0);
    await expect(account.page.getByText("Avisos da plataforma", { exact: true })).toHaveCount(0);
  }

  await donorPage.close();
});

test("menu mostra a quantidade de avisos não lidos e zera após consultá-los", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await login(page);
  await expect(page.getByRole("heading", { name: "Da comunidade" })).toBeVisible();
  const menuButton = page.getByRole("button", { name: "Abrir menu do painel" });
  if (await menuButton.isVisible()) await menuButton.click();
  await expect(page.getByRole("navigation", { name: "Navegação do painel" })).toBeVisible();
  const noticesLink = page.getByRole("link", { name: /Avisos.*avisos não lidos/ });
  await expect(noticesLink).toBeVisible();
  await noticesLink.click();
  await expect(page.getByRole("heading", { name: "Avisos da plataforma." })).toBeVisible();
  const unreadCount = await page.evaluate(() => {
    const value = Object.entries(localStorage).find(([key]) => key.startsWith("socialtrade-read-announcements-"))?.[1];
    return value ? JSON.parse(value).length : 0;
  });
  expect(unreadCount).toBeGreaterThan(0);
  const returnMenuButton = page.getByRole("button", { name: "Abrir menu do painel" });
  if (await returnMenuButton.isVisible()) await returnMenuButton.click();
  await expect(page.getByRole("navigation", { name: "Navegação do painel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Avisos", exact: true })).toBeVisible();
  await expect(page.getByLabel(/aviso[s]? não lido[s]?/)).toHaveCount(0);
});

test("login, restauração da sessão, edição persistida e logout", async ({ page }, testInfo) => {
  await login(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "Abrir menu do painel" })).toBeVisible({ visible: testInfo.project.name.startsWith("mobile") });
  await page.goto("/painel/perfil");
  const name = `Responsável atualizado ${testInfo.project.name}`;
  await page.getByLabel("Nome completo", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page.getByText("Informações salvas com sucesso.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue(name);
  await openWorkspaceMenu(page);
  await page.getByRole("button", { name: "Sair da conta", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/entrar");
  expect(await page.evaluate(() => sessionStorage.getItem("socialtrade_token"))).toBeNull();
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar\?proximo=/);
});

test("suporte envia e mantém solicitação após recarregar", async ({ page }, testInfo) => {
  await login(page);
  await page.goto("/painel/suporte");
  const subject = `Ajuda no cadastro ${testInfo.project.name} tentativa ${testInfo.retry}`;
  await page.getByLabel("Assunto", { exact: true }).fill(subject);
  await page.getByLabel("Relato", { exact: true }).fill("Preciso de orientação para atualizar os dados da organização.");
  const createdResponse = page.waitForResponse((response) => response.url().endsWith("/api/support") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Abrir ticket" }).click();
  const created = await (await createdResponse).json();
  expect(created.protocol).toMatch(/^[0-9]{6}$/);
  await expect(page.getByRole("status").filter({ hasText: `Ticket aberto com sucesso. Protocolo ${created.protocol}.` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seus tickets" })).toBeVisible();
  await page.reload();
  await expect(page.getByText(subject, { exact: true })).toBeVisible();
  const card = page.locator("article").filter({ hasText: subject });
  await expect(card).toContainText(`Protocolo #${created.protocol}`);
  await expect(card).toContainText("Recebida");
  const moderatorLogin = await page.request.post("/api/auth/login", { data: { document: "33333333333", password: "SocialTrade123!", account_type: "project" } });
  expect(moderatorLogin.ok()).toBeTruthy();
  const moderator = await moderatorLogin.json();
  const resolved = await page.request.patch(`/api/moderation/tickets/${created.id}`, { data: { status: "resolved" }, headers: { Authorization: `Bearer ${moderator.access_token}` } });
  expect(resolved.ok()).toBeTruthy();
  await page.reload();
  await expect(card).toContainText(`Protocolo #${created.protocol}`);
  await expect(card).toContainText("Resolvida");
});

test("cadastro em etapas cria pessoa e permite entrar", async ({ page }, testInfo) => {
  const base = String(900000000 + (testInfo.project.name.startsWith("mobile") ? 100 : 0) + testInfo.retry + testInfo.repeatEachIndex * 1000);
  let document = base;
  for (const length of [9, 10]) {
    const total = [...document].reduce((sum, digit, index) => sum + Number(digit) * (length + 1 - index), 0);
    const check = (total * 10) % 11;
    document += check === 10 ? "0" : String(check);
  }
  await page.goto("/cadastro?tipo=person");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill("Pessoa de teste");
  await page.getByLabel("CPF", { exact: true }).fill(document);
  await page.getByLabel("E-mail", { exact: true }).fill(`${document}@example.org`);
  await page.getByLabel("Crie uma senha", { exact: true }).fill(password);
  await page.getByLabel("Confirme a senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Nome de usuário", { exact: true }).fill(`pessoa_${document}`);
  await page.getByLabel(/Ocupação|Como você participa/).fill("Voluntária da comunidade");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("heading", { name: /conta está pronta|cadastro.*concluído|faz parte|bem-vindo/i })).toBeVisible();
  await login(page, document, "person");
});

test("CNPJ alfanumérico permanece no cadastro, no login e no perfil institucional", async ({ page }, testInfo) => {
  // Documentos fictícios exclusivos por projeto/tentativa, com DV calculado
  // para os caracteres do formato alfanumérico definido pela Receita Federal.
  let document = `E2E${900000000 + (testInfo.project.name.startsWith("mobile") ? 100 : 0) + testInfo.retry}`;
  for (const weights of [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]]) {
    const remainder = weights.reduce((sum, weight, index) => sum + (document.charCodeAt(index) - 48) * weight, 0) % 11;
    document += String(remainder < 2 ? 0 : 11 - remainder);
  }
  const masked = `${document.slice(0, 2)}.${document.slice(2, 5)}.${document.slice(5, 8)}/${document.slice(8, 12)}-${document.slice(12)}`.toLowerCase();
  await page.goto("/cadastro?tipo=donor");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Nome completo do responsável", { exact: true }).fill("Responsável fictício");
  await page.getByLabel("CPF da pessoa responsável", { exact: true }).fill("52998224725");
  await page.getByLabel("CNPJ da instituição", { exact: true }).fill(masked);
  await page.getByLabel("E-mail", { exact: true }).fill(`${document.toLowerCase()}@example.org`);
  await page.getByLabel("Crie uma senha", { exact: true }).fill(password);
  await page.getByLabel("Confirme a senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Nome da empresa", { exact: true }).fill("Instituição alfanumérica de teste");
  await page.getByRole("combobox", { name: "Estado", exact: true }).click();
  await page.getByRole("option", { name: "SP", exact: true }).click();
  await page.getByRole("combobox", { name: "Cidade", exact: true }).click();
  await page.getByRole("option", { name: "São Paulo", exact: true }).click();
  await page.getByLabel("Apresentação breve", { exact: true }).fill("Empresa fictícia que apoia iniciativas comunitárias.");
  await page.getByRole("button", { name: "Criar minha conta", exact: true }).click();
  await expect(page.getByRole("heading", { name: /conta está pronta|cadastro.*concluído|faz parte|bem-vindo/i })).toBeVisible();
  await login(page, masked);
  await page.reload();
  const profile = await page.request.get("/api/organizations/mine", {
    headers: { Authorization: `Bearer ${await page.evaluate(() => sessionStorage.getItem("socialtrade_token"))}` },
  });
  expect(profile.ok()).toBeTruthy();
  const profileData = await profile.json();
  expect(profileData[0].cnpj).toBe(document);
  expect(profileData[0]).toMatchObject({ city: "São Paulo", state: "SP" });
  await page.goto("/painel/organizacoes");
  await page.getByRole("button", { name: /Editar/ }).first().click();
  await expect(page.getByLabel(/CNPJ/)).toHaveValue(document);
  await expect(page.getByLabel(/CNPJ/)).toHaveAttribute("readonly", "");
});

test("navegação móvel funciona por teclado e página não transborda", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Fluxo específico do menu móvel.");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  const toggle = page.getByRole("button", { name: "Abrir navegação" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  const navigation = page.getByRole("navigation", { name: "Navegação móvel" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Quem somos", exact: true }).click();
  await expect(page).toHaveURL(/#quem-somos$/);
  await expect(page.locator("#quem-somos")).toBeInViewport();
  await expect(navigation).toHaveCount(0);
  await page.getByRole("button", { name: "Encontrar um projeto", exact: false }).click();
  await expect(page.locator("#projetos")).toBeInViewport();
  await toggle.click();
  await expect(navigation.getByRole("link", { name: "Meu projeto", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Confiança se constrói com informação/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("páginas públicas e administração do projeto cabem na tela móvel", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Verificação de layout em viewport móvel.");
  const expectNoHorizontalOverflow = async () => {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `A página ${page.url()} não deve transbordar horizontalmente no celular`,
    ).toBeTruthy();
  };

  for (const path of ["/", "/entrar", "/cadastro", "/projetos", "/projetos/projeto-de-teste-pix#conteudo"]) {
    await page.goto(path);
    await expect(page.getByRole("main").first()).toBeVisible();
    await expectNoHorizontalOverflow();
  }

  await login(page, "90000001000129", "project", "SocialTrade123!");
  await expectNoHorizontalOverflow();
  await openWorkspaceMenu(page);
  const menu = page.getByRole("navigation", { name: "Navegação do painel" });
  await expect(menu.getByRole("link", { name: "Meu projeto", exact: true })).toBeVisible();
  await menu.getByRole("link", { name: "Meu projeto", exact: true }).click();
  await expect(page).toHaveURL(/\/painel\/meu-projeto$/);
  await expect(page.getByRole("heading", { name: "Meu projeto." })).toBeVisible();
  await expectNoHorizontalOverflow();

  for (const path of ["/painel", "/painel/doacoes", "/painel/organizacoes", "/painel/suporte"]) {
    await page.goto(path);
    await expect(page.getByRole("main").first()).toBeVisible();
    await expectNoHorizontalOverflow();
  }
});
