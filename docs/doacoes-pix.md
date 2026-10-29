# Doações Pix diretas — backend do MVP

## Limite do fluxo

O SocialTrade registra a intenção de doação, exibe a chave Pix declarada pelo projeto e acompanha as confirmações. Empresas e pessoas físicas podem doar; no fluxo atualmente implementado, a transferência é feita no aplicativo bancário do próprio doador diretamente para a chave do projeto. A plataforma não cria cobrança Pix, não recebe, não custodia, não liquida e não repassa dinheiro; não há PSP conectado nem taxa da plataforma neste fluxo. Uma modalidade futura poderá direcionar o pagamento para uma tesouraria da SocialTrade, mas não deve ser tratada como disponível até que conta recebedora, custódia, conciliação, repasse e responsabilidades sejam definidos e implementados.

### Aviso sobre impostos e benefício fiscal

A SocialTrade não garante que a doação seja abatida do Imposto de Renda, reduza impostos ou gere qualquer outro benefício fiscal para empresa ou pessoa física. O tratamento depende das regras oficiais aplicáveis à situação de quem doa e à modalidade da doação. Antes de considerar qualquer efeito tributário, consulte as orientações nos canais oficiais do governo e um profissional de contabilidade que possa analisar o caso concreto. O registro de intenção, a confirmação manual e o recibo privado da SocialTrade não comprovam elegibilidade fiscal nem substituem comprovantes e documentos exigidos pelos órgãos competentes.

Uma pessoa moderadora confere, fora do sistema, os dados cadastrais do projeto e a titularidade da conta/chave (rota `PATCH /api/moderation/projects/{id}/pix-verification`). A API exige CNPJ do projeto e chave informados para registrar essa aprovação; a anotação não consulta o banco nem prova por si só a conferência. Alterar a chave remove a aprovação e bloqueia novas intenções até nova revisão. O identificador E2E é informado por quem doou e também não é consultado no sistema bancário. Por isso, o recibo só aparece depois do atesto autenticado do proprietário do projeto, que deve conferir o crédito na conta da própria organização. O recibo HTML identifica a empresa pelo CNPJ ou a pessoa física pelo CPF e é uma declaração privada registrada pelo SocialTrade, não uma validação bancária independente, nota fiscal, certificado de elegibilidade nem garantia de benefício fiscal. O doador deve guardar o comprovante emitido pelo banco.

## Pagamento em SOL pela carteira intermediária

A modalidade Solana Pay usa a carteira pública `4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry`, configurável por `SOCIALTRADE_SOLANA_WALLET_ADDRESS`. O doador escolhe um valor de 0,0001 a 100 SOL e o backend cria uma intenção com uma referência Base58 aleatória, vinculada à conta autenticada e ao projeto ou causa escolhidos. O QR contém destinatário, valor e referência. A referência precisa acompanhar a transação para a conciliação automática; transferir manualmente apenas para o endereço copiado pode receber SOL, mas não identifica a intenção.

Enquanto o QR está aberto, a interface consulta `POST /api/solana-payments/intents/{id}/verify` a cada dois segundos. O backend pesquisa transações que incluam a referência, consulta a transação na RPC e só marca `confirmed` quando a assinatura está confirmada, a transação não falhou, a referência consta na transação e existe uma transferência nativa de SOL ao destinatário configurado com o valor exato. O QR e o pedido não expiram automaticamente; o acompanhamento termina quando há confirmação ou cancelamento pelo usuário. A assinatura confirmada fica disponível para consulta no Solana Explorer. Se a RPC estiver indisponível, a interface mantém o estado pendente e tenta novamente; uma falha de consulta nunca confirma pagamento.

Rotas autenticadas:

| Método e rota | Acesso | Efeito |
| --- | --- | --- |
| `POST /api/solana-payments/intents` | Empresa doadora ou pessoa física | Cria uma intenção SOL e retorna QR/URI Solana Pay com referência única. |
| `POST /api/solana-payments/intents/{id}/verify` | Pessoa/empresa que criou a intenção | Consulta a RPC e retorna `pending`, `confirmed` ou `cancelled` (pedidos legados podem permanecer `expired`); confirmação e assinatura ficam persistidas. |

Configure `SOCIALTRADE_SOLANA_RPC_URL`. O exemplo usa a RPC pública oficial para desenvolvimento e validação de baixo volume. A Solana informa que endpoints públicos têm limites de uso e não oferecem SLA para pagamentos em produção; configure uma RPC contratada com disponibilidade e limites adequados antes de publicar. As migrações Alembic até `20261028_0005` precisam ser aplicadas antes de iniciar a API.

O projeto ou causa escolhido fica registrado como intenção de destinação. O SOL entra na carteira da SocialTrade e não há distribuição automática, conversão nem recibo fiscal nesta integração. O status confirmado comprova que uma transação correspondente foi observada na Solana, não que já houve repasse ao projeto.

### Valores em reais e SOL

