"use client";

import { NumeroAnimado } from "@/components/numero-animado";
import { Graficos, type DadosGraficos } from "./painel/projetos/[id]/graficos";

// Exemplo de dashboard da página inicial: os mesmos gráficos da aba Métricas do projeto,
// com uma Sprint fictícia de 8 dias (10 cartões, 34 pontos; mais 4 no Backlog). Os números contam quando aparecem na tela.

const DIAS = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24"];

// Cartões em cada coluna no fim de cada dia: [Backlog, A fazer, Em andamento, Em revisão, Concluído]
const FLUXO: [number, number, number, number, number][] = [
  [4, 10, 0, 0, 0],
  [4, 8, 2, 0, 0],
  [4, 6, 3, 1, 0],
  [4, 4, 3, 2, 1],
  [4, 3, 2, 2, 3],
  [4, 2, 2, 1, 5],
  [4, 1, 1, 1, 7],
  [4, 0, 0, 0, 10],
];
const RESTANTE = [34, 34, 34, 31, 26, 21, 13, 0];
const ENTREGUES = [0, 0, 0, 1, 2, 2, 2, 3];
const PONTOS = [0, 0, 0, 3, 5, 5, 8, 13];

const DADOS: DadosGraficos = {
  sprintEscolhida: true,
  individual: false,
  fluxo: DIAS.map((dia, i) => {
    const [b, f, a, r, c] = FLUXO[i];
    return { dia, Backlog: b, "A fazer": f, "Em andamento": a, "Em revisão": r, Concluído: c };
  }),
  wip: DIAS.map((dia, i) => ({ dia, andamento: FLUXO[i][2], revisao: FLUXO[i][3] })),
  limites: { andamento: 3, revisao: 2 },
  burndown: DIAS.map((dia, i) => ({ dia, restante: RESTANTE[i], ideal: Math.round((34 - (34 / 7) * i) * 10) / 10 })),
  entregas: DIAS.map((dia, i) => ({ dia, cartoes: ENTREGUES[i], pontos: PONTOS[i] })),
  tempos: [
    ["Cadastro e login", 3.1, 20],
    ["Criar projeto", 2.4, 14],
    ["Mover cartão", 4.2, 30],
    ["Limite de WIP", 2.9, 9],
    ["Lead Time", 3.6, 26],
    ["Cycle Time", 1.8, 7],
    ["Burndown", 4.5, 31],
    ["Exportar CSV", 1.2, 5],
  ].map(([titulo, leadDias, cycleHoras], i) => ({
    titulo: String(titulo),
    leadDias: Number(leadDias),
    cycleHoras: Number(cycleHoras),
    dia: DIAS[Math.min(7, 3 + Math.floor(i / 2))],
  })),
  metas: { leadDias: 4, cycleHoras: 24 },
  pessoas: [
    { nome: "Ana", cartoes: 4, pontos: 13, horasEstimadas: 16, horasUsadas: 14 },
    { nome: "Bruno", cartoes: 3, pontos: 13, horasEstimadas: 14, horasUsadas: 17 },
    { nome: "Carla", cartoes: 3, pontos: 8, horasEstimadas: 10, horasUsadas: 9 },
  ],
};

const NUMEROS = [
  { titulo: "Lead Time médio", valor: "3,1", unidade: "dias", nota: "Da criação até concluir." },
  { titulo: "Cycle Time médio", valor: "17,8 h", nota: "Do início do trabalho até concluir." },
  { titulo: "Throughput", valor: "10", unidade: "cartões", nota: "Concluídos na Sprint." },
  { titulo: "Velocity", valor: "34", unidade: "pontos", nota: "Pontos entregues na Sprint." },
];

export function DashboardExemplo() {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-linha bg-cartao/60 p-4 sm:p-6">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NUMEROS.map((n) => (
          <div key={n.titulo} className="flex flex-col gap-1 rounded-2xl border border-linha bg-painel p-4">
            <dt className="text-sm text-suave">{n.titulo}</dt>
            <dd className="flex items-baseline gap-2">
              <NumeroAnimado texto={n.valor} className="text-4xl font-semibold tracking-tight tabular-nums" />
              {n.unidade && <span className="text-sm text-suave">{n.unidade}</span>}
            </dd>
            <p className="text-xs text-suave">{n.nota}</p>
          </div>
        ))}
      </dl>
      <Graficos dados={DADOS} />
    </div>
  );
}
