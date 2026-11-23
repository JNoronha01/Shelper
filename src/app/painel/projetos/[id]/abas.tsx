import Link from "next/link";
import type { IdAba } from "@/lib/board/papeis";

export const ABAS = [
  { id: "board", rotulo: "Board" },
  { id: "sprint", rotulo: "Sprint" },
  { id: "metricas", rotulo: "Métricas" },
  { id: "votacao", rotulo: "Votação" },
  { id: "historico", rotulo: "Histórico" },
  { id: "time", rotulo: "Time" },
  { id: "projeto", rotulo: "Projeto" },
] as const satisfies readonly { id: IdAba; rotulo: string }[];
export type { IdAba };

export const eAba = (v: unknown): v is IdAba => ABAS.some((a) => a.id === v);

// Abas como links (?aba=...): a página inteira continua no servidor, sem JavaScript extra,
// e o endereço pode ser copiado e enviado ao time já na aba certa.
// Só aparecem as abas que o papel da pessoa usa (ver papeis.ts).
export function Abas({ projetoId, atual, visiveis }: { projetoId: string; atual: IdAba; visiveis: IdAba[] }) {
  return (
    <nav aria-label="Seções do projeto" className="sem-barra -mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-1 rounded-xl border border-linha bg-painel p-1">
        {ABAS.filter((a) => visiveis.includes(a.id)).map((a) => {
          const ativa = a.id === atual;
          return (
            <Link
              key={a.id}
              href={`/painel/projetos/${projetoId}?aba=${a.id}`}
              aria-current={ativa ? "page" : undefined}
              className={`relative rounded-lg px-4 py-1.5 text-sm font-medium transition duration-150 ease-suave focus-visible:outline-2 focus-visible:outline-laranja ${
                ativa ? "bg-elevado text-texto shadow-[inset_0_-2px_0_var(--color-laranja)]" : "text-suave hover:bg-elevado/50 hover:text-texto"
              }`}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
