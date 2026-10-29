# Quiz de descoberta de causas

O quiz da SocialTrade aproxima respostas a dilemas de dez causas disponíveis no filtro de projetos. São dez perguntas originais com quatro alternativas cada. A sugestão serve para iniciar a exploração de iniciativas; não mede personalidade, qualidade dos projetos, impacto ou disposição real para doar.

## Pesquisa da referência e seus limites

A pesquisa de 27 de outubro de 2026 consultou recursos públicos do [Descubra Sua Causa](https://descubrasuacausa.net.br/), especialmente o [jogo](https://descubrasuacausa.net.br/jogo/), a [apresentação das causas](https://descubrasuacausa.net.br/causas/) e a [página Sobre](https://descubrasuacausa.net.br/sobre/). Não foram transmitidas respostas ao serviço.

A representação pública indexada do HTML do jogo contém 20 perguntas e 61 alternativas: 13 perguntas binárias e sete com três a seis opções. O conteúdo combina situações hipotéticas, preferências cotidianas, comportamento social, prioridades de cuidado e decisões diretamente relacionadas a causas. Essa alternância permite apresentar escolhas leves e perguntas que distinguem prioridades. A presença de todos os blocos no HTML extraído não comprova que o aplicativo apresente uma sequência fixa.

A página Sobre atribui ao Instituto MOL a elaboração das perguntas, da mecânica de pontuação e dos dez resultados. Ela descreve uma experiência lúdica, sem base científica ou de pesquisa. Os resultados apresentam caminhos de participação e conteúdo relacionado à causa.

As requisições HTTP diretas ao jogo e aos assets retornaram **403 / Vercel Security Checkpoint**. Foi possível analisar o conteúdo indexado, mas não obter e executar o JavaScript ou JSON da aplicação. **Pesos, cálculo final, desempate, persistência e ramificações da referência não foram verificados.** Não se tentou contornar a proteção. A quantidade de perguntas e os formatos observados não devem ser apresentados como prova desses mecanismos.

A SocialTrade aproveita a ideia geral de descobrir afinidades e encaminhar a ações concretas. As perguntas, os pesos e o tratamento de resultados descritos abaixo são decisões próprias. Os textos, as imagens, os nomes dos arquétipos e a estrutura visual da referência não foram reproduzidos.

## Dilemas e participação

Os dez dilemas tratam de custos que uma decisão transfere a outras pessoas ou seres, pertencimento, autonomia, cuidado, memória e efeitos que só aparecem com o tempo. Todas as alternativas defendem algo relevante e assumem uma concessão; não existe resposta correta. As associações às causas são editoriais e procuram tornar a reflexão menos direta do que pedir à pessoa que escolha uma categoria social pelo nome.

| Identificador | Reflexão proposta |
| --- | --- |
| `unseen-cost` | Custos ocultos de uma melhoria coletiva |
| `empty-place` | Barreiras que interrompem a participação e o pertencimento |
| `missing-voice` | Experiências que permanecem sem representação |
| `acceptable-delay` | Concessões entre rapidez, alcance e atenção |
| `fair-rule` | Regras iguais que produzem barreiras diferentes |
| `what-remains` | Vínculos, memória e autonomia diante de uma perda |
| `quiet-change` | Prevenção e mudanças que demoram a ser reconhecidas |
| `shared-space` | Negociação do uso de um recurso comum |
| `stay-or-grow` | Continuidade, crescimento e relações construídas |
| `ten-years-later` | Transformações que valem acompanhar no longo prazo |

A jornada tem ordem fixa. Selecionar uma alternativa destaca a escolha, sem avançar automaticamente; é preciso confirmá-la. Antes de confirmar, a pessoa pode mudar a seleção. Também pode voltar, revisar respostas e refazer o quiz. A confirmação de uma revisão substitui a resposta anterior daquela pergunta, sem somar as duas. O resultado exige uma resposta válida para cada um dos dez dilemas.

O quiz pode ser realizado sem cadastro. Seu estado é mantido na interface durante a jornada; o resultado é uma sugestão baseada nas escolhas feitas. A navegação para projetos aplica o código da causa ao filtro existente.

## Catálogo e pontuação

A fonte compartilhada das causas é `projectFilterCauseCodes`, em [catalog.ts](../frontend/src/lib/catalog.ts). O quiz usa exatamente as dez causas desse filtro, na mesma ordem:

| Código | Causa |
| --- | --- |
| `food` | Alimentação |
| `education` | Educação |
| `health` | Saúde |
| `housing` | Moradia |
| `children` | Crianças e adolescentes |
| `animals` | Animais |
| `environment` | Meio ambiente |
| `sports` | Esporte |
| `culture` | Cultura |
| `technology` | Tecnologia |

Cada alternativa atribui **quatro pontos a uma causa e um ponto a outra causa distinta**. Cada resposta confirmada distribui cinco pontos; dez respostas válidas distribuem **50 pontos**. A pontuação de uma causa é a soma das contribuições das alternativas escolhidas.

O desenho das 40 alternativas oferece a cada causa quatro associações de quatro pontos, uma em cada posição de resposta, e quatro associações de um ponto. A exposição agregada é, portanto, **20 pontos disponíveis por causa** entre todas as alternativas (`4 × 4 + 4 × 1`). Essa exposição descreve o catálogo completo, não os pontos recebidos por cada pessoa. Equilibrar posições e exposição não garante frequências iguais de resultado.

O percentual exibido representa a parcela dos 50 pontos atribuída a uma causa. Por exemplo, dez pontos correspondem a 20% dos pontos daquelas respostas. Esse número não é uma probabilidade estatística, uma medida de confiança científica nem uma estimativa de doação futura. O campo interno `confidence` também deriva dessa proporção e não estabelece qualquer dessas interpretações.

Os dilemas, as associações e os guias de tipos de projeto ficam em [cause-quiz.ts](../frontend/src/lib/cause-quiz.ts). Alterar perguntas, alternativas ou pesos exige rever a auditoria e os testes, mesmo que o total de pontos continue igual.

## Resultado e empates

As causas são ordenadas pela pontuação decrescente. Quando duas ou mais alcançam o maior valor, todas estão no mesmo nível: o quiz não encontrou um destaque exclusivo. A interface deve informar o empate e mostrar todas essas afinidades.

A ordem do catálogo é usada apenas para tornar a apresentação determinística e escolher qual guia abrir primeiro. O campo interno `primary` identifica esse primeiro guia; em um empate, ele não representa uma preferência superior às demais causas empatadas. A mesma ordem não deve ser interpretada como evidência adicional sobre a pessoa.

O resultado explica o significado da causa, oferece exemplos de tipos de projeto e permite explorar iniciativas relacionadas. As descrições são orientações de categoria: um projeto pode atuar em várias causas e deve ser conhecido pelas informações que apresenta.

## Auditoria combinatória

A enumeração das quatro alternativas de cada uma das dez perguntas cobre **1.048.576 sequências possíveis** (`4¹⁰`). Na matriz documentada aqui, **241.761 sequências têm empate na maior pontuação**. As demais 806.815 têm um único destaque. As dez causas podem vencer estritamente, conforme a contagem abaixo:

| Causa | Sequências com vitória estrita |
| --- | ---: |
| Alimentação (`food`) | 86.888 |
| Educação (`education`) | 81.368 |
| Saúde (`health`) | 86.954 |
| Moradia (`housing`) | 82.636 |
| Crianças e adolescentes (`children`) | 83.732 |
| Animais (`animals`) | 74.702 |
| Meio ambiente (`environment`) | 74.475 |
| Esporte (`sports`) | 75.878 |
| Cultura (`culture`) | 77.622 |
| Tecnologia (`technology`) | 82.560 |
| **Total de vitórias estritas** | **806.815** |
| **Empates no topo** | **241.761** |
| **Total de sequências** | **1.048.576** |

Vitória estrita significa pontuação maior que a de qualquer outra causa; os empates não foram atribuídos artificialmente a um vencedor nessa tabela. A auditoria verifica possibilidades da matriz e confirma que nenhum dos dez resultados está inacessível. Ela não representa uma amostra de pessoas, não supõe que as alternativas sejam escolhidas com a mesma frequência e não calibra estatisticamente as associações editoriais. Não permite inferir probabilidades reais de afinidade, engajamento ou doação.

## Contrato de verificação

As verificações automatizadas da entrega devem acompanhar o comportamento documentado:

- [Testes da lógica](../frontend/src/lib/cause-quiz.test.ts): dez dilemas com quatro opções, identidade com o catálogo do filtro, duas causas distintas por resposta, pesos quatro e um, total de 50 pontos, equilíbrio de exposição e posições, resultados possíveis, empates estáveis e rejeição de respostas incompletas ou inválidas.
- [Testes do componente](../frontend/src/components/cause-quiz.test.tsx): selecionar, alterar e confirmar escolhas; impedir avanço sem seleção; voltar e revisar sem duplicar pontuação; concluir, reconhecer empates, mostrar o guia e reiniciar.
- [Jornada de navegador](../frontend/e2e/public-navigation.spec.ts): completar as dez confirmações, ler a orientação do resultado e abrir a exploração de projetos com a causa correspondente ao filtro.

Os resultados das execuções devem constar na entrega. Este documento não declara que esses testes ou a validação completa foram aprovados. Os comandos, o banco exclusivo de testes e o wrapper obrigatório do E2E estão em [testes.md](testes.md). Alterações de comportamento exigem a validação prevista no [AGENTS.md](../AGENTS.md).
