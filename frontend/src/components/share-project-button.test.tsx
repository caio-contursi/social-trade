import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareProjectButton } from "./share-project-button";

describe("compartilhamento de projeto", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copia o link canônico direto para a página do projeto", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    window.history.replaceState({}, "", "/projetos/projeto-exemplo#conteudo");

    render(<ShareProjectButton />);
    await user.click(screen.getByRole("button", { name: "Compartilhar projeto" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/projetos/projeto-exemplo`);
    expect(await screen.findByRole("status")).toHaveTextContent("Link direto do projeto copiado.");
    expect(screen.getByLabelText("Link direto do projeto")).toHaveValue(`${window.location.origin}/projetos/projeto-exemplo`);
  });

  it("mostra o link para cópia manual se o navegador bloquear a área de transferência", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("bloqueado")) } });
    window.history.replaceState({}, "", "/projetos/projeto-exemplo");

    render(<ShareProjectButton />);
    await user.click(screen.getByRole("button", { name: "Compartilhar projeto" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Copie o link direto do projeto para compartilhar.");
    expect(screen.getByLabelText("Link direto do projeto")).toHaveValue(`${window.location.origin}/projetos/projeto-exemplo`);
  });
});
