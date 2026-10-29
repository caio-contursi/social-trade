import { areaLabels, projectFilterCauseCodes } from "@/lib/catalog";

export const quizCauseCodes = projectFilterCauseCodes;
export type QuizCauseCode = (typeof quizCauseCodes)[number];
export type CauseQuizAnswer = { questionId: string; optionId: string };

type QuizOption = { id: string; text: string; scores: Partial<Record<QuizCauseCode, number>> };
type QuizQuestion = { id: string; prompt: string; note: string; options: QuizOption[] };

export const causeQuizQuestions: QuizQuestion[] = [
  { id: "unseen-cost", prompt: "Um plano beneficia muita gente, mas deixa alguém para trás. Que condição faria você pedir uma revisão?", note: "Os benefícios são reais. Você só consegue exigir uma mudança antes da aprovação; as outras terão de esperar.", options: [
    { id: "daily-cost", text: "Se a economia prevista dependesse de pessoas continuarem pulando refeições.", scores: { food: 4, health: 1 } },
    { id: "uprooting", text: "Se quem vive ali há anos tivesse de sair para que o plano funcionasse.", scores: { housing: 4, culture: 1 } },
    { id: "irreversible", text: "Se o ganho de agora fosse pago por perdas irreversíveis no lugar onde vivemos.", scores: { environment: 4, animals: 1 } },
    { id: "access-gap", text: "Se a nova facilidade só estivesse disponível para quem já sabe utilizá-la.", scores: { technology: 4, education: 1 } },
  ] },
  { id: "empty-place", prompt: "Uma pessoa jovem para de aparecer em um grupo que parecia lhe fazer bem. O que você tentaria entender primeiro?", note: "O grupo reúne oficinas e atividades coletivas. Investigar uma barreira com cuidado significa adiar a investigação das outras.", options: [
    { id: "pace", text: "Ela consegue aprender no ritmo proposto ou está tentando alcançar um nível que não teve chance de construir?", scores: { education: 4, sports: 1 } },
    { id: "agency", text: "As decisões são tomadas com ela ou apenas por quem acredita saber o que é melhor?", scores: { children: 4, sports: 1 } },
    { id: "belonging", text: "Existe espaço para participar no próprio ritmo, sem precisar ser boa em algo para pertencer?", scores: { sports: 4, health: 1 } },
    { id: "invisible-duty", text: "Ela precisa escolher entre estar ali e garantir o básico em casa?", scores: { food: 4, housing: 1 } },
  ] },
  { id: "missing-voice", prompt: "Uma história verdadeira só vai ganhar espaço se você escolher um ponto de vista. Qual ausência seria mais difícil aceitar?", note: "As quatro histórias merecem ser contadas. Pense em qual experiência você mais gostaria de tirar da invisibilidade.", options: [
    { id: "normalized-pain", text: "A de quem nunca consegue descansar no lugar onde vive, mas ouve que isso é normal.", scores: { health: 4, housing: 1 } },
    { id: "without-words", text: "A de um ser que depende das pessoas para se defender, mas não consegue contar o que vive.", scores: { animals: 4, environment: 1 } },
    { id: "own-story", text: "A de quem tem sua memória contada sempre pela voz de outra pessoa.", scores: { culture: 4, children: 1 } },
    { id: "permission-to-ask", text: "A de quem foi convencido de que certas perguntas e conhecimentos não são para si.", scores: { education: 4, technology: 1 } },
  ] },
  { id: "acceptable-delay", prompt: "Uma solução nova economiza tempo, mas exige que todos mudem a rotina. Qual concessão você aceitaria fazer?", note: "Não dá para preservar velocidade, alcance e atenção individual ao mesmo tempo. A escolha também tem um custo para outras pessoas.", options: [
    { id: "stay-and-participate", text: "Avançar mais devagar para que quem já vive ali consiga permanecer e participar.", scores: { housing: 4, food: 1 } },
    { id: "less-convenience", text: "Abrir mão de parte da conveniência para não transferir o custo para outros seres e lugares.", scores: { environment: 4, animals: 1 } },
    { id: "redesign-together", text: "Refazer a solução com quem não consegue usá-la, mesmo perdendo a data de lançamento.", scores: { technology: 4, education: 1 } },
    { id: "time-to-listen", text: "Manter um acompanhamento próximo de quem volta a se movimentar, mesmo atendendo menos pessoas por dia.", scores: { health: 4, sports: 1 } },
  ] },
  { id: "fair-rule", prompt: "Uma regra vale para todos, mas alguém sempre fica do lado de fora. Em qual situação você abriria a primeira exceção?", note: "Mudar a regra pode reduzir a capacidade do grupo. Qual barreira justificaria assumir esse custo agora?", options: [
    { id: "protected-dissent", text: "Quando uma criança precisa de proteção para discordar de quem decide por ela.", scores: { children: 4, health: 1 } },
    { id: "chance-to-start", text: "Quando participar exige um desempenho que a pessoa ainda não teve chance de desenvolver.", scores: { sports: 4, education: 1 } },
    { id: "dignity", text: "Quando receber o básico obriga alguém a provar em público o quanto está precisando.", scores: { food: 4, housing: 1 } },
    { id: "stable-address", text: "Quando um sistema digital exige endereço fixo e bloqueia quem mais precisa criar estabilidade.", scores: { housing: 4, technology: 1 } },
  ] },
  { id: "what-remains", prompt: "Um lugar importante vai fechar e não será possível preservar tudo. O que você tentaria manter vivo?", note: "Manter algo também consome recursos que poderiam ajudar no recomeço. Escolha o que seria mais difícil reconstruir.", options: [
    { id: "dependent-lives", text: "Os vínculos com os seres que dependem daquele lugar, mesmo que isso complique a mudança.", scores: { animals: 4, environment: 1 } },
    { id: "shared-memory", text: "As histórias e formas de expressão que nasciam quando aquelas pessoas se reuniam em torno da mesma mesa.", scores: { culture: 4, food: 1 } },
    { id: "shared-knowledge", text: "O conhecimento que permite a alguém continuar aprendendo sem depender de uma única pessoa.", scores: { education: 4, technology: 1 } },
    { id: "safe-experiments", text: "A liberdade de quem está crescendo experimentar e errar sem perder sua rede de proteção.", scores: { children: 4, sports: 1 } },
  ] },
  { id: "quiet-change", prompt: "Você pode evitar um problema que ninguém percebeu ainda, mas talvez nunca receba reconhecimento. O que faria a espera valer a pena?", note: "As quatro mudanças exigem trabalho contínuo e têm efeitos difíceis de medir no começo.", options: [
    { id: "regeneration", text: "Deixar um lugar capaz de se recuperar por conta própria, mesmo sem um resultado rápido para mostrar.", scores: { environment: 4, food: 1 } },
    { id: "less-dependence", text: "Tornar uma ferramenta compreensível para que as pessoas deixem de depender de intermediários.", scores: { technology: 4, education: 1 } },
    { id: "early-attention", text: "Perceber um sofrimento antes que vire uma crise, inclusive quando quem sente não consegue explicá-lo.", scores: { health: 4, animals: 1 } },
    { id: "break-the-cycle", text: "Diminuir uma cadeia de abandono, mesmo cuidando hoje de situações que quase ninguém vê.", scores: { animals: 4, environment: 1 } },
  ] },
  { id: "shared-space", prompt: "Um espaço comum ficou disputado. Você só consegue defender uma mudança agora. Qual negociação toparia sustentar?", note: "A decisão vai contrariar pessoas com bons argumentos. Pense em qual custo você estaria disposto a explicar.", options: [
    { id: "beginners", text: "Ter menos horários livres para que iniciantes também participem, sem competir com quem já tem experiência.", scores: { sports: 4, children: 1 } },
    { id: "reliable-routine", text: "Trocar uma grande entrega ocasional por uma rotina discreta em que ninguém precise pedir toda vez.", scores: { food: 4, health: 1 } },
    { id: "lasting-base", text: "Adiar a expansão para que o acolhimento vire um ponto de apoio estável, e não só uma passagem.", scores: { housing: 4, culture: 1 } },
    { id: "room-for-life", text: "Limitar parte do uso humano para que outras formas de vida e o próprio lugar possam se recuperar.", scores: { environment: 4, animals: 1 } },
  ] },
  { id: "stay-or-grow", prompt: "Um grupo termina o ano com poucos resultados visíveis e vínculos fortes. Que sinal faria você querer continuar?", note: "Há pouco dinheiro para o próximo ano. Crescer rápido pode desfazer justamente o que começou a funcionar.", options: [
    { id: "heard", text: "Pessoas antes silenciadas passaram a contar a própria história e a ser ouvidas.", scores: { culture: 4, children: 1 } },
    { id: "teach-others", text: "Quem antes só recebia respostas agora formula perguntas e ensina outras pessoas.", scores: { education: 4, technology: 1 } },
    { id: "supported-autonomy", text: "Quem precisava de permissão para tudo começou a decidir, com apoio, sobre a própria vida.", scores: { children: 4, housing: 1 } },
    { id: "joy-in-practice", text: "Quem costumava desistir passou a encontrar prazer em praticar junto, sem precisar vencer.", scores: { sports: 4, culture: 1 } },
  ] },
  { id: "ten-years-later", prompt: "Daqui a dez anos, alguém diz que aquela escolha mudou sua vida. Que parte desse relato ficaria com você?", note: "Todas são conquistas importantes. Escolha o tipo de transformação que você teria mais vontade de acompanhar de perto.", options: [
    { id: "navigate-the-world", text: "Hoje consigo resolver coisas que antes exigiam alguém traduzindo o mundo para mim.", scores: { technology: 4, culture: 1 } },
    { id: "someone-stayed", text: "Alguém ficou tempo suficiente para perceber o que estava acontecendo comigo.", scores: { health: 4, food: 1 } },
    { id: "different-life", text: "Aprendi que uma vida não precisa se parecer com a minha para merecer cuidado.", scores: { animals: 4, environment: 1 } },
    { id: "own-roots", text: "Parei de esconder de onde venho para conseguir ser ouvido.", scores: { culture: 4, children: 1 } },
  ] },
];

