import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/test/helpers";
import { RegisterForm } from "./register-form";

const navigation = vi.hoisted(() => ({ params: "tipo=donor" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.params),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("cadastro institucional com CNPJ alfanumérico", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    navigation.params = "tipo=donor";
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { configurable: true, value: () => false },
      setPointerCapture: { configurable: true, value: () => {} },
      releasePointerCapture: { configurable: true, value: () => {} },
      scrollIntoView: { configurable: true, value: () => {} },
    });
    fetchMock.mockReset();
    fetchMock.mockImplementation((path) => Promise.resolve(jsonResponse(
      path === "/api/projects/open"
        ? [
            { id: 1, name: "Instituto Cenu", city: "Rio de Janeiro", state: "RJ" },
            { id: 2, name: "Projeto Niterói", city: "Niterói", state: "RJ" },
            { id: 3, name: "Projeto São Paulo", city: "São Paulo", state: "SP" },
          ]
        : { message: "Cadastro criado." },
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

  it("preserva letras do CNPJ e limita a cidade às opções do estado cadastradas", async () => {
    const user = await fillAccess("12.abc.345/01de-35");
    const organizationName = screen.getByLabelText("Nome da empresa");
    await user.type(organizationName, "Empresa 123 fictícia");
    expect(organizationName).toHaveValue("Empresa  fictícia");

    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.click(screen.getByRole("option", { name: "RJ" }));
    await user.click(screen.getByRole("combobox", { name: "Cidade" }));
    expect(screen.getByRole("option", { name: "Rio de Janeiro" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Niterói" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "São Paulo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Rio de Janeiro" }));

    await user.type(screen.getByLabelText(/Apresentação/), "Apoio a projetos da comunidade.");
    await user.click(screen.getByRole("button", { name: "Criar minha conta" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => path === "/api/auth/register-institution")).toBe(true));
    const request = fetchMock.mock.calls.find(([path]) => path === "/api/auth/register-institution");
    const payload = JSON.parse(request?.[1]?.body as string);
    expect(payload.document).toBe("12ABC34501DE35");
    expect(payload.organization.cnpj).toBe("12ABC34501DE35");
    expect(payload.organization.city).toBe("Rio de Janeiro");
    expect(payload.organization.state).toBe("RJ");
  });

  it("limpa a cidade escolhida quando o estado muda e não aceita texto livre", async () => {
    const user = await fillAccess("12.abc.345/01de-35");
    const city = screen.getByRole("combobox", { name: "Cidade" });
    expect(city).toBeDisabled();
    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.click(screen.getByRole("option", { name: "RJ" }));
    await user.click(city);
    await user.click(screen.getByRole("option", { name: "Niterói" }));
    expect(city).toHaveTextContent("Niterói");

    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.click(screen.getByRole("option", { name: "SP" }));
    expect(city).toHaveTextContent("Selecione uma cidade");
    await user.click(city);
    expect(screen.getByRole("option", { name: "São Paulo" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Niterói" })).not.toBeInTheDocument();
  });

  it("impede números no nome do projeto social", async () => {
    navigation.params = "tipo=project";
    const user = await fillAccess("12.abc.345/01de-35");
    const name = screen.getByLabelText("Nome do projeto ou organização");
    await user.type(name, "Instituto Cenu 2026");
    expect(name).toHaveValue("Instituto Cenu ");
  });

  it("informa quando não consegue carregar as cidades cadastradas", async () => {
    fetchMock.mockImplementation((path) =>
      path === "/api/projects/open"
        ? Promise.reject(new Error("Falha de conexão"))
        : Promise.resolve(jsonResponse({ message: "Cadastro criado." })),
    );
    const user = await fillAccess("12.abc.345/01de-35");
    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.click(screen.getByRole("option", { name: "RJ" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Não foi possível carregar as cidades cadastradas.",
    );
    expect(screen.getByRole("combobox", { name: "Cidade" })).toBeDisabled();
  });

  it("remove números de nomes e mantém apenas dígitos no telefone e CPF", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("radio", { name: /Quero participar/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    const name = screen.getByLabelText("Nome completo");
    await user.type(name, "Ana2 Maria");
    expect(name).toHaveValue("Ana Maria");
    const cpf = screen.getByLabelText("CPF");
    expect(cpf).toHaveAttribute("inputmode", "numeric");
    await user.type(cpf, "529a982.247-25x");
    expect(cpf).toHaveValue("52998224725");
    await user.type(screen.getByLabelText("E-mail"), "pessoa@example.test");
    await user.type(screen.getByLabelText("Crie uma senha"), "SenhaDeTeste123!");
    await user.type(screen.getByLabelText("Confirme a senha"), "SenhaDeTeste123!");
    const phone = screen.getByLabelText("Telefone (opcional)");
    expect(phone).toHaveAttribute("inputmode", "numeric");
    await user.type(phone, "(11) 9abc9999-1234");
    expect(phone).toHaveValue("11999991234");
  });

  it.each(["12ABC34501DE34", "12AſC34501DE20", "12.AſC.345/01DE-20", "12Aß4501DE313", "12.Aß.450/1DE3-13"])("não avança nem envia cadastro com CNPJ inválido: %s", async (document) => {
    await fillAccess(document);
    expect(screen.getByLabelText("CNPJ da instituição")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Informe um CNPJ válido.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([path]) => path === "/api/projects/open")).toBe(true);
  });
});
