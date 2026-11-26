import { COLUNAS, type Coluna } from "@/lib/colunas";
import { FORMATO_SHELPER } from "@/lib/exportacao/exportar";
import { analisarCsv, listasDoCsv, montarDoCsv } from "./csv";
import {
  LIMITE_CARTOES,
  listasDoExport,
  montarImportacao,
  validarExport,
  type CartaoImportado,
  type EventoImportado,
  type Importacao,
  type ListaTrello,
  type MapaListas,
} from "./trello";

// "Importar board": descobre de onde veio o arquivo e devolve as listas (para a pessoa escolher a
// coluna de cada uma) e a função que monta os cartões. Três origens:
//   - JSON exportado pelo Trello (plano grátis), com o histórico de movimentos
//   - JSON exportado pelo próprio Shelper (outro projeto ou um backup), com o histórico
//   - CSV: Trello Premium, Jira, planilha do time ou o modelo do Shelper (sem histórico)

export type Origem = "trello" | "shelper" | "csv";
export type Fonte = { origem: Origem; descricao: string; listas: ListaTrello[]; montar: (mapa: MapaListas) => Importacao };

const ehObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ehColuna = (v: unknown): v is Coluna => typeof v === "string" && (COLUNAS as readonly string[]).includes(v);

export function lerArquivo(nome: string, texto: string): { ok: true; fonte: Fonte } | { ok: false; erro: string } {
  if (/\.csv$/i.test(nome) || (!texto.trimStart().startsWith("{") && !texto.trimStart().startsWith("["))) {
    const r = analisarCsv(texto);
    if (!r.ok) return r;
    return {
      ok: true,
      fonte: { origem: "csv", descricao: "CSV", listas: listasDoCsv(r.csv), montar: (mapa) => montarDoCsv(r.csv, mapa) },
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Não foi possível ler o arquivo. Ele precisa ser um JSON (Trello ou Shelper) ou um CSV." };
  }

  if (ehObj(json) && json.formato === FORMATO_SHELPER && Array.isArray(json.cartoes)) {
    const cartoes = json.cartoes.filter(ehObj);
    const listas: ListaTrello[] = COLUNAS.map((c) => ({
      id: c,
      nome: c,
      cartoes: cartoes.filter((x) => x.coluna === c).length,
      sugestao: c,
    }));
    return {
      ok: true,
      fonte: {
        origem: "shelper",
        descricao: "JSON do Shelper",
        listas: listas.filter((l) => l.cartoes > 0),
        montar: (mapa) => montarDoShelper(cartoes, mapa),
      },
    };
  }

  const v = validarExport(json);
  if (!v.ok) return { ok: false, erro: "O JSON não é um board do Trello nem um projeto exportado pelo Shelper." };
  return {
    ok: true,
    fonte: {
      origem: "trello",
      descricao: "JSON do Trello",
      listas: listasDoExport(v.dados),
      montar: (mapa) => montarImportacao(v.dados, mapa),
    },
  };
}

// Projeto exportado pelo Shelper: as colunas já são as nossas; a pessoa só escolhe se quer
// trazer cada coluna (e pode mandar uma para outra). Os eventos vêm com as datas originais.
function montarDoShelper(cartoes: Record<string, unknown>[], mapa: MapaListas, agora = new Date().toISOString()): Importacao {
  const avisos: string[] = [];
  const saida: CartaoImportado[] = [];
  // Coluna sem cartões hoje não aparece na lista para escolher, mas pode estar no histórico: fica igual.
  const destino = (c: unknown): Coluna | null => (ehColuna(c) ? (c in mapa ? (mapa[c] ?? null) : c) : null);
  for (const c of cartoes) {
    const coluna = destino(c.coluna);
    const titulo = typeof c.titulo === "string" ? c.titulo.trim().slice(0, 200) : "";
    if (!coluna || !titulo || typeof c.id !== "string") continue;
    const criadoEm = typeof c.criadoEm === "string" && !Number.isNaN(Date.parse(c.criadoEm)) && c.criadoEm <= agora ? c.criadoEm : agora;
    let eventos: EventoImportado[] = (Array.isArray(c.eventos) ? c.eventos.filter(ehObj) : [])
      .map((e) => ({ de: destino(e.de), para: destino(e.para), em: typeof e.em === "string" ? e.em : "" }))
      .filter((e): e is EventoImportado => e.para !== null && !Number.isNaN(Date.parse(e.em)) && e.em <= agora && e.em >= criadoEm);
    // Uma coluna mandada para outra pode deixar eventos repetidos (de X para X): saem.
    eventos = eventos.filter((e, i) => i === 0 || e.para !== eventos[i - 1].para);
    if (!eventos.length || eventos[0].de !== null) eventos.unshift({ de: null, para: eventos[0]?.de ?? coluna, em: criadoEm });
    if (eventos[eventos.length - 1].para !== coluna)
      eventos.push({ de: eventos[eventos.length - 1].para, para: coluna, em: eventos[eventos.length - 1].em });
    // Cada movimento sai da coluna em que o anterior chegou.
    eventos = eventos.map((e, i) => ({ ...e, de: i === 0 ? null : eventos[i - 1].para }));
    const checklist = (Array.isArray(c.checklist) ? c.checklist.filter(ehObj) : [])
      .map((i) => ({ texto: typeof i.texto === "string" ? i.texto.trim().slice(0, 200) : "", feito: i.feito === true }))
      .filter((i) => i.texto)
      .slice(0, 100);
    const pontos = typeof c.pontos === "number" ? c.pontos : 0;
    saida.push({
      origem: `shelper:${c.id}`.slice(0, 64),
      titulo,
      pontos,
      coluna,
      descricao: typeof c.descricao === "string" ? c.descricao.slice(0, 2000) || null : null,
      checklist,
      criadoEm,
      eventos: eventos.slice(0, 200),
    });
  }
  if (saida.length > LIMITE_CARTOES) {
    avisos.unshift(`O arquivo tem ${saida.length} cartões; entram os ${LIMITE_CARTOES} primeiros.`);
    saida.length = LIMITE_CARTOES;
  }
  avisos.push("Sprints e responsáveis não vêm junto: o time e as datas das Sprints são deste projeto.");
  return { cartoes: saida, avisos };
}
