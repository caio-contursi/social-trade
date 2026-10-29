# SocialTrade

Plataforma para conectar empresas doadoras de todos os portes, pessoas físicas e projetos sociais. A SocialTrade apresenta objetivos, áreas de atuação e resultados informados pelos projetos para apoiar decisões de investimento social. A descoberta planejada permitirá buscar por nome ou interesse, filtrar por tipo de projeto e navegar por categorias sugeridas por IA. A avaliação interna poderá influenciar a ordem dos resultados sem ser exibida a doadores ou projetos; essas funções ainda não estão implementadas. A modalidade SOL usa Solana Pay, cria referências únicas e verifica a transferência na rede antes de mostrar sucesso.

A interface principal fica em `frontend/` e utiliza Next.js, TypeScript, Tailwind CSS e componentes oficiais do shadcn/ui. A API usa FastAPI, PostgreSQL e SQLAlchemy 2 Core, com migrações explícitas pelo Alembic. As informações apresentadas pelos projetos são autodeclaradas: cadastro ou perfil completo não representam verificação independente.

## Executar no Windows

Requisitos: Python 3.12, PostgreSQL 17, Node.js 24 e npm. Crie um banco local vazio e configure a autenticação antes de iniciar. Os comandos abaixo usam PowerShell; execute-os a partir da pasta do repositório.

Prepare a API no primeiro terminal. Após copiar `.env.example`, configure `SOCIALTRADE_DATABASE_URL` e uma chave de sessão em `SOCIALTRADE_TOKEN_SECRET`; depois aplique a migração e inicie o servidor:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

No segundo terminal, também a partir da raiz do repositório:

```powershell
Set-Location frontend
npm ci
if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
npm run dev
```

