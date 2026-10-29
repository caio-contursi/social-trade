import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModerationPage } from "./moderation";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ user: { role: "moderator" } }) }));
vi.mock("./shared", async (original) => ({
  ...await original<typeof import("./shared")>(), useSessionRequest: () => mocks.request,
  useWorkspaceResource: (path: string) => ({ data: path === "/api/moderation/overview" ? { counts: { users: 0, organizations: 0, open_tickets: 0 }, tickets: [] } : [], loading: false, error: null, reload: vi.fn() }),
}));

describe("campos obrigatórios na moderação", () => {
  it("mostra avisos para título, categoria e mensagem sem publicar", async () => {
    const user = userEvent.setup();
    render(<ModerationPage />);
    await user.clear(screen.getByLabelText("Categoria"));
    await user.click(screen.getByRole("button", { name: "Publicar aviso" }));
    for (const label of ["Título", "Categoria", "Mensagem"]) {
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(`Preencha o campo “${label}” para continuar.`);
    }
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
