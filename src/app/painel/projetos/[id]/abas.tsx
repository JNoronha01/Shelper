import type { IdAba } from "@/lib/board/papeis";

export const ABAS = [
  { id: "board", rotulo: "Board" },
  { id: "sprint", rotulo: "Sprint" },
  { id: "metricas", rotulo: "Métricas" },
  { id: "minhas", rotulo: "Minhas métricas" },
  { id: "votacao", rotulo: "Votação" },
  { id: "historico", rotulo: "Histórico" },
  { id: "time", rotulo: "Time" },
  { id: "projeto", rotulo: "Projeto" },
] as const satisfies readonly { id: IdAba; rotulo: string }[];
export type { IdAba };

export const eAba = (v: unknown): v is IdAba => ABAS.some((a) => a.id === v);
