import { COLUNAS, type Coluna } from "@/lib/colunas";

// Importação do board a partir do JSON que o Trello exporta (menu do board → Imprimir, exportar e
// compartilhar → Exportar como JSON; funciona no plano grátis). Funções puras: a tela lê o arquivo,
// mostra a prévia e manda para o servidor só o resultado já normalizado.
//
// O JSON do Trello traz as listas, os cartões, os checklists e as 1000 ações mais recentes.
// As ações "createCard" e "updateCard" com troca de lista viram os eventos do Shelper, com a data do Trello.

export const LIMITE_CARTOES = 500;
const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

type Obj = Record<string, unknown>;
const ehObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown) => (typeof v === "string" ? v : "");

export type ListaTrello = { id: string; nome: string; cartoes: number; sugestao: Coluna | null };
export type MapaListas = Record<string, Coluna | null>;

export type EventoImportado = { de: Coluna | null; para: Coluna; em: string };
export type CartaoImportado = {
  origem: string; // id do cartão no Trello: evita importar o mesmo cartão duas vezes
  titulo: string;
  pontos: number;
  coluna: Coluna;
  descricao: string | null;
  checklist: { texto: string; feito: boolean }[];
  criadoEm: string;
  eventos: EventoImportado[];
};
export type Importacao = { cartoes: CartaoImportado[]; avisos: string[] };

// Nome da lista do Trello → coluna do Shelper, por palavras comuns em português e inglês.
export function sugerirColuna(nomeLista: string): Coluna | null {
  const n = nomeLista.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/backlog|ideias|icebox/.test(n)) return "Backlog";
  if (/revis|review|teste|testing|qa\b|homolog/.test(n)) return "Em revisão";
  if (/andamento|fazendo|doing|progress|desenvolv/.test(n)) return "Em andamento";
  if (/conclu|done|feito|pronto|entregue/.test(n)) return "Concluído";
  if (/a fazer|to ?do|sprint|proxim|pendente/.test(n)) return "A fazer";
  return null;
}

// O id do Trello (ObjectId) guarda a data de criação nos 8 primeiros caracteres (segundos, em hexadecimal).
export function dataDoId(id: string): string | null {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  const segundos = parseInt(id.slice(0, 8), 16);
  return Number.isFinite(segundos) && segundos > 0 ? new Date(segundos * 1000).toISOString() : null;
}

// "H5 - (3) Criar Sprint" → pontos 3. Sem "(n)" ou fora da escala de Fibonacci → 0 (com aviso).
export function lerPontos(nome: string): { pontos: number; valido: boolean; achou: boolean } {
  const m = nome.match(/\((\d{1,3})\)/);
  if (!m) return { pontos: 0, valido: true, achou: false };
  const n = Number(m[1]);
  return FIBONACCI.includes(n) ? { pontos: n, valido: true, achou: true } : { pontos: 0, valido: false, achou: true };
}

export function validarExport(json: unknown): { ok: true; dados: Obj } | { ok: false; erro: string } {
  if (!ehObj(json)) return { ok: false, erro: "O arquivo não é um JSON de board do Trello." };
  if (!Array.isArray(json.lists) || !Array.isArray(json.cards)) {
    return {
      ok: false,
      erro: "Não encontramos listas e cartões. Exporte o board pelo menu Imprimir, exportar e compartilhar → Exportar como JSON.",
    };
  }
  return { ok: true, dados: json };
}

const listasAbertas = (dados: Obj) => (dados.lists as unknown[]).filter(ehObj).filter((l) => !l.closed && typeof l.id === "string");
const cartoesAbertos = (dados: Obj) =>
  (dados.cards as unknown[]).filter(ehObj).filter((c) => !c.closed && typeof c.id === "string" && typeof c.idList === "string");

export function listasDoExport(dados: Obj): ListaTrello[] {
  const cartoes = cartoesAbertos(dados);
  return listasAbertas(dados).map((l) => ({
    id: l.id as string,
    nome: texto(l.name) || "(sem nome)",
    cartoes: cartoes.filter((c) => c.idList === l.id).length,
    sugestao: sugerirColuna(texto(l.name)),
  }));
}

