import { redirect } from "next/navigation";

export default async function LegacyPublicPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string | string[] }>;
}) {
  const { slug } = await searchParams;
  const value = (Array.isArray(slug) ? slug[0] : slug)?.trim();
  redirect(value ? `/projetos/${encodeURIComponent(value)}` : "/projetos");
}
