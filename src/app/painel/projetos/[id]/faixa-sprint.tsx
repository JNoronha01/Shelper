import Link from "next/link";
import type { Cartao, Sprint } from "@/lib/board/dados";

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const formatar = (data: string) => DIA.format(new Date(`${data}T00:00:00Z`));
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

function prazo(hoje: string, sprint: Sprint): { texto: string; atrasada: boolean } {
  const faltam = diasEntre(hoje, sprint.fim);
  if (faltam > 1) return { texto: `faltam ${faltam} dias`, atrasada: false };
  if (faltam === 1) return { texto: "termina amanhã", atrasada: false };
  if (faltam === 0) return { texto: "termina hoje", atrasada: false };
  return { texto: `passou do fim há ${-faltam} ${faltam === -1 ? "dia" : "dias"}`, atrasada: true };
}

// Faixa no topo do board: a Sprint ativa sempre à vista (número, datas, Meta e progresso).
export function FaixaSprint({ projetoId, sprint, cartoes, hoje }: { projetoId: string; sprint: Sprint | null; cartoes: Cartao[]; hoje: string }) {
  const link = `/painel/projetos/${projetoId}?aba=sprint`;
  if (!sprint) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-linha-forte px-4 py-2.5 text-sm">
        <span className="text-suave">Nenhuma Sprint ativa. Os cartões ficam fora de um período de trabalho.</span>
        <Link href={link} className="font-medium text-laranja-claro transition-colors hover:text-laranja">
          Planejar Sprint
        </Link>
      </div>
    );
  }

  const daSprint = cartoes.filter((c) => c.sprintId === sprint.id);
  const comprometidos = daSprint.reduce((s, c) => s + c.pontos, 0);
  const feitos = daSprint.filter((c) => c.coluna === "Concluído").reduce((s, c) => s + c.pontos, 0);
  const porcentagem = comprometidos ? Math.round((feitos / comprometidos) * 100) : 0;
  const p = prazo(hoje, sprint);

  return (
    <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-linha bg-painel px-4 py-2.5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <Link href={link} className="font-semibold transition-colors hover:text-laranja-claro">
            Sprint {sprint.numero}
          </Link>
          <span className="text-sm text-suave tabular-nums">
            {formatar(sprint.inicio)} a {formatar(sprint.fim)}
          </span>
          <span className={`text-sm ${p.atrasada ? "text-aviso" : "text-suave"}`}>{p.texto}</span>
        </div>
        {sprint.meta && (
          <p className="truncate text-sm text-texto/85" title={sprint.meta}>
            Meta: {sprint.meta}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:w-64">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevado"
          role="progressbar"
          aria-valuenow={porcentagem}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Pontos da Sprint concluídos"
        >
          <div className="h-full rounded-full bg-laranja transition-[width] duration-500 ease-suave" style={{ width: `${porcentagem}%` }} />
        </div>
        <span className="text-sm text-suave tabular-nums">
          <strong className="font-semibold text-texto">{feitos}</strong>/{comprometidos} pts
        </span>
      </div>
    </div>
  );
}
