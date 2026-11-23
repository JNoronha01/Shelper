// Gargalo pelo tempo estimado (pedido do professor em 21/11): o relógio do cartão começa
// quando ele entra em "Em andamento". Se o tempo passar das horas estimadas enquanto ele
// ainda está em Em andamento ou Em revisão, o cartão vira gargalo e pede atenção.
import type { Coluna } from "@/lib/colunas";

const HORA = 3_600_000;
const EM_EXECUCAO: readonly Coluna[] = ["Em andamento", "Em revisão"];

export type CartaoComPrazo = {
  id: string;
  coluna: Coluna;
  horasEstimadas: number | null;
  inicioAndamento: string | null;
  bloqueado: boolean;
  bloqueadoEm: string | null;
};

export type Prazo = { decorridoHoras: number; estimadoHoras: number; atrasado: boolean; porcentagem: number };

// null quando o cartão não está em execução ou não tem estimativa.
export function prazoDoCartao(c: CartaoComPrazo, agora: string): Prazo | null {
  if (!EM_EXECUCAO.includes(c.coluna) || !c.horasEstimadas || !c.inicioAndamento) return null;
  const decorridoHoras = Math.max(0, (Date.parse(agora) - Date.parse(c.inicioAndamento)) / HORA);
  return {
    decorridoHoras,
    estimadoHoras: c.horasEstimadas,
    atrasado: decorridoHoras > c.horasEstimadas,
    porcentagem: Math.round((decorridoHoras / c.horasEstimadas) * 100),
  };
}

export type Alerta = { cartaoId: string; prazo: Prazo | null; bloqueado: boolean };

// Cartões que pedem atenção do PO e do SM: atrasados e/ou bloqueados.
// Ordem: primeiro os mais estourados (em proporção ao estimado), depois os só bloqueados.
export function alertasDoBoard(cartoes: CartaoComPrazo[], agora: string): Alerta[] {
  return cartoes
    .filter((c) => c.coluna !== "Concluído")
    .map((c) => ({ cartaoId: c.id, prazo: prazoDoCartao(c, agora), bloqueado: c.bloqueado }))
    .filter((a) => a.bloqueado || a.prazo?.atrasado)
    .sort((a, b) => (b.prazo?.atrasado ? b.prazo.porcentagem : 0) - (a.prazo?.atrasado ? a.prazo.porcentagem : 0));
}

// "45 min", "3 h", "1 d 4 h" (dias corridos de 24 h, como o Cycle Time).
export function formatarDuracao(horas: number): string {
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 24) return `${Math.round(horas * 10) / 10} h`.replace(".", ",");
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return resto ? `${dias} d ${resto} h` : `${dias} d`;
}

// Horas do contrato: as estimadas dos cartões concluídos contam como usadas.
export function horasDoContrato(cartoes: { coluna: Coluna; horasEstimadas: number | null }[]) {
  const soma = (lista: typeof cartoes) => lista.reduce((s, c) => s + (c.horasEstimadas ?? 0), 0);
  return {
    usadas: soma(cartoes.filter((c) => c.coluna === "Concluído")),
    planejadas: soma(cartoes),
    semEstimativa: cartoes.filter((c) => !c.horasEstimadas).length,
  };
}
