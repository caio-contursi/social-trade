# Mapa financeiro e jurídico do MVP SocialTrade

**Atualizado em 25/10/2026.** Este documento organiza decisões de produto e riscos para discussão. É orientação de planejamento, não parecer jurídico, contábil ou tributário. A resposta concreta depende da pessoa jurídica, do regime tributário, do projeto, do contrato e do fluxo real do dinheiro.

## Resumo executivo

O caminho de menor complexidade para validar o MVP é manter o SocialTrade como catálogo e ferramenta de registro/acompanhamento, com doação Pix feita pelo doador diretamente para a conta da instituição beneficiária. A plataforma não recebe nem guarda o dinheiro, não cobra taxa nesta etapa e não promete dedução ou redução de imposto. O recibo SocialTrade deve continuar identificado como registro/declaração privada, sem se apresentar como comprovante bancário ou documento fiscal.

Não há um benefício fiscal geral aplicável a toda doação, empresa, projeto ou tamanho empresarial. Há incentivos legais específicos, com destinatários, aprovações, limites e procedimentos próprios. O regime tributário e os requisitos do programa importam mais que chamar uma empresa de pequena, média ou grande. Doação comum não deve ser anunciada como dedutível. A Receita Federal lista modalidades incentivadas; a Lei nº 9.249/1995 também contém hipótese específica para certas doações empresariais a entidades sem fins lucrativos, com condições e limite próprios. Cada caso deve ser confirmado por quem responde pela escrituração tributária da empresa doadora.

Se o produto futuramente receber dinheiro em conta SocialTrade e repassar ao projeto, isso muda o fluxo e pode mudar o enquadramento regulatório, operacional, fiscal e contratual. Não basta abrir uma conta bancária comum e chamar o saldo de tesouraria: antes é necessário desenhar o modelo e obter análise especializada. O Banco Central explica que alguns marketplaces que recebem e repassam pagamentos podem atuar como subcredenciadores, conforme o modelo.

## Decisões para o MVP

| Tema | Decisão simples recomendada | O que evitar agora |
|---|---|---|
| Fluxo do dinheiro | Pix sai da conta do doador e vai diretamente para conta/chave de titularidade da instituição beneficiária, revisada por pessoa autorizada | Tesouraria SocialTrade, saldo de usuário, repasse manual, conta de terceiro ou mistura com despesas da plataforma |
| Taxa SocialTrade | Não cobrar taxa sobre o valor doado neste MVP | Descontar comissão, “taxa administrativa” ou retenção sem modelo, contrato e avaliação fiscal/regulatória definidos |
| Benefício fiscal | Aviso explícito de que a plataforma não garante dedução, redução de imposto ou incentivo | Promessas como “doe e abata do IR”, percentuais universais ou recibo apresentado como certificado fiscal |
| Comprovantes | Doador guarda comprovante emitido pelo banco; SocialTrade emite apenas registro privado após confirmação pelo beneficiário | Chamar registro de recibo fiscal, nota fiscal, auditoria ou confirmação bancária independente |
| Cadastro de beneficiário | Conferência humana documentada de cadastro, identidade da organização e titularidade da conta/chave | Exibir selo “verificado” sem explicar exatamente o que foi conferido ou sem trilha da revisão |
| Pesquisa e IA | Categorias sugeridas a partir de informações públicas, com revisão humana | IA decidir idoneidade, uso correto de recursos, elegibilidade jurídica ou avaliação fiscal |
| Evidências e avaliação | Manter avaliação interna com acesso restrito, histórico, oportunidade de esclarecimento e sem acusação automática | Publicar notas internas, expor comprovantes/dados de atendidos ou reduzir visibilidade só por falta de mídia |
| Cripto/Solana | Não movimentar ativos neste MVP | Custódia de chaves, conversão, câmbio, reembolso ou divulgação de hash como prova de que a finalidade social foi cumprida |

O fluxo Pix direto já descrito em `docs/doacoes-pix.md` é coerente com esse escopo. A rota de tesouraria permanece como etapa futura e separada.

## Tópicos que exigem atenção

### 1. Regime fiscal e alegações de benefício