Abra a nova interface em [http://127.0.0.1:3000](http://127.0.0.1:3000). A documentação da API fica em [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs). A configuração exige `SOCIALTRADE_DATABASE_URL` com o driver `postgresql+psycopg`. `SOCIALTRADE_DATABASE_SCHEMA` permite selecionar um schema existente. O startup não cria tabelas, não aplica migrações e não grava demonstrações.

O arquivo `frontend/.env.example` documenta `SOCIALTRADE_API_URL=http://127.0.0.1:8000`. O servidor Next.js encaminha `/api/*` à API: o navegador continua na origem do front-end e essa configuração local não exige CORS. Reinicie o servidor de desenvolvimento após mudar essa variável; para produção, gere um novo build.

O FastAPI na porta **8000** é somente o backend da aplicação; ele não serve mais a interface web antiga. A porta **3000** é a única interface do SocialTrade. Acesse a API em `/docs` apenas para documentação técnica. Detalhes de arquitetura, rotas e decisões visuais estão em [docs/frontend.md](docs/frontend.md).

## Funcionalidades e limites

- Descoberta pública de projetos, suas causas, localização, objetivos e resultados informados.
- Acesso e cadastro de empresa doadora ou projeto social, com login por CPF/CNPJ.
- Perfil institucional, página pública e edição pelo proprietário autorizado.
- Cadastro de pessoas por CPF, matrícula numérica única de seis dígitos e vínculo com projetos como funcionário ou pessoa assistida.
- Sessão assinada, senhas armazenadas com scrypt, avisos, suporte e moderação. Tickets recebem protocolos aleatórios únicos de seis dígitos, persistidos e exibidos no histórico em todos os status.
- Tema claro, escuro ou conforme o sistema e interface adaptada para dispositivos móveis.
- Doações em SOL para a carteira intermediária SocialTrade, com QR por valor e referência únicos e confirmação on-chain em tempo real. A escolha de projeto ou causa registra a intenção de destinação; o repasse não é automático.

O backend registra intenções de doação por Pix direto feitas por empresas ou pessoas físicas para projetos com CNPJ e chave Pix conferidos por moderação. Acompanha o E2E informado por quem doa e permite que o projeto confirme manualmente o crédito e emita um recibo HTML imprimível, identificado pelo CNPJ empresarial ou CPF pessoal. Este é o único fluxo Pix implementado: uma futura modalidade poderá receber na tesouraria da SocialTrade, sujeita a definições operacionais e jurídicas sobre recebimento, custódia, conciliação e repasse. O fluxo atual não tem PSP nem taxa da plataforma. A SocialTrade não garante abatimento no Imposto de Renda nem outro benefício fiscal; quem doa deve consultar orientações oficiais do governo e um profissional de contabilidade para verificar se alguma regra se aplica ao próprio caso. O registro da doação e o recibo privado não substituem o comprovante bancário, nota fiscal, validação fiscal ou confirmação de elegibilidade. O fluxo está descrito em [docs/doacoes-pix.md](docs/doacoes-pix.md). Categorizações por IA, avaliação interna, ordenação por avaliação, pagamentos por cartão, conciliação automática e criptoativos/Solana seguem fora da implementação atual.

## Demonstração local

A flag `SOCIALTRADE_DEMO_USERS=true` só habilita a apresentação das demonstrações na interface. Para criar dados fictícios em um banco local já migrado, execute explicitamente:

```powershell
.\.venv\Scripts\python.exe -m app.seed --environment development
```

O seed é aditivo: não sobrescreve credenciais, funções, perfis ou vínculos existentes. Use apenas em desenvolvimento/teste; as credenciais de demonstração são apresentadas no acesso local da interface. Para preservar um SQLite existente, use o importador descrito em [docs/migracao-postgresql.md](docs/migracao-postgresql.md), antes de qualquer seed.

A API informa a disponibilidade das demonstrações por `GET /api/catalog`, no campo `demo_users_enabled`. Organizações de demonstração são sinalizadas por `is_demo`, derivado do domínio do e-mail do proprietário. Essas instituições e informações são fictícias e devem aparecer identificadas como demonstração, sem se passar por projetos, resultados ou doações reais.

`verification_status="self_declared"` indica informação declarada pela instituição. `profile_completeness` mede o preenchimento da apresentação pública, de 0 a 100; não mede verificação, qualidade, regularidade fiscal ou garantia de impacto.

## Testes automatizados

Instale as dependências de desenvolvimento e execute a suíte de API a partir da raiz:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing --cov-report=xml:reports/api-coverage.xml --cov-fail-under=90 --junitxml=reports/api-junit.xml
```

Se o ambiente virtual foi criado sem pip, use `uv pip install --python .venv\Scripts\python.exe -r requirements-dev.txt`. Defina `SOCIALTRADE_TEST_DATABASE_URL` com uma conexão `postgresql+psycopg` para um banco exclusivo de testes. A suíte cria um schema isolado por execução, bloqueia a leitura de `.env` e desativa demonstrações.

Para executar a verificação completa, dentro de `frontend/`:

```powershell
npm ci
npx playwright install chromium
npm run test:all
```

O comando executa API, verificação de tipos, Vitest com cobertura e Playwright. Também é possível usar `npm test`, `npm run test:watch`, `npm run test:coverage` e `npm run test:e2e` separadamente.

O E2E gera um build separado em `.next-e2e` e inicia servidores próprios nas portas 8765 e 3100, com um schema PostgreSQL exclusivo e dados de teste. Não é necessário iniciar a aplicação manualmente. Os testes não usam nem modificam `socialtrade.db` ou os arquivos `.env` do projeto.

Instruções de configuração, seleção do Python, portas alternativas, cobertura, relatórios e integração contínua estão em [docs/testes.md](docs/testes.md). O workflow roda em pushes e pull requests, com PostgreSQL 17, API e frontend/E2E no Ubuntu. A execução local também foi verificada no Windows.

Para verificar e servir o build normal, dentro de `frontend/`:

```powershell
npm run typecheck
npm run build
npm run start
```

`npm run start` serve o build na porta 3000 e requer que a API da porta 8000 também esteja em execução. Use `npm run dev` para desenvolvimento.

## Rotas principais da API

- `GET /api/public/projects`, `GET /api/public/organizations/{slug}`.
- `POST /api/auth/register`, `POST /api/auth/register-institution`, `POST /api/auth/login`, `GET /api/auth/me`.
- `GET /api/catalog`, `GET /api/profile`, `PATCH /api/profile`.
- `GET /api/organizations/mine`, `POST /api/organizations`, `PATCH /api/organizations/{org_id}`.
- `GET /api/projects`, `GET /api/projects/open`, `GET /api/memberships/mine`.
- `POST /api/donations`, `GET /api/donations/mine`, `POST /api/donations/{id}/report-payment`, `POST /api/donations/{id}/confirm`, `GET /api/donations/{id}/receipt`.
- `GET /api/announcements`, `POST /api/support`, `GET /api/support/mine`.
- `GET /api/moderation/overview`, `PATCH /api/moderation/tickets/{id}`, `POST /api/moderation/announcements`, `PATCH /api/moderation/projects/{id}/pix-verification`.

As respostas públicas usam uma lista explícita de campos e não expõem proprietário, e-mail, documentos ou chave Pix. A edição institucional exige o proprietário autenticado, mantém o slug, o tipo de instituição e o CNPJ (inclusive quando nulo), e recebe os campos completos de `OrganizationCreate`.

## Configuração e publicação

Mantenha `.env`, `frontend/.env.local`, segredos, bancos SQLite e arquivos auxiliares do banco fora do Git. Os arquivos `.env.example` contêm apenas exemplos. Não coloque `SOCIALTRADE_TOKEN_SECRET` ou credenciais em variáveis `NEXT_PUBLIC_*`.

Antes de uma instalação compartilhada ou de produção, desative a apresentação de demonstrações com `SOCIALTRADE_DEMO_USERS=false`, configure uma chave longa e aleatória em `SOCIALTRADE_TOKEN_SECRET`, HTTPS, limites de requisição e backups; aplique as migrações antes de iniciar o servidor. Desativar a flag não remove contas de demonstração que já existam em um banco; use dados de produção separados.

O desenho das dez tabelas, a cópia validada do SQLite e o procedimento de reversão estão em [docs/migracao-postgresql.md](docs/migracao-postgresql.md).

## Imagem ilustrativa

A imagem de apresentação tem origem no [Unsplash](https://images.unsplash.com/photo-1559027615-cd4628902d4a) e deve ser identificada como **imagem ilustrativa**. Ela não é uma foto de um projeto cadastrado e não comprova vínculo, atendimento ou resultados de qualquer instituição.
