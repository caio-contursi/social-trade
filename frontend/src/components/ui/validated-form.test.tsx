import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { ValidatedForm } from "./validated-form";

function Example({ submit = vi.fn() }: { submit?: () => void }) {
  return <ValidatedForm onSubmit={submit}>
    <Label htmlFor="subject">Assunto *</Label><Input id="subject" name="subject" required minLength={4} />
    <Label htmlFor="message">Relato</Label><Textarea id="message" name="message" required minLength={10} />
    <Label htmlFor="optional">Telefone (opcional)</Label><Input id="optional" name="phone" />
    <button type="submit">Enviar</button><button type="reset">Limpar</button>
  </ValidatedForm>;
}

describe("avisos de validação no formulário", () => {
  it("aponta cada campo vazio, associa as mensagens e foca o primeiro sem enviar", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<Example submit={submit} />);
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Revise os campos destacados");
    expect(screen.getByLabelText("Assunto *")).toHaveAccessibleDescription("Preencha o campo “Assunto” para continuar.");
    expect(screen.getByLabelText("Relato")).toHaveAccessibleDescription("Preencha o campo “Relato” para continuar.");
    expect(screen.getByLabelText("Telefone (opcional)")).not.toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(screen.getByLabelText("Assunto *")).toHaveFocus());
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejeita espaços e textos curtos, remove erros ao corrigir e envia com campos opcionais vazios", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<Example submit={submit} />);
    await user.type(screen.getByLabelText("Assunto *"), "   ");
    await user.type(screen.getByLabelText("Relato"), "curto");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Relato")).toHaveAccessibleDescription(/ao menos 10 caracteres/);
    await user.clear(screen.getByLabelText("Assunto *"));
    await user.type(screen.getByLabelText("Assunto *"), "Dúvida de teste");
    await user.clear(screen.getByLabelText("Relato"));
    await user.type(screen.getByLabelText("Relato"), "Uma dúvida completa para o suporte.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Relato")).not.toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("valida no desfoque e limpa avisos quando o formulário é redefinido", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByLabelText("Assunto *"));
    await user.tab();
    expect(screen.getByLabelText("Assunto *")).toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.getByLabelText("Assunto *")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("preserva dicas existentes e ignora campos desabilitados e somente leitura", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<ValidatedForm onSubmit={submit}>
      <Label htmlFor="email">E-mail</Label><Input id="email" type="email" required aria-describedby="email-help" />
      <p id="email-help">Use seu e-mail de acesso.</p>
      <Input id="disabled" required disabled /><Input id="readonly" required readOnly />
      <button type="submit">Enviar</button>
    </ValidatedForm>);
    await user.type(screen.getByLabelText("E-mail"), "inválido");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription(/Use seu e-mail de acesso.*Informe um valor válido/);
    expect(submit).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("E-mail"));
    await user.type(screen.getByLabelText("E-mail"), "teste@example.test");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("não mistura erros entre formulários diferentes", () => {
    render(<><Example /><ValidatedForm><Label htmlFor="other">Outro campo</Label><Input id="other" required /></ValidatedForm></>);
    fireEvent.submit(screen.getByRole("button", { name: "Enviar" }).closest("form")!);
    expect(screen.getByLabelText("Outro campo")).not.toHaveAttribute("aria-invalid", "true");
  });
});