- Deduções incentivadas são vinculadas a mecanismos previstos em lei e a condições específicas. A Receita Federal enumera fundos e programas, como fundos dos direitos da criança/adolescente e da pessoa idosa, cultura, audiovisual, esporte, reciclagem e programas de saúde. Limites agregados podem variar por modalidade e período.
- Para pessoas físicas, uma transferência direta para qualquer ONG não equivale automaticamente a uma doação incentivada. A Receita distingue doação incentivada de despesas dedutíveis e descreve modalidades próprias.
- Para empresas, regime tributário, lucro apurado, aprovação do projeto/fundo, limite, forma e prazo da contribuição podem ser determinantes. A Lei nº 9.249/1995 prevê uma hipótese específica de doação empresarial a certas entidades civis sem fins lucrativos, limitada a 2% do lucro operacional e sujeita a requisitos, incluindo depósito diretamente em conta da entidade. Isso não transforma qualquer Pix para qualquer projeto em dedução garantida.
- Porte empresarial, isoladamente, não resolve a elegibilidade. Uma empresa pequena, média ou grande pode estar em regimes diferentes; o caminho fiscal depende do enquadramento e do mecanismo aplicável.
- Incentivos descritos nas fontes consultadas não são uma obrigação geral para que todas as empresas façam doações. Não comunicar participação como dever legal universal. Leis setoriais, contratos públicos, decisões judiciais ou compromissos particulares podem criar situações específicas, que precisam de análise própria.
- O SocialTrade deve publicar apenas informação geral, com link para o órgão/programa oficial, e orientar cada doador a confirmar o caso com seu contador. Não calcular economia tributária nem emitir documento de elegibilidade.

### 2. Conta recebedora, pagamento e eventual taxa

Manter a doação fora das contas da SocialTrade reduz conciliação, risco de saldo não repassado, fraude interna, estorno, insolvência e dúvidas sobre serviços de pagamento. Ainda assim, não elimina a necessidade de contratos claros, proteção de dados, segurança, atendimento, transparência sobre a verificação e tratamento de reclamações.

Antes de uma futura tesouraria, responder por escrito: quem é o recebedor jurídico do pagamento; quem mantém os recursos e por quanto tempo; quem responde por erro, fraude, devolução, disputa e falha de repasse; como será a conciliação; se o PSP liquida diretamente na conta da organização; quem paga a tarifa; que documentos cada parte emite; como contabilizar doação e receita da plataforma; e que autorização ou enquadramento regulatório pode ser aplicável. O Banco Central informa que certos marketplaces que recebem e repassam pagamentos podem se enquadrar como subcredenciadores em determinados arranjos. A classificação depende do desenho concreto, então não se deve presumir nem que toda tesouraria exige autorização, nem que está automaticamente dispensada.

Se a plataforma passar a cobrar por software, divulgação, patrocínio ou outro serviço, separar essa receita do valor doado, documentar o serviço/contrato e obter orientação sobre emissão de documento fiscal, tributos e regime da entidade operadora. Não financiar a operação retendo parte de uma doação sem que isso seja parte explícita e revisada do modelo.

### 3. Elegibilidade e transparência dos projetos

Definir critérios objetivos de entrada: existência e situação cadastral, representante autorizado, finalidade e área de atuação, titularidade da conta recebedora e dados de contato. Registrar quem conferiu, o que conferiu, quando, documentos consultados e validade da revisão. Uma revisão cadastral não é auditoria financeira nem certificação de idoneidade.

Para prestação de contas, apresentar ao público somente o status permitido e explicações compreensíveis. Comprovantes, contratos, notas internas e dados de pessoas atendidas devem ter acesso restrito. Inconsistência ou falta de evidência deve abrir pedido de esclarecimento e revisão humana; não deve ser rotulada automaticamente como fraude. Fotos e vídeos ilustram contexto, mas não provam sozinhos aquisição, entrega ou uso integral de verba.

### 4. Regras da relação entre as partes

Preparar termos simples para doadores, projetos e usuários, indicando pelo menos: papel do SocialTrade; fluxo bancário direto; momento em que a doação é considerada concluída; que o doador deve conferir os dados no app bancário; o que o registro/recibo comprova e o que não comprova; ausência de promessa fiscal; como corrigir informação; contato para disputa; critérios e limites da revisão; encerramento de campanha/projeto; privacidade e uso de marca/imagem.

O Marco Regulatório das Organizações da Sociedade Civil (Lei nº 13.019/2014) trata de parcerias entre administração pública e OSCs. Não deve ser tratado como requisito universal para toda doação privada entre empresa e entidade social; contratos ou recursos públicos podem trazer obrigações próprias.

