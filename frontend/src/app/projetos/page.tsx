import { redirect } from "next/navigation";

export default async function LegacyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await searchParams;
  const query = new URLSearchParams({ explorar: "projetos" });
  for (const key of ["busca", "causa", "estado", "cidade", "ordem", "local"]) {
    const value = current[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  redirect(`/?${query.toString()}#projetos`);
}
