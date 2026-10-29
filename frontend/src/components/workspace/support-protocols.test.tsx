import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ticket } from "@/lib/types";
import { SupportPage } from "./account";

const mocks = vi.hoisted(() => ({ request: vi.fn(), reload: vi.fn() }));
let tickets: Ticket[] = [];
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("./shared", async (original) => ({
  ...await original<typeof import("./shared")>(),
  useSessionRequest: () => mocks.request,
  useWorkspaceResource: () => ({ data: tickets, loading: false, error: null, reload: mocks.reload }),
}));

describe("protocolos persistidos no suporte", () => {
  beforeEach(() => { tickets = []; mocks.request.mockReset(); mocks.reload.mockReset(); });

  it("exibe protocolos de seis dígitos em tickets abertos e finalizados sem substituir por ID", () => {
    tickets = [
      { id: 1, protocol: "000007", subject: "Ticket aberto", message: "Relato de teste aberto.", status: "open", created_at: "2026-10-28T10:00:00Z" },
      { id: 2, protocol: "123456", subject: "Ticket finalizado", message: "Relato de teste finalizado.", status: "resolved", created_at: "2026-10-27T10:00:00Z" },
    ];
    render(<SupportPage />);
    const open = screen.getByRole("heading", { name: "Ticket aberto" }).closest("article")!;
    expect(within(open).getByText(/Protocolo #000007/)).toBeVisible();
    expect(within(open).getByText("Recebida")).toBeVisible();
    const resolved = screen.getByRole("heading", { name: "Ticket finalizado" }).closest("article")!;
    expect(within(resolved).getByText(/Protocolo #123456/)).toBeVisible();
    expect(within(resolved).getByText("Resolvida")).toBeVisible();
  });

  it("mostra o protocolo retornado pelo servidor na confirmação e no histórico", async () => {
    mocks.request.mockImplementation(async () => {
      tickets = [{ id: 99, protocol: "000042", subject: "Ajuda no cadastro", message: "Preciso de ajuda com o cadastro.", status: "open", created_at: "2026-10-28T10:00:00Z" }];
      return { id: 99, protocol: "000042", message: "Enviado" };
    });
    const user = userEvent.setup();
    render(<SupportPage />);
    await user.type(screen.getByLabelText("Assunto"), "Ajuda no cadastro");
    await user.type(screen.getByLabelText("Relato"), "Preciso de ajuda com o cadastro.");
    await user.click(screen.getByRole("button", { name: "Abrir ticket" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Protocolo 000042.");
    expect(screen.getByText(/Protocolo #000042/)).toBeVisible();
    expect(mocks.reload).toHaveBeenCalled();
    expect(JSON.parse(mocks.request.mock.calls[0][1].body)).toEqual({ subject: "Ajuda no cadastro", message: "Preciso de ajuda com o cadastro." });
  });

  it("identifica assunto e relato vazios antes de tentar abrir ticket", async () => {
    const user = userEvent.setup();
    render(<SupportPage />);
    await user.click(screen.getByRole("button", { name: "Abrir ticket" }));
    expect(screen.getByLabelText("Assunto")).toHaveAccessibleDescription("Preencha o campo “Assunto” para continuar.");
    expect(screen.getByLabelText("Relato")).toHaveAccessibleDescription("Preencha o campo “Relato” para continuar.");
    expect(mocks.request).not.toHaveBeenCalled();
    expect(screen.queryByText(/Ticket aberto com sucesso/)).not.toBeInTheDocument();
  });
});
