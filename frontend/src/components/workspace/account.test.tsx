import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountProfile } from "./account";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  refreshUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/painel/conta",
}));
vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: "Ana Silva",
      username: "ana_silva",
      email: "ana@example.test",
      document: "52998224725",
      account_type: "person",
      role: "member",
      role_label: "Membro",
      phone: "21999990000",
      responsible_title: "Voluntária",
      registration_number: "123456",
    },
    refreshUser: mocks.refreshUser,
    token: "token-de-teste",
    expireSession: vi.fn(),
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("./shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./shared")>();
  return { ...actual, useSessionRequest: () => mocks.request };
});

describe("edição dos dados pessoais", () => {
  beforeEach(() => {
    mocks.request.mockReset().mockResolvedValue({});
    mocks.refreshUser.mockReset().mockResolvedValue(undefined);
  });

  it("remove números do nome e letras do telefone antes de salvar", async () => {
    const user = userEvent.setup();
    render(<AccountProfile />);

    const name = screen.getByLabelText("Nome completo");
    await user.clear(name);
    await user.type(name, "Ana2 Maria");
    expect(name).toHaveValue("Ana Maria");

    const phone = screen.getByLabelText(/Telefone/);
    expect(phone).toHaveAttribute("inputmode", "numeric");
    await user.clear(phone);
    await user.type(phone, "21abc 9999-0000");
    expect(phone).toHaveValue("2199990000");

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    expect(mocks.request.mock.calls[0][0]).toBe("/api/profile");
    expect(JSON.parse(mocks.request.mock.calls[0][1].body)).toMatchObject({
      full_name: "Ana Maria",
      phone: "2199990000",
    });
  });
});
