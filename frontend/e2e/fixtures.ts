import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const password = "TesteLocalSeguro123!";
export const donorDocument = "04252011000110";
export const projectName = "Projeto Educação Aberta";
export const projectObjective = "Ampliar o acesso à educação no bairro.";

export async function registerInstitution(
  request: APIRequestContext,
  kind: "project" | "donor",
  document: string,
  name: string,
  city = "São Paulo",
  state = "SP",
) {
  const response = await request.post(`${process.env.SOCIALTRADE_API_URL}/api/auth/register-institution`, {
    data: {
      full_name: "Responsável de teste",
      responsible_cpf: "52998224725",
      document,
      email: `${document}@example.org`,
      password,
      password_confirmation: password,
      institution_kind: kind,
      organization: {
        name,
        organization_type: kind === "donor" ? "company" : "independent_project",
        institution_kind: kind,
        cnpj: document,
        city,
        state,
        short_description: "Ações de educação e apoio para a comunidade.",
        objective: kind === "project" ? projectObjective : null,
        impact_summary: kind === "project" ? "Atividades educativas realizadas semanalmente." : null,
        areas: kind === "project" ? [city === "São Paulo" ? "education" : "health"] : [],
        interested_services: [],
        pix_key: "chave-privada-dos-testes",
      },
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function login(page: Page, document = donorDocument, kind: "donor" | "project" | "person" = "donor", secret = password) {
  await page.goto(`/entrar?tipo=${kind}`);
  await page.getByLabel(kind === "donor" ? "CNPJ da empresa" : kind === "person" ? "Seu CPF" : "CPF ou CNPJ", { exact: true }).fill(document);
  await page.getByLabel("Senha", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(page).toHaveURL(/\/painel$/);
}

export async function openWorkspaceMenu(page: Page) {
  const toggle = page.getByRole("button", { name: "Abrir menu do painel" });
  if (await toggle.isVisible()) await toggle.click();
}
