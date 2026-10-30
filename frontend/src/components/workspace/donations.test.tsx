import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { User } from "@/lib/types";
import { jsonResponse } from "@/test/helpers";
import { DonationsPage } from "./donations";

let account: User;
let solanaStatus: "pending" | "confirmed" | "cancelled";
const fetchMock = vi.fn<typeof fetch>();
const navigation = vi.hoisted(() => ({ router: { replace: vi.fn(), push: vi.fn() }, expireSession: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => "/painel/doacoes",
}));
vi.mock("@/components/auth-provider", () => ({
    useAuth: () => ({ user: account, token: "token-de-teste", expireSession: navigation.expireSession }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("fluxo de doações à carteira SocialTrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    account = {
      id: 1, full_name: "Pessoa doadora", username: "doadora", email: "doadora@example.test",
      document: "90000001084", account_type: "person", role: "member", role_label: "Membro",
      phone: null, responsible_title: "Pessoa doadora", registration_number: "123456",
    };
    fetchMock.mockReset();
    solanaStatus = "pending";
    fetchMock.mockImplementation(async (input) => {
      const path = String(input);
      if (path === "/api/solana-payments/quote") return jsonResponse({ brl_per_sol: "500", updated_at: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 300, source: "CoinGecko" });
      if (path === "/api/solana-payments/intents") return jsonResponse({
        id: 77, target: "project", project_id: 12, cause_code: "education",
        amount_lamports: 50_000_000, reference: "11111111111111111111111111111111",
        recipient_address: "4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry",
        payment_uri: "solana:4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry?amount=0.05&reference=11111111111111111111111111111111&label=SocialTrade&message=Doacao%20SocialTrade",
        status: "pending", transaction_signature: null, expires_at: "2026-10-28T15:10:00+00:00",
      });
      if (path === "/api/solana-payments/intents/77/cancel") { solanaStatus = "cancelled"; return jsonResponse({ status: "cancelled" }); }
      if (path === "/api/solana-payments/intents/77/verify") return jsonResponse({
        id: 77, target: "project", project_id: 12, cause_code: "education",
        amount_lamports: 50_000_000, reference: "11111111111111111111111111111111",
        recipient_address: "4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry",
        payment_uri: "solana:4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry?amount=0.05&reference=11111111111111111111111111111111&label=SocialTrade&message=Doacao%20SocialTrade",
        status: solanaStatus, transaction_signature: solanaStatus === "confirmed" ? "5yM4signaturedeTeste" : null,
        expires_at: "2026-10-28T15:10:00+00:00",
      });
      if (path === "/api/donations/mine") return jsonResponse([]);
      if (path === "/api/public/projects") return jsonResponse([
        { id: 12, name: "Projeto de teste", city: "Niterói", state: "RJ", areas: ["education"], pix_donations_available: true },
        { id: 13, name: "Esporte para todos", city: "Rio de Janeiro", state: "RJ", areas: ["sports"], pix_donations_available: true },
        { id: 14, name: "Projeto sem Pix", city: "Niterói", state: "RJ", areas: ["sports"], pix_donations_available: false },
      ]);
      return jsonResponse({ detail: "Rota inesperada" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("mantém as opções de pagamento sem mostrar o QR antes da seleção", async () => {
    render(<DonationsPage />);

    expect(await screen.findByRole("heading", { name: "Contribua com uma causa." })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Doar diretamente para um projeto" })).toBeVisible();
    expect(await screen.findByRole("option", { name: "Projeto de teste · Niterói, RJ" })).toBeInTheDocument();
    expect(screen.queryByTestId("solana-pay-qr")).not.toBeInTheDocument();
    expect(screen.queryByText(/Pix temporariamente indisponível/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continuar para o Pix/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/donations/mine", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/public/projects", expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/donations", expect.anything());
  });

  it("filtra projetos disponíveis por nome sem acentos e por categoria, independentemente do Pix", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);

    const projectSelect = await screen.findByLabelText("Projeto social");
    expect(screen.getByRole("option", { name: "Esporte para todos · Rio de Janeiro, RJ" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Projeto sem Pix · Niterói, RJ" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Categoria"), "sports");
    expect(screen.getByRole("option", { name: "Esporte para todos · Rio de Janeiro, RJ" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Projeto de teste · Niterói, RJ" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Categoria"), "");
    await user.type(screen.getByLabelText("Pesquisar projetos"), "esporte");
    expect(screen.getByRole("option", { name: "Esporte para todos · Rio de Janeiro, RJ" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Projeto de teste · Niterói, RJ" })).not.toBeInTheDocument();
    expect(projectSelect).toBeInTheDocument();
  });

  it("remove o cartão Pix pendente e seus controles sem esconder doações confirmadas", async () => {
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input) === "/api/donations/mine" ? jsonResponse([
      { id: 2, project_name: "Projeto pendente antigo", status: "awaiting_payment", amount_cents: 2500, created_at: "2026-10-27T10:00:00Z", pix_key: "projeto-pix@example.test" },
      { id: 3, project_name: "Doação concluída", status: "confirmed", amount_cents: 5000, created_at: "2026-10-27T10:00:00Z", receipt_code: "REC-3" },
    ]) : fallback(input, init));
    render(<DonationsPage />);
    expect(await screen.findByText(/Doação concluída/)).toBeVisible();
    expect(screen.queryByText(/Projeto pendente antigo/)).not.toBeInTheDocument();
    expect(screen.queryByText("projeto-pix@example.test")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Informar pagamento" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Identificador E2E do comprovante Pix")).not.toBeInTheDocument();
    expect(screen.queryByText("Pagamento pendente")).not.toBeInTheDocument();
    expect(screen.queryByText(/Escolher um projeto sinaliza/)).not.toBeInTheDocument();
    expect(screen.queryByText("Selecione um projeto antes de gerar o QR.")).not.toBeInTheDocument();
  });

  it("mostra a mesma carteira para a doação indireta sem fingir alocação automática", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);

    const indirectOption = await screen.findByRole("button", { name: /Doe indiretamente/ });
    await user.click(indirectOption);

    expect(indirectOption).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("heading", { name: "Doação por categoria" })).toBeVisible();
    expect(screen.getByText(/não vincula automaticamente uma transferência/i)).toBeVisible();
    expect(screen.queryByTestId("solana-pay-qr")).not.toBeInTheDocument();
    expect(screen.getByText(/distribuição ainda precisa ser tratada manualmente/i)).toBeVisible();
    expect(screen.queryByLabelText("Pesquisar projetos")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/donations", expect.anything());

    await user.click(screen.getByRole("button", { name: /Ajude seu projeto favorito!/ }));
    expect(await screen.findByLabelText("Pesquisar projetos")).toBeVisible();
  });

  it("gera o QR Solana Pay e abre uma prévia Pix não pagável ao selecionar Pix", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);

    await user.selectOptions(await screen.findByLabelText("Projeto social"), "12");
    await user.click(await screen.findByRole("button", { name: /SOL · Solana Pay/ }));
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled());
    expect(screen.queryByTestId("solana-pay-qr")).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Valor da doação em SOL" }), "0,05");
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/solana-payments/intents", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ amount_lamports: 50_000_000, target: "project", project_id: 12, cause_code: null }),
    }));
    const qr = screen.getByTestId("solana-pay-qr");
    expect(qr).toHaveAttribute("data-payment-uri", expect.stringContaining("amount=0.05&reference="));
    expect(qr.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir em carteira compatível" })).not.toBeInTheDocument();
    expect(screen.getByText(/O QR Code não expira/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Copiar endereço da carteira Solana SocialTrade" })).toHaveTextContent("4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry");

    const previousClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await user.click(screen.getByRole("button", { name: "Copiar endereço da carteira Solana SocialTrade" }));
    expect(writeText).toHaveBeenCalledWith("4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry");
    screen.getByRole("button", { name: "Copiar endereço da carteira Solana SocialTrade" }).focus();
    await user.keyboard("{Enter}");
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Pague com SOL")).not.toBeInTheDocument();
    expect(screen.queryByText(/Escaneie com a Phantom/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cancela este pedido no site/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Copiar endereço$/ })).not.toBeInTheDocument();
    if (previousClipboard) Object.defineProperty(navigator, "clipboard", previousClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");

    solanaStatus = "confirmed";
    expect(await screen.findByTestId("sol-payment-confirmed", {}, { timeout: 5_000 })).toHaveTextContent("Pagamento confirmado na rede Solana");
    expect(screen.getByText("5yM4signaturedeTeste")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Fechar" })[0]);

    await user.click(screen.getByRole("button", { name: /Pix · BRL/ }));
    expect(screen.queryByTestId("solana-pay-qr")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Valor da doação em reais"), "25,00");
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(screen.getByTestId("pix-demo-warning")).toHaveTextContent("não é um código Pix válido");
    expect(screen.getByTestId("pix-demo-qr").querySelector("svg")).toBeInTheDocument();
    expect(screen.getByTestId("pix-demo-qr")).toHaveAttribute("data-payload", "SOCIALTRADE_PIX_DEMO|NAO_PAGAVEL|valor=25.00");
    expect(screen.queryByText(/Pagamento confirmado/)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/donations", expect.anything());
  });

  it("converte reais e SOL imediatamente e cobra exatamente o SOL exibido", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.selectOptions(await screen.findByLabelText("Projeto social"), "12");
    await user.click(screen.getByRole("button", { name: /SOL · Solana Pay/ }));
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled());
    const brl = screen.getByLabelText("Valor da doação em reais");
    const sol = screen.getByLabelText("Valor da doação em SOL");
    await user.type(brl, "25,00");
    expect(sol).toHaveValue("0,05");
    await user.clear(sol);
    await user.type(sol, "0,1");
    expect(brl).toHaveValue("50,00");
    await user.clear(brl);
    expect(sol).toHaveValue("");
    expect(screen.getByRole("button", { name: "Visualizar QR Code" })).toBeDisabled();
    await user.type(brl, "25");
    expect(screen.queryByText(/Utilização de outra rede pode causar perda permanente/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/solana-payments/intents", expect.objectContaining({ body: JSON.stringify({ amount_lamports: 50_000_000, target: "project", project_id: 12, cause_code: null }) }));
    expect(brl).toBeDisabled();
    expect(sol).toBeDisabled();
    expect(screen.getByText(/Utilização de outra rede pode causar perda permanente/)).toBeVisible();
  });

  it("bloqueia o QR sem cotação e permite tentar obter a cotação novamente", async () => {
    const user = userEvent.setup();
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input) === "/api/solana-payments/quote" ? jsonResponse({ detail: "Cotação indisponível" }, 503) : fallback(input, init));
    render(<DonationsPage />);
    await user.click(await screen.findByRole("button", { name: /SOL · Solana Pay/ }));
    await screen.findByRole("button", { name: "Atualizar cotação" });
    expect(screen.getByRole("button", { name: "Visualizar QR Code" })).toBeDisabled();
    fetchMock.mockImplementation(fallback);
    await user.click(screen.getByRole("button", { name: "Atualizar cotação" }));
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled());
    expect(screen.getByLabelText("Valor da doação em reais")).toBeEnabled();
  });

  it("mostra o equivalente em reais ao retomar um QR pendente antes de a cotação carregar", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem("socialtrade_solana_payment_intent_id", "77");
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input) === "/api/solana-payments/quote") await new Promise((resolve) => setTimeout(resolve, 40));
      return fallback(input, init);
    });
    render(<DonationsPage />);
    await user.click(await screen.findByRole("button", { name: /SOL · Solana Pay/ }));
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em reais")).toHaveValue("25,00"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Visualizar QR Code" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Projeto social"), "12");
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(screen.getByTestId("solana-pay-qr")).toBeVisible();
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/solana-payments/intents")).toHaveLength(0);
    expect(screen.getByLabelText("Valor da doação em reais")).toHaveValue("25,00");
  });

  it("cancela o pedido, fecha a janela, interrompe consultas e permite gerar outro QR ou selecionar Pix", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.selectOptions(await screen.findByLabelText("Projeto social"), "12");
    await user.click(screen.getByRole("button", { name: /SOL · Solana Pay/ }));
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled());
    await user.type(screen.getByLabelText("Valor da doação em SOL"), "0,05");
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    await user.click(screen.getByRole("button", { name: "Cancelar pagamento" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("socialtrade_solana_payment_intent_id")).toBeNull();
    expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled();
    const verifications = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/verify")).length;
    const previousCount = verifications();
    await new Promise((resolve) => setTimeout(resolve, 1700));
    expect(verifications()).toBe(previousCount);
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(screen.getByTestId("solana-pay-qr")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancelar pagamento" }));
    await user.click(screen.getByRole("button", { name: /Pix · BRL/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Valor da doação em reais"), "25,00");
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(screen.getByTestId("pix-demo-qr")).toBeVisible();
    expect(screen.queryByTestId("solana-pay-qr")).not.toBeInTheDocument();
  });

  it("mantém a janela fechada em falha de cancelamento até clicar no botão de QR novamente", async () => {
    const user = userEvent.setup();
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input).endsWith("/cancel") ? jsonResponse({ detail: "Falha ao cancelar" }, 503) : fallback(input, init));
    render(<DonationsPage />);
    await user.selectOptions(await screen.findByLabelText("Projeto social"), "12");
    await user.click(screen.getByRole("button", { name: /SOL · Solana Pay/ }));
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled());
    await user.type(screen.getByLabelText("Valor da doação em SOL"), "0,05");
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    await user.click(screen.getByRole("button", { name: "Cancelar pagamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao cancelar");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(window.sessionStorage.getItem("socialtrade_solana_payment_intent_id")).toBe("77");
  });

  it("informa falha na cópia do endereço sem fechar o pagamento", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.selectOptions(await screen.findByLabelText("Projeto social"), "12");
    await user.click(screen.getByRole("button", { name: /SOL · Solana Pay/ }));
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled());
    await user.type(screen.getByLabelText("Valor da doação em SOL"), "0,05");
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    const write = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("Sem permissão"));
    await user.click(screen.getByRole("button", { name: "Copiar endereço da carteira Solana SocialTrade" }));
    expect(toast.error).toHaveBeenCalledWith("Não foi possível copiar o endereço.");
    expect(screen.getByTestId("solana-pay-qr")).toBeVisible();
    write.mockRestore();
  });

  it.each(["SOL · Solana Pay", "Pix · BRL"])("exige projeto para gerar QR direto por %s e volta a bloquear ao limpar a seleção", async (method) => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.click(await screen.findByRole("button", { name: new RegExp(method) }));
    const input = method.startsWith("SOL") ? screen.getByLabelText("Valor da doação em SOL") : screen.getByLabelText("Valor da doação em reais");
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, method.startsWith("SOL") ? "0,05" : "25,00");
    const trigger = screen.getByRole("button", { name: "Visualizar QR Code" });
    expect(trigger).toBeDisabled();
    await user.hover(screen.getByTestId("payment-qr-trigger"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Escolha um projeto para ajudar!");
    await user.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Projeto social"), "12");
    expect(trigger).toBeEnabled();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Projeto social"), "");
    expect(trigger).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/solana-payments/intents")).toHaveLength(0);
  });

  it.each(["SOL · Solana Pay", "Pix · BRL"])("destaca o projeto obrigatório ao tentar gerar QR por %s sem selecioná-lo", async (method) => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.click(await screen.findByRole("button", { name: new RegExp(method) }));
    const input = method.startsWith("SOL") ? screen.getByLabelText("Valor da doação em SOL") : screen.getByLabelText("Valor da doação em reais");
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, method.startsWith("SOL") ? "0,05" : "25,00");
    await user.click(screen.getByTestId("payment-qr-trigger"));
    const select = screen.getByLabelText("Projeto social");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Selecione o campo “Projeto social” para continuar.");
    await waitFor(() => expect(select).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.selectOptions(select, "12");
    expect(select).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Selecione o campo “Projeto social” para continuar.")).not.toBeInTheDocument();
  });

  it.each([
    { method: /SOL · Solana Pay/, label: "Valor da doação em reais", field: "Valor da doação em reais", empty: /Preencha o campo “Valor da doação em reais” ou “Valor da doação em SOL”/, invalid: /Informe um valor válido para o campo “Valor da doação em reais” ou/ },
    { method: /Pix · BRL/, label: "Valor da doação em reais", field: "Valor da doação em reais", empty: /^Preencha o campo “Valor da doação em reais” para continuar\.$/, invalid: /^Informe um valor válido para o campo “Valor da doação em reais”\.$/ },
  ])("avisa valor ausente ou inválido em $label ao tentar gerar QR", async ({ method, label, field, empty, invalid }) => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.selectOptions(await screen.findByLabelText("Projeto social"), "12");
    await user.click(screen.getByRole("button", { name: method }));
    const input = screen.getByLabelText(label, { exact: true });
    await waitFor(() => expect(input).toBeEnabled());
    await user.click(screen.getByTestId("payment-qr-trigger"));
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(empty);
    await waitFor(() => expect(screen.getByLabelText(field, { exact: true })).toHaveFocus());
    await user.type(input, "abc");
    expect(input).not.toHaveAttribute("aria-invalid");
    screen.getByTestId("payment-qr-trigger").focus();
    await user.keyboard("{Enter}");
    expect(input).toHaveAccessibleDescription(invalid);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/solana-payments/intents")).toHaveLength(0);
  });

  it("não exibe aviso de carregamento enquanto busca a cotação SOL/BRL", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.click(await screen.findByRole("button", { name: /SOL · Solana Pay/ }));
    expect(screen.queryByText(/Buscando cotação/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Valor da doação em SOL")).toBeEnabled());
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/solana-payments/quote")).toBe(true);
  });

  it("destaca a forma de pagamento escolhida e reduz a outra", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    const pix = await screen.findByRole("button", { name: /Pix · BRL/ });
    const sol = screen.getByRole("button", { name: /SOL · Solana Pay/ });
    expect(pix).toHaveAttribute("data-state", "idle");
    expect(sol).toHaveAttribute("data-state", "idle");
    expect(screen.getByTestId("payment-details")).toHaveTextContent("Escolha uma forma de pagamento para informar o valor da doação.");
    await user.click(pix);
    expect(screen.getByTestId("payment-details")).not.toHaveTextContent("Escolha uma forma de pagamento");
    expect(screen.getByLabelText("Valor da doação em reais")).toBeInTheDocument();
    expect(pix).toHaveAttribute("data-state", "selected");
    expect(sol).toHaveAttribute("data-state", "dimmed");
    await user.click(sol);
    expect(sol).toHaveAttribute("data-state", "selected");
    expect(pix).toHaveAttribute("data-state", "dimmed");
  });

  it("aceita apenas letras na pesquisa de projetos", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    const search = await screen.findByLabelText("Pesquisar projetos");
    await user.type(search, "São Paulo 123!@# d'Arco-SP");
    expect(search).toHaveValue("São Paulo  d'Arco-SP");
  });

  it("permite gerar a prévia Pix por categoria sem exigir seleção de projeto", async () => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.click(await screen.findByRole("button", { name: /Doe indiretamente/ }));
    await user.click(screen.getByRole("button", { name: /Pix · BRL/ }));
    await user.type(screen.getByLabelText("Valor da doação em reais"), "25,00");
    expect(screen.getByRole("button", { name: "Visualizar QR Code" })).toBeEnabled();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Visualizar QR Code" }));
    expect(screen.getByTestId("pix-demo-qr")).toBeVisible();
  });

  it.each([
    { method: /SOL · Solana Pay/, label: "Valor da doação em reais", valid: "25,00", invalid: ["0", "-1", "abc", "0,01"] },
    { method: /SOL · Solana Pay/, label: "Valor da doação em SOL", valid: "0,05", invalid: ["0", "-1", "abc", "0,000000001", "101"] },
    { method: /Pix · BRL/, label: "Valor da doação em reais", valid: "25,00", invalid: ["0", "-1", "abc", "1,234"] },
  ])("só libera o QR com valor válido no campo $label", async ({ method, label, valid, invalid }) => {
    const user = userEvent.setup();
    render(<DonationsPage />);
    await user.selectOptions(await screen.findByLabelText("Projeto social"), "12");
    await user.click(screen.getByRole("button", { name: method }));
    const input = screen.getByLabelText(label);
    await waitFor(() => expect(input).toBeEnabled());
    const trigger = screen.getByRole("button", { name: "Visualizar QR Code" });
    expect(trigger).toBeDisabled();
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Digite um valor válido em reais/);
    for (const value of invalid) {
      await user.clear(input);
      await user.type(input, value);
      expect(trigger).toBeDisabled();
      await user.click(trigger);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
    await user.clear(input);
    await user.type(input, valid);
    expect(trigger).toBeEnabled();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.clear(input);
    expect(trigger).toBeDisabled();
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Digite um valor válido em reais/);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/solana-payments/intents")).toHaveLength(0);
  });
});
