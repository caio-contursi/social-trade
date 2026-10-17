import { request } from "@playwright/test";
import { donorDocument, projectName, registerInstitution } from "./fixtures";

export default async function setup() {
  const client = await request.newContext();
  try {
    await registerInstitution(client, "project", "11222333000181", projectName);
    await registerInstitution(client, "project", "11444777000161", "Rede Saúde Comunitária", "Recife", "PE");
    await registerInstitution(client, "donor", donorDocument, "Empresa de testes");
  } finally {
    await client.dispose();
  }
}