export function montarImportacao(dados: Obj, mapa: MapaListas, agora = new Date().toISOString()): Importacao {
  const avisos: string[] = [];
  const colunaDaLista = (idLista: unknown) => (typeof idLista === "string" ? (mapa[idLista] ?? null) : null);

  // Checklists por cartão.
  const checklists = new Map<string, { texto: string; feito: boolean }[]>();
  for (const cl of Array.isArray(dados.checklists) ? dados.checklists.filter(ehObj) : []) {
    const idCartao = texto(cl.idCard);
    const itens = (Array.isArray(cl.checkItems) ? cl.checkItems.filter(ehObj) : [])
      .sort((a, b) => Number(a.pos ?? 0) - Number(b.pos ?? 0))
      .map((i) => ({
        texto: texto(i.name)
          .replace(/^\s*[-–•]\s*/, "")
          .trim()
          .slice(0, 200),
        feito: i.state === "complete",
      }))
      .filter((i) => i.texto);
    checklists.set(idCartao, [...(checklists.get(idCartao) ?? []), ...itens]);
  }

  // Ações em ordem de data: criação e troca de lista de cada cartão.
  type Acao = { em: string; para: Coluna | null; criacao: boolean };
  const acoes = new Map<string, Acao[]>();
  const todas = (Array.isArray(dados.actions) ? dados.actions.filter(ehObj) : []).sort(
    (a, b) => Date.parse(texto(a.date)) - Date.parse(texto(b.date)),
  );
  for (const a of todas) {
    const d = ehObj(a.data) ? a.data : {};
    const idCartao = ehObj(d.card) ? texto(d.card.id) : "";
    const em = texto(a.date);
    if (!idCartao || Number.isNaN(Date.parse(em))) continue;
    let acao: Acao | null = null;
    if (a.type === "createCard" || a.type === "copyCard" || a.type === "convertToCardFromCheckItem") {
      acao = { em, para: colunaDaLista(ehObj(d.list) ? d.list.id : null), criacao: true };
    } else if (a.type === "updateCard" && ehObj(d.listAfter)) {
      acao = { em, para: colunaDaLista(d.listAfter.id), criacao: false };
    } else if (a.type === "moveCardToBoard") {
      acao = { em, para: colunaDaLista(ehObj(d.list) ? d.list.id : null), criacao: false };
    }
    if (acao) acoes.set(idCartao, [...(acoes.get(idCartao) ?? []), acao]);
  }

  const semColuna = new Set<string>();
  const cartoes: CartaoImportado[] = [];
  for (const c of cartoesAbertos(dados)) {
    const coluna = colunaDaLista(c.idList);
    const nome = texto(c.name).trim().slice(0, 200);
    if (!coluna) {
      semColuna.add(texto(c.idList));
      continue;
    }
    if (!nome) continue;
    const { pontos, valido } = lerPontos(nome);
    if (!valido) avisos.push(`"${nome}": pontos fora da escala de Fibonacci; entrou com 0.`);

    const id = c.id as string;
    const historico = acoes.get(id) ?? [];
    const criacao = historico.find((h) => h.criacao);
    const criadoEm = criacao?.em ?? dataDoId(id) ?? agora;

    // Eventos: criação na primeira coluna conhecida e cada troca de lista depois dela.
    const eventos: EventoImportado[] = [];
    let atual: Coluna | null = null;
    const primeira = criacao?.para ?? historico.find((h) => h.para)?.para ?? coluna;
    eventos.push({ de: null, para: primeira, em: criadoEm });
    atual = primeira;
    for (const h of historico) {
      if (h.criacao || !h.para || h.para === atual || Date.parse(h.em) < Date.parse(criadoEm)) continue;
      eventos.push({ de: atual, para: h.para, em: h.em });
      atual = h.para;
    }
    // O cartão precisa terminar na coluna onde está hoje no Trello.
    if (atual !== coluna) {
      const ultimo = texto(c.dateLastActivity) || eventos[eventos.length - 1].em;
      const em = Date.parse(ultimo) >= Date.parse(eventos[eventos.length - 1].em) ? ultimo : eventos[eventos.length - 1].em;
      eventos.push({ de: atual, para: coluna, em });
    }

    cartoes.push({
      origem: id,
      titulo: nome,
      pontos,
      coluna,
      descricao: texto(c.desc).trim().slice(0, 2000) || null,
      checklist: checklists.get(id) ?? [],
      criadoEm,
      eventos,
    });
  }

  if (semColuna.size)
    avisos.unshift(`${semColuna.size} ${semColuna.size === 1 ? "lista ficou" : "listas ficaram"} sem coluna; os cartões dela não entram.`);
  if (cartoes.length > LIMITE_CARTOES) {
    avisos.unshift(`O board tem ${cartoes.length} cartões; entram os ${LIMITE_CARTOES} primeiros.`);
    cartoes.length = LIMITE_CARTOES;
  }
  return { cartoes, avisos };
}

export function resumoDaImportacao(imp: Importacao) {
  return COLUNAS.map((coluna) => {
    const da = imp.cartoes.filter((c) => c.coluna === coluna);
    return { coluna, cartoes: da.length, pontos: da.reduce((s, c) => s + c.pontos, 0) };
  });
}

// Conferência no servidor do que a tela mandou (nunca confiar no navegador).
// O banco repete as regras principais (colunas, pontos, tamanho do título e datas).
export function validarCartoesImportados(v: unknown): { ok: true; cartoes: CartaoImportado[] } | { ok: false; erro: string } {
  if (!Array.isArray(v) || v.length === 0) return { ok: false, erro: "Nenhum cartão para importar." };
  if (v.length > LIMITE_CARTOES) return { ok: false, erro: `Importe no máximo ${LIMITE_CARTOES} cartões por vez.` };
  const ehColuna = (x: unknown): x is Coluna => typeof x === "string" && (COLUNAS as readonly string[]).includes(x);
  const ehData = (x: unknown) => typeof x === "string" && !Number.isNaN(Date.parse(x));
  for (const c of v) {
    if (!ehObj(c)) return { ok: false, erro: "Arquivo inválido." };
    const titulo = texto(c.titulo).trim();
    const ruim =
      !titulo ||
      titulo.length > 200 ||
      typeof c.origem !== "string" ||
      c.origem.length > 64 ||
      !FIBONACCI.includes(Number(c.pontos)) ||
      !ehColuna(c.coluna) ||
      !ehData(c.criadoEm) ||
      (c.descricao !== null && (typeof c.descricao !== "string" || c.descricao.length > 2000)) ||
      !Array.isArray(c.checklist) ||
      c.checklist.length > 100 ||
      c.checklist.some((i) => !ehObj(i) || !texto(i.texto).trim() || texto(i.texto).length > 200 || typeof i.feito !== "boolean") ||
      !Array.isArray(c.eventos) ||
      c.eventos.length === 0 ||
      c.eventos.length > 200 ||
      c.eventos.some((e) => !ehObj(e) || !ehColuna(e.para) || (e.de !== null && !ehColuna(e.de)) || !ehData(e.em)) ||
      (c.eventos.at(-1) as Obj).para !== c.coluna;
    if (ruim) return { ok: false, erro: `Cartão "${titulo.slice(0, 60) || "sem título"}" veio com dados inválidos.` };
  }
  return { ok: true, cartoes: v as CartaoImportado[] };
}
