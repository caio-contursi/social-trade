# Validação da reconstrução do front-end

> Registro histórico da validação da interface anterior à migração PostgreSQL. Para a configuração e os critérios atuais, consulte [testes.md](testes.md).

Revisão local realizada em 17 de outubro de 2026.

## Verificações automatizadas

- `npm run typecheck`: aprovado, com TypeScript em modo estrito.
- `npm run build`: aprovado; páginas estáticas e rotas públicas dinâmicas geradas pelo Next.js.
- `python -m unittest discover -s tests -v`: 11 testes de integração aprovados.
- `git diff --check`: sem erros de espaços ou marcadores de conflito.

Os testes da API usam SQLite temporário, desativam carregamento de `.env` e não utilizam o banco real. Cobrem privacidade dos campos públicos, autenticação, permissões de edição, consistência do slug e do tipo institucional, validação e transação de atualizações, cadastro de empresa e metadados de apresentação.

## Fluxos verificados no navegador

- Página inicial e descoberta pública consumindo a API, sem autenticação.
- Busca sem resultados, limpeza dos filtros e recuperação dos resultados.
- Perfil público com objetivos, resultados declarados, identificação de demonstração e ausência de canais de contato.
- Login de empresa e painel com dados retornados pela API.
- Edição e recarregamento dos dados da empresa proprietária.
- Envio de uma solicitação de suporte e exibição do histórico/status.
- Cadastro de projeto pelas três etapas até a confirmação de criação pela API.
- Visualização a 390 pixels, sem transbordamento horizontal na página inicial.
- Menu móvel, fechamento por teclado e alternância para tema escuro.
- Versão de produção com a API temporariamente indisponível e recuperação pelo botão “Tentar novamente”.

As operações de cadastro, suporte e edição foram executadas exclusivamente em banco temporário de revisão. Uma prévia limpa com dados de demonstração foi usada para as capturas finais. Nenhum banco de uso do projeto foi modificado.

## Limites

A revisão visual é uma amostragem dos fluxos, não uma auditoria completa de acessibilidade ou segurança. A área de moderação foi implementada e tipada, mas suas mutações não foram exercitadas nesta revisão pelo navegador. Autorização e dados continuam sob responsabilidade da API.

O fluxo de registro de doações por Pix direto entre empresas ou pessoas físicas e projetos foi implementado. A interface acompanha o pagamento informado e só apresenta recibo depois da confirmação manual do projeto. O SocialTrade não movimenta o valor nem verifica transações bancárias. PSP, pagamentos por cartão, transações Solana, verificação independente e prestação de contas financeira ampliada continuam fora desta etapa.

## Suíte automatizada atual

O registro acima descreve a validação inicial da interface. Os comandos atuais usam pytest, Vitest e Playwright, conforme [testes.md](testes.md). O runner unittest foi substituído por pytest.