O endpoint autenticado `GET /api/solana-payments/quote` consulta o preço SOL/BRL no [CoinGecko](https://docs.coingecko.com/reference/simple-price), com cache de 60 segundos por processo e rejeição de dados com mais de cinco minutos. Sem cotação válida, a interface bloqueia a geração do QR e oferece atualização. Não há preço fixo inventado nem compra de SOL em reais: o preço é uma estimativa de mercado, sem taxas da rede.

Os campos BRL e SOL são editáveis, e o equivalente é calculado localmente a cada digitação. Ao partir de reais, o SOL é arredondado para nove casas decimais (lamports); o QR usa exatamente esse valor e os campos ficam bloqueados durante a cobrança. Valores inteiros de SOL preservam seus zeros no URI (10 SOL gera `amount=10`, nunca `amount=1`). O aviso de rede é exibido somente dentro do modal, em três frases: somente SOL nativo na Solana Mainnet; envio por outra rede pode causar perda permanente.

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

## Modalidades planejadas

A interface está sendo organizada em dois destinos: (1) transferência direta para um projeto específico, atualmente disponível por Pix; e (2) contribuição para uma categoria, com futura divisão automática entre projetos elegíveis. O segundo destino não recebe nem registra pagamentos ainda: a conta recebedora da SocialTrade e o provedor Pix estão por definir. A divisão automática não deve ser simulada como pagamento concluído.

Na doação direta, o Pix atual continua sendo uma transferência iniciada no banco do doador para a chave revisada do projeto; não há QR dinâmico nem PSP. A modalidade SOL usa QR dinâmico, mas o pagamento permanece na carteira intermediária SocialTrade e não é repassado automaticamente ao projeto.

Na tela de doações, selecionar Pix exibe o campo de valor e o botão “Visualizar QR Code”. Somente clicar nesse botão abre a prévia modal centralizada com QR de demonstração. O conteúdo desse QR é deliberadamente inválido como cobrança Pix e a interface avisa para não pagar; nenhuma intenção bancária, requisição a PSP ou confirmação de pagamento é criada. O QR serve somente para antecipar o layout. Para habilitar o fluxo real, conectar uma conta de arrecadação controlada pela SocialTrade a um PSP, gerar uma cobrança Pix dinâmica pelo backend e confirmar a liquidação por webhook autenticado ou consulta conciliada do provedor; só então mostrar sucesso na tela.

Quando a divisão indireta for implementada, a intenção deverá guardar o total, a categoria, a moeda, a regra de rateio e as alocações individuais por projeto, sem misturar o registro de intenção com a confirmação de pagamento/liquidação. A prioridade poderá usar a avaliação interna confidencial documentada em `avaliacao-e-descoberta-de-projetos.md`; estrelas, critérios, evidências, justificativas e histórico nunca serão incluídos em payloads para doadores, projetos ou páginas públicas.

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

## Cancelamento de pedido SOL

`POST /api/solana-payments/intents/{id}/cancel` permite apenas ao titular autenticado cancelar um pedido não confirmado. O cancelamento é persistido, idempotente e não permite que uma consulta RPC concorrente transforme esse pedido em confirmado. Pedidos confirmados retornam 409. A janela fecha imediatamente ao iniciar o cancelamento e as consultas param; após o servidor confirmar o cancelamento, os campos são liberados para um novo QR com outra referência ou para selecionar Pix. Em erro, a janela permanece fechada e a falha aparece no formulário; o usuário pode clicar novamente no botão do QR para retomar o acompanhamento.

Isso cancela o pedido e seu acompanhamento no site. Não estorna transações, não invalida um QR já fotografado e não impede que alguém envie SOL à carteira usando uma cópia antiga. Os valores BRL/SOL permanecem no formulário; os detalhes extras e a abertura em carteira foram retirados da janela conforme o layout solicitado.

As janelas Pix e SOL abrem somente pelo botão “Visualizar QR Code”. A retomada de um pedido SOL salvo preenche os campos sem abrir a janela; o botão permite consultá-lo novamente. O histórico do doador não mostra mais cartões Pix legados em `awaiting_payment`, nem chave Pix ou formulário manual de E2E; doações confirmadas continuam visíveis. Essa alteração é de apresentação e não apaga registros.

Na janela SOL pendente, o título e a introdução são ocultados visualmente, preservando o nome acessível do diálogo. O endereço é um botão: clicar ou pressionar Enter/Espaço copia para a área de transferência com feedback de sucesso/falha; ao passar o cursor, um ícone e “copiar” aparecem sobre o endereço. O botão separado de cópia e a nota sob o cancelamento foram removidos. Os avisos usam a redação solicitada na revisão de interface.

Na doação direta, a geração ou reabertura do QR exige selecionar um projeto, inclusive para pedidos salvos. Enquanto a seleção estiver vazia, o botão fica desabilitado com opacidade reduzida e uma dica no cursor/foco informa “Escolha um projeto para ajudar!”. Limpar a seleção bloqueia novamente. A regra também vale para a prévia Pix direta; a modalidade por categoria continua sem exigir projeto individual.

A geração de QR também exige um valor válido. Sem valor ou com valor inválido, o botão permanece desabilitado com opacidade reduzida; a dica no cursor/foco informa “Digite um valor válido em reais ou SOL!” (na prévia Pix, somente reais). Se também faltar o projeto na doação direta, a dica de seleção do projeto tem prioridade. Limpar o valor bloqueia novamente a geração.
