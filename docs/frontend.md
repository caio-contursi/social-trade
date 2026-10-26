# Front-end SocialTrade

## Arquitetura

O diretório `frontend/` contém a interface Next.js com App Router, React e TypeScript. Tailwind CSS organiza os estilos e componentes oficiais do shadcn/ui, apoiados em primitivas Radix, formam a base de controles, formulários e sobreposições. A API continua em FastAPI, com dados persistidos em PostgreSQL por SQLAlchemy 2; Alembic versiona o esquema.

```text
Navegador :3000
  └─ Next.js: páginas, componentes e /api/*
       └─ rewrite para SOCIALTRADE_API_URL
            └─ FastAPI :8000
                 └─ PostgreSQL
```

As chamadas do navegador usam caminhos `/api/...` na mesma origem. `frontend/next.config.ts` encaminha esses caminhos para `SOCIALTRADE_API_URL`. Em desenvolvimento, o padrão é `http://127.0.0.1:8000`; em produção, a variável é obrigatória no ambiente de build para impedir que o frontend seja publicado apontando silenciosamente para o localhost do próprio servidor. A URL deve ser acessível pelo processo do Next.js; o segredo de assinatura de sessão pertence exclusivamente ao backend.

| Local | Responsabilidade |
| --- | --- |
| `frontend/src/app/` | Rotas e layouts do App Router, metadados e estilos globais. |
| `frontend/src/components/` | Interface pública, área autenticada e provedores compartilhados. |
| `frontend/src/components/ui/` | Componentes oficiais do shadcn/ui incorporados ao projeto. |
| `frontend/src/lib/api.ts` | Cliente da API, cabeçalhos de autenticação e mensagens de falha. |
| `frontend/src/lib/types.ts` | Contratos TypeScript dos dados utilizados pela interface. |
| `frontend/src/lib/catalog.ts` | Uso dos catálogos e rótulos da plataforma. |
| `frontend/.env.example` | Exemplo de origem da API; não contém segredos. |
| `app/` | API, autorização, validação, catálogo e persistência existentes. |

As restrições de proprietário, tipo de conta e moderação continuam na API. Esconder uma opção na interface não substitui a autorização do backend.

## Rotas

| Rota do novo front-end | Finalidade |
| --- | --- |
| `/` | Apresentação da plataforma e acesso à descoberta de projetos. |
| `/projetos` | Busca e exploração de projetos sociais. |
| `/projetos/[slug]` | Perfil público de um projeto e informações declaradas pela instituição. |
| `/entrar` | Acesso por CPF/CNPJ. |
| `/cadastro` | Cadastro conforme o tipo de conta. |
| `/painel` | Resumo e próximas ações da conta autenticada. |
| `/painel/organizacoes` | Informações institucionais e edição quando autorizada. |
| `/painel/perfil` | Dados pessoais da conta. |
| `/painel/avisos` | Comunicados da plataforma. |
| `/painel/suporte` | Solicitações de suporte. |
| `/painel/moderacao` | Gestão restrita a moderadores. |

Essas rotas são servidas na porta 3000. A porta 8000 é somente o backend FastAPI: `/` identifica a API, `/public` retorna `410 Gone` para a antiga interface descontinuada, e `/docs` apresenta a documentação técnica. O perfil público atual usa `/projetos/[slug]` no Next.js.

## Execução no Windows

Requer Python 3.12, Node.js 24 e PostgreSQL 17. Crie um banco local e configure a URL PostgreSQL e o segredo de sessão em `.env`, conforme o [README](../README.md). Abra dois terminais PowerShell na raiz do repositório.

API:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Front-end:

```powershell
Set-Location frontend
npm ci
if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
npm run dev
```

O arquivo local `frontend/.env.local` pode definir:

```dotenv
SOCIALTRADE_API_URL=http://127.0.0.1:8000
```

Depois de mudar a origem da API, reinicie o servidor de desenvolvimento. Para produção, defina `SOCIALTRADE_API_URL` no ambiente de build e publique novamente; sem essa configuração o build falha com uma mensagem explícita. `GET /api/health` verifica a disponibilidade do banco através do mesmo rewrite usado pelo frontend.

