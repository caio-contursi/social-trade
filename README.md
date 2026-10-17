# SocialTrade

Plataforma para conectar empresas doadoras de todos os portes a ONGs e projetos sociais. A SocialTrade apresenta objetivos, áreas de atuação e resultados informados pelos projetos para apoiar decisões de investimento social. A integração com Solana está desativada nesta etapa.

A interface principal fica em `frontend/` e utiliza Next.js, TypeScript, Tailwind CSS e componentes oficiais do shadcn/ui. A API FastAPI e o banco SQLite foram mantidos. As informações apresentadas pelos projetos são autodeclaradas: cadastro ou perfil completo não representam verificação independente.

## Executar no Windows

Requisitos: Python 3.11 ou superior, Node.js 20.9 ou superior e npm. Os comandos abaixo usam PowerShell; execute-os a partir da pasta do repositório.

Inicie a API no primeiro terminal:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

No segundo terminal, também a partir da raiz do repositório:

```powershell
Set-Location frontend
npm ci
if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
npm run dev
```

Abra a nova interface em [http://127.0.0.1:3000](http://127.0.0.1:3000). A documentação da API fica em [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs). O SQLite usa `socialtrade.db` por padrão e pode ser direcionado por `SOCIALTRADE_DB`.

O arquivo `frontend/.env.example` documenta `SOCIALTRADE_API_URL=http://127.0.0.1:8000`. O servidor Next.js encaminha `/api/*` à API: o navegador continua na origem do front-end e essa configuração local não exige CORS. Reinicie o servidor de desenvolvimento após mudar essa variável; para produção, gere um novo build.

As páginas antigas do FastAPI em `/` e `/public` continuam disponíveis na porta **8000** por compatibilidade. A nova interface está na porta **3000**. Detalhes de arquitetura, rotas e decisões visuais estão em [docs/frontend.md](docs/frontend.md).

## Funcionalidades e limites

- Descoberta pública de projetos, suas causas, localização, objetivos e resultados informados.
- Acesso e cadastro de empresa doadora ou projeto social, com login por CPF/CNPJ.
- Perfil institucional, página pública e edição pelo proprietário autorizado.
- Cadastro de pessoas por CPF, matrícula numérica única de seis dígitos e vínculo com projetos como funcionário ou pessoa assistida.
- Sessão assinada, senhas armazenadas com scrypt, avisos, suporte e moderação.
- Tema claro, escuro ou conforme o sistema e interface adaptada para dispositivos móveis.

Não há processamento real de doações, pagamentos na Solana, comprovantes financeiros ou relatórios de prestação de contas nesta etapa. Esses recursos pertencem ao roteiro futuro. Uma eventual confirmação de transferência na blockchain também precisará ser distinguida da comprovação do uso dos recursos.

## Demonstração local

Com `SOCIALTRADE_DEMO_USERS=true`, as contas de demonstração usam a senha `SocialTrade123!`:

| Acesso | CPF/CNPJ |
| --- | --- |
| Projeto social | 11111111111 |
| Empresa doadora | 12345678000195 |

A API informa a disponibilidade das demonstrações por `GET /api/catalog`, no campo `demo_users_enabled`. Organizações de demonstração são sinalizadas por `is_demo`, derivado do domínio do e-mail do proprietário. Essas instituições e informações são fictícias e devem aparecer identificadas como demonstração, sem se passar por projetos, resultados ou doações reais.

`verification_status="self_declared"` indica informação declarada pela instituição. `profile_completeness` mede o preenchimento da apresentação pública, de 0 a 100; não mede verificação, qualidade, regularidade fiscal ou garantia de impacto.

## Testes automatizados

Instale as dependências de desenvolvimento e execute a suíte de API a partir da raiz:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing --cov-report=xml:reports/api-coverage.xml --cov-fail-under=90 --junitxml=reports/api-junit.xml
```

Se o ambiente virtual foi criado sem pip, use `uv pip install --python .venv\Scripts\python.exe -r requirements-dev.txt`. A API usa um SQLite temporário, com leitura de `.env` e contas de demonstração desativadas.

Para executar a verificação completa, dentro de `frontend/`:

```powershell
npm ci
npx playwright install chromium
npm run test:all
```

O comando executa API, verificação de tipos, Vitest com cobertura e Playwright. Também é possível usar `npm test`, `npm run test:watch`, `npm run test:coverage` e `npm run test:e2e` separadamente.

O E2E gera um build separado em `.next-e2e` e inicia servidores próprios nas portas 8765 e 3100, com banco temporário e dados de teste. Não é necessário iniciar a aplicação manualmente. Os testes não usam nem modificam `socialtrade.db` ou os arquivos `.env` do projeto.

Instruções de configuração, seleção do Python, portas alternativas, cobertura, relatórios e integração contínua estão em [docs/testes.md](docs/testes.md). O workflow roda em pushes e pull requests, com API no Windows e Ubuntu e frontend/E2E no Ubuntu.

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
- `GET /api/announcements`, `POST /api/support`, `GET /api/support/mine`.
- `GET /api/moderation/overview`, `PATCH /api/moderation/tickets/{id}`, `POST /api/moderation/announcements`.

As respostas públicas usam uma lista explícita de campos e não expõem proprietário, e-mail, documentos ou chave Pix. A edição institucional exige o proprietário autenticado, mantém o slug e o tipo de instituição, e recebe os campos completos de `OrganizationCreate`.

## Configuração e publicação

Mantenha `.env`, `frontend/.env.local`, segredos, bancos SQLite e arquivos auxiliares do banco fora do Git. Os arquivos `.env.example` contêm apenas exemplos. Não coloque `SOCIALTRADE_TOKEN_SECRET` ou credenciais em variáveis `NEXT_PUBLIC_*`.

Antes de uma instalação compartilhada ou de produção, desative a criação de demonstrações com `SOCIALTRADE_DEMO_USERS=false`, configure uma chave longa e aleatória em `SOCIALTRADE_TOKEN_SECRET`, HTTPS, limites de requisição e uma estratégia de banco/migrações e backup. Desativar a flag não remove contas de demonstração que já existam em um banco; use dados de produção separados.

## Imagem ilustrativa

A imagem de apresentação tem origem no [Unsplash](https://images.unsplash.com/photo-1559027615-cd4628902d4a) e deve ser identificada como **imagem ilustrativa**. Ela não é uma foto de um projeto cadastrado e não comprova vínculo, atendimento ou resultados de qualquer instituição.
