import { COLUNAS, type Coluna } from "@/lib/colunas";
import {
  lerPontos,
  sugerirColuna,
  type CartaoImportado,
  type Importacao,
  type ListaTrello,
  type MapaListas,
  LIMITE_CARTOES,
} from "./trello";

// Importação por CSV: o CSV do Trello (Premium), o do Jira, uma planilha do time ou o modelo do Shelper.
// Cada ferramenta chama as colunas de um jeito; procuramos pelos nomes mais comuns.
// O CSV não traz o histórico de movimentos: cada cartão nasce na data de criação (se houver)
// e vai para a coluna final na data de conclusão ou da última atividade.

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Lê CSV (RFC 4180): aspas, aspas dobradas, quebra de linha dentro de aspas, separador , ou ;
export function lerCsv(texto: string): string[][] {
  const limpo = texto.replace(/^\uFEFF/, "");
  const primeira = limpo.slice(0, limpo.search(/\r?\n|$/));
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpo[i + 1] === "\n") i++;
      linha.push(campo);
      if (linha.some((v) => v.trim())) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((v) => v.trim())) linhas.push(linha);
  return linhas;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Nomes aceitos para cada informação (já normalizados: minúsculas, sem acento).
const NOMES = {
  id: ["card id", "issue key", "issue id", "id", "chave", "key"],
  titulo: ["titulo", "card name", "summary", "title", "name", "nome", "resumo", "tarefa", "cartao"],
  lista: ["coluna", "list name", "status", "lista", "column", "list", "estado", "situacao"],
  descricao: ["descricao", "card description", "description", "detalhes"],
  pontos: [
    "pontos",
    "story points",
    "custom field story points",
    "story point estimate",
    "custom field story point estimate",
    "points",
    "estimativa",
  ],
  criado: ["criado em", "created", "created date", "data de criacao", "criacao", "criado"],
  concluido: ["concluido em", "resolved", "resolution date", "done date", "data de conclusao", "concluido"],
  atividade: ["last activity date", "updated", "atualizado em", "ultima atividade"],
  arquivado: ["archived", "arquivado", "closed"],
} as const;
type Campo = keyof typeof NOMES;

export type CsvLido = { cabecalho: string[]; colunas: Partial<Record<Campo, number>>; linhas: string[][] };

export function analisarCsv(texto: string): { ok: true; csv: CsvLido } | { ok: false; erro: string } {
  const todas = lerCsv(texto);
  if (todas.length < 2) return { ok: false, erro: "O CSV precisa de um cabeçalho e pelo menos uma linha de cartão." };
  const cabecalho = todas[0].map((c) => c.trim());
  const normais = cabecalho.map(norm);
  const colunas: Partial<Record<Campo, number>> = {};
  for (const campo of Object.keys(NOMES) as Campo[]) {
    // Primeiro procura o nome exato, depois um nome que comece igual ("Status Category" não vale como Status).
    const i = NOMES[campo].map((n) => normais.indexOf(n)).find((x) => x >= 0);
    if (i !== undefined) colunas[campo] = i;
  }
  if (colunas.titulo === undefined) {
    return { ok: false, erro: "Não achamos a coluna com o título do cartão. Use um cabeçalho como Título, Card Name ou Summary." };
  }
  return { ok: true, csv: { cabecalho, colunas, linhas: todas.slice(1) } };
}

const valor = (csv: CsvLido, linha: string[], campo: Campo) => {
  const i = csv.colunas[campo];
  return i === undefined ? "" : (linha[i] ?? "").trim();
};

const MESES: Record<string, number> = {
  jan: 1,
  feb: 2,
  fev: 2,
  mar: 3,
  apr: 4,
  abr: 4,
  may: 5,
  mai: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  ago: 8,
  sep: 9,
  set: 9,
  oct: 10,
  out: 10,
  nov: 11,
  dec: 12,
  dez: 12,
};

