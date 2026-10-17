import { expect, test } from "@playwright/test";
import { donorDocument, login, openWorkspaceMenu, password, projectName, projectObjective } from "./fixtures";

test("descoberta pública, busca sem acentos e limpeza de filtros", async ({ page }) => {
  await page.goto("/projetos");
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  const search = page.getByRole("textbox", { name: "Buscar projetos por nome, cidade ou palavra" });
  await search.fill("educacao aberta");
  await page.getByRole("button", { name: "Buscar projetos", exact: true }).click();
  await expect(page).toHaveURL(/busca=educacao/);
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rede Saúde Comunitária", exact: true })).toHaveCount(0);
  await search.fill("nenhum-projeto-com-este-nome");
  await page.getByRole("button", { name: "Buscar projetos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ainda não encontramos essa combinação." })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).first().click();
  await expect(page).toHaveURL(/\/projetos$/);
  await expect(page.getByRole("heading", { name: "Rede Saúde Comunitária", exact: true })).toBeVisible();
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
  await expect(page.getByText(projectObjective, { exact: true })).toBeVisible();
  await expect(page.getByText(/Informações declaradas pelo próprio projeto/)).toBeVisible();
  await page.goto("/projetos/perfil-que-nao-existe");
  await expect(page.getByRole("heading", { name: "Vamos encontrar outro caminho?" })).toBeVisible();
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
  await page.getByLabel("Sua mensagem", { exact: true }).fill("Preciso de orientação para atualizar os dados da organização.");
  await page.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Solicitação.*recebida/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText(subject, { exact: true })).toBeVisible();
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
  await navigation.getByRole("link", { name: "Explorar projetos", exact: true }).click();
  await expect(page).toHaveURL(/\/projetos$/);
  await expect(navigation).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
