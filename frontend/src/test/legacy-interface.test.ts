import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext, type Context } from "node:vm";
import { fireEvent, waitFor } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const staticRoot = resolve(process.cwd(), "../app/static");
const timers: ReturnType<typeof setTimeout>[] = [];
let context: Context;
const fetchMock = vi.fn();

function execute(code: string) {
  return runInContext(code, context);
}

// Executa o arquivo entregue pelo FastAPI com o HTML real, sem reimplementar
// validadores ou renderizadores. Só a fronteira HTTP é substituída.
function loadScript(file = "app.js") {
  document.body.innerHTML = readFileSync(resolve(staticRoot, file === "app.js" ? "index.html" : "public.html"), "utf8");
  context = createContext({
    document, window, localStorage, FormData, Option, URLSearchParams,
    location: { search: "?slug=projeto-teste" }, fetch: fetchMock,
    setTimeout: (callback: () => void, delay: number) => {
      const timer = setTimeout(callback, delay);
      timers.push(timer);
      return timer;
    },
    clearTimeout, clearInterval, setInterval,
  });
  execute(readFileSync(resolve(staticRoot, file), "utf8"));
}

function respond(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}

function input(name: string, value: string, form: ParentNode = document) {
  const field = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
  field.value = value;
  fireEvent.input(field);
  fireEvent.change(field);
  return field;
}

function institutionForm(documentValue: string) {
  loadScript();
  execute("setupRegistrationForm()");
  input("institution_kind", "donor");
  input("institution_name", "Empresa fictícia");
  input("institution_contact", "Responsável fictício");
  input("institution_document", documentValue);
  input("institution_email", "exemplo@example.test");
  input("institution_password", "senha-exclusiva-teste");
  input("institution_password_confirmation", "senha-exclusiva-teste");
  document.querySelector<HTMLInputElement>('[name="terms"]')!.checked = true;
  return document.querySelector<HTMLFormElement>("#register-form")!;
}

const organization = {
  id: 1, name: "Projeto fictício", slug: "projeto-teste", city: "Rio de Janeiro",
  state: "RJ", institution_kind: "project", organization_type: "association",
  short_description: "Organização de exemplo para teste.", areas: [], services: [],
};
const account = {
  id: 1, username: "000001", full_name: "Pessoa fictícia", email: "pessoa@example.test",
  registration_number: "000001", account_type: "project", role: "moderator", role_label: "Moderador",
};
const timestamps = ["2026-10-21T15:30:00.123Z", "2026-10-21T15:30:00+00:00", "2026-10-21T15:30:00"];

afterEach(() => {
  for (const timer of timers.splice(0)) clearTimeout(timer);
  document.body.innerHTML = "";
  fetchMock.mockReset();
});

