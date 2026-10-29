# Design do SocialTrade

Guia visual da interface em `frontend/`. Descreve a direção, os tokens, a composição de cada tela e os critérios para aceitar mudanças visuais. Os valores de verdade ficam em `frontend/src/app/globals.css` (tokens e classes) e `frontend/src/lib/causes.ts` (cores das causas).

## Ideia: a ponte

O SocialTrade liga quem apoia (empresas e pessoas) a quem transforma (projetos sociais). A interface usa uma linguagem editorial e calorosa, de publicação de impacto, em vez do visual genérico de painel:

- **Papel, floresta e tinta.** O cabeçalho translúcido e o rodapé usam creme; a apresentação institucional usa verde claro com painéis floresta, e a descoberta de projetos inverte essa relação. As superfícies verdes claras usam tinta escura; as escuras usam texto claro.
- **Uma cor de energia.** Âmbar marca a ação principal, estados selecionados e foco em blocos escuros. O verde marca links e ações secundárias, sempre com contraste legível.
- **Cada causa com sua cor.** Os projetos ainda não têm fotos; a capa do card usa a cor e o ícone da causa principal, com um padrão de pontos.
- **Títulos com voz.** Serifada editorial (Fraunces) nos títulos; DM Sans no texto corrido e nos controles.
- **A marca é uma ponte:** um arco ligando dois pontos âmbar (`BrandMark` em `components/brand.tsx`). O favicon usa a mesma marca, com traço mais grosso para ficar legível em 16 px: `app/icon.svg` (navegadores atuais), `app/favicon.ico` (16, 32 e 48 px, para os antigos) e `app/apple-icon.png` (180 px, sem cantos, porque o iOS arredonda sozinho). O Next gera as tags `<link>`; o teste `e2e/icones.spec.ts` confere que elas existem e respondem como imagem.

## Princípios

1. **Honestidade visível.** Nada de números, depoimentos, logotipos de parceiros ou selos inventados. Demonstração, imagem ilustrativa e recursos ainda não disponíveis sempre aparecem sinalizados. Selos de disponibilidade qualificam funcionalidades, nunca validam organizações.
2. **Contraste primeiro.** Texto com 4,5:1 (AA) no claro e no escuro, inclusive o secundário. Contornos de campos e indicadores de foco com 3:1 contra o fundo ao lado. Cor nunca é a única pista (causas também têm nome e ícone).
3. **Uma ação principal por bloco.** Os demais caminhos são links ou botões secundários.
4. **Mesmo vocabulário em todas as telas.** Os componentes públicos usam superfícies, raios, bordas e sombras compartilhados (`.public-card` e `.public-card-quiet`). Os componentes de `components/ui` herdam os tokens; cores de marca ficam em `globals.css` e as cores próprias das causas em `lib/causes.ts`. `color-scheme` acompanha o tema no documento para que controles nativos também usem a paleta correta.

## Tokens

Contrastes medidos pela fórmula da WCAG, no formato claro / escuro.

