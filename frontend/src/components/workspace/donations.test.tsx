import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";
import { jsonResponse } from "@/test/helpers";
import { DonationsPage } from "./donations";

let account: User;
const fetchMock = vi.fn<typeof fetch>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/painel/doacoes",
}));
vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({ user: account, token: "token-de-teste", expireSession: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("fluxo de doações Pix", () => {
  beforeEach(() => {
    account = {
      id: 1, full_name: "Pessoa doadora", username: "doadora", email: "doadora@example.test",
      document: "90000001084", account_type: "person", role: "member", role_label: "Membro",
      phone: null, responsible_title: "Pessoa doadora", registration_number: "123456",
    };
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input) => {
      const path = String(input);
      if (path === "/api/donations/mine") return jsonResponse([]);
      if (path === "/api/public/projects") return jsonResponse([{
        id: 12, name: "Projeto de teste", city: "Niterói", state: "RJ", pix_donations_available: true,
      }]);
      return jsonResponse({ detail: "Rota inesperada" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("permite que uma conta pessoal consulte projetos e inicie doação Pix", async () => {
    render(<DonationsPage />);

    expect(await screen.findByRole("heading", { name: "Doações por Pix." })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Iniciar uma doação Pix" })).toBeVisible();
    expect(await screen.findByRole("option", { name: "Projeto de teste · Niterói, RJ" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/donations/mine", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/public/projects", expect.any(Object));
  });
});
