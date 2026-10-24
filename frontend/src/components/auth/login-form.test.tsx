import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deferred, jsonResponse, makeSession } from "@/test/helpers";
import { LoginForm } from "./login-form";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
const auth = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.params,
}));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("formulário de entrada", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const loginRequest = vi.fn<() => Promise<Response>>();
  let demoEnabled = false;

  beforeEach(() => {
    navigation.params = new URLSearchParams();
    fetchMock.mockReset();
    loginRequest.mockReset();
    demoEnabled = false;
    fetchMock.mockImplementation((path) => {
      if (path === "/api/catalog") return Promise.resolve(jsonResponse({ demo_users_enabled: demoEnabled }));
      return loginRequest();
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("expõe os erros e foca o primeiro campo inválido sem enviar login", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    const document = screen.getByLabelText("CPF ou CNPJ");
    expect(document).toHaveAttribute("aria-invalid", "true");
    expect(document).toHaveAccessibleDescription("Informe seu CPF (11 dígitos) ou CNPJ (14 caracteres).");
    expect(screen.getByLabelText("Senha")).toHaveAccessibleDescription("Informe sua senha.");
    await waitFor(() => expect(document).toHaveFocus());
    expect(loginRequest).not.toHaveBeenCalled();
  });

  it.each([
    ["Empresa", "CNPJ da empresa", "52998224725", "Informe o CNPJ com 14 caracteres (letras ou números e 2 dígitos finais)."],
    ["Pessoa", "Seu CPF", "04252011000110", "Informe o CPF com 11 dígitos."],
  ])("valida o documento da opção %s", async (option, label, document, message) => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("radio", { name: option }));
    await user.type(screen.getByLabelText(label), document);
    await user.type(screen.getByLabelText("Senha"), "SenhaDeTeste123!");
    await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
    expect(loginRequest).not.toHaveBeenCalled();
  });

  it("normaliza o CNPJ e navega para o destino interno depois de autenticar", async () => {
    navigation.params = new URLSearchParams("tipo=donor&proximo=/painel/organizacoes");
    const session = makeSession("novo", { account_type: "donor" });
    loginRequest.mockResolvedValueOnce(jsonResponse(session));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("CNPJ da empresa"), "04.252.011/0001-10");
    await user.type(screen.getByLabelText("Senha"), "SenhaDeTeste123!");
    await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith(session));
    const request = fetchMock.mock.calls.find(([path]) => path === "/api/auth/login");
    expect(request?.[1]?.method).toBe("POST");
    expect(JSON.parse(request?.[1]?.body as string)).toEqual({
      document: "04252011000110", password: "SenhaDeTeste123!", account_type: "donor",
    });
    expect(navigation.replace).toHaveBeenCalledWith("/painel/organizacoes");
  });

  it.each(["donor", "project"])("envia CNPJ alfanumérico sem perder letras no acesso %s", async (kind) => {
    navigation.params = new URLSearchParams(`tipo=${kind}`);
    loginRequest.mockResolvedValueOnce(jsonResponse(makeSession("novo")));
    const user = userEvent.setup();
    render(<LoginForm />);
    const field = screen.getByLabelText(kind === "donor" ? "CNPJ da empresa" : "CPF ou CNPJ");
    expect(field).toHaveAttribute("inputmode", "text");
    await user.type(field, "12.abc.345/01de-35");
    await user.type(screen.getByLabelText("Senha"), "SenhaDeTeste123!");
    await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));
    await waitFor(() => expect(auth.login).toHaveBeenCalled());
    const request = fetchMock.mock.calls.find(([path]) => path === "/api/auth/login");
    expect(JSON.parse(request?.[1]?.body as string).document).toBe("12ABC34501DE35");
  });

  it("preserva o login do CPF fictício da demonstração", async () => {
    navigation.params = new URLSearchParams("tipo=person");
    loginRequest.mockResolvedValueOnce(jsonResponse(makeSession("demo")));
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.getByLabelText("Seu CPF")).toHaveAttribute("inputmode", "numeric");
    await user.type(screen.getByLabelText("Seu CPF"), "11111111111");
    await user.type(screen.getByLabelText("Senha"), "SocialTrade123!");
    await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));
    await waitFor(() => expect(auth.login).toHaveBeenCalled());
  });

  it.each(["12ABC34501DE3A", "12ABC34501DÉ35", "1234567890A", "12ABC34501DE35!", "12 ABC34501DE35", "12/ABC/345/01DE/35", "12AſC34501DE20", "12.AſC.345/01DE-20", "12Aß4501DE313", "12.Aß.450/1DE3-13"])(
    "não transforma documento malformado em outro documento válido: %s", async (document) => {
      const user = userEvent.setup();
      render(<LoginForm />);
      await user.type(screen.getByLabelText("CPF ou CNPJ"), document);
      await user.type(screen.getByLabelText("Senha"), "SenhaDeTeste123!");
      await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));
      expect(loginRequest).not.toHaveBeenCalled();
      expect(screen.getByLabelText("CPF ou CNPJ")).toHaveAttribute("aria-invalid", "true");
    },
  );

  it("mantém o formulário bloqueado durante envio e bloqueia redirecionamento externo", async () => {
    navigation.params = new URLSearchParams("tipo=person&proximo=https://example.test/painel");
    const pending = deferred<Response>();
    loginRequest.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Seu CPF"), "52998224725");
    await user.type(screen.getByLabelText("Senha"), "SenhaDeTeste123!");
    await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    expect(screen.getByRole("button", { name: "Entrando..." })).toBeDisabled();
    expect(screen.getByLabelText("Seu CPF")).toBeDisabled();
    await act(async () => { pending.resolve(jsonResponse(makeSession("novo"))); });
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/painel"));
    expect(loginRequest).toHaveBeenCalledTimes(1);
  });

  it("mostra a rejeição do servidor e permite corrigir os dados", async () => {
    loginRequest.mockResolvedValueOnce(jsonResponse({ detail: "Documento ou senha inválidos." }, 401));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("CPF ou CNPJ"), "52998224725");
    await user.type(screen.getByLabelText("Senha"), "SenhaDeTeste123!");
    await user.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Documento ou senha inválidos.");
    expect(screen.getByRole("button", { name: "Entrar na minha conta" })).toBeEnabled();
    expect(auth.login).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("só apresenta credenciais de demonstração quando o catálogo habilita o ambiente", async () => {
    const { unmount } = render(<LoginForm />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Ambiente de demonstração")).not.toBeInTheDocument();
    unmount();

    demoEnabled = true;
    render(<LoginForm />);
    expect(await screen.findByText("Ambiente de demonstração")).toBeInTheDocument();
  });

  it("permite exibir e ocultar a senha sem enviar o formulário", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText("Senha");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(password).toHaveAttribute("type", "password");
    expect(loginRequest).not.toHaveBeenCalled();
  });
});