| Token | Claro | Escuro | Uso e contraste |
| --- | --- | --- | --- |
| `--background` (papel) | `#f6f2e9` | `#0f1d1a` | fundo neutro de páginas e superfícies de apoio |
| `--card` | `#fbf9f3` | `#162824` | cartões e painéis neutros |
| `--foreground` (tinta) | `#12302a` | `#eef3ee` | texto: 12,7 / 15,4 sobre o fundo |
| `--muted-foreground` | `#4f625b` | `#a9bdb4` | texto secundário: 5,8 / 8,8 sobre o fundo; 5,6 sobre `--muted` |
| `--primary` | `#155e52` | `#7fd3b8` | marca, botões e links: 6,8 / 9,8 sobre o fundo |
| `--primary-foreground` | `#ffffff` | `#0f1d1a` | texto do botão primário: 7,6 / 9,8 |
| `--secondary` / `--muted` / `--accent` | `#e8eee3` / `#eaf0e6` / `#e1ebdf` | `#213833` / `#1a2f2a` / `#23403a` | superfícies de apoio, nunca contorno funcional |
| `--border` | `#b9c9b7` | `#2e4740` | divisória e borda de cartões; contornos de campos usam `--input` |
| `--input` | `#8f8676` | `#6a8a80` | contorno funcional de campos, selects e checkboxes: 3,2 / 4,1–4,6 |
| `--ring` | `#1b6957` | `#7fd3b8` | cor do foco sobre papel e cartões verdes claros: 5,1 / 9,8 |
| `--focus-ring` | `var(--ring)` | `var(--ring)` | cor efetiva do foco; vira `var(--energy)` dentro de `.ink-panel` e `.on-ink` (7,7:1) |
| `--energy` (âmbar) | `#f2b53c` | `#f5c463` | ação e ênfase (veja a regra do âmbar) |
| `--energy-foreground` | `#2b1e04` | `#2b1e04` | texto sobre âmbar: 8,9 / 10,0 |
| `--ink-panel` | `#193c31` | `#0b1614` | blocos escuros e barra lateral do painel |
| `--ink-panel-foreground` | `#eef3ee` | `#eef3ee` | texto nos blocos escuros |
| `--forest` / `--forest-surface` | `#193c31` / `#285842` | `#091410` / `#14251d` | blocos escuros e cartões internos |
| `--surface-green` / `--surface-green-raised` | `#dae7d0` / `#e6efdf` | `#15241f` / `#1d3028` | apresentação e cartões de descoberta |
| `--surface-green-foreground` / `--surface-green-muted` | `#17392e` / `#405a49` | `#e8f0eb` / `#b6c7bd` | texto principal e secundário das superfícies verdes |
| `--surface-green-accent` / `--moss-highlight` | `#285842` / `#c9dda9` | `#83d6b7` / `#c4dda2` | links e destaques sobre as superfícies públicas |
| `--cream` | `#f6efe2` | `#17231f` | rodapé e base translúcida do cabeçalho |
| `--cream-foreground` / `--cream-muted` / `--cream-link` | `#17392e` / `#485f50` / `#344e40` | `#eaf0eb` / `#b6c4bb` / `#c2d2c8` | texto, observações e links no rodapé |
| `--color-logo-surface` | `#ffffff` | `#ffffff` | quadro dos logotipos, claro nos dois temas |

**Contexto escuro (`.ink-panel`, `.on-ink`).** Texto principal em `--ink-panel-foreground`; secundário em `text-ink-foreground/75` (≈ 8,4:1); sobretítulo, links de destaque e palavra de ênfase em âmbar (7,7:1); foco em âmbar. Na barra lateral do painel, o item ativo tem fundo âmbar com `--energy-foreground` (8,9:1) e mantém `aria-current="page"`; os demais itens usam `text-sidebar-foreground/80`.

**Regra do âmbar.** Âmbar sobre o papel tem só 1,7:1, então no fundo claro nunca é texto nem a única pista de nada: só traço decorativo, fundo de botão com texto escuro ou ponto ao lado de um rótulo. Texto em âmbar só no contexto escuro.

**Foco.** Contorno opaco de 2 px com afastamento de 3 px em todo elemento com `:focus-visible`, na cor `--focus-ring`. A regra fica fora de `@layer` em `globals.css` de propósito: regras sem camada vencem as utilidades do Tailwind 4, então o `outline-none` dos componentes do shadcn não apaga o contorno (o halo `ring-ring/50` continua só como reforço). O teste `e2e/foco.spec.ts` confere o contorno nos botões e campos sobre o papel, nos blocos escuros, na barra lateral e no menu móvel do painel.

**Páginas públicas.** A página inicial usa `--surface-green` no fundo e `--forest` nos blocos principais; a descoberta inverte os planos. Cartões, filtros, convite e prévia do quiz compartilham `.public-card`, com superfície verde clara, borda de musgo e sombra discreta. O quiz usa `.public-card-quiet` nas etapas para criar hierarquia sem introduzir outra cor. Cabeçalho e rodapé usam o mesmo creme; o cabeçalho combina transparência e desfoque para preservar contexto sem perder contraste.

Raio base `0.9rem`; botões em pílula. Sombras suaves, só em elementos que respondem ao toque.

## Tipografia

