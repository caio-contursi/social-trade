# Migração de SQLite para PostgreSQL

A persistência usa SQLAlchemy 2 Core e PostgreSQL 17. O Alembic é a fonte das alterações de schema; importar a aplicação ou iniciar a API não executa DDL nem seed. A revisão inicial é `20261021_0001`.

## Estrutura

| Tabela | Chave primária | Atributos e relações principais |
| --- | --- | --- |
| `users` | `id BIGINT IDENTITY BY DEFAULT` | Documento `VARCHAR(14)` único; matrícula `VARCHAR(6)` única; e-mail e username com índices únicos em `lower()`. Pessoa usa CPF e matrícula obrigatória; contas institucionais usam CNPJ. |
| `organizations` | `id BIGINT IDENTITY BY DEFAULT` | Proprietário obrigatório com FK `RESTRICT`; slug único; tipo com FK para catálogo; natureza `project` ou `donor`; CNPJ opcional, sem unicidade global. |
| `organization_types` | `code TEXT` | Código estável e nome; sete tipos iniciais. |
| `areas` | `code TEXT` | Código estável e nome; doze áreas iniciais. |
| `services` | `code TEXT` | Código estável, nome e disponibilidade validada; nove serviços iniciais. |
| `organization_areas` | `(organization_id, area_code)` | Relação N:N; organização em `CASCADE`, catálogo em `RESTRICT`. |
| `organization_services` | `(organization_id, service_code)` | A existência da linha representa interesse; sem coluna redundante `interested`. |
| `project_memberships` | `(user_id, organization_id)` | FK composta e CHECK exigem organização `project`; função `staff` ou `assisted`. Dependentes em `CASCADE`. |
| `announcements` | `id BIGINT IDENTITY BY DEFAULT` | Título, corpo, categoria e publicação. |
| `support_tickets` | `id BIGINT IDENTITY BY DEFAULT` | Autor com FK `RESTRICT`; assunto, mensagem e status validado. |

Datas são `TIMESTAMPTZ`, expostas na API como ISO 8601 UTC. As listagens ordenam por data e ID para desempate estável. Campos descritivos são `TEXT`, UF é `VARCHAR(2)` e ano de fundação é `SMALLINT`, com CHECK de domínio. Os limites dos formulários continuam validados pela API. Os catálogos são lidos do banco; não há cópia paralela no backend.

A validação de cadastro aceita CPF e CNPJ numérico ou alfanumérico com os dígitos verificadores correspondentes. Valores ficam sem máscara e em maiúsculas; apenas caracteres ASCII no formato puro ou na máscara padrão são aceitos, após remover espaços externos. O login valida o formato para manter acesso aos documentos fictícios legados. O CNPJ de um perfil não pode ser modificado pelo PATCH, inclusive quando estiver nulo. Um proprietário pode ter várias organizações; a migração preserva contas pessoais que já eram proprietárias.

## Instalação nova

Crie um banco vazio e configure `.env` com `SOCIALTRADE_DATABASE_URL`, `SOCIALTRADE_TOKEN_SECRET` e, opcionalmente, `SOCIALTRADE_DATABASE_SCHEMA` apontando para um schema já existente. Não versione credenciais.

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Somente em desenvolvimento/teste, e por escolha explícita, crie demonstrações com `python -m app.seed --environment development`. O seed preserva registros existentes. Não execute seed antes de importar uma base legada: a importação exige tabelas de negócio vazias.

## Importar a base legada

Preserve uma cópia de segurança e interrompa gravações na origem durante a operação. Configure a conexão de destino, aplique Alembic e confira primeiro, sem `--apply`:

```powershell
.\.venv\Scripts\python.exe -m app.migrate_sqlite --source C:\caminho\socialtrade.db --report reports\migration-check.json
```

O importador abre SQLite somente para leitura, exige o layout legado conhecido e valida integridade, referências, tipos, documentos, catálogos e conflitos antes de inserir. Tabelas desconhecidas, textos com caractere nulo e timestamps com mais de seis casas decimais são recusados, sem truncamento silencioso. O destino deve estar vazio e com revisão e estrutura compatíveis com o Alembic. O relatório traz contagens e códigos de problema, sem conteúdo de registros ou credenciais.

A exceção `--allow-demo-documents` aceita apenas os quatro CPFs repetidos conhecidos, de 1 a 4, quando a conta pertence a um dos dois domínios locais de demonstração reconhecidos. Ela não corrige nem amplia a exceção para novos cadastros. Cada ocorrência é listada como aviso. Sem a opção, a pré-validação bloqueia esses documentos.

Após um resultado `ready`, aplique com os mesmos argumentos e `--apply`. Para a base demonstrativa que requer a exceção explicitamente aprovada:

```powershell
.\.venv\Scripts\python.exe -m app.migrate_sqlite --source C:\caminho\socialtrade.db --allow-demo-documents --apply --report reports\migration-apply.json
```

A cópia preserva IDs, hashes de senha, documentos, slugs e vínculos. Timestamps legados sem fuso são interpretados como UTC, mantendo a convenção anterior da API. A cópia inteira e o reinício das identidades ocorrem na mesma transação. A próxima identidade é maior tanto que o maior ID retido quanto que o contador histórico `sqlite_sequence`; IDs de registros já excluídos não são reutilizados, inclusive em tabelas agora vazias. Contagem e checksum de todas as colunas importadas precisam coincidir. O arquivo de origem é conferido novamente antes de confirmar a transação; falhas de validação, cópia, conferência ou reinício das identidades desfazem a transação.

Um resultado `blocked` termina com código 2; `ready` e `imported`, com código 0. Se a gravação do arquivo opcional de relatório falhar, a saída JSON no terminal mantém o estado real (`ready`, `blocked` ou `imported`), acrescenta `report_error=report_write_failed` e termina com código 3. Esse erro de relatório não desfaz uma cópia já confirmada: confira o status antes de repetir. O caminho de relatório não pode ser a origem ou seus auxiliares, nem um hardlink deles. Não repita a cópia sobre um destino preenchido. Corrija problemas identificados por uma decisão explícita ou prepare outro destino vazio; o programa não repara nem descarta registros silenciosamente.

Colisões concorrentes de slugs e matrículas gerados internamente são repetidas em SAVEPOINT, sem desfazer os outros dados da transação. O limite de dez colisões de inserção retorna 503 com rollback integral. Conflitos reais de documento, e-mail ou username continuam retornando 409. Instituições de ambos os domínios locais de demonstração reconhecidos são sinalizadas como fictícias nas respostas privadas e públicas.

## Reversão e implantação

A origem SQLite permanece preservada. Antes de colocar a aplicação migrada em uso, é possível voltar ao checkout e à configuração anteriores. Depois de aceitar novas gravações no PostgreSQL, retornar ao SQLite antigo perderia essas alterações; nesse caso é necessário um plano próprio de recuperação e reconciliação.

A cópia local não publica a aplicação nem configura hospedagem. Para produção, prepare backup, autenticação do PostgreSQL, segredo de sessão próprio, HTTPS e migrações explícitas na instalação. Não use demonstrações em dados reais. Pagamentos, prestação de contas e Solana seguem fora desta etapa.
