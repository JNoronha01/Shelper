import { COLUNAS, type Coluna } from "@/lib/colunas";

const eColuna = (v: string): v is Coluna => (COLUNAS as readonly string[]).includes(v);

// Regras do board usadas na tela. O banco confere as mesmas regras de novo
// (supabase/migrations/20261117000000_board.sql); aqui elas servem para mostrar
// a mensagem certa antes de enviar e para pintar as colunas.

// Escala Fibonacci ampliada (ideia do professor): de 0 a 89, o baralho comum do Planning Poker.
export const PONTOS_VALIDOS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;
export const DESCRICAO_MAXIMO = 2000;
export const ITEM_CHECKLIST_MAXIMO = 200;
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

  const bruto = texto(pontosBrutos);
  const pontos = Number(bruto);
  if (!bruto || !ePontoValido(pontos)) {
    erros.pontos = "Escolha os pontos da escala Fibonacci: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55 ou 89.";
  }
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, dados: { titulo, pontos } };
}

export const ePontoValido = (n: number) => (PONTOS_VALIDOS as readonly number[]).includes(n);

// Novo projeto: nome e os limites de WIP já na criação (ideia do professor).
export function validarNovoProjeto(
  nomeBruto: FormDataEntryValue | null | undefined,
  andamentoBruto: FormDataEntryValue | null | undefined,
  revisaoBruto: FormDataEntryValue | null | undefined,
): Resultado<{ nome: string; andamento: number; revisao: number }> {
  const nome = validarNomeProjeto(nomeBruto);
  const wip = validarLimitesWip(andamentoBruto, revisaoBruto);
  const erros = { ...(nome.ok ? {} : nome.erros), ...(wip.ok ? {} : wip.erros) };
  if (!nome.ok || !wip.ok) return { ok: false, erros };
  return { ok: true, dados: { ...nome.dados, ...wip.dados } };
}

// Cartão novo: além de título e pontos, a coluna onde ele entra e a descrição (opcional).
export function validarNovoCartao(
  tituloBruto: FormDataEntryValue | null | undefined,
  pontosBrutos: FormDataEntryValue | null | undefined,
  colunaBruta: FormDataEntryValue | null | undefined,
  descricaoBruta: FormDataEntryValue | null | undefined,
): Resultado<{ titulo: string; pontos: number; coluna: Coluna; descricao: string | null }> {
  const base = validarCartao(tituloBruto, pontosBrutos);
  const erros: Partial<Record<string, string>> = base.ok ? {} : { ...base.erros };
  const coluna = texto(colunaBruta);
  if (!eColuna(coluna)) erros.coluna = "Escolha a coluna do cartão.";
  const descricao = validarDescricao(descricaoBruta);
  if (!descricao.ok) Object.assign(erros, descricao.erros);
  if (!base.ok || Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados: { ...base.dados, coluna: coluna as Coluna, descricao: descricao.ok ? descricao.dados.descricao : null } };
}

export function validarDescricao(bruta: FormDataEntryValue | null | undefined): Resultado<{ descricao: string | null }> {
  const descricao = texto(bruta);
  if (descricao.length > DESCRICAO_MAXIMO) {
    return { ok: false, erros: { descricao: `A descrição pode ter no máximo ${DESCRICAO_MAXIMO} caracteres.` } };
  }
  return { ok: true, dados: { descricao: descricao || null } };
}

