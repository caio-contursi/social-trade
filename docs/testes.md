# Testes automatizados

A suíte verifica a aplicação com PostgreSQL, SQLAlchemy 2 e Alembic, incluindo o importador do SQLite legado. Ela combina testes da API com pytest, testes de componentes e contratos com Vitest/Testing Library e fluxos reais no Chromium com Playwright.

## Preparar o ambiente

Use Python 3.12 e Node.js 24 para reproduzir os ambientes da integração contínua. Os exemplos abaixo usam PowerShell a partir da raiz do repositório.

Se ainda não existir um ambiente virtual:

```powershell
py -3.12 -m venv .venv
```

Instale as dependências de desenvolvimento da API:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

Se o ambiente foi criado sem pip, use uv, informando o caminho completo do executável caso ele não esteja no PATH:

```powershell
uv pip install --python .venv\Scripts\python.exe -r requirements-dev.txt
```

Dentro de `frontend/`, instale os pacotes registrados no lockfile e o navegador de teste:

```powershell
Set-Location frontend
npm ci
npx playwright install chromium
```

O Playwright baixa uma versão própria do Chromium; ele não precisa usar seu Chrome pessoal. Em Linux ou na integração contínua, use `npx playwright install --with-deps chromium` para instalar também as dependências do sistema.

## API

Crie um banco PostgreSQL 17 exclusivo de testes, configure a autenticação localmente e defina `SOCIALTRADE_TEST_DATABASE_URL`. Exemplo sem credenciais embutidas, a partir da raiz:

```powershell
$env:SOCIALTRADE_TEST_DATABASE_URL = 'postgresql+psycopg://postgres@127.0.0.1:5432/socialtrade_test'
.\.venv\Scripts\python.exe -m pytest
```

Para gerar os mesmos relatórios e exigir o mínimo de 90% de cobertura de linhas usado na integração contínua:

```powershell
.\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing --cov-report=xml:reports/api-coverage.xml --cov-fail-under=90 --junitxml=reports/api-junit.xml
```

Com o ambiente virtual ativado, o executável pode ser substituído por `python`. No Linux, ele fica em `.venv/bin/python`.

A suíte verifica cadastro e login, assinatura e expiração de sessão, armazenamento de senhas, validação de documentos e textos, conflitos de cadastro, rollback, vínculo com projetos, edição por proprietário, separação entre contas, suporte, moderação e privacidade das respostas públicas. Os 11 cenários anteriores de organizações foram preservados.

O `conftest.py` substitui a configuração antes de importar a aplicação: bloqueia a leitura de `.env`, desativa demonstrações e exige a URL exclusiva de teste. Cria um schema aleatório, aplica Alembic e o remove ao terminar. Os dados são limpos entre testes; não é necessário iniciar a API manualmente.

## Frontend

Execute os comandos abaixo dentro de `frontend/`:

| Comando | Finalidade |
| --- | --- |
| `npm test` | Executar os testes de componentes e contratos uma vez. |
| `npm run test:watch` | Reexecutar esses testes ao salvar alterações. |
| `npm run test:coverage` | Executar Vitest e gerar relatórios de cobertura. |
| `npm run typecheck` | Verificar os tipos TypeScript. |
| `npm run test:e2e` | Gerar o build isolado e testar os fluxos no navegador. |
| `npm run test:e2e:report` | Abrir o último relatório HTML do Playwright. |
| `npm run test:all` | Executar API com cobertura mínima, tipos, Vitest com cobertura e E2E. |

O comando `test:unit` também está disponível como sinônimo de `npm test`. Os testes do frontend cobrem os contratos HTTP, os formulários de acesso e validação e o ciclo da sessão, incluindo respostas atrasadas, expiração e troca de conta.

A cobertura do Vitest está delimitada a módulos críticos selecionados, incluindo documentos e datas, além de `src/lib/api.ts`, `src/components/auth-provider.tsx`, `src/components/auth/validation.ts` e `src/components/auth/login-form.tsx`. Ela não representa a cobertura de todas as páginas e componentes da interface.

## Fluxos no navegador e isolamento

Use `npm run test:e2e` para iniciar o Playwright pelo wrapper de isolamento. Ele cria um schema exclusivo no banco definido por `SOCIALTRADE_TEST_DATABASE_URL`, desativa a leitura do `.env` da API e a apresentação de demonstrações, aplica Alembic e executa o seed explicitamente para os cenários. O build usa `.next-e2e`, separado do build de desenvolvimento.

O runner inicia os servidores de teste: API em `127.0.0.1:8765` e frontend em `127.0.0.1:3100`. A configuração recusa reutilizar servidores já abertos nessas portas. Não é necessário parar a aplicação local das portas 8000 e 3000.

A execução usa Chromium no desktop e com emulação do Pixel 7; não substitui testes em um celular físico ou em outros motores de navegador. Os relatórios incluem JUnit e HTML; traces e capturas de tela são retidos quando ocorre uma falha. A configuração da integração contínua permite uma nova tentativa por cenário.

