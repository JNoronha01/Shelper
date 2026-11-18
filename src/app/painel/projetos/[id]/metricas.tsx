import Link from "next/link";
import type { Metas, Sprint } from "@/lib/board/dados";
import type { Faixa } from "@/lib/metricas/calculo";
import type { PainelMetricas } from "@/lib/metricas/painel";
import { FormularioMetas } from "./formulario-metas";

const ESTILO_FAIXA: Record<Faixa, { texto: string; classe: string }> = {
  bom: { texto: "Bom", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  medio: { texto: "Mais ou menos", classe: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  ruim: { texto: "Ruim", classe: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300" },
};

const num = (n: number | null, casas: number) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas }));
const horas = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${num(h, 1)} h` : `${num(h / 24, 1)} dias`);

function Cartao({ titulo, valor, unidade, faixa, nota }: { titulo: string; valor: string; unidade?: string; faixa?: Faixa | null; nota: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <dt className="text-sm text-zinc-500">{titulo}</dt>
      <dd className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{valor}</span>
        {unidade && <span className="text-sm text-zinc-500">{unidade}</span>}
        {faixa && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO_FAIXA[faixa].classe}`}>{ESTILO_FAIXA[faixa].texto}</span>}
      </dd>
      <p className="text-xs text-zinc-500">{nota}</p>
    </div>
  );
}

export function Metricas({
  projetoId,
  painel,
  metas,
  sprints,
  escolhida,
}: {
  projetoId: string;
  painel: PainelMetricas;
  metas: Metas;
  sprints: Sprint[];
  escolhida: string; // "tudo" ou id da Sprint
}) {
  const { resumo, faixas, tempos, gargalo } = painel;
  const link = (id: string) => `/painel/projetos/${projetoId}?aba=metricas&periodo=${id}`;
  const opcoes = [{ id: "tudo", rotulo: "Projeto todo" }, ...sprints.map((s) => ({ id: s.id, rotulo: `Sprint ${s.numero}` }))];
  const maxHoras = Math.max(...tempos.map((t) => t.mediaHoras), 1);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Período das métricas" className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <Link
            key={o.id}
            href={link(o.id)}
            aria-current={o.id === escolhida ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              o.id === escolhida
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {o.rotulo}
          </Link>
        ))}
      </nav>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao titulo="Lead Time médio" valor={num(resumo.leadTimeMedioDias, 1)} unidade="dias" faixa={faixas.leadTime} nota="Da criação do cartão até concluir." />
        <Cartao titulo="Cycle Time médio" valor={resumo.cycleTimeMedioHoras === null ? "—" : horas(resumo.cycleTimeMedioHoras)} faixa={faixas.cycleTime} nota="Do início do trabalho até concluir." />
        <Cartao titulo="Throughput" valor={String(resumo.throughput)} unidade={resumo.throughput === 1 ? "cartão" : "cartões"} nota="Cartões concluídos no período." />
        <Cartao titulo="Velocity" valor={String(resumo.velocity)} unidade="pontos" faixa={faixas.velocity} nota="Pontos dos cartões concluídos." />
      </dl>
      {!metas.leadDias && !metas.cycleHoras && !metas.velocity && (
        <p className="text-sm text-zinc-500">Sem metas definidas, os números aparecem sem a faixa Bom / Mais ou menos / Ruim. Defina as metas do time abaixo.</p>
      )}

      <section aria-labelledby="titulo-gargalo" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-gargalo" className="font-semibold">
            Onde os cartões ficam mais tempo
          </h2>
          <p className="text-sm text-zinc-500">Tempo médio por cartão em cada coluna, contando os concluídos do período e o que ainda está aberto.</p>
        </div>
        {gargalo === null ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Ainda não há movimentações suficientes para apontar um gargalo.
          </p>
        ) : (
          <>
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm dark:bg-amber-500/10">
              <strong>Gargalo: {gargalo.coluna}.</strong> Os cartões passam em média {horas(gargalo.mediaHoras)} nessa coluna, o maior tempo do fluxo.
              {gargalo.coluna === "A fazer" && " É uma fila de espera: o time está começando os cartões tarde."}
            </p>
            <ul className="flex flex-col gap-2">
              {tempos.map((t) => (
                <li key={t.coluna} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0">{t.coluna}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
                    <span className="block h-full rounded bg-indigo-500" style={{ width: `${Math.max((t.mediaHoras / maxHoras) * 100, 2)}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">{horas(t.mediaHoras)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <FormularioMetas projetoId={projetoId} metas={metas} />
    </div>
  );
}
