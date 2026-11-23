"use client";

import { useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLUNAS } from "@/lib/colunas";
import type { PontoBurndown, PontoCartao, PontoEntrega, PontoFluxo, PontoPessoa, PontoWip } from "@/lib/metricas/graficos";

// Gráficos da aba Métricas ("dash BI", pedido do professor). Um gráfico por vez, escolhido
// pelo filtro, para a tela não ficar carregada.
//
// Cores das séries: paleta categórica validada para fundo escuro (contraste e daltonismo),
// sempre na mesma ordem. Não usa o laranja da interface, para dado e botão não se confundirem.
const SERIE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"] as const;
const COR_COLUNA = Object.fromEntries(COLUNAS.map((c, i) => [c, SERIE[i]])) as Record<(typeof COLUNAS)[number], string>;
const NEUTRO = "#8a8a8a";
const GRADE = "#2a2a2a";
const EIXO = { fill: "#a8a8a8", fontSize: 12 };

export type DadosGraficos = {
  sprintEscolhida: boolean;
  fluxo: PontoFluxo[];
  wip: PontoWip[];
  limites: { andamento: number; revisao: number };
  burndown: PontoBurndown[] | null;
  entregas: PontoEntrega[];
  tempos: PontoCartao[];
  metas: { leadDias: number | null; cycleHoras: number | null };
  pessoas: PontoPessoa[];
};

type IdGrafico = "burndown" | "fluxo" | "entregas" | "wip" | "tempos" | "pessoas" | "horas";

const GRAFICOS: { id: IdGrafico; rotulo: string }[] = [
  { id: "burndown", rotulo: "Burndown" },
  { id: "fluxo", rotulo: "Fluxo acumulado" },
  { id: "entregas", rotulo: "Throughput e Velocity" },
  { id: "wip", rotulo: "WIP por dia" },
  { id: "tempos", rotulo: "Lead e Cycle por cartão" },
  { id: "pessoas", rotulo: "Por pessoa" },
  { id: "horas", rotulo: "Horas por pessoa" },
];

const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

