import type { Evento } from "@/lib/board/dados";
import { formatarDataHora } from "@/lib/board/regras";

export function Historico({ eventos }: { eventos: Evento[] }) {
  return (
    <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-historico" className="font-semibold">
          Histórico de movimentações
        </h2>
        <p className="text-sm text-suave">
          Os 50 eventos mais recentes. Cada criação e movimentação vira um evento com a hora do servidor; eles não podem ser
          editados nem apagados e são a base das métricas.
        </p>
      </div>
      {eventos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linha-forte px-4 py-6 text-center text-sm text-suave">
          Nenhum evento ainda. Crie um cartão no Backlog para começar.
        </p>
      ) : (
        <ol className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-painel text-sm">
          {eventos.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <time dateTime={e.em} className="w-24 shrink-0 tabular-nums text-suave">
                {formatarDataHora(e.em)}
              </time>
              <span className="min-w-0 flex-1 truncate font-medium">{e.titulo}</span>
              <span className="text-suave">
                {e.de ? (
                  <>
                    {e.de} <span aria-hidden="true">→</span>
                    <span className="sr-only">para</span> {e.para}
                  </>
                ) : (
                  <>Criado no {e.para}</>
                )}
              </span>
              {e.acimaDoWip && (
                <span className="rounded-full bg-aviso/15 px-2 py-0.5 text-xs font-medium text-aviso">
                  acima do WIP
                </span>
              )}
              <span className="text-xs text-suave">{e.meu ? "por você" : "por outro integrante"}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
