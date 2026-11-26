import Link from "next/link";
import type { Metas, Sprint } from "@/lib/board/dados";
import type { Faixa } from "@/lib/metricas/calculo";
import type { PainelMetricas } from "@/lib/metricas/painel";
import { NumeroAnimado } from "@/components/numero-animado";
import { FiltroPessoa } from "./metricas-filtro";

const ESTILO_FAIXA: Record<Faixa, { texto: string; classe: string }> = {
  bom: { texto: "Bom", classe: "bg-bom/15 text-bom" },
  medio: { texto: "Mais ou menos", classe: "bg-aviso/15 text-aviso" },
  ruim: { texto: "Ruim", classe: "bg-perigo/10 text-perigo" },
};

const num = (n: number | null, casas: number) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas }));
const horas = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${num(h, 1)} h` : `${num(h / 24, 1)} dias`);

function Cartao({
  titulo,
  valor,
  unidade,
  faixa,
  nota,
}: {
  titulo: string;
  valor: string;
  unidade?: string;
  faixa?: Faixa | null;
  nota: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-linha bg-painel p-4">
      <dt className="text-sm text-suave">{titulo}</dt>
      <dd className="flex flex-wrap items-baseline gap-2">
        <NumeroAnimado texto={valor} className="text-4xl font-semibold tracking-tight tabular-nums" />
        {unidade && <span className="text-sm text-suave">{unidade}</span>}
        {faixa && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO_FAIXA[faixa].classe}`}>{ESTILO_FAIXA[faixa].texto}</span>
        )}
      </dd>
      <p className="text-xs text-suave">{nota}</p>
    </div>
  );
}

export function Metricas({
  projetoId,
  painel,
  metas,
  sprints,
  escolhida,
  aba,
  pessoa,
  time,
}: {
  projetoId: string;
  painel: PainelMetricas;
  metas: Metas;
  sprints: Sprint[];
  escolhida: string; // "tudo" ou id da Sprint
  // "metricas": PO e SM, com filtro Time / pessoa. "minhas": o Dev vê só os cartões dele.
  aba: "metricas" | "minhas";
  pessoa: { id: string; nome: string } | null;
  time: { usuarioId: string; nome: string }[];
}) {
  const { resumo, faixas, tempos, gargalo } = painel;
  const link = (id: string) =>
    `/painel/projetos/${projetoId}?aba=${aba}&periodo=${id}${aba === "metricas" && pessoa ? `&pessoa=${pessoa.id}` : ""}`;
  const opcoes = [{ id: "tudo", rotulo: "Projeto todo" }, ...sprints.map((s) => ({ id: s.id, rotulo: `Sprint ${s.numero}` }))];
  const maxHoras = Math.max(...tempos.map((t) => t.mediaHoras), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Período das métricas" className="flex w-fit flex-wrap gap-1 rounded-xl border border-linha bg-painel p-1">
          {opcoes.map((o) => (
            <Link
              key={o.id}
              href={link(o.id)}
              aria-current={o.id === escolhida ? "true" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition duration-150 ease-suave focus-visible:outline-2 focus-visible:outline-laranja ${
                o.id === escolhida
                  ? "bg-elevado text-texto shadow-[inset_0_-2px_0_var(--color-laranja)]"
                  : "text-suave hover:bg-elevado/50 hover:text-texto"
              }`}
            >
              {o.rotulo}
            </Link>
          ))}
        </nav>
        {aba === "metricas" && <FiltroPessoa projetoId={projetoId} periodo={escolhida} pessoa={pessoa?.id ?? ""} time={time} />}
      </div>
      {sprints.find((s) => s.id === escolhida)?.foraDoBacklog && (
        <p className="rounded-xl border border-aviso/40 bg-aviso/10 px-4 py-2.5 text-sm">
          Esta Sprint foi planejada com cartões de fora do Backlog: alguns já estavam em andamento ou concluídos quando ela começou.
          Burndown e Velocity contam esses cartões normalmente.
        </p>
      )}
      {pessoa && (
        <p className="text-sm text-suave">
          {aba === "minhas" ? "Seus números" : `Números de ${pessoa.nome}`}: só os cartões em que{" "}
          {aba === "minhas" ? "você é" : "a pessoa é"} responsável.
          {painel.resumo.throughput === 0 && " Ainda não há cartões concluídos no período."}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao
          titulo="Lead Time médio"
          valor={num(resumo.leadTimeMedioDias, 1)}
          unidade="dias"
          faixa={faixas.leadTime}
          nota="Da criação do cartão até concluir."
        />
        <Cartao
          titulo="Cycle Time médio"
          valor={resumo.cycleTimeMedioHoras === null ? "—" : horas(resumo.cycleTimeMedioHoras)}
          faixa={faixas.cycleTime}
          nota="Do início do trabalho até concluir."
        />
        <Cartao
          titulo="Throughput"
          valor={String(resumo.throughput)}
          unidade={resumo.throughput === 1 ? "cartão" : "cartões"}
          nota="Cartões concluídos no período."
        />
        <Cartao
          titulo="Velocity"
          valor={String(resumo.velocity)}
          unidade="pontos"
          faixa={faixas.velocity}
          nota="Pontos dos cartões concluídos."
        />
      </dl>
      {!metas.leadDias && !metas.cycleHoras && !metas.velocity && (
        <p className="text-sm text-suave">
          Sem metas definidas, os números aparecem sem a faixa Bom / Mais ou menos / Ruim. O PO define as metas na aba Projeto.
        </p>
      )}

      <section aria-labelledby="titulo-gargalo" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-gargalo" className="font-semibold">
            Onde os cartões ficam mais tempo
          </h2>
          <p className="text-sm text-suave">
            Tempo médio por cartão em cada coluna, contando os concluídos do período e o que ainda está aberto.
          </p>
        </div>
        {gargalo === null ? (
          <p className="rounded-xl border border-dashed border-linha-forte px-4 py-6 text-center text-sm text-suave">
            Ainda não há movimentações suficientes para apontar um gargalo.
          </p>
        ) : (
          <>
            <p className="rounded-xl border border-aviso/30 bg-aviso/10 px-4 py-3 text-sm">
              <strong>Gargalo: {gargalo.coluna}.</strong> Os cartões passam em média {horas(gargalo.mediaHoras)} nessa coluna, o maior tempo
              do fluxo.
              {gargalo.coluna === "A fazer" && " É uma fila de espera: o time está começando os cartões tarde."}
            </p>
            <ul className="flex flex-col gap-2">
              {tempos.map((t) => (
                <li key={t.coluna} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0">{t.coluna}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-elevado" aria-hidden="true">
                    <span
                      className={`block h-full rounded-full transition-[width] duration-500 ease-suave ${t.coluna === gargalo.coluna ? "bg-aviso" : "bg-fraco"}`}
                      style={{ width: `${Math.max((t.mediaHoras / maxHoras) * 100, 2)}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">{horas(t.mediaHoras)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="text-sm text-suave">
        Metas do projeto: Lead Time {metas.leadDias ?? "–"} dias, Cycle Time {metas.cycleHoras ?? "–"} h, Velocity {metas.velocity ?? "–"}{" "}
        pontos.
        {aba === "minhas" ? (
          " As metas fazem parte do cadastro e são definidas pelo PO."
        ) : (
          <>
            {" "}
            As metas fazem parte do cadastro e são alteradas pelo PO na{" "}
            <Link href={`/painel/projetos/${projetoId}?aba=projeto`} className="text-laranja-claro hover:text-laranja">
              aba Projeto
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