Para usar outro Python ou portas livres, defina as variáveis antes do comando, dentro de `frontend/`:

```powershell
$env:SOCIALTRADE_TEST_PYTHON = (Resolve-Path ..\.venv\Scripts\python.exe).Path
$env:SOCIALTRADE_E2E_API_PORT = '8766'
$env:SOCIALTRADE_E2E_FRONTEND_PORT = '3101'
npm run test:e2e
```

O Python padrão é o do ambiente `.venv` do repositório, quando existe; caso contrário, o comando `python` do PATH. `SOCIALTRADE_TEST_PYTHON` permite selecionar explicitamente outro executável. As portas devem ser distintas, livres e estar entre 1024 e 65535.

Não execute `npx playwright test` diretamente: a configuração exige o ambiente criado pelo wrapper para proteger o banco e as configurações locais.

## Relatórios e critérios

| Camada | Relatórios |
| --- | --- |
| API | `reports/api-coverage.xml`, `reports/api-junit.xml` e resumo no terminal. |
| Vitest | `frontend/coverage/`, com HTML, LCOV e resumo JSON. |
| Playwright | `frontend/playwright-report/` e `frontend/test-results/`. |

Na validação inicial, a API passou seus 122 testes e alcançou 93,34% de cobertura de linhas. O frontend passou 71 testes; nos quatro módulos delimitados, a cobertura foi de 99,36% de linhas e 96,8% de ramificações. O Playwright passou 13 cenários, com um caso exclusivo de mobile ignorado intencionalmente no projeto desktop. A checagem de tipos e o build de produção também passaram. Esses valores registram a execução inicial e podem mudar conforme a aplicação evolui; os relatórios de cada execução são a referência atual.

O piso automático da API é 90%. A cobertura do frontend explicita seu escopo e deve ser ampliada conforme novas funcionalidades entram no projeto. Uma porcentagem alta não substitui cenários sobre permissões, privacidade, estados de erro e integrações.

## Integração contínua

O workflow `.github/workflows/testes.yml` roda em pushes e pull requests:

- API com Python 3.12 e um serviço PostgreSQL 17 no Ubuntu.
- TypeScript e Vitest com Node.js 24 no Ubuntu.
- Build e Playwright com Chromium e PostgreSQL 17 no Ubuntu.

Execuções anteriores da mesma referência são canceladas quando uma nova começa. A integração contínua possui permissão de leitura do repositório e preserva relatórios por 14 dias, inclusive quando um teste falha. O banco efêmero da CI não usa credenciais de produção. Pagamentos e Solana não são acessados.

## Limites atuais

Pagamentos, doações reais, registro na Solana, comprovantes financeiros e prestação de contas ainda não foram implementados. A suíte não afirma validar esses recursos futuros. Os testes dessas integrações devem ser adicionados junto de cada etapa da V2, com provedores de teste e ambientes apropriados.

## Execução e diagnóstico no Windows

O runner inicia API e Next.js diretamente, sem shell, verifica sua disponibilidade com prazo limitado e encerra somente os processos criados pela execução. Há um lock para impedir dois E2Es usando o mesmo build. Se uma interrupção forçada deixar o lock de um processo já encerrado, o comando identifica essa condição e orienta a remoção manual de `frontend/.e2e-run.lock`; não apaga um lock de outra execução automaticamente.

Com o runtime empacotado Node.js 24.19.0 no Windows, o Vitest emitiu um aviso de timeout ao encerrar servidores Vite, mesmo com todos os testes aprovados e código de saída zero. A execução completa com o Node.js 24.15.0 instalado na máquina terminou sem esse aviso. O aviso foi reproduzido também com um teste de função pura, sem componentes da aplicação. A suíte não oculta o aviso nem aumenta timeouts para mascará-lo. Uma falha de teste ou de cobertura retorna código diferente de zero.

O TestClient instalado também emite um aviso de depreciação upstream sobre httpx. Isso não altera as asserções nem o resultado dos testes.

Os limites mínimos nos módulos monitorados do frontend são 95% de linhas e statements e 90% de branches e funções. Esses números não representam cobertura global de todas as telas.


## Migração e integridade

Os testes usam PostgreSQL real para conferir PKs, FKs, índices únicos sem distinção de caixa, CHECKs, identidades, TIMESTAMPTZ, catálogos e política de exclusão. O importador é exercitado com SQLite sintético: simulação sem escrita, exceção restrita dos CPFs demo, preservação de IDs e hashes, conferência integral por checksum, conflitos, schema/revisão incorretos, origem alterada e rollback inclusive das identidades. A simulação e a cópia são testadas separadamente; a origem real do desenvolvedor nunca é usada pela suíte.

As regressões da revisão da migração cobrem concorrência de cadastros distintos com o mesmo slug/matrícula gerados, preservação de IDs excluídos via `sqlite_sequence`, tabelas extras cujo nome começa por `sqlite` sem sublinhado, relatório apontando para hardlink da origem, falha de escrita do relatório após commit, demonstrações do domínio antigo, caracteres não ASCII em documentos, NUL em textos e precisão excessiva de timestamps.