export type CauseQuizResult = {
  primary: QuizCauseCode;
  secondary: QuizCauseCode | null;
  confidence: number;
  scores: Record<QuizCauseCode, number>;
  percentages: Record<QuizCauseCode, number>;
};

export const causeProjectGuides: Record<QuizCauseCode, { summary: string; projectTypes: string[] }> = {
  food: {
    summary: "Iniciativas que ampliam o acesso regular a alimentos e fortalecem a segurança alimentar de pessoas e comunidades.",
    projectTypes: ["Cozinhas comunitárias e distribuição de refeições ou cestas básicas", "Hortas comunitárias, escolares ou urbanas", "Ações de educação alimentar e combate ao desperdício"],
  },
  education: {
    summary: "Projetos que criam oportunidades de aprendizagem, apoiam a permanência nos estudos e ajudam pessoas a desenvolver conhecimentos.",
    projectTypes: ["Reforço escolar, alfabetização e incentivo à leitura", "Cursos, oficinas formativas e preparação para o trabalho", "Bibliotecas comunitárias e apoio à trajetória escolar"],
  },
  health: {
    summary: "Ações que promovem prevenção, orientação e acesso a cuidados que contribuem para a saúde física e emocional.",
    projectTypes: ["Campanhas de prevenção e orientação em saúde", "Atendimento, acompanhamento ou encaminhamento comunitário", "Ações de promoção da saúde mental e do bem-estar"],
  },
  housing: {
    summary: "Iniciativas que buscam condições de moradia mais seguras, adequadas e dignas para famílias e comunidades.",
    projectTypes: ["Reformas e melhorias habitacionais", "Acesso a abrigo temporário e apoio para moradia segura", "Melhorias comunitárias de saneamento e infraestrutura residencial"],
  },
  children: {
    summary: "Projetos voltados à proteção, ao desenvolvimento e à participação de crianças e adolescentes em ambientes seguros.",
    projectTypes: ["Atividades educativas, recreativas e de convivência", "Apoio a famílias e ações de proteção de direitos", "Espaços seguros de desenvolvimento e acompanhamento"],
  },
  animals: {
    summary: "Ações de proteção e cuidado animal, com foco em bem-estar, saúde e convivência responsável.",
    projectTypes: ["Resgate, acolhimento temporário e adoção responsável", "Atendimento veterinário e campanhas de vacinação ou castração", "Educação para guarda responsável e proteção animal"],
  },
  environment: {
    summary: "Iniciativas que conservam recursos naturais, recuperam ambientes e apoiam comunidades a cuidar do território.",
    projectTypes: ["Preservação de áreas verdes e recuperação de ecossistemas", "Reciclagem, gestão de resíduos e redução do desperdício", "Educação ambiental, hortas e cuidado de espaços naturais"],
  },
  sports: {
    summary: "Projetos que ampliam o acesso à prática esportiva e usam o movimento para apoiar saúde, convivência e desenvolvimento.",
    projectTypes: ["Aulas e atividades esportivas gratuitas ou comunitárias", "Formação esportiva e acompanhamento de crianças e jovens", "Esporte inclusivo, adaptado e iniciativas de lazer ativo"],
  },
  culture: {
    summary: "Ações que ampliam o acesso à produção cultural, à expressão artística e à valorização de identidades e memórias.",
    projectTypes: ["Oficinas de música, artes visuais, teatro ou dança", "Bibliotecas, leitura e atividades culturais comunitárias", "Preservação de patrimônio, memória e manifestações locais"],
  },
  technology: {
    summary: "Iniciativas que reduzem barreiras digitais e aproximam pessoas de ferramentas e conhecimentos tecnológicos.",
    projectTypes: ["Inclusão digital, acesso à internet e equipamentos", "Cursos de informática, programação e competências digitais", "Laboratórios, oficinas e soluções tecnológicas comunitárias"],
  },
};

