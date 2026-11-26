import Link from "next/link";
import type { Cartao, EventoCalculo, Membro, Metas, Sprint } from "@/lib/board/dados";
import { diaLocal, metricasPorCartao } from "@/lib/metricas/calculo";
import { burndown, diasDoPeriodo, porPessoa, type PontoBurndown } from "@/lib/metricas/graficos";
import { montarPainel } from "@/lib/metricas/painel";
import { BotaoImprimir } from "./imprimir";

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const data = (d: string) => DATA.format(new Date(`${d}T00:00:00Z`));
const num = (n: number | null, casas = 1) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas }));
const horas = (h: number | null) => (h === null ? "—" : h < 48 ? `${num(h)} h` : `${num(h / 24)} dias`);

// A folha em si: só calcula e desenha (dá para ver com dados de exemplo, sem banco).
export function FolhaRelatorio({
  projeto,
  sprint,
  cartoes,
  eventos,
  metas,
  time,
  agora,
}: {
  projeto: { id: string; nome: string };
  sprint: Sprint;
  cartoes: Cartao[];
  eventos: EventoCalculo[];
  metas: Metas;
  time: Membro[];
  agora: string;
}) {
  const id = projeto.id;
  const board = { projeto, cartoes, metas, time };
  const hoje = diaLocal(agora);
  const daSprint = board.cartoes.filter((c) => c.sprintId === sprint.id);
  const planejados = daSprint.reduce((s, c) => s + c.pontos, 0);
  const concluidos = daSprint.filter((c) => c.coluna === "Concluído");
  const entregues = concluidos.reduce((s, c) => s + c.pontos, 0);
  const metricas = new Map(metricasPorCartao(board.cartoes, eventos).map((m) => [m.cartaoId, m]));
  const painel = montarPainel(daSprint, eventos, { inicio: sprint.inicio, fim: sprint.fim }, board.metas, agora);
  const pontos = burndown(daSprint, eventos, diasDoPeriodo(sprint.inicio, sprint.fim), hoje);
  const pessoas = porPessoa(daSprint, [...metricas.values()], board.time, sprint.inicio, sprint.fim);
  const nome = new Map(board.time.map((m) => [m.usuarioId, m.nome]));
  const bloqueados = daSprint.filter((c) => c.bloqueado);
  const situacao = sprint.encerrada ? "Encerrada" : sprint.fim < hoje ? "Terminou, ainda não encerrada" : "Em andamento";
  const ordem = ["Concluído", "Em revisão", "Em andamento", "A fazer", "Backlog"];
  const linhas = [...daSprint].sort(
    (a, b) => ordem.indexOf(a.coluna) - ordem.indexOf(b.coluna) || a.titulo.localeCompare(b.titulo, "pt-BR"),
  );

  return (
    <>
      <div className="nao-imprimir mx-auto flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 pt-6">
        <Link href={`/painel/projetos/${id}?aba=sprint`} className="text-sm text-suave hover:text-texto">
          ← Voltar para a Sprint
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-suave sm:inline">Na janela de impressão, escolha Salvar como PDF.</span>
          <BotaoImprimir />
        </div>
      </div>

      <article className="folha mx-auto my-6 flex w-full max-w-[210mm] flex-col gap-7 bg-white p-[14mm] text-[13px] leading-relaxed text-neutral-900 shadow-2xl">
        <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-4">
          <div>
            <p className="text-xs tracking-wide text-neutral-500">Relatório da Sprint · {board.projeto.nome}</p>
            <h1 className="text-2xl font-bold tracking-tight">Sprint {sprint.numero}</h1>
            <p className="text-neutral-600">
              {data(sprint.inicio)} a {data(sprint.fim)} · {situacao}
            </p>
          </div>
          <p className="shrink-0 text-right text-xs text-neutral-500">
            Gerado pelo Shelper
            <br />
            em{" "}
            {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(
              new Date(agora),
            )}
          </p>
        </header>

        <section>
          <h2 className="mb-1 text-sm font-semibold">Meta da Sprint</h2>
          <p>{sprint.meta ?? "Sem meta definida."}</p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Resumo</h2>
          <dl className="grid grid-cols-3 gap-2">
            {[
              ["Pontos planejados", String(planejados), `${daSprint.length} cartões`],
              ["Pontos entregues", String(entregues), `${concluidos.length} cartões concluídos`],
              ["Entrega", planejados ? `${Math.round((entregues / planejados) * 100)}%` : "—", "dos pontos planejados"],
              [
                "Lead Time médio",
                painel.resumo.leadTimeMedioDias === null ? "—" : `${num(painel.resumo.leadTimeMedioDias)} dias`,
                "da criação até concluir",
              ],
              ["Cycle Time médio", horas(painel.resumo.cycleTimeMedioHoras), "do início até concluir"],
              [
                "Gargalo",
                painel.gargalo ? painel.gargalo.coluna : "—",
                painel.gargalo ? `${horas(painel.gargalo.mediaHoras)} em média` : "sem dados",
              ],
            ].map(([titulo, valor, nota]) => (
              <div key={titulo} className="rounded-md border border-neutral-300 px-3 py-2">
                <dt className="text-xs text-neutral-500">{titulo}</dt>
                <dd className="text-xl font-semibold tabular-nums">{valor}</dd>
                <p className="text-xs text-neutral-500">{nota}</p>
              </div>
            ))}
          </dl>
        </section>

        <section className="evitar-quebra">
          <h2 className="mb-2 text-sm font-semibold">Burndown</h2>
          <GraficoBurndown pontos={pontos} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Cartões da Sprint</h2>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-400 text-neutral-600">
                <th className="py-1.5 pr-2 font-medium">Cartão</th>
                <th className="py-1.5 pr-2 text-right font-medium">Pontos</th>
                <th className="py-1.5 pr-2 font-medium">Responsável</th>
                <th className="py-1.5 pr-2 font-medium">Coluna</th>
                <th className="py-1.5 pr-2 text-right font-medium">Lead</th>
                <th className="py-1.5 text-right font-medium">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((c) => {
                const m = metricas.get(c.id);
                return (
                  <tr key={c.id} className="border-b border-neutral-200 align-top">
                    <td className="py-1.5 pr-2">
                      {c.titulo}
                      {c.bloqueado && <span className="ml-1 font-semibold text-red-700">(bloqueado)</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{c.pontos}</td>
                    <td className="py-1.5 pr-2">{c.responsavelId ? (nome.get(c.responsavelId) ?? "—") : "—"}</td>
                    <td className="py-1.5 pr-2">{c.coluna}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{m?.leadTimeDias === null || !m ? "—" : `${m.leadTimeDias} d`}</td>
                    <td className="py-1.5 text-right tabular-nums">{horas(m?.cycleTimeHoras ?? null)}</td>
                  </tr>
                );
              })}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-neutral-500">
                    Nenhum cartão nesta Sprint.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="grid grid-cols-2 gap-6">
          <section className="evitar-quebra">
            <h2 className="mb-2 text-sm font-semibold">Por pessoa</h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-400 text-neutral-600">
                  <th className="py-1.5 pr-2 font-medium">Pessoa</th>
                  <th className="py-1.5 pr-2 text-right font-medium">Concluídos</th>
                  <th className="py-1.5 text-right font-medium">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {pessoas.map((p) => (
                  <tr key={p.nome} className="border-b border-neutral-200">
                    <td className="py-1.5 pr-2">{p.nome}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{p.cartoes}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.pontos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="evitar-quebra">
            <h2 className="mb-2 text-sm font-semibold">Tempo médio em cada coluna</h2>
            <table className="w-full border-collapse text-left text-xs">
              <tbody>
                {painel.tempos.map((t) => (
                  <tr key={t.coluna} className="border-b border-neutral-200">
                    <td className="py-1.5 pr-2">{t.coluna}</td>
                    <td className="py-1.5 text-right tabular-nums">{horas(t.mediaHoras)}</td>
                  </tr>
                ))}
                {painel.tempos.length === 0 && (
                  <tr>
                    <td className="py-1.5 text-neutral-500">Sem movimentos no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {bloqueados.length > 0 && (
          <section className="evitar-quebra">
            <h2 className="mb-2 text-sm font-semibold">Impedimentos</h2>
            <ul className="list-disc pl-5">
              {bloqueados.map((c) => (
                <li key={c.id}>
                  {c.titulo}: {c.motivoBloqueio ?? "sem motivo informado"}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-auto border-t border-neutral-300 pt-3 text-xs text-neutral-500">
          Lead Time: da criação do cartão até ele chegar em Concluído. Cycle Time: da última entrada em Em andamento até Concluído. Os
          números saem do histórico de movimentos, que não pode ser editado.
        </footer>
      </article>
    </>
  );
}

// Burndown desenhado direto em SVG (sem biblioteca), para sair nítido no PDF.
function GraficoBurndown({ pontos }: { pontos: PontoBurndown[] }) {
  if (pontos.length < 2) return <p className="text-neutral-500">Sprint curta demais para o gráfico.</p>;
  const L = 640;
  const A = 200;
  const m = { e: 34, d: 24, t: 10, b: 26 };
  const maximo = Math.max(1, ...pontos.map((p) => Math.max(p.ideal, p.restante ?? 0)));
  const x = (i: number) => m.e + (i * (L - m.e - m.d)) / (pontos.length - 1);
  const y = (v: number) => m.t + (A - m.t - m.b) * (1 - v / maximo);
  const linha = (vals: (number | null)[]) =>
    vals
      .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  const marcas = [0, Math.round(maximo / 2), maximo];
  const passo = Math.ceil(pontos.length / 10);
  return (
    <figure>
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Burndown: pontos que faltam por dia, contra a linha ideal">
        {marcas.map((v) => (
          <g key={v}>
            <line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} stroke="#e5e5e5" />
            <text x={m.e - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#737373">
              {v}
            </text>
          </g>
        ))}
        {pontos.map((p, i) =>
          i % passo === 0 || i === pontos.length - 1 ? (
            <text key={p.dia} x={x(i)} y={A - 8} textAnchor="middle" fontSize="10" fill="#737373">
              {p.dia.slice(8, 10)}/{p.dia.slice(5, 7)}
            </text>
          ) : null,
        )}
        <polyline points={linha(pontos.map((p) => p.ideal))} fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeDasharray="5 4" />
        <polyline points={linha(pontos.map((p) => p.restante))} fill="none" stroke="#1d4ed8" strokeWidth="2" />
        {pontos.map((p, i) => (p.restante === null ? null : <circle key={p.dia} cx={x(i)} cy={y(p.restante)} r="2.5" fill="#1d4ed8" />))}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-neutral-600">
        <span>
          <span className="mr-1 inline-block h-0.5 w-4 bg-blue-700 align-middle" />
          Pontos que faltam
        </span>
        <span>
          <span className="mr-1 inline-block h-0 w-4 border-t-2 border-dashed border-neutral-400 align-middle" />
          Ideal
        </span>
      </figcaption>
    </figure>
  );
}
