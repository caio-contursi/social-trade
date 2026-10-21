# Instruções para agentes — SocialTrade

Este arquivo contém regras do repositório para qualquer agente que trabalhe no SocialTrade, independentemente da máquina, conta ou conversa usada. Aplica-se a todo o projeto; leia também os `AGENTS.md` das subpastas afetadas. As orientações locais complementam a política de testes abaixo.

## Regra obrigatória: feature nova exige testes automatizados

**Toda nova funcionalidade DEVE incluir testes automatizados específicos para seu comportamento, na mesma entrega ou pull request. Uma feature sem esses testes está incompleta.** Esta exigência também vale para novas pastas e serviços.

- Crie ou atualize testes que exercitem o comportamento acrescentado. A suíte antiga continuar passando não comprova que a feature nova foi testada.
- Cubra o fluxo principal e os cenários de erro, limites, permissões e privacidade pertinentes à mudança. Escolha as camadas adequadas conforme a tabela abaixo.
- Correções de bugs devem incluir um teste de regressão que reproduza o problema e proteja o comportamento corrigido.
- Os testes devem verificar resultados observáveis e detectar uma implementação incorreta. Evite testes que apenas repitam a implementação ou confirmem que mocks foram configurados.
- Build, verificação de tipos, testes manuais e porcentagens de cobertura não substituem testes automatizados da funcionalidade.
- Não remova testes, não adicione `skip` e não reduza limites de cobertura apenas para fazer a execução passar. Corrija a causa das falhas.
- Use dados fictícios, fixtures e bancos isolados. Não use credenciais de produção, pagamentos reais ou o banco local/de produção. Integrações externas devem usar mocks ou ambientes de teste com credenciais exclusivas de sandbox.

## Onde adicionar os testes

| Mudança | Testes esperados |
| --- | --- |
| API, validações, persistência, regras de negócio ou autorização | pytest em `tests/test_*.py`, usando as fixtures de `tests/conftest.py`. |
| Componentes, formulários, sessão, cliente HTTP ou lógica do frontend | Vitest + Testing Library em `frontend/src/**/*.test.ts` ou `frontend/src/**/*.test.tsx`. |
| Nova jornada de usuário ou mudança de integração entre frontend e API | Cenários Playwright em `frontend/e2e/**/*.spec.ts`, além dos testes das camadas alteradas. |

Use a estrutura existente antes de introduzir outra ferramenta. Se criar um novo serviço com outro executor de testes, configure os testes desse serviço e inclua-os na validação automatizada do projeto. A cobertura atual do Vitest acompanha módulos críticos selecionados; não a apresente como cobertura de toda a interface. Ao acrescentar módulos, mantenha o escopo de cobertura coerente com a lógica testada.

## Ambiente e comandos

A aplicação atual usa FastAPI + PostgreSQL, SQLAlchemy 2 e Alembic em `app/` e Next.js + TypeScript + Tailwind CSS + shadcn/ui em `frontend/`. Use Python 3.12 e Node.js 24 para reproduzir a CI. Leia [README.md](README.md) e [docs/testes.md](docs/testes.md) para preparar o ambiente, instalar dependências e selecionar outro Python ou portas de teste.

Configure `SOCIALTRADE_TEST_DATABASE_URL` com uma URL `postgresql+psycopg://` de PostgreSQL exclusivo de testes. Pytest e E2E criam schemas próprios e nunca usam a URL normal da aplicação como alternativa. A CI usa PostgreSQL 17. Não valide persistência em SQLite fingindo ser PostgreSQL.

Com o ambiente virtual Python ativado, na raiz:

```sh
python -m pip install -r requirements-dev.txt
```

Dentro de `frontend/`:

```sh
npm ci
npx playwright install chromium
```

No Linux, a instalação do navegador pode exigir `npx playwright install --with-deps chromium`, conforme o guia de testes.

| Verificação | Diretório | Comando |
| --- | --- | --- |
| API com cobertura mínima e relatórios | Raiz | `python -m pytest --cov=app --cov-report=term-missing --cov-report=xml:reports/api-coverage.xml --cov-fail-under=90 --junitxml=reports/api-junit.xml` |
| Frontend com cobertura | `frontend/` | `npm run test:coverage` |
| TypeScript | `frontend/` | `npm run typecheck` |
| Jornadas de navegador | `frontend/` | `npm run test:e2e` |
| Validação completa: API, tipos, frontend, build e E2E | `frontend/` | `npm run test:all` |

Execute os testes pertinentes durante o desenvolvimento e a validação completa antes de entregar uma alteração de comportamento. O runner completo procura o Python em `.venv` na raiz, aceita `SOCIALTRADE_TEST_PYTHON` e usa `python` do PATH como alternativa.

O E2E deve ser iniciado pelo comando `npm run test:e2e` ou pelo runner completo. Não execute `npx playwright test` diretamente: o wrapper cria um schema PostgreSQL exclusivo, configura a API, separa o build e gerencia os servidores de teste.

Mudanças exclusivamente em documentação não exigem criar testes de aplicação nem executar a suíte completa; confira o conteúdo, os links e os comandos afetados.

## Critérios de conclusão e entrega

Antes de declarar uma feature concluída:

1. Inclua os testes automatizados da feature junto do código e execute-os.
2. Execute as verificações acima e corrija as falhas causadas pela mudança.
3. Informe na entrega ou no PR quais comportamentos foram testados, os comandos executados e seus resultados.
4. Se um bloqueio de ambiente persistir após tentar resolvê-lo, informe o impedimento e as verificações pendentes. Não declare aprovação de testes que não foram executados nem considere a validação concluída.

A CI em `.github/workflows/testes.yml` executa os testes em pushes e pull requests. Ela não comprova, sozinha, que cada nova feature recebeu testes adequados; essa correspondência também deve ser revisada no diff.

Use commits focados, em português, no padrão Conventional Commits, por exemplo `feat(perfil): permite atualizar a apresentação do projeto` e `test(perfil): cobre atualização e permissões do perfil`. Código e testes podem estar em commits separados, desde que integrem a mesma entrega.
