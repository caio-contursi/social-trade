import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/test/helpers";
import { RegisterForm } from "./register-form";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tipo=donor"),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("cadastro institucional com CNPJ alfanumérico", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((path) => Promise.resolve(jsonResponse(
      path === "/api/projects/open" ? [] : { message: "Cadastro criado." },
    )));
    vi.stubGlobal("fetch", fetchMock);
  });

  async function fillAccess(document: string) {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Nome completo do responsável"), "Responsável fictício");
    const field = screen.getByLabelText("CNPJ da instituição");
    expect(field).toHaveAttribute("inputmode", "text");
    await user.type(field, document);
    await user.type(screen.getByLabelText("E-mail"), "instituicao@example.test");
    await user.type(screen.getByLabelText("Crie uma senha"), "SenhaDeTeste123!");
    await user.type(screen.getByLabelText("Confirme a senha"), "SenhaDeTeste123!");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    return user;
  }

  it("preserva letras no documento de acesso e no CNPJ do perfil enviado", async () => {
    const user = await fillAccess("12.abc.345/01de-35");
    await user.type(screen.getByLabelText("Nome da empresa"), "Empresa fictícia");
    await user.type(screen.getByLabelText("Cidade"), "Niterói");
    // O Select do Radix mantém o controle nativo para integração de formulários.
    const state = document.querySelector("select");
    expect(state).not.toBeNull();
    fireEvent.change(state!, { target: { value: "RJ" } });
    await user.type(screen.getByLabelText(/Apresentação/), "Apoio a projetos da comunidade.");
    await user.click(screen.getByRole("button", { name: "Criar minha conta" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => path === "/api/auth/register-institution")).toBe(true));
    const request = fetchMock.mock.calls.find(([path]) => path === "/api/auth/register-institution");
    const payload = JSON.parse(request?.[1]?.body as string);
    expect(payload.document).toBe("12ABC34501DE35");
    expect(payload.organization.cnpj).toBe("12ABC34501DE35");
  });

  it("não avança nem envia cadastro quando o DV do CNPJ alfanumérico está errado", async () => {
    await fillAccess("12ABC34501DE34");
    expect(screen.getByLabelText("CNPJ da instituição")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Informe um CNPJ válido.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([path]) => path === "/api/projects/open")).toBe(true);
  });
});