### 5. Dados pessoais, mídias e segurança

O sistema trata identificadores como CPF/CNPJ e pode guardar informações de usuários, responsáveis, doações, documentos e imagens. Mapear finalidade, necessidade, base legal, acesso, retenção, exclusão/correção, fornecedores e resposta a incidentes; coletar apenas o mínimo. Fotos podem identificar pessoas e revelar contexto sensível. A presença de crianças/adolescentes exige salvaguardas adicionais e respeito ao melhor interesse; a regra concreta não se resume a marcar uma caixa de consentimento.

Agentes de tratamento de pequeno porte podem ter flexibilizações, como registro simplificado e, em condições aplicáveis, dispensa de indicar encarregado. Isso não dispensa cumprir princípios, bases legais, direitos dos titulares, medidas de segurança e um canal de comunicação. Confirmar se a organização realmente se enquadra na definição regulatória de pequeno porte e se há exceções aplicáveis.

### 6. Governança dos três fundadores

Antes de operar com dinheiro, clientes ou dados de terceiros, alinhar entre os três: titularidade do código, marca, domínio e contas; participação e poder de decisão; responsável por despesas, contratos e incidentes; titular da conta bancária da empresa; como receitas e custos serão aprovados; saída de integrante; continuidade do serviço; e quem pode falar em nome da SocialTrade. Formalizar por escrito, mesmo que em acordo inicial simples. A forma societária, CNPJ, CNAE, regime tributário e contratos devem ser escolhidos com orientação, porque afetam obrigações e responsabilidade.

### 7. Blockchain e cripto em etapa posterior

Uma transação/hashes públicos podem provar que uma instrução foi registrada em uma rede e em certo endereço; não provam por si sós a identidade real do doador ou beneficiário, que o projeto era elegível, que a conversão ocorreu pelo valor anunciado ou que os recursos foram usados na finalidade social. Antes da integração Solana, decidir custódia de carteira, chaves perdidas/comprometidas, taxas de rede, volatilidade, conversão para BRL, reembolso, identificação de contrapartes, documentos fiscais e responsabilidades. Manter esse fluxo separado do Pix até essas decisões e revisões.

## Como simplificar sem contornar regras

1. **Reduzir o escopo:** lançar apenas catálogo, perfil público, Pix direto, confirmação pelo beneficiário e registro privado; não habilitar tesouraria, cartões, cripto nem cálculo fiscal.
2. **Separar “doação comum” de “doação incentivada”:** no MVP, suportar a primeira sem benefício fiscal prometido. No futuro, só destacar uma campanha incentivada quando o projeto estiver formalmente aprovado no mecanismo específico e o pagamento seguir o canal/regra daquele mecanismo.
3. **Não custodiar:** deixar o banco do doador enviar diretamente à conta da instituição; manter valor doado fora das receitas e contas SocialTrade.
4. **Fazer verificação proporcional:** revisão humana em checklist, com evidência mínima necessária, prazo de validade e log; não exigir auditoria profissional completa de cada projeto para entrar no catálogo.
5. **Adiar dados de alto risco:** não armazenar prontuários, listas de assistidos, documentos bancários completos nem mídia de menores até definir controles, finalidade, consentimento/base legal, retenção e acesso.
6. **Adiar a taxa da plataforma:** testar valor com empresas e projetos antes de monetizar. Se houver receita, começar por serviço separado e preço transparente, com contrato e emissão fiscal definidos; isso ainda exige contabilização, mas não mistura a doação.
7. **Usar recursos gratuitos e consultas pontuais:** verificar se uma OSC beneficiária se enquadra no atendimento gratuito do Núcleo de Apoio Contábil e Fiscal (NAF) de uma universidade; cada unidade define serviços e público. Consultar Sebrae para modelo de negócio e incubadoras/universidades. Para dúvida jurídica, perguntar a Núcleo de Prática Jurídica (NPJ) local sobre critérios de atendimento — muitos atendem pessoas em vulnerabilidade, e uma empresa/startup pode não ser elegível. Se houver algum orçamento, comprar uma consulta fechada de escopo curto é mais simples que contratar assessoria mensal.

Simplificar significa retirar operações opcionais e reduzir dados/fluxos. Não significa que uma decisão privada possa eliminar obrigações legais aplicáveis.

