export const areaLabels: Record<string, string> = {
  food: "Alimentação",
  education: "Educação",
  health: "Saúde",
  housing: "Moradia",
  children: "Crianças e adolescentes",
  homelessness: "Pessoas em situação de rua",
  animals: "Animais",
  environment: "Meio ambiente",
  sports: "Esporte",
  culture: "Cultura",
  technology: "Tecnologia",
  emergency_relief: "Apoio emergencial",
};
export const organizationLabels: Record<string, string> = {
  company: "Empresa",
  formal_ngo: "ONG formalizada",
  independent_project: "Projeto independente",
  community_collective: "Coletivo comunitário",
  association: "Associação",
  religious_group: "Grupo religioso",
  student_project: "Projeto universitário",
};
// Estados de `SERVICES` em app/catalog.py. Qualificam a funcionalidade, nunca a organização.
export const serviceStatusLabels: Record<string, string> = {
  available: "Disponível",
  coming_soon: "Em breve",
  future: "Planejado, sem previsão",
};
export function serviceStatusLabel(status: string): string {
  return Object.hasOwn(serviceStatusLabels, status)
    ? serviceStatusLabels[status]
    : "Situação não informada";
}
export const brazilStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
export function formatDate(
  value: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const date = new Date(
    value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value)
      ? value
      : `${value.replace(" ", "T")}Z`,
  );
  return Number.isNaN(date.getTime())
    ? "Data não informada"
    : date.toLocaleDateString(
        "pt-BR",
        options || { day: "2-digit", month: "short", year: "numeric" },
      );
}
