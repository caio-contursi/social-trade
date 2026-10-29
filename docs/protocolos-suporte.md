# Protocolos de suporte

Cada ticket tem um protocolo de seis dígitos (`000000` a `999999`), armazenado como texto em `support_tickets.protocol`. Zeros iniciais são preservados. O ID interno continua identificando as operações de moderação; o protocolo é o identificador exibido para acompanhamento.

`POST /api/support` sorteia com `secrets.randbelow`, insere o ticket e retorna `id`, `protocol` e `message`. A restrição única do PostgreSQL protege contra repetição inclusive em requisições simultâneas. Uma colisão gera nova tentativa em savepoint, sem perder a transação; após dez colisões, retorna 503 sem criar ticket incompleto. O espaço contém um milhão de protocolos; códigos existentes não são reciclados automaticamente.

`GET /api/support/mine` continua restrito à conta autenticada e inclui `protocol` em cada registro, independentemente de estar recebido, em atendimento ou resolvido. O protocolo não muda ao alterar o status. A visão de moderação também o inclui, com suas permissões atuais. Não existe busca pública por protocolo nem autorização baseada apenas nesse número.

A migração Alembic `20261028_0006` atribui códigos únicos sorteados sem reposição aos tickets existentes e adiciona as restrições de formato, obrigatoriedade e unicidade. A importação de SQLite atribui protocolos novos sem alterar a origem, os IDs, os relatos ou os status. Aplicar `python -m alembic upgrade head` antes de reiniciar a API.

Os testes cobrem colisões, esgotamento de tentativas, concorrência, zeros iniciais, privacidade, estabilidade após resolução, restrições PostgreSQL e preenchimento dos tickets antigos. A interface e a jornada E2E verificam o mesmo protocolo na confirmação, após recarregar e após finalizar o ticket. Todos usam dados e schemas de teste isolados.