export function Graficos({ dados }: { dados: DadosGraficos }) {
  const disponiveis = GRAFICOS.filter((g) => g.id !== "burndown" || dados.sprintEscolhida);
  const [atual, setAtual] = useState<IdGrafico>(dados.sprintEscolhida ? "burndown" : "fluxo");
  const escolhido = disponiveis.some((g) => g.id === atual) ? atual : disponiveis[0].id;

  return (
    <section aria-labelledby="titulo-graficos" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-graficos" className="font-semibold">
            Gráficos
          </h2>
          <p className="text-sm text-suave">
            {dados.sprintEscolhida ? "Dias da Sprint escolhida." : "Últimos dias do projeto. Escolha uma Sprint acima para ver o Burndown."}
          </p>
        </div>
      </div>
      <div role="tablist" aria-label="Escolha o gráfico" className="sem-barra -mx-4 flex gap-1 overflow-x-auto px-4">
        {disponiveis.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === escolhido}
            onClick={() => setAtual(g.id)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm transition duration-150 ease-suave focus-visible:outline-2 focus-visible:outline-laranja ${
              g.id === escolhido ? "border-linha-forte bg-elevado text-texto" : "border-transparent text-suave hover:bg-elevado/50 hover:text-texto"
            }`}
          >
            {g.rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={escolhido} className="surgir">
        {escolhido === "burndown" && dados.burndown && <Burndown pontos={dados.burndown} />}
        {escolhido === "fluxo" && <Fluxo pontos={dados.fluxo} />}
        {escolhido === "entregas" && <Entregas pontos={dados.entregas} />}
        {escolhido === "wip" && <Wip pontos={dados.wip} limites={dados.limites} />}
        {escolhido === "tempos" && <Tempos pontos={dados.tempos} metas={dados.metas} />}
        {escolhido === "pessoas" && <Pessoas pontos={dados.pessoas} />}
        {escolhido === "horas" && <Horas pontos={dados.pessoas} />}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- moldura, dica e tabela

function Moldura({
  titulo,
  explicacao,
  tabela,
  children,
  vazio,
}: {
  titulo: string;
  explicacao: string;
  tabela: { colunas: string[]; linhas: (string | number)[][] };
  children: ReactNode;
  vazio?: string | false;
}) {
  return (
    <figure className="flex flex-col gap-3 rounded-2xl border border-linha bg-painel p-5">
      <figcaption>
        <p className="font-medium">{titulo}</p>
        <p className="text-sm text-suave">{explicacao}</p>
      </figcaption>
      {vazio ? (
        <p className="rounded-xl border border-dashed border-linha-forte px-4 py-10 text-center text-sm text-suave">{vazio}</p>
      ) : (
        <>
          <div className="h-72 w-full">{children}</div>
          {/* Os mesmos números em tabela: para quem usa leitor de tela ou prefere ler os valores. */}
          <details className="text-sm">
            <summary className="w-fit cursor-pointer text-suave hover:text-texto">Ver como tabela</summary>
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-linha">
              <table className="w-full text-left tabular-nums">
                <thead className="sticky top-0 bg-elevado text-xs text-suave">
                  <tr>
                    {tabela.colunas.map((c) => (
                      <th key={c} className="px-3 py-1.5 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {tabela.linhas.map((l, i) => (
                    <tr key={i}>
                      {l.map((v, j) => (
                        <td key={j} className="px-3 py-1.5">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </figure>
  );
}

// Dica ao passar o mouse: valores em texto neutro, a cor fica só no marcador ao lado.
type ItemDica = { value?: unknown; name?: unknown; color?: string; dataKey?: unknown };

function Dica({
  active,
  payload,
  label,
  formatarRotulo,
  unidade,
  cores,
}: {
  active?: boolean;
  payload?: readonly ItemDica[];
  label?: unknown;
  formatarRotulo?: (l: string) => string;
  unidade?: string;
  cores?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-linha-forte bg-elevado px-3 py-2 text-xs shadow-[0_12px_30px_-12px_rgb(0_0_0/0.9)]">
      <p className="mb-1 font-medium text-texto">{formatarRotulo ? formatarRotulo(String(label)) : String(label)}</p>
      <ul className="flex flex-col gap-0.5">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((p) => (
            <li key={String(p.dataKey)} className="flex items-center gap-2 text-suave">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: cores?.[String(p.dataKey)] ?? p.color }} />
              {String(p.name)}: <strong className="font-semibold text-texto tabular-nums">{String(p.value)}</strong>
              {unidade && <span>{unidade}</span>}
            </li>
          ))}
      </ul>
    </div>
  );
}

const eixos = (formatarX?: (v: string) => string) => (
  <>
    <CartesianGrid stroke={GRADE} vertical={false} />
    <XAxis dataKey="dia" tickFormatter={formatarX ?? diaCurto} tick={EIXO} axisLine={{ stroke: GRADE }} tickLine={false} minTickGap={16} />
    <YAxis tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
  </>
);

// Texto da legenda sempre em cinza neutro; a cor fica só na bolinha.
const legenda = (
  <Legend
    iconType="circle"
    iconSize={8}
    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
    formatter={(valor) => <span style={{ color: "#a8a8a8" }}>{String(valor)}</span>}
  />
);

// ---------------------------------------------------------------- gráficos

function Burndown({ pontos }: { pontos: PontoBurndown[] }) {
  return (
    <Moldura
      titulo="Burndown da Sprint"
      explicacao="Pontos que ainda faltam no fim de cada dia, contra a linha ideal (do total até zero no último dia)."
      tabela={{ colunas: ["Dia", "Faltam", "Ideal"], linhas: pontos.map((p) => [diaCurto(p.dia), p.restante ?? "–", p.ideal]) }}
      vazio={pontos.every((p) => p.ideal === 0) && "A Sprint ainda não tem cartões."}
    >
      <ResponsiveContainer>
        <LineChart data={pontos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          {eixos()}
          <Tooltip content={(p) => <Dica {...p} formatarRotulo={diaCurto} unidade="pts" />} cursor={{ stroke: "#3d3d3d" }} />
          {legenda}
          <Line isAnimationActive={false} type="linear" dataKey="ideal" name="Ideal" stroke={NEUTRO} strokeWidth={2} strokeDasharray="5 5" dot={false} />
          <Line isAnimationActive={false} type="linear" dataKey="restante" name="Faltam" stroke={SERIE[0]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "#181818" }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </Moldura>
  );
}

function Fluxo({ pontos }: { pontos: PontoFluxo[] }) {
  // Empilhado de baixo para cima na ordem inversa do fluxo: Concluído embaixo, como no CFD clássico.
  const camadas = [...COLUNAS].reverse();
  return (
    <Moldura
      titulo="Fluxo acumulado (CFD)"
      explicacao="Quantos cartões havia em cada coluna no fim de cada dia. Uma faixa que engorda e não anda é gargalo."
      tabela={{ colunas: ["Dia", ...COLUNAS], linhas: pontos.map((p) => [diaCurto(p.dia), ...COLUNAS.map((c) => p[c])]) }}
      vazio={pontos.length === 0 && "Ainda não há movimentos no período."}
    >
      <ResponsiveContainer>
        <AreaChart data={pontos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          {eixos()}
          <Tooltip content={(p) => <Dica {...p} formatarRotulo={diaCurto} cores={COR_COLUNA} />} cursor={{ stroke: "#3d3d3d" }} />
          <Legend
            content={() => (
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-suave">
                {COLUNAS.map((c) => (
                  <li key={c} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-2 rounded-full" style={{ background: COR_COLUNA[c] }} />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          />
          {camadas.map((c) => (
            <Area
              key={c}
              type="linear"
              dataKey={c}
              name={c}
              stackId="fluxo"
              stroke="#181818"
              strokeWidth={2}
              fill={COR_COLUNA[c]}
              fillOpacity={0.85}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Moldura>
  );
}

function Entregas({ pontos }: { pontos: PontoEntrega[] }) {
  // Duas medidas de escalas diferentes: dois gráficos lado a lado, nunca dois eixos no mesmo.
  const tabela = { colunas: ["Dia", "Cartões", "Pontos"], linhas: pontos.map((p) => [diaCurto(p.dia), p.cartoes, p.pontos]) };
  const vazio = pontos.every((p) => p.cartoes === 0) && "Nenhum cartão concluído no período.";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Moldura titulo="Throughput" explicacao="Cartões concluídos em cada dia." tabela={tabela} vazio={vazio}>
        <ResponsiveContainer>
          <BarChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {eixos()}
            <Tooltip content={(p) => <Dica {...p} formatarRotulo={diaCurto} />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
            <Bar isAnimationActive={false} dataKey="cartoes" name="Cartões" fill={SERIE[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Moldura>
      <Moldura titulo="Velocity" explicacao="Pontos dos cartões concluídos em cada dia." tabela={tabela} vazio={vazio}>
        <ResponsiveContainer>
          <BarChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {eixos()}
            <Tooltip content={(p) => <Dica {...p} formatarRotulo={diaCurto} unidade="pts" />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
            <Bar isAnimationActive={false} dataKey="pontos" name="Pontos" fill={SERIE[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Moldura>
    </div>
  );
}

function Wip({ pontos, limites }: { pontos: PontoWip[]; limites: { andamento: number; revisao: number } }) {
  return (
    <Moldura
      titulo="WIP por dia contra os limites"
      explicacao={`Cartões em Em andamento e em Em revisão no fim de cada dia. Linhas tracejadas: limites atuais (${limites.andamento} e ${limites.revisao}).`}
      tabela={{ colunas: ["Dia", "Em andamento", "Em revisão"], linhas: pontos.map((p) => [diaCurto(p.dia), p.andamento, p.revisao]) }}
      vazio={pontos.length === 0 && "Ainda não há movimentos no período."}
    >
      <ResponsiveContainer>
        <LineChart data={pontos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          {eixos()}
          <Tooltip content={(p) => <Dica {...p} formatarRotulo={diaCurto} />} cursor={{ stroke: "#3d3d3d" }} />
          {legenda}
          <ReferenceLine y={limites.andamento} stroke={SERIE[0]} strokeDasharray="4 4" strokeOpacity={0.7} />
          <ReferenceLine y={limites.revisao} stroke={SERIE[1]} strokeDasharray="4 4" strokeOpacity={0.7} />
          <Line isAnimationActive={false} type="stepAfter" dataKey="andamento" name="Em andamento" stroke={SERIE[0]} strokeWidth={2} dot={false} />
          <Line isAnimationActive={false} type="stepAfter" dataKey="revisao" name="Em revisão" stroke={SERIE[1]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Moldura>
  );
}

function Tempos({ pontos, metas }: { pontos: PontoCartao[]; metas: { leadDias: number | null; cycleHoras: number | null } }) {
  const tabela = { colunas: ["Cartão", "Concluído", "Lead Time (dias)", "Cycle Time (h)"], linhas: pontos.map((p) => [p.titulo, diaCurto(p.dia), p.leadDias ?? "–", p.cycleHoras ?? "–"]) };
  const vazio = pontos.length === 0 && "Nenhum cartão concluído no período.";
  const curto = (t: string) => (t.length > 14 ? `${t.slice(0, 13)}…` : t);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Moldura titulo="Lead Time por cartão" explicacao={`Dias da criação até concluir.${metas.leadDias ? ` Linha tracejada: meta de ${metas.leadDias} dias.` : ""}`} tabela={tabela} vazio={vazio}>
        <ResponsiveContainer>
          <BarChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRADE} vertical={false} />
            <XAxis dataKey="titulo" tickFormatter={curto} tick={EIXO} axisLine={{ stroke: GRADE }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={EIXO} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={(p) => <Dica {...p} unidade="dias" />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
            {metas.leadDias && <ReferenceLine y={metas.leadDias} stroke={NEUTRO} strokeDasharray="5 5" />}
            <Bar isAnimationActive={false} dataKey="leadDias" name="Lead Time" fill={SERIE[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Moldura>
      <Moldura titulo="Cycle Time por cartão" explicacao={`Horas do início do trabalho até concluir.${metas.cycleHoras ? ` Linha tracejada: meta de ${metas.cycleHoras} h.` : ""}`} tabela={tabela} vazio={vazio}>
        <ResponsiveContainer>
          <BarChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRADE} vertical={false} />
            <XAxis dataKey="titulo" tickFormatter={curto} tick={EIXO} axisLine={{ stroke: GRADE }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={EIXO} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={(p) => <Dica {...p} unidade="h" />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
            {metas.cycleHoras && <ReferenceLine y={metas.cycleHoras} stroke={NEUTRO} strokeDasharray="5 5" />}
            <Bar isAnimationActive={false} dataKey="cycleHoras" name="Cycle Time" fill={SERIE[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Moldura>
    </div>
  );
}

function Pessoas({ pontos }: { pontos: PontoPessoa[] }) {
  return (
    <Moldura
      titulo="Entregas por pessoa"
      explicacao="Pontos dos cartões concluídos no período, pelo responsável de cada cartão."
      tabela={{ colunas: ["Pessoa", "Cartões", "Pontos"], linhas: pontos.map((p) => [p.nome, p.cartoes, p.pontos]) }}
      vazio={pontos.every((p) => p.cartoes === 0) && "Nenhum cartão com responsável foi concluído no período."}
    >
      <ResponsiveContainer>
        <BarChart data={pontos} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={GRADE} horizontal={false} />
          <XAxis type="number" tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="nome" tick={EIXO} axisLine={false} tickLine={false} width={110} />
          <Tooltip content={(p) => <Dica {...p} unidade="pts" />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
          <Bar isAnimationActive={false} dataKey="pontos" name="Pontos" fill={SERIE[0]} radius={[0, 4, 4, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </Moldura>
  );
}

function Horas({ pontos }: { pontos: PontoPessoa[] }) {
  return (
    <Moldura
      titulo="Horas por pessoa: estimadas x usadas"
      explicacao="Estimadas: horas de todos os cartões da pessoa. Usadas: horas estimadas dos que ela já concluiu."
      tabela={{ colunas: ["Pessoa", "Estimadas (h)", "Usadas (h)"], linhas: pontos.map((p) => [p.nome, p.horasEstimadas, p.horasUsadas]) }}
      vazio={pontos.every((p) => p.horasEstimadas === 0) && "Nenhum cartão com responsável e horas estimadas."}
    >
      <ResponsiveContainer>
        <BarChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="nome" tick={EIXO} axisLine={{ stroke: GRADE }} tickLine={false} />
          <YAxis tick={EIXO} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={(p) => <Dica {...p} unidade="h" />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
          {legenda}
          <Bar isAnimationActive={false} dataKey="horasEstimadas" name="Estimadas" fill={SERIE[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar isAnimationActive={false} dataKey="horasUsadas" name="Usadas" fill={SERIE[1]} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </Moldura>
  );
}
