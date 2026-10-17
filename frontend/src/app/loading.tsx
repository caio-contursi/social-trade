import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main
      id="conteudo"
      className="page-container space-y-7 py-16"
      aria-busy="true"
      aria-label="Carregando página"
    >
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-14 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <div className="grid gap-6 pt-8 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-72 rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