## Plano de trabalho enxuto

### Agora, antes de expandir o produto

- [ ] Confirmar que o único fluxo ativo é Pix direto para conta do projeto e que nenhuma tela/API sugere tesouraria ou pagamento processado pela plataforma.
- [ ] Revisar em todas as telas, e-mails e recibos as frases de benefício fiscal; manter aviso claro e consistente.
- [ ] Fechar checklist mínimo de análise do projeto e da titularidade da chave; registrar responsável e data, sem chamar isso de auditoria.
- [ ] Publicar termos curtos para doador/projeto e aviso de privacidade coerentes com o fluxo real.
- [ ] Mapear todos os dados coletados e limitar upload de comprovantes/mídias até haver política de acesso e retenção.

### Antes de qualquer tesouraria, tarifa, cartão ou cripto

- [ ] Desenhar diagrama do dinheiro e papéis jurídicos, inclusive falhas, devoluções e disputas.
- [ ] Obter avaliação da classificação de serviço de pagamento e contratar PSP apenas com fluxo de liquidação compatível com o modelo escolhido.
- [ ] Definir instituição operadora, conta, contabilização, documentos fiscais e contratos.
- [ ] Validar separadamente cada modalidade de incentivo fiscal com fonte oficial e contador da empresa/projeto envolvido.
- [ ] Fazer revisão de segurança, proteção de dados e atendimento ao usuário para a nova modalidade.

## Perguntas objetivas para atendimento gratuito ou consulta pontual

Levar um diagrama de uma página e perguntar:

1. No Pix direto, com a plataforma apenas exibindo a chave e guardando confirmação do beneficiário, qual é a responsabilidade contratual/fiscal da plataforma e do projeto?
2. Qual documento o projeto pode entregar ao doador e o que ele precisa guardar para sua escrituração, sem tratar o recibo SocialTrade como fiscal?
3. Alguma doação direta desse caso específico pode ser incentivada/dedutível? Qual regime, aprovação, teto, prazo, conta e procedimento são exigidos?
4. Se o SocialTrade receber e repassar, qual classificação regulatória se aplica ao desenho e como estruturar a liquidação via PSP?
5. Se houver cobrança de assinatura, patrocínio ou serviço, qual entidade/atividade, documento fiscal e regime tributário seriam adequados?
6. Quais dados de doadores, representantes, beneficiários e imagens são realmente necessários, por quanto tempo e com quais permissões?
7. Como tratar erro de destinatário, fraude, campanha encerrada, desistência, reclamação e divergência de prestação de contas?

## Fontes oficiais e referências

- [Receita Federal — Deduções incentivadas no Imposto de Renda](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/pagamentos-ou-doacoes/deducoes-incentivadas)
- [Receita Federal — Perguntas frequentes sobre deduzir doações feitas durante o ano](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/imposto-de-renda/dirpf/deducoes/doacoes-no-ano-calendario)
- [Lei nº 9.249/1995, art. 13 — Planalto](https://planalto.gov.br/ccivil_03/leis/l9249.htm)
- [Lei nº 13.019/2014 — Marco Regulatório das Organizações da Sociedade Civil](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l13019compilado.htm)
- [Banco Central — FAQ sobre liquidação centralizada e marketplaces](https://www.bcb.gov.br/estabilidadefinanceira/faq-liquidacao-centralizada)
- [Lei nº 12.865/2013 — arranjos e instituições de pagamento](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12865.htm)
- [ANPD — Resolução CD/ANPD nº 2/2022, agentes de pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
- [LGPD — Lei nº 13.709/2018, texto compilado](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Receita Federal — o que é o NAF e quem pode buscar atendimento](https://www.gov.br/receitafederal/simples/pt-br/acesso-a-informacao/acoes-e-programas/cidadania-fiscal/naf/o-que-e)
- [Receita Federal — serviços oferecidos pelos NAF](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/cidadania-fiscal/naf/servicos)

## Limites desta análise

As fontes federais orientam regras gerais, mas não determinam por si só a situação de uma empresa, OSC, contrato ou operação concreta. Pode haver exigências estaduais/municipais, setoriais, contratuais ou ligadas a uma modalidade específica. Antes de lançar tesouraria, cobrar taxa, processar pagamentos, prometer incentivo ou movimentar cripto, validar o desenho com profissional qualificado e, quando aplicável, com o órgão/programa responsável.