describe("documentos na interface legada", () => {
  it.each([
    ["12.abc.345/01de-35", "12ABC34501DE35"],
    ["12ABC34501DE35", "12ABC34501DE35"],
    ["04.252.011/0001-10", "04252011000110"],
  ])("cadastra instituição preservando letras e zeros: %s", async (raw, expected) => {
    fetchMock.mockResolvedValue(respond({ message: "Cadastro concluído." }));
    const form = institutionForm(raw);
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [path, options] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/auth/register-institution");
    const body = JSON.parse(options.body);
    expect(body.document).toBe(expected);
    expect(body.organization.cnpj).toBe(expected);
    expect(document.querySelector('[name="institution_document"]')).toHaveAttribute("inputmode", "text");
    await waitFor(() => expect(document.querySelector("#toast")).toHaveTextContent("Cadastro concluído"));
  });

  it.each(["12ABC34501DE34", "12ABC34501DE35!", "12/ABC/345/01DE/35", "04 252011000110", "00000000000000"])(
    "bloqueia CNPJ inválido mesmo sem sair do campo: %s", (raw) => {
      const form = institutionForm(raw);
      fireEvent.submit(form);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(form.querySelector<HTMLInputElement>('[name="institution_document"]')!.validationMessage).toBe("CNPJ inválido.");
    },
  );

  it.each([["529.982.247-25", true], ["CPF52998224725", false], ["52998224724", false]])(
    "valida CPF no cadastro de pessoa sem remover texto indevido: %s", async (raw, valid) => {
      loadScript();
      execute("setupRegistrationForm(); setRegistrationMode('person')");
      input("person_full_name", "Pessoa fictícia");
      input("person_document", raw);
      input("person_email", "pessoa@example.test");
      input("person_password", "senha-exclusiva-teste");
      input("person_password_confirmation", "senha-exclusiva-teste");
      document.querySelector<HTMLInputElement>('[name="terms"]')!.checked = true;
      fetchMock.mockResolvedValue(respond({ registration_number: "000001" }));
      fireEvent.submit(document.querySelector("#register-form")!);
      if (valid) {
        await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
        expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/register");
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).document).toBe("52998224725");
        await waitFor(() => expect(document.querySelector("#toast")).toHaveTextContent("000001"));
      } else {
        expect(fetchMock).not.toHaveBeenCalled();
        expect(document.querySelector<HTMLInputElement>('[name="person_document"]')!.validationMessage).toBe("CPF inválido.");
      }
    },
  );

  it.each([[" 12.abc.345/01de-35 ", "12ABC34501DE35"], ["01234567890", "01234567890"]])(
    "envia o documento de login sem perder caracteres: %s", async (raw, expected) => {
      loadScript();
      execute("bindGlobalEvents()");
      fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ detail: "Resposta de teste" }) });
      input("document", raw, document.querySelector("#login-form")!);
      input("password", "senha-exclusiva-teste", document.querySelector("#login-form")!);
      fireEvent.submit(document.querySelector("#login-form")!);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).document).toBe(expected);
      expect(document.querySelector("#login-document")).toHaveAttribute("minlength", "11");
      expect(document.querySelector("#login-document")).toHaveAttribute("inputmode", "text");
      await waitFor(() => expect(document.querySelector("#toast")).toHaveTextContent("Resposta de teste"));
    },
  );

  it.each([["12.abc.345/01de-35", "12ABC34501DE35"], ["", null]])(
    "salva organização com CNPJ alfanumérico ou ausente: %s", async (raw, expected) => {
      loadScript();
      context.catalog = { organization_types: [{ code: "association", label: "Associação" }], areas: [{ code: "education", label: "Educação" }], services: [] };
      execute("state.catalog = catalog; state.user = {account_type: 'project'}");
      fetchMock.mockResolvedValue(respond([]));
      execute("renderOrganizations()");
      await waitFor(() => expect(document.querySelector("#show-org-form")).not.toBeNull());
      fireEvent.click(document.querySelector("#show-org-form")!);
      const form = document.querySelector<HTMLFormElement>("#org-create-form")!;
      input("name", "Projeto fictício", form);
      input("organization_type", "association", form);
      input("city", "Rio de Janeiro", form);
      input("state", "RJ", form);
      input("short_description", "Uma descrição para o teste.", form);
      input("cnpj", raw, form);
      form.querySelector<HTMLInputElement>('[name="areas"]')!.checked = true;
      fireEvent.submit(form);
      await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => path === "/api/organizations")).toBe(true));
      const [, options] = fetchMock.mock.calls.find(([path]) => path === "/api/organizations")!;
      expect(JSON.parse(options.body).cnpj).toBe(expected);
    },
  );
});

describe("datas da API na interface legada", () => {
  it.each(timestamps)("exibe datas nas áreas autenticadas: %s", async (createdAt) => {
    loadScript();
    context.account = { ...account, created_at: createdAt };
    context.org = { ...organization, created_at: createdAt };
    const ticket = { id: 1, subject: "Solicitação de teste", message: "Mensagem fictícia", status: "open", created_at: createdAt, full_name: account.full_name, email: account.email };
    fetchMock.mockImplementation(async (path: string) => respond({
      "/api/organizations/mine": [context.org],
      "/api/announcements": [{ id: 1, category: "teste", title: "Aviso fictício", body: "Texto do aviso", published_at: createdAt }],
      "/api/profile": context.account,
      "/api/support/mine": [ticket],
      "/api/moderation/overview": { counts: { users: 1, organizations: 1, open_tickets: 1 }, tickets: [ticket] },
    }[path]));
    execute("state.user = account; state.catalog = {areas: []}");
    for (const [renderer, selector] of [
      ["renderOrganizations", ".org-meta"], ["renderAnnouncements", ".announcement-date"],
      ["renderProfile", "#profile-created"], ["renderSupport", ".ticket-date"], ["renderModeration", ".mod-ticket small"],
    ]) {
      execute(`${renderer}()`);
      await waitFor(() => expect(document.querySelector(selector)).toHaveTextContent("21/10/2026"));
      expect(document.querySelector("#page-content")).not.toHaveTextContent("Invalid Date");
    }
  });

  it.each(timestamps)("exibe o mês no perfil público: %s", async (createdAt) => {
    loadScript("public.js");
    fetchMock.mockResolvedValue(respond({ ...organization, created_at: createdAt }));
    await execute("loadPublicProfile()");
    expect(document.querySelector(".public-joined")).toHaveTextContent("outubro de 2026");
    expect(document.querySelector("#public-content")).not.toHaveTextContent("Invalid Date");
  });
});