export function validarItemChecklist(bruto: FormDataEntryValue | null | undefined): Resultado<{ texto: string }> {
  const t = texto(bruto);
  if (!t) return { ok: false, erros: { texto: "Escreva o item." } };
  if (t.length > ITEM_CHECKLIST_MAXIMO) {
    return { ok: false, erros: { texto: `O item pode ter no máximo ${ITEM_CHECKLIST_MAXIMO} caracteres.` } };
  }
  return { ok: true, dados: { texto: t } };
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

// ---------------------------------------------------------------- Convite e votação

export const DIAS_CONVITE = [1, 7, 30] as const;

export function validarDiasConvite(bruto: FormDataEntryValue | null | undefined): Resultado<{ dias: number }> {
  const dias = Number(texto(bruto));
  if (!Number.isInteger(dias) || dias < 1 || dias > 30) return { ok: false, erros: { dias: "O convite pode valer de 1 a 30 dias." } };
  return { ok: true, dados: { dias } };
}

export type TipoVotacao = "pontos" | "wip";

// Valores do baralho: pontos usam a escala Fibonacci; WIP usa de 1 a 20.
export function valoresDaVotacao(tipo: TipoVotacao): number[] {
  return tipo === "pontos" ? [...PONTOS_VALIDOS] : Array.from({ length: WIP_MAXIMO }, (_, i) => i + 1);
}

export function valorDeVotoValido(tipo: TipoVotacao, valor: number): boolean {
  return valoresDaVotacao(tipo).includes(valor);
}

// Resumo dos votos revelados: média, menor, maior e o valor do baralho mais próximo da média
// (sugestão para o time; quem decide é o time).
export function resumoDosVotos(tipo: TipoVotacao, valores: number[]) {
  if (valores.length === 0) return null;
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  const baralho = valoresDaVotacao(tipo);
  const sugestao = baralho.reduce((melhor, v) => (Math.abs(v - media) < Math.abs(melhor - media) ? v : melhor), baralho[0]);
  const consenso = valores.every((v) => v === valores[0]);
  return { media, menor: Math.min(...valores), maior: Math.max(...valores), sugestao, consenso };
}

// ---------------------------------------------------------------- Cadastro do projeto
// Pedido do professor: o projeto é cadastrado como um contrato, com tudo que os
// cálculos precisam. Todos os campos são obrigatórios.

export const DURACAO_SPRINT_PADRAO = 14;

export type CadastroProjeto = {
  nome: string;
  cliente: string;
  objetivo: string;
  horas: number;
  inicio: string;
  entrega: string;
  duracao: number;
  lead: number;
  cycle: number;
  velocity: number;
};

type LeitorDeForm = { get(nome: string): FormDataEntryValue | null };

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validarCadastroProjeto(form: LeitorDeForm): Resultado<CadastroProjeto> {
  const erros: Partial<Record<string, string>> = {};
  const textoObrigatorio = (nome: string, maximo: number, rotulo: string) => {
    const t = texto(form.get(nome));
    if (!t) erros[nome] = `Informe ${rotulo}.`;
    else if (t.length > maximo) erros[nome] = `Use no máximo ${maximo} caracteres.`;
    return t;
  };
  const numero = (nome: string, min: number, max: number, inteiro: boolean, rotulo: string) => {
    const t = texto(form.get(nome)).replace(",", ".");
    const n = Number(t);
    if (!t || !Number.isFinite(n) || n < min || n > max || (inteiro && !Number.isInteger(n))) {
      erros[nome] = `Informe ${rotulo} (${inteiro ? "número inteiro " : ""}de ${min} a ${max}).`;
    }
    return n;
  };
  const data = (nome: string, rotulo: string) => {
    const t = texto(form.get(nome));
    if (!DATA_ISO.test(t) || Number.isNaN(Date.parse(`${t}T00:00:00Z`))) erros[nome] = `Informe ${rotulo}.`;
    return t;
  };

  const nome = textoObrigatorio("nome", NOME_PROJETO_MAXIMO, "o nome do projeto");
  const cliente = textoObrigatorio("cliente", 80, "o cliente");
  const objetivo = textoObrigatorio("objetivo", 300, "o objetivo do projeto");
  const horas = numero("horas", 1, 100000, true, "as horas contratadas");
  const inicio = data("inicio", "a data de início");
  const entrega = data("entrega", "a data de entrega");
  if (!erros.inicio && !erros.entrega && entrega < inicio) erros.entrega = "A entrega não pode ser antes do início.";
  const duracao = numero("duracao", 1, 60, true, "a duração da Sprint em dias");
  const lead = numero("lead", 0.1, 365, false, "a meta de Lead Time em dias");
  const cycle = numero("cycle", 0.1, 2000, false, "a meta de Cycle Time em horas");
  const velocity = numero("velocity", 1, 10000, true, "a meta de Velocity em pontos");

  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados: { nome, cliente, objetivo, horas, inicio, entrega, duracao, lead, cycle, velocity } };
}

// O cadastro dos projetos criados antes desta versão pode estar incompleto.
export function cadastroCompleto(p: {
  cliente: string | null;
  objetivo: string | null;
  horasContratadas: number | null;
  dataInicio: string | null;
  dataEntrega: string | null;
  duracaoSprint: number | null;
  metas: { leadDias: number | null; cycleHoras: number | null; velocity: number | null };
}): boolean {
  return Boolean(
    p.cliente && p.objetivo && p.horasContratadas && p.dataInicio && p.dataEntrega && p.duracaoSprint &&
      p.metas.leadDias && p.metas.cycleHoras && p.metas.velocity,
  );
}

// ---------------------------------------------------------------- Horas estimadas e bloqueio

export const HORAS_MINIMO = 0.5;
export const HORAS_MAXIMO = 1000;

// Horas estimadas do cartão (obrigatórias): aceitam vírgula e meia hora.
export function validarHoras(bruto: FormDataEntryValue | null | undefined): Resultado<{ horas: number }> {
  const t = texto(bruto).replace(",", ".");
  const n = Number(t);
  if (!t || !Number.isFinite(n) || n < HORAS_MINIMO || n > HORAS_MAXIMO || Math.round(n * 10) !== n * 10) {
    return { ok: false, erros: { horas: `Informe as horas estimadas (de ${HORAS_MINIMO.toLocaleString("pt-BR")} a ${HORAS_MAXIMO}).` } };
  }
  return { ok: true, dados: { horas: n } };
}

export const MOTIVO_MAXIMO = 300;

export function validarMotivo(bruto: FormDataEntryValue | null | undefined): Resultado<{ motivo: string }> {
  const t = texto(bruto);
  if (!t) return { ok: false, erros: { motivo: "Escreva o motivo do bloqueio." } };
  if (t.length > MOTIVO_MAXIMO) return { ok: false, erros: { motivo: `Use no máximo ${MOTIVO_MAXIMO} caracteres.` } };
  return { ok: true, dados: { motivo: t } };
}
