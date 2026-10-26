# Avaliação interna e descoberta de projetos

## Escopo aprovado para planejamento

Este documento descreve uma etapa futura. A avaliação interna, a categorização assistida por IA e a ordenação de resultados ainda não estão implementadas. Nenhuma classificação deve ser apresentada como validação jurídica, fiscal, auditoria independente ou garantia de que os recursos foram usados corretamente.

O desenho separa três responsabilidades:

1. **Categorização assistida por IA:** sugerir áreas, temas e termos de busca a partir das informações públicas do projeto. A IA não analisa comprovantes para aprovar despesas, não valida os critérios de acompanhamento e não declara que um projeto é idôneo ou que aplicou corretamente uma doação.
2. **Avaliação interna por pessoas responsáveis pela plataforma:** registrar evidências, pendências, divergências, esclarecimentos e revisões humanas segundo critérios definidos pela equipe. Essa avaliação e seus detalhes ficam restritos às pessoas autorizadas a manter a SocialTrade.
3. **Descoberta e ordenação:** a IA pode apoiar a categorização e a ordenação dos resultados de cada busca, combinando a correspondência da consulta com as categorias e a avaliação interna já registrada por pessoas. Projetos com acompanhamento interno mais consistente podem receber maior destaque; casos com pendências ou evidência insuficiente podem aparecer com menor frequência. A IA não calcula, valida nem altera essa avaliação. O resultado não exibe nota, rótulo de qualidade, motivo da posição ou estado interno nem para doadores nem para os próprios projetos.

A categorização pode ajudar a encontrar iniciativas relevantes, mas não substitui a leitura do perfil. A equipe deve conseguir revisar as categorias sugeridas e corrigir erros. A avaliação que afeta a visibilidade permanece sob responsabilidade humana, com histórico e possibilidade de revisão; a IA apenas usa esse resultado como um dos fatores de ordenação.

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
- Preservar relevância da busca: a avaliação interna pode influenciar destaque, mas não deve ocultar permanentemente projetos nem substituir filtros explícitos por causa e localização.

## Fora da implementação atual

Não há, nesta etapa, upload ou análise de evidências financeiras, nota de avaliação, ranking interno, categorização por IA, ajuste de frequência nos resultados, integração com PSP ou Pix para tesouraria SocialTrade. O Pix atualmente disponível registra uma transferência direta para a instituição beneficiária. A futura modalidade de tesouraria depende de decisões próprias sobre conta recebedora, custódia, conciliação, repasse e responsabilidades.