// Datas nos formatos mais comuns: ISO (Trello), 25/11/2026 14:30 (planilha), 25/Nov/26 2:30 PM (Jira).
// Sem fuso, vale o horário de Brasília (-03:00).
export function lerData(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(t) || t.length <= 10 ? t : `${t.replace(" ", "T")}-03:00`;
    const d = new Date(t.length <= 10 ? `${t}T12:00:00-03:00` : iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = t.match(/^(\d{1,2})[/.-]([A-Za-z]{3}|\d{1,2})[/.-](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = /^\d+$/.test(m[2]) ? Number(m[2]) : MESES[m[2].toLowerCase()];
  let ano = Number(m[3]);
  if (ano < 100) ano += 2000;
  let hora = m[4] ? Number(m[4]) : 12;
  if (m[6]?.toLowerCase() === "pm" && hora < 12) hora += 12;
  if (m[6]?.toLowerCase() === "am" && hora === 12) hora = 0;
  const minuto = m[5] ? Number(m[5]) : 0;
  if (!mes || mes > 12 || dia > 31) return null;
  const d = new Date(Date.UTC(ano, mes - 1, dia, hora + 3, minuto));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const arquivado = (v: string) => ["true", "sim", "yes", "1"].includes(v.toLowerCase());
const SEM_LISTA = "(sem coluna)";

export function listasDoCsv(csv: CsvLido): ListaTrello[] {
  const contagem = new Map<string, number>();
  for (const l of csv.linhas) {
    if (arquivado(valor(csv, l, "arquivado")) || !valor(csv, l, "titulo")) continue;
    const lista = valor(csv, l, "lista") || SEM_LISTA;
    contagem.set(lista, (contagem.get(lista) ?? 0) + 1);
  }
  return [...contagem].map(([nome, cartoes]) => ({
    id: nome,
    nome,
    cartoes,
    sugestao: nome === SEM_LISTA ? "Backlog" : (COLUNAS as readonly string[]).includes(nome) ? (nome as Coluna) : sugerirColuna(nome),
  }));
}

export function montarDoCsv(csv: CsvLido, mapa: MapaListas, agora = new Date().toISOString()): Importacao {
  const avisos: string[] = [];
  const cartoes: CartaoImportado[] = [];
  const vistos = new Set<string>();
  let semData = 0;
  for (const l of csv.linhas) {
    const titulo = valor(csv, l, "titulo").slice(0, 200);
    if (!titulo || arquivado(valor(csv, l, "arquivado"))) continue;
    const coluna = mapa[valor(csv, l, "lista") || SEM_LISTA] ?? null;
    if (!coluna) continue;

    const pontosTexto = valor(csv, l, "pontos").replace(",", ".");
    let pontos = 0;
    if (pontosTexto) {
      const n = Number(pontosTexto);
      if (FIBONACCI.includes(n)) pontos = n;
      else avisos.push(`"${titulo}": ${pontosTexto} pontos está fora da escala de Fibonacci; entrou com 0.`);
    } else {
      const lido = lerPontos(titulo);
      if (!lido.valido) avisos.push(`"${titulo}": pontos fora da escala de Fibonacci; entrou com 0.`);
      pontos = lido.pontos;
    }

    const criadoLido = lerData(valor(csv, l, "criado"));
    if (!criadoLido) semData++;
    const criadoEm = criadoLido && criadoLido <= agora ? criadoLido : agora;
    const fimLido = (coluna === "Concluído" ? lerData(valor(csv, l, "concluido")) : null) ?? lerData(valor(csv, l, "atividade"));
    const fim = fimLido && fimLido >= criadoEm && fimLido <= agora ? fimLido : criadoEm;

    const id = valor(csv, l, "id");
    let origem = (id ? `csv:${id}` : `csv:${norm(titulo)}`).slice(0, 64);
    if (vistos.has(origem)) origem = `${origem.slice(0, 58)}#${cartoes.length}`;
    vistos.add(origem);

    const eventos =
      coluna === "Backlog"
        ? [{ de: null, para: "Backlog" as Coluna, em: criadoEm }]
        : [
            { de: null, para: "Backlog" as Coluna, em: criadoEm },
            { de: "Backlog" as Coluna, para: coluna, em: fim },
          ];
    cartoes.push({
      origem,
      titulo,
      pontos,
      coluna,
      descricao: valor(csv, l, "descricao").slice(0, 2000) || null,
      checklist: [],
      criadoEm,
      eventos,
    });
  }
  avisos.unshift(
    "O CSV não traz o histórico de movimentos: o Lead Time usa as datas de criação e de conclusão, e o Cycle Time fica em branco.",
  );
  if (semData)
    avisos.push(
      `${semData} ${semData === 1 ? "cartão sem data de criação entrou" : "cartões sem data de criação entraram"} com a data de hoje.`,
    );
  if (cartoes.length > LIMITE_CARTOES) {
    avisos.unshift(`O arquivo tem ${cartoes.length} cartões; entram os ${LIMITE_CARTOES} primeiros.`);
    cartoes.length = LIMITE_CARTOES;
  }
  return { cartoes, avisos };
}

// Modelo para quem vai montar o CSV numa planilha.
export const MODELO_CSV = [
  "Título;Coluna;Pontos;Descrição;Criado em;Concluído em",
  "H1 - Cadastro e login;Concluído;3;Como visitante, quero criar uma conta.;10/11/2026 09:00;12/11/2026 18:30",
  "H2 - Criar projeto;Em andamento;5;;11/11/2026 10:00;",
  "H3 - Exportar relatório;Backlog;2;;;",
].join("\r\n");
