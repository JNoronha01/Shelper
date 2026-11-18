import type { Coluna } from "@/lib/colunas";

// Regras do board usadas na tela. O banco confere as mesmas regras de novo
// (supabase/migrations/20261117000000_board.sql); aqui elas servem para mostrar
// a mensagem certa antes de enviar e para pintar as colunas.

export const PONTOS_VALIDOS = [1, 2, 3, 5, 8, 13] as const;
export const NOME_PROJETO_MAXIMO = 80;
export const TITULO_MAXIMO = 200;
export const WIP_MINIMO = 1;
export const WIP_MAXIMO = 20;

type Resultado<T> = { ok: true; dados: T } | { ok: false; erros: Partial<Record<string, string>> };

const texto = (valor: FormDataEntryValue | null | undefined) =>
  typeof valor === "string" ? valor.trim() : "";

export function validarNomeProjeto(valor: FormDataEntryValue | null | undefined): Resultado<{ nome: string }> {
  const nome = texto(valor);
  if (!nome) return { ok: false, erros: { nome: "Informe o nome do projeto." } };
  if (nome.length > NOME_PROJETO_MAXIMO) {
    return { ok: false, erros: { nome: `O nome pode ter no máximo ${NOME_PROJETO_MAXIMO} caracteres.` } };
  }
  return { ok: true, dados: { nome } };
}

export function validarCartao(
  tituloBruto: FormDataEntryValue | null | undefined,
  pontosBrutos: FormDataEntryValue | null | undefined,
): Resultado<{ titulo: string; pontos: number }> {
  const erros: Partial<Record<string, string>> = {};
  const titulo = texto(tituloBruto);
  if (!titulo) erros.titulo = "O título do cartão é obrigatório.";
  else if (titulo.length > TITULO_MAXIMO) erros.titulo = `O título pode ter no máximo ${TITULO_MAXIMO} caracteres.`;

  const pontos = Number(texto(pontosBrutos));
  if (!(PONTOS_VALIDOS as readonly number[]).includes(pontos)) {
    erros.pontos = "Escolha os pontos: 1, 2, 3, 5, 8 ou 13.";
  }
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, dados: { titulo, pontos } };
}

export function validarLimitesWip(
  andamentoBruto: FormDataEntryValue | null | undefined,
  revisaoBruto: FormDataEntryValue | null | undefined,
): Resultado<{ andamento: number; revisao: number }> {
  const erros: Partial<Record<string, string>> = {};
  const andamento = Number(texto(andamentoBruto));
  const revisao = Number(texto(revisaoBruto));
  const valido = (n: number) => Number.isInteger(n) && n >= WIP_MINIMO && n <= WIP_MAXIMO;
  const mensagem = `Use um número inteiro de ${WIP_MINIMO} a ${WIP_MAXIMO}.`;
  if (!valido(andamento)) erros.andamento = mensagem;
  if (!valido(revisao)) erros.revisao = mensagem;
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, dados: { andamento, revisao } };
}

export type LimitesWip = { wipAndamento: number; wipRevisao: number };

// Só "Em andamento" e "Em revisão" têm limite (Parte 4 do Relatório).
export function limiteDaColuna(coluna: Coluna, limites: LimitesWip): number | null {
  if (coluna === "Em andamento") return limites.wipAndamento;
  if (coluna === "Em revisão") return limites.wipRevisao;
  return null;
}

export type SituacaoWip = "sem_limite" | "livre" | "no_limite" | "acima";

export function situacaoWip(ocupados: number, limite: number | null): SituacaoWip {
  if (limite === null) return "sem_limite";
  if (ocupados > limite) return "acima";
  if (ocupados === limite) return "no_limite";
  return "livre";
}

// Mover para a coluna exige confirmação quando ela já está cheia (H4).
export function exigeConfirmacaoWip(ocupadosNoDestino: number, limite: number | null): boolean {
  return limite !== null && ocupadosNoDestino >= limite;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function eUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

// Horário de Brasília, como o Relatório define para as datas do board.
const FORMATO_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
export function formatarDataHora(iso: string): string {
  return FORMATO_DATA_HORA.format(new Date(iso));
}

// ---------------------------------------------------------------- Sprint e metas

export const META_SPRINT_MAXIMO = 300;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (v: string) => DATA.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

export function validarSprint(
  inicioBruto: FormDataEntryValue | null | undefined,
  fimBruto: FormDataEntryValue | null | undefined,
  metaBruta: FormDataEntryValue | null | undefined,
): Resultado<{ inicio: string; fim: string; meta: string | null }> {
  const erros: Partial<Record<string, string>> = {};
  const inicio = texto(inicioBruto);
  const fim = texto(fimBruto);
  const meta = texto(metaBruta);
  if (!dataValida(inicio)) erros.inicio = "Informe a data de início.";
  if (!dataValida(fim)) erros.fim = "Informe a data de fim.";
  // Datas no formato AAAA-MM-DD se comparam como texto.
  if (!erros.inicio && !erros.fim && fim < inicio) erros.fim = "A data de fim não pode ser antes da data de início.";
  if (meta.length > META_SPRINT_MAXIMO) erros.meta = `A Meta pode ter no máximo ${META_SPRINT_MAXIMO} caracteres.`;
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, dados: { inicio, fim, meta: meta || null } };
}

// Metas das métricas: todas opcionais. Vazio = sem meta; se preenchido, número maior que zero.
export function validarMetas(
  leadBruto: FormDataEntryValue | null | undefined,
  cycleBruto: FormDataEntryValue | null | undefined,
  velocityBruta: FormDataEntryValue | null | undefined,
): Resultado<{ lead: number | null; cycle: number | null; velocity: number | null }> {
  const erros: Partial<Record<string, string>> = {};
  const ler = (bruto: FormDataEntryValue | null | undefined, nome: string, inteiro: boolean) => {
    const t = texto(bruto).replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0 || (inteiro && !Number.isInteger(n))) {
      erros[nome] = inteiro ? "Use um número inteiro maior que zero ou deixe em branco." : "Use um número maior que zero ou deixe em branco.";
      return null;
    }
    return n;
  };
  const lead = ler(leadBruto, "lead", false);
  const cycle = ler(cycleBruto, "cycle", false);
  const velocity = ler(velocityBruta, "velocity", true);
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, dados: { lead, cycle, velocity } };
}
