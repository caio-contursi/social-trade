# Doações Pix diretas — backend do MVP

## Limite do fluxo

O SocialTrade registra a intenção de doação, exibe a chave Pix declarada pelo projeto e acompanha as confirmações. Empresas e pessoas físicas podem doar; a transferência é feita no aplicativo bancário do próprio doador diretamente para a chave do projeto. A plataforma não cria cobrança Pix, não recebe, não custodia, não liquida e não repassa dinheiro; não há PSP conectado nem taxa da plataforma neste fluxo.

Uma pessoa moderadora confere, fora do sistema, os dados cadastrais do projeto e a titularidade da conta/chave (rota `PATCH /api/moderation/projects/{id}/pix-verification`). A API exige CNPJ do projeto e chave informados para registrar essa aprovação; a anotação não consulta o banco nem prova por si só a conferência. Alterar a chave remove a aprovação e bloqueia novas intenções até nova revisão. O identificador E2E é informado por quem doou e também não é consultado no sistema bancário. Por isso, o recibo só aparece depois do atesto autenticado do proprietário do projeto, que deve conferir o crédito na conta da própria organização. O recibo HTML identifica a empresa pelo CNPJ ou a pessoa física pelo CPF e é uma declaração privada registrada pelo SocialTrade, não uma validação bancária independente, nota fiscal, certificado de elegibilidade nem garantia de benefício fiscal. O doador deve guardar o comprovante emitido pelo banco.

## Estados

```text
awaiting_payment → awaiting_confirmation → confirmed
                                      ↘ rejected (estado reservado)
```

`awaiting_payment` significa que a empresa ou pessoa física iniciou o registro, sem prova de que pagou. `awaiting_confirmation` significa que o doador informou um E2E; ainda não prova o recebimento. `confirmed` só é definido pelo proprietário autenticado do projeto beneficiário, e nessa transição é gerado um código de recibo. A API não emite recibo antes dela. O estado `rejected` está reservado para uma etapa posterior de tratamento de divergências e não é definido por nenhuma rota nesta versão.

## Rotas autenticadas

| Método e rota | Acesso | Efeito |
| --- | --- | --- |
| `POST /api/donations` | Empresa doadora ou pessoa física | Registra valor em centavos e projeto; retorna a chave Pix declarada e instrução de pagamento direto. Empresa precisa ter perfil institucional; pessoa física usa sua conta pessoal. |
| `GET /api/donations/mine` | Empresa, pessoa física ou projeto | Lista somente doações próprias ou recebidas pelos projetos que a conta possui. |
| `POST /api/donations/{id}/report-payment` | Empresa ou pessoa que iniciou a doação | Registra o E2E informado e move para `awaiting_confirmation`. |
| `POST /api/donations/{id}/confirm` | Proprietário do projeto beneficiário | Atesta que conferiu o crédito e emite o código de recibo. |
| `GET /api/donations/{id}/receipt` | Doador autenticado ou projeto beneficiário | Entrega o recibo HTML imprimível, apenas para doação confirmada; identifica o doador pelo CNPJ ou CPF. |

Exemplo de criação:

```json
{
  "project_id": 123,
  "amount_cents": 25000
}
```

O valor é inteiro em centavos (ex.: `25000` = R$ 250,00); moeda e meio são fixados pelo backend em BRL e Pix. E2E é único no sistema. CPF, CNPJ, chave Pix e dados de conta não são exibidos no catálogo público.

## Antes de pagamentos em produção

1. Verificar por processo confiável que a conta/chave de recebimento pertence à organização cadastrada e manter a revisão atualizada.
2. Substituir a confirmação manual por conciliação bancária ou webhook de um PSP, contratado para liquidar diretamente à beneficiária. Não usar conta intermediária do SocialTrade.
3. Decidir com as organizações o conteúdo, guarda, correção e contestação do recibo e dos registros, além de retenção e acesso a dados pessoais.
4. Revisar contratos, privacidade, segurança, estornos e mensagens do fluxo antes de habilitar pagamentos reais. O sistema não faz análise fiscal nem promete dedutibilidade.

## Como fazer um teste local controlado

1. Inicie o banco e a API de desenvolvimento e execute `python -m app.seed --environment development`. O seed é aditivo e não altera contas já existentes. Se algum identificador de demonstração já estiver ocupado, confira o cadastro existente em vez de apagar ou substituir dados.
2. Defina `SOCIALTRADE_DEMO_USERS=true` somente no ambiente local. Na tela de login, a área “Ambiente de demonstração” informa a senha `SocialTrade123!` e os documentos do projeto Pix, empresa doadora e moderador.
3. Entre como projeto (CNPJ `90000001000129`), abra o perfil da organização e informe uma chave Pix de uma conta bancária que você controla. Não use chave de terceiros sem consentimento.
4. Uma conta moderadora independente (CPF `33333333333`) deve revisar o cadastro e a titularidade fora do sistema e habilitar a chave na área de moderação. O projeto não pode aprovar a própria chave.
5. Entre como empresa doadora de demonstração (CNPJ `12345678000195`) ou cadastre uma conta pessoal de teste, abra **Doações por Pix**, escolha o projeto e registre um valor baixo. Copie a chave e faça a transferência pelo aplicativo do seu banco somente se deseja testar um Pix real. A SocialTrade não abre o aplicativo bancário nem executa o pagamento.
6. Informe o E2E que aparece no comprovante do banco. Entre na conta do projeto, confira o crédito no extrato bancário e só então clique em **Confirmar que recebi**. A empresa pode baixar o recibo HTML do SocialTrade e guardar também o comprovante bancário.

O fluxo demonstra uma transferência Pix real entre as contas informadas; não é um sandbox bancário. A criação de intenção e o E2E podem ser testados sem transferir dinheiro, mas nesse caso não confirme recebimento nem trate o estado como pagamento real. Para testar somente interface e estados, use os cenários automatizados: eles usam um E2E fictício e não movimentam dinheiro.

## Testes

`tests/test_donations_api.py` cobre o fluxo de empresas e pessoas físicas, autorização por tipo e propriedade, valor inválido, projeto inexistente/sem Pix, transições de estado, E2E duplicado, privacidade do recibo e emissão somente após confirmação do beneficiário. Os testes automatizados usam dados sintéticos e não movimentam dinheiro. As integrações bancárias e pagamentos reais não são simulados como se estivessem conectados.
