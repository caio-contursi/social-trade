import { SupportPage } from "@/components/workspace/account";
export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  return <SupportPage suggestion={tipo === "sugestao"} />;
}