export function quizCauseLabel(cause: QuizCauseCode): string {
  return areaLabels[cause];
}

export function scoreCauseQuiz(answers: CauseQuizAnswer[]): CauseQuizResult | null {
  if (answers.length !== causeQuizQuestions.length) return null;
  const score = Object.fromEntries(quizCauseCodes.map((cause) => [cause, 0])) as Record<QuizCauseCode, number>;
  for (const question of causeQuizQuestions) {
    const answer = answers.find((item) => item.questionId === question.id);
    const option = question.options.find((item) => item.id === answer?.optionId);
    if (!option) return null;
    for (const [cause, points] of Object.entries(option.scores) as [QuizCauseCode, number][]) {
      score[cause] += points;
    }
  }
  const ranked = [...quizCauseCodes].sort((a, b) => score[b] - score[a] || quizCauseCodes.indexOf(a) - quizCauseCodes.indexOf(b));
  const total = Object.values(score).reduce((sum, value) => sum + value, 0);
  const percentages = Object.fromEntries(quizCauseCodes.map((cause) => [cause, total ? Math.floor(score[cause] / total * 100) : 0])) as Record<QuizCauseCode, number>;
  if (total) {
    let remainder = 100 - Object.values(percentages).reduce((sum, value) => sum + value, 0);
    for (const cause of ranked) {
      if (!remainder) break;
      percentages[cause] += 1;
      remainder -= 1;
    }
  }
  return {
    primary: ranked[0], secondary: score[ranked[1]] > 0 ? ranked[1] : null,
    confidence: total ? Math.round(score[ranked[0]] / total * 100) : 0,
    scores: score, percentages,
  };
}
