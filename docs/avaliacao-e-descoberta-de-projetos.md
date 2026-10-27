# Avaliação interna e descoberta de projetos

## Escopo aprovado para planejamento

Este documento descreve uma etapa futura. A avaliação interna, a categorização assistida por IA e a ordenação de resultados ainda não estão implementadas. Nenhuma classificação deve ser apresentada como validação jurídica, fiscal, auditoria independente ou garantia de que os recursos foram usados corretamente.

O desenho separa três responsabilidades:

1. **Categorização assistida por IA:** sugerir áreas, temas e termos de busca a partir das informações públicas do projeto. A IA não declara que um projeto é idôneo nem certifica que uma despesa foi correta.
2. **Avaliação interna assistida por IA:** futuramente, produzir uma avaliação confidencial de 0 a 5 estrelas com base em critérios versionados pela equipe, como confirmação de recebimentos, relação entre despesas e finalidade, notas fiscais, registros de entrega, fotos e outras mídias. A falta de um documento ou mídia não significa fraude nem deve, sozinha, zerar a avaliação. Evidências contraditórias, baixa confiança ou pendências devem ser encaminhadas para revisão humana, com oportunidade de esclarecimento pelo projeto.
3. **Revisão humana e governança:** pessoas autorizadas definem critérios, verificam casos sinalizados, podem corrigir ou contestar a recomendação da IA e registram justificativa, responsável e histórico de alterações. A pontuação não é auditoria independente, validação jurídica ou fiscal, nem garantia de uso correto dos recursos.
4. **Priorização de doações indiretas:** quando a modalidade de recebimento e repasse estiver disponível, a avaliação interna poderá ser um fator para priorizar projetos elegíveis da categoria escolhida. Elegibilidade de recebimento, correspondência da categoria e distribuição de valores são regras distintas da pontuação. A regra de rateio e desempate deve ser definida antes de movimentar recursos.

**Confidencialidade obrigatória:** nota, critérios preenchidos, evidências, justificativas, sinais da IA, confiança e histórico são dados internos. Não podem ser retornados por endpoints públicos, APIs de doadores/projetos, busca, perfis, HTML/metadata, recibos ou mensagens visíveis a usuários comuns. O acesso deve ser autorizado no servidor somente para funções internas explicitamente permitidas e registrado para auditoria. Ocultar o campo apenas por CSS ou pela interface não atende a esse requisito.

A categorização pode ajudar a encontrar iniciativas relevantes, mas não substitui a leitura do perfil. A equipe deve conseguir revisar as categorias sugeridas e corrigir erros. A avaliação interna usada para prioridade deve ter histórico e possibilidade de revisão humana. A pontuação não será publicada nem usada como selo de qualidade.

## Modelo confidencial de avaliação e prioridade

Estrutura conceitual para uma etapa futura, ainda não implementada:

- Cada avaliação pertence a um projeto e a uma versão identificada dos critérios; guardar a recomendação de 0 a 5, o momento e versão do modelo de IA, os critérios considerados, estado de revisão, confiança quando disponível e eventual decisão/justificativa humana.
- Evidências devem ser registros separados com tipo, período, relação com a doação ou finalidade, estado de revisão e referência a arquivo privado. Não guardar cópias públicas nem incluir links temporários em payloads públicos.
- Cada nova avaliação ou revisão cria histórico; não sobrescrever a decisão anterior. Mudança de critérios/modelo não deve reescrever avaliações antigas silenciosamente.
- O serviço de priorização consulta esses dados no servidor e devolve apenas o resultado operacional necessário para montar a alocação. Não devolve estrelas ou motivos ao doador, ao projeto beneficiário ou à página pública.
- A futura modalidade indireta deve registrar o valor total, moeda, categoria, conjunto de projetos elegíveis, regra de rateio e alocações por projeto, além do estado de cada repasse. A regra para escolher quantidade de projetos, dividir centavos restantes, lidar com projeto inelegível após pagamento, falha/estorno e prestação de contas ainda precisa ser definida.
- Não habilitar captação central ou distribuir dinheiro até estarem definidos recebedor jurídico, PSP/conta, custódia, liquidação, conciliação, taxas, falhas/estornos, termos e revisão especializada do modelo financeiro.

## Jornada de pesquisa para doadores

Empresas e pessoas físicas terão acesso à mesma descoberta de projetos. A tela deve oferecer três caminhos, combináveis entre si:

1. **Busca digitada:** procurar um projeto pelo nome ou descrever uma iniciativa, causa ou objetivo de interesse em linguagem comum.
2. **Filtros explícitos:** refinar por tipo de projeto/instituição, área de atuação e localidade. O tipo institucional deve usar opções padronizadas do cadastro; as categorias temáticas sugeridas por IA são um filtro distinto.
3. **Categorias rápidas:** escolher, com poucos cliques, temas sugeridos pela categorização assistida por IA para chegar a projetos relacionados aos interesses de quem pesquisa.

As categorias devem ter nomes claros e servir como atalhos de navegação. A interface pode combinar categoria, termo digitado, tipo e localidade, além de permitir remover cada seleção e limpar todos os filtros. A busca deve explicar quando não encontrar resultados e oferecer um caminho simples para tentar outra categoria ou consulta.

A busca atual já tem texto livre, filtro de causa, localidade e ordenação recente/alfabética. Filtro por tipo de projeto e categorias geradas por IA são planejados, não estão implementados. A IA pode apoiar a relevância da busca usando consulta e dados públicos; a avaliação confidencial não altera resultados públicos e só poderá priorizar a alocação de doações indiretas.

## Critérios de acompanhamento sugeridos

Cada critério deve admitir **não avaliado**, **evidência recebida**, **em revisão**, **precisa de esclarecimento** e **revisado pela equipe**. Um item sem evidência não deve ser automaticamente descrito como fraude ou irregularidade.

| Critério | Evidências que podem ser consideradas | Limite da evidência |
| --- | --- | --- |
| Comprovação da despesa | Nota fiscal, recibo ou contrato com data, valor, fornecedor e descrição | O documento não prova sozinho que o item foi entregue ou usado no projeto. |
| Relação com a finalidade | Comparação entre a despesa, o objetivo público do projeto e a destinação combinada para aquela doação | Divergência exige contexto e pedido de esclarecimento antes de uma conclusão. |
| Recebimento do item ou serviço | Registro de entrega, declaração de responsável, comprovante do fornecedor ou evidência da atividade | Uma declaração isolada pode exigir confirmação adicional. |
| Fotos e mídias de contexto | Imagem ou vídeo com projeto, local, período e descrição da atividade | Mídia contextualiza; não comprova sozinha compra, valor, titularidade ou uso integral. Avaliar consentimento e exposição de pessoas atendidas. |
| Prestação por etapa | Valor destinado, despesas vinculadas, saldo e itens ainda pendentes | Não misturar doações e períodos diferentes; saldo não utilizado não é automaticamente irregular. |
| Coerência dos registros | Compatibilidade de valores, datas, comprovantes, entregas e atualizações | Inconsistências são sinais para revisão, não uma conclusão automática. |
| Pendências e resposta | Solicitações de informação, prazo, resposta e correção apresentada | Registrar o contexto e permitir que o projeto esclareça fatos antes de reduzir sua visibilidade. |
| Revisão humana e trilha | Responsável, data, decisão, justificativa e alterações posteriores | Preservar histórico para auditoria interna e reduzir decisões arbitrárias. |

## Privacidade e governança

- Proteger notas, recibos, contratos, mídias, dados pessoais e observações internas com controle de acesso por função e registro de consultas e alterações.
- Não incluir evidências privadas nem avaliação interna nas respostas públicas, no perfil do projeto, no painel do doador, em metadados HTML ou em APIs acessíveis a essas contas.
- Definir finalidade, retenção, exclusão, correção, contestação e tratamento de dados de pessoas retratadas antes de receber documentos e mídias em produção.
- Documentar os fatores de ordenação para a equipe, monitorar erros e efeitos desiguais entre projetos grandes e pequenos e permitir revisão humana de casos sinalizados.
- Não transformar ausência de documentação, porte, região, popularidade ou qualidade de produção audiovisual em prova de uso indevido.
- Preservar a busca pública separada: a avaliação interna não altera a ordem, a frequência ou a visibilidade pública dos projetos; sua única finalidade futura de priorização será a alocação interna de doações indiretas.

## Fora da implementação atual

Não há, nesta etapa, categorização ou pontuação por IA, upload/análise de evidências financeiras, ranking de prioridade, integração com PSP ou Pix para tesouraria SocialTrade, carteira Solana ou rateio automático. O Pix atualmente disponível registra uma transferência direta para a instituição beneficiária. A futura modalidade central depende de decisões próprias sobre conta recebedora, custódia, conciliação, repasse e responsabilidades.