- **Fontes:** Fraunces (`@fontsource-variable/fraunces`, arquivos `full.css` e `full-italic.css`, eixos `wght`, `opsz` e `SOFT`; reserva Georgia) nos títulos; DM Sans (`@fontsource-variable/dm-sans`) no resto. As duas são instaladas como pacotes, sem depender de rede no build.
- **Escala editorial** (páginas públicas): `.display-1` `clamp(2.75rem, 6vw, 5rem)`, entrelinha 1,02, peso 500, só no título principal da página inicial; `.display-2` `clamp(2rem, 4vw, 3.25rem)`, entrelinha 1,08, nos títulos de seção pública e no h1 de explorar e do perfil.
- **Escala operacional** (login, painel, formulários): `.page-title` 32–40 px, peso 500; seções do painel 20–34 px; controles e dados em DM Sans. Títulos de dados (indicadores) em Fraunces 36 px com `tabular-nums`.
- **Espaçamento de letras:** `-0.02em` em h1/h2 (a serifada não aguenta o `-0.045em` da versão anterior).
- **Ênfase (`.title-mark`):** no papel, itálico na cor primária com traço âmbar decorativo; no contexto escuro, itálico âmbar. Uma ênfase por título.
- Nomes longos de projeto quebram com `text-wrap: balance`; títulos de card ficam em 23 px.

## Cores das causas

Definidas em `frontend/src/lib/causes.ts`. O teste `causes.test.ts` garante que toda causa do catálogo tem cor, ícone e nome, que as capas são diferentes entre si e que a tinta passa de 4,5:1 sobre a capa nos dois temas. Código desconhecido (inclusive nomes herdados do `Object`, como `toString`) cai na capa neutra (`bg-secondary text-secondary-foreground`, "Iniciativa social").

| Causa | Capa / tinta (claro) | Capa / tinta (escuro) | Ícone |
| --- | --- | --- | --- |
| Alimentação | `#fbe1cc` / `#8f3a10` | `#3d2416` / `#f6c8a3` | Utensils |
| Educação | `#dbe5fb` / `#22409a` | `#1c2747` / `#b9cdfa` | GraduationCap |
| Saúde | `#f9dbe5` / `#9c2149` | `#3d1a27` / `#f5b6cb` | HeartPulse |
| Moradia | `#f1e2d1` / `#71441b` | `#33261a` / `#e9cda9` | House |
| Crianças e adolescentes | `#fdeeb8` / `#7a5600` | `#362b0b` / `#f6dc8a` | Baby |
| Pessoas em situação de rua | `#e6e0f6` / `#4a3692` | `#261f44` / `#cdc2f5` | HandHeart |
| Animais | `#d5efe9` / `#125f55` | `#133430` / `#9fe0d2` | PawPrint |
| Meio ambiente | `#dcefd9` / `#28652b` | `#17321a` / `#b2e0b0` | Leaf |
| Esporte | `#d6eff9` / `#0b5b7a` | `#0f2d3a` / `#a6dcf1` | Trophy |
| Cultura | `#f4dcf0` / `#842a77` | `#36172f` / `#efb6e3` | Palette |
| Tecnologia | `#e1e7ee` / `#30445a` | `#1e2834` / `#c3d0de` | Cpu |
| Apoio emergencial | `#fbd9d3` / `#9b2718` | `#3e1a15` / `#f5b4a8` | LifeBuoy |

O padrão de pontos (`.dot-pattern`, opacidade 13%) fica atrás do ícone, nunca atrás de texto; o rótulo da causa na capa tem fundo próprio (`bg-card/90`).

## Telas

**Início** (`app/page.tsx`), nesta ordem: (1) topo com sobretítulo, título `.display-1`, uma frase, ação principal "Encontrar um projeto" e secundária "Sou um projeto social", e os dois lados da ponte (quem apoia, projetos); à direita, a foto com o selo "Imagem ilustrativa" e o cartão "O impacto começa com uma conexão"; (2) faixa com as 12 causas, cada uma levando a `/projetos?causa=`; (3) até dois projetos reais e o cartão "Espaço para novas histórias" (sem projetos fictícios); (4) como funciona, em três passos; (5) bloco escuro de transparência, separando "Disponível agora" de "Próximos passos, ainda não disponíveis"; (6) dois cartões de fechamento, um por lado, cada um com uma ação. No celular a ordem é a mesma, empilhada.

