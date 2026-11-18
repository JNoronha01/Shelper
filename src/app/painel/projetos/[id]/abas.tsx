import Link from "next/link";

export const ABAS = [
  { id: "board", rotulo: "Board" },
  { id: "sprint", rotulo: "Sprint" },
  { id: "metricas", rotulo: "Métricas" },
  { id: "votacao", rotulo: "Votação" },
  { id: "historico", rotulo: "Histórico" },
  { id: "time", rotulo: "Time" },
] as const;
export type IdAba = (typeof ABAS)[number]["id"];

export const eAba = (v: unknown): v is IdAba => ABAS.some((a) => a.id === v);

// Abas como links (?aba=...): a página inteira continua no servidor, sem JavaScript extra,
// e o endereço pode ser copiado e enviado ao time já na aba certa.
export function Abas({ projetoId, atual }: { projetoId: string; atual: IdAba }) {
  return (
    <nav aria-label="Seções do projeto" className="-mx-4 flex gap-1 overflow-x-auto px-4 border-b border-zinc-200 dark:border-zinc-800">
      {ABAS.map((a) => (
        <Link
          key={a.id}
          href={`/painel/projetos/${projetoId}?aba=${a.id}`}
          aria-current={a.id === atual ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 ${
            a.id === atual
              ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
