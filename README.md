# SocialTrade

Plataforma para conectar empresas doadoras de todos os portes a ONGs e projetos sociais. A SocialTrade apresenta objetivos, áreas de atuação e resultados informados pelos projetos para apoiar decisões de investimento social. A integração com Solana está desativada nesta etapa.

## Requisitos e execução

Requer Python 3.11 ou superior. No Windows, no diretório do projeto, crie o ambiente virtual, instale as dependências de requirements.txt, copie .env.example para .env se ainda não existir e inicie o servidor com uvicorn app.main:app --reload. Abra http://127.0.0.1:8000. A documentação da API fica em /docs e o SQLite é criado em socialtrade.db.

## Demonstração local

Com SOCIALTRADE_DEMO_USERS=true, use a senha SocialTrade123!:

| Acesso | CPF/CNPJ |
| --- | --- |
| Projeto social | 11111111111 |
| Empresa doadora | 12345678000195 |

Desative as contas de demonstração em instalações compartilhadas ou de produção com SOCIALTRADE_DEMO_USERS=false e defina uma chave longa e aleatória em SOCIALTRADE_TOKEN_SECRET.

## Funcionalidades

- Acesso para empresa doadora ou projeto social, com login por CPF/CNPJ.
- Cadastro de instituições como empresa doadora ou projeto social.
- Perfil dos projetos com objetivos, impactos, áreas de atuação e página pública.
- Área de descoberta para empresas consultarem projetos e escolherem quais apoiar ou promover.
- Cadastro de usuários por CPF, com matrícula numérica única de seis dígitos.
- Vínculo de usuários a projetos como funcionários ou pessoas assistidas.
- Sessão assinada, senha armazenada com scrypt, avisos, suporte e moderação.

## Rotas principais

- POST /api/auth/register, POST /api/auth/register-institution, POST /api/auth/login, GET /api/auth/me
- GET /api/catalog, GET /api/profile, PATCH /api/profile
- GET /api/organizations/mine, POST /api/organizations, GET /api/public/organizations/{slug}
- GET /api/projects, GET /api/projects/open, GET /api/memberships/mine
- GET /api/announcements, POST /api/support, GET /api/support/mine
- GET /api/moderation/overview, PATCH /api/moderation/tickets/{id}, POST /api/moderation/announcements

Antes de publicar, migre o banco para PostgreSQL, adicione migrações, configure HTTPS, revise limites de requisição e desative contas de demonstração.