**Explorar** (`components/project-explorer.tsx`): hoje há busca em pílula por nome, cidade ou palavra, seguida de três selects compactos (causa, localidade, ordem). A evolução planejada acrescenta filtro por tipo de projeto e categorias temáticas sugeridas por IA, como atalhos combináveis com a busca. Essas categorias não validam a qualidade do projeto; a ordenação poderá considerar uma avaliação humana interna, sem exibir nota, rótulo ou motivo ao público. Os títulos acompanham a hierarquia: h1 da página, h2 "Projetos encontrados" (só para leitores de tela) e h3 em cada card e no convite. Resultados: com zero, um cartão de estado vazio com "Limpar filtros" (com filtros) ou "Cadastrar meu projeto" (sem projetos); com um ou dois, o convite "Seu projeto também pode estar aqui" entra na grade para não deixar o card isolado; com três ou mais, o convite vira faixa no fim. O escopo da avaliação e descoberta está em [avaliação e descoberta de projetos](avaliacao-e-descoberta-de-projetos.md).

**Perfil do projeto** (`app/projetos/[slug]/page.tsx`): cabeçalho em cartão com tipo, selo de demonstração, nome em `.display-2`, resumo, cidade, ano e causas, e a capa da causa à direita. Coluna principal: aviso de demonstração (quando houver), história, objetivo e ações apresentadas, com a frase "Informações declaradas pelo próprio projeto". Lateral: o contato como bloco escuro (ação principal em âmbar) e um único cartão "Sobre este perfil", que junta preenchimento, o aviso de que preenchimento não é certificação e a transparência em construção.

**Login e cadastro** (`components/auth/auth-shell.tsx`): painel lateral escuro com a marca e a proposta; formulário no papel, em largura de leitura. Os rótulos dos campos não mudam (os testes dependem deles).

**Painel** (`components/workspace/shell.tsx` e `dashboard.tsx`): barra lateral escura fixa em altura total; cabeçalho fixo e translúcido com o nome em Fraunces e o avatar na cor primária; destaque do topo como bloco escuro com uma ação em âmbar; indicadores em cartões com números em Fraunces.

**Editor de organização** (`components/workspace/organizations.tsx`): diálogo de até 90% da altura, com rolagem interna e seções numeradas (`fieldset` + `legend`). As ações (Cancelar, Salvar) ficam fixas no rodapé do diálogo, sempre à vista no celular e com teclado aberto. Campos de texto obrigatórios usam a validação nativa, que leva o foco ao primeiro inválido. Estado (select) e áreas (checkboxes) não têm validação nativa: o erro aparece no próprio campo (ligado por `aria-describedby`), o campo recebe `aria-invalid` e o foco vai até ele com rolagem. O aviso geral e o erro do servidor aparecem em `FormError` (alerta) dentro do rodapé fixo, junto das ações. Coberto por `components/workspace/organizations.test.tsx`. Os recursos de interesse mostram os três estados da API: "Disponível", "Em breve" e "Planejado, sem previsão" (`serviceStatusLabel` em `lib/catalog.ts`).

## Card de projeto

Capa da causa principal (`areas[0]`); um `logo_url` válido (http ou https) aparece sobre a capa, num quadro branco (`bg-logo-surface`, também no tema escuro, para logotipos escuros com transparência), e, se a imagem falhar, a capa fica só com o ícone. Selo "Demonstração" legível quando `is_demo`. Título em Fraunces com link para o perfil, cidade, até duas causas (com ponto na cor da causa) e "+N causas", e o link "Conhecer o projeto".

## Critérios de aceitação de mudanças visuais

- Conferir em claro e escuro, no computador (1440 px) e no celular (390 px), sem rolagem horizontal até 320 px de largura.
- Navegar por teclado: foco visível em todos os controles, inclusive nos blocos escuros e no menu do celular.
- Testar nomes longos de projeto, perfil sem logotipo, logotipo quebrado e estados vazio, carregando e erro.
- Rodar `npm run test:all`. Comportamento novo ou corrigido leva teste próprio, conforme o `AGENTS.md`: hoje, cores e contraste das causas (`lib/causes.test.ts`), estados dos recursos (`lib/catalog.test.ts`), erros e foco do editor de organização (`components/workspace/organizations.test.tsx`) e contorno de foco (`e2e/foco.spec.ts`).

## Fora do escopo

Fotos reais de projetos, números de impacto e depoimentos dependem de dados que a plataforma ainda não tem; quando existirem, entram no lugar das capas por causa.
