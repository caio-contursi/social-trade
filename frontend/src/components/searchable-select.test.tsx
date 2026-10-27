import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchableSelect } from "./searchable-select";

const options = [
  { value: "food", label: "Alimentação" },
  { value: "education", label: "Educação" },
  { value: "health", label: "Saúde" },
];

describe("SearchableSelect", () => {
  it("permite navegar para cima e para baixo e escolher a opção ativa com Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SearchableSelect
        id="cause"
        label="Causa"
        value=""
        options={options}
        placeholder="Todas as causas"
        searchPlaceholder="Busque uma causa"
        onValueChange={onValueChange}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Causa" });
    await user.click(combobox);
    await user.type(combobox, "a");
    const listbox = screen.getByRole("listbox", { name: "Opções de causa" });
    const optionIds = Array.from(listbox.querySelectorAll<HTMLElement>("[role=option]"))
      .map((option) => option.id);
    expect(optionIds).toHaveLength(4);

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(combobox).toHaveAttribute("aria-activedescendant", optionIds[2]);
    await user.keyboard("{ArrowUp}");
    expect(combobox).toHaveAttribute("aria-activedescendant", optionIds[1]);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("education");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("mantém a navegação dentro dos limites e pode fechar com Escape", async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        id="state"
        label="Estado"
        value=""
        options={options}
        placeholder="Todos os estados"
        searchPlaceholder="Busque um estado"
        onValueChange={vi.fn()}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Estado" });
    await user.click(combobox);
    await user.keyboard("{ArrowUp}");
    expect(combobox).toHaveAttribute("aria-activedescendant", expect.stringContaining("option-0"));
    await user.keyboard("{Escape}");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