Comandos disponíveis em `frontend/`:

| Comando | Uso |
| --- | --- |
| `npm ci` | Instalar as dependências conforme o lockfile. |
| `npm run dev` | Desenvolvimento em `http://127.0.0.1:3000`. |
| `npm run typecheck` | Verificação TypeScript sem emitir arquivos. |
| `npm run build` | Gerar o build de produção. |
| `npm run start` | Servir o build de produção na porta 3000. |

O processo FastAPI deve continuar em execução tanto em desenvolvimento quanto ao testar `npm run start`. Não execute `dev` e `start` simultaneamente na mesma porta.

Para a suíte de API, na raiz do repositório:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
$env:PYTHONDONTWRITEBYTECODE = '1'
.\.venv\Scripts\python.exe -m pytest
```

O comando equivalente com ambiente virtual ativado é `python -m pytest`. Os testes exigem `SOCIALTRADE_TEST_DATABASE_URL`, criam um schema PostgreSQL isolado, impedem a leitura de `.env` e desativam demonstrações. Eles não modificam `socialtrade.db` ou contas existentes.

## Direção visual e acessibilidade

- Verde-água como cor de ação e identidade, combinado com superfícies neutras, contraste legível e decoração discreta. Cores de estado devem comunicar ações e condições reais.
- Manrope e DM Sans distribuídas localmente pelo pacote `@fontsource-variable`, sem dependência de uma requisição ao Google Fonts durante a navegação.
- Componentes oficiais do shadcn/ui para manter consistência em botões, campos, cartões, alertas e painéis móveis. Ajustes de marca são feitos por tokens de tema e composição.
- Hierarquia centrada na descoberta do doador e na apresentação do projeto; formulários e painéis devem destacar a próxima ação útil.
- Semântica de títulos, rótulos associados aos campos, feedback textual de erro, foco visível, navegação por teclado, link de salto para o conteúdo e respeito à preferência de tema do sistema.
- Sobreposições e navegação móvel devem manter o foco e ser fecháveis pelo teclado; estados de carregamento, lista vazia e falha precisam ter mensagens distintas.

A foto de apresentação tem origem em [https://images.unsplash.com/photo-1559027615-cd4628902d4a](https://images.unsplash.com/photo-1559027615-cd4628902d4a). Seu rótulo deve ser **imagem ilustrativa**. Ela não deve ser apresentada como foto de uma instituição cadastrada, de seus beneficiários ou de um resultado comprovado.

## Dados públicos, demonstração e confiança

`GET /api/public/projects` fornece a descoberta pública; `GET /api/public/organizations/{slug}` fornece o perfil. As respostas usam campos explícitos e não incluem proprietário, e-mail, CPF/CNPJ ou chave Pix. A lista autenticada `GET /api/projects` mantém a autorização existente para doadores.

| Campo da API | Interpretação na interface |
| --- | --- |
| `verification_status="self_declared"` | Informações declaradas pela instituição, sem verificação independente. |
| `profile_completeness` | Percentual de preenchimento da apresentação; nunca selo de verificação ou garantia de impacto. |
| `is_demo` | Organização fictícia de demonstração, derivada do domínio `@socialtrade.local` do proprietário. |
| `GET /api/catalog` → `demo_users_enabled` | Indica se o ambiente habilita as contas de demonstração; a interface não deve assumir que estão sempre disponíveis. |

O percentual conta nome, tipo, cidade, estado, resumo, descrição, logo e pelo menos um site ou perfil social. Projetos contam também objetivos, impacto e áreas de atuação. Ele não utiliza CNPJ ou chave Pix como critério de confiança.

`PATCH /api/organizations/{org_id}` recebe um payload completo de `OrganizationCreate`, incluindo o `institution_kind` original. O editor deve enviar apenas campos de entrada: `id`, `owner_id`, `slug`, `verification_status`, `profile_completeness` e `is_demo` são dados de resposta e não devem ser reenviados como atributos editáveis. O backend preserva slug e tipo, valida catálogos e exige proprietário e tipo de conta compatíveis.

Empresas usam o tipo `company` na nova interface. Projetos não podem usar esse tipo. Empresas legadas cadastradas como `association` continuam editáveis sem alterar seu tipo de instituição.

O fluxo Pix direto está operacional como registro e acompanhamento: empresas e pessoas físicas iniciam a doação, transferem no próprio banco para a chave do projeto, informam o E2E e o projeto confirma manualmente o crédito. O SocialTrade não movimenta o dinheiro; não há cobrança Pix/PSP, conciliação bancária, carteira nem transação Solana. O recibo privado só é emitido após a confirmação do projeto e não é comprovante bancário nem garantia fiscal. Não exiba saldos ou estados de sucesso antes da confirmação. Informações demonstrativas devem ter rótulo explícito.

## Fases e estado do produto

| Fase | Estado nesta migração |
| --- | --- |
| Base visual e técnica | Next.js, TypeScript, Tailwind, shadcn/ui, fontes locais e temas compõem a nova interface. |
| Descoberta pública | Apresentação, exploração e perfis públicos consomem a API existente e sua nova lista pública segura. |
| Fluxos autenticados | Cadastro, login, painel, dados institucionais/pessoais, avisos, suporte e moderação usam as regras da API. |
| Qualidade | Validar com TypeScript, build, suíte de API e revisão manual de desktop, celular, teclado e estados de falha. Os comandos acima não substituem essa revisão visual. |
| Doações Pix diretas | Implementado: empresas e pessoas físicas podem registrar a intenção, efetuar transferência fora da plataforma e informar o E2E; o projeto confirma o crédito. O SocialTrade não recebe nem transfere valores. |
| PSP, pagamentos por cartão e conciliação | Fora do MVP; dependem de decisões operacionais, contratuais e de segurança. |
| Solana | Futuro: integração desativada; nenhuma transação em criptoativo é realizada pela interface atual. |
| Prestação de contas e verificação | Futuro: exigem contratos de dados, evidências e processos próprios; preenchimento cadastral não equivale a comprovação. |

## Preservação de dados e configuração

A persistência atual usa PostgreSQL. O importador explícito preserva o SQLite legado e suas contas; veja [migração PostgreSQL](migracao-postgresql.md). Os novos metadados de apresentação são calculados na leitura; a introdução da interface não converte projetos demonstrativos em dados reais.

`SOCIALTRADE_DEMO_USERS` controla a apresentação das demonstrações na interface. O seed só é executado por comando explícito em desenvolvimento/teste, nunca no startup; produção deve usar configuração e dados próprios.

Mantenha `.env`, `frontend/.env.local`, segredos e arquivos SQLite fora do versionamento. Exemplos versionados devem conter somente valores demonstrativos. Tokens e a chave `SOCIALTRADE_TOKEN_SECRET` não pertencem ao bundle do navegador nem a variáveis `NEXT_PUBLIC_*`. Revise HTTPS, autenticação, limites, migrações e backups antes de publicar.

A suíte completa, incluindo componentes e jornadas de navegador, está documentada em [testes.md](testes.md).


## Documentos e datas na migração PostgreSQL

CNPJ pode ser numérico ou alfanumérico: 12 posições alfanuméricas e dois dígitos verificadores. Cadastro valida DV; login preserva documentos legados de demonstração. Formas aceitas: documento puro ou máscara padrão, com maiúsculas canônicas e zeros preservados. Perfil institucional mantém o CNPJ salvo somente para leitura, inclusive quando nulo; a API aplica a mesma regra.

A API serializa datas ISO 8601 com fuso explícito. `formatDate` e a ordenação por data tratam também os valores legados como UTC; empates são resolvidos pelo ID. O E2E exige `SOCIALTRADE_TEST_DATABASE_URL`, prepara um schema randômico exclusivo, aplica Alembic e seed de teste explícito e remove apenas esse schema ao terminar.
