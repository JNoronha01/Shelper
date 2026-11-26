import type { Cartao, EventoCalculo, Membro, Sprint } from "@/lib/board/dados";
import { diaLocal, metricasPorCartao } from "@/lib/metricas/calculo";

// Exportação do projeto. Funções puras: recebem os dados já carregados e devolvem o texto do arquivo.
//
// - cartoes.csv     um cartão por linha, com as métricas (Excel, Google Planilhas, Power BI)
// - movimentos.csv  um movimento por linha (para montar gráficos próprios no Power BI)
// - completo.json   tudo, no formato que o próprio Shelper importa de volta
// - basico.csv      só o essencial, com nomes em inglês que o importador CSV do Jira reconhece
//
// Os CSVs para Excel usam ";" e vírgula decimal, porque é o padrão do Excel em português;
// o básico usa "," e ponto decimal, o padrão das ferramentas em inglês.

export type DadosExportacao = {
  projeto: { id: string; nome: string };
  cartoes: Cartao[];
  sprints: Sprint[];
  time: Membro[];
  eventos: EventoCalculo[];
  geradoEm: string;
};

type Celula = string | number | null | undefined;

export function paraCsv(linhas: Celula[][], separador: ";" | ","): string {
  const celula = (v: Celula) => {
    const t = v === null || v === undefined ? "" : String(v);
    // Fórmula no começo vira texto (evita "injeção de fórmula" ao abrir no Excel).
    const seguro = /^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t) ? `'${t}` : t;
    return /["\r\n]/.test(seguro) || seguro.includes(separador) ? `"${seguro.replaceAll('"', '""')}"` : seguro;
  };
  // BOM no início: o Excel reconhece o UTF-8 e mostra os acentos certos.
  return "\uFEFF" + linhas.map((l) => l.map(celula).join(separador)).join("\r\n") + "\r\n";
}

// Data e hora de Brasília, "25/11/2026 14:30".
const dataHora = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
        .format(new Date(iso))
        .replace(",", "")
    : "";
const decimal = (n: number | null, casas = 1) => (n === null ? "" : n.toFixed(casas).replace(".", ","));

function apoio(d: DadosExportacao) {
  const sprint = new Map(d.sprints.map((s) => [s.id, `Sprint ${s.numero}`]));
  const pessoa = new Map(d.time.map((m) => [m.usuarioId, m.nome]));
  const metricas = new Map(metricasPorCartao(d.cartoes, d.eventos).map((m) => [m.cartaoId, m]));
  const inicio = new Map<string, string>();
  for (const e of d.eventos) if (e.para === "Em andamento" && !inicio.has(e.cartaoId)) inicio.set(e.cartaoId, e.em);
  return { sprint, pessoa, metricas, inicio };
}

export function cartoesCsv(d: DadosExportacao): string {
  const { sprint, pessoa, metricas, inicio } = apoio(d);
  const cabecalho = [
    "ID",
    "Título",
    "Pontos",
    "Coluna",
    "Sprint",
    "Responsável",
    "Horas estimadas",
    "Criado em",
    "Começou em",
    "Concluído em",
    "Lead Time (dias)",
    "Cycle Time (horas)",
    "Bloqueado",
    "Motivo do bloqueio",
    "Checklist feito",
    "Checklist total",
    "Descrição",
  ];
  const linhas = d.cartoes.map((c) => {
    const m = metricas.get(c.id);
    return [
      c.id,
      c.titulo,
      c.pontos,
      c.coluna,
      c.sprintId ? sprint.get(c.sprintId) : "",
      c.responsavelId ? pessoa.get(c.responsavelId) : "",
      decimal(c.horasEstimadas),
      dataHora(c.criadoEm),
      dataHora(inicio.get(c.id) ?? null),
      dataHora(m?.concluidoEm ?? null),
      m?.leadTimeDias ?? "",
      decimal(m?.cycleTimeHoras ?? null),
      c.bloqueado ? "Sim" : "Não",
      c.motivoBloqueio ?? "",
      c.checklist.filter((i) => i.feito).length,
      c.checklist.length,
      c.descricao ?? "",
    ];
  });
  return paraCsv([cabecalho, ...linhas], ";");
}

export function movimentosCsv(d: DadosExportacao): string {
  const titulo = new Map(d.cartoes.map((c) => [c.id, c.titulo]));
  const linhas = [...d.eventos]
    .sort((a, b) => a.em.localeCompare(b.em))
    .map((e) => [e.cartaoId, titulo.get(e.cartaoId) ?? "", e.de ?? "(criação)", e.para, dataHora(e.em), diaLocal(e.em)]);
  return paraCsv([["ID do cartão", "Título", "De", "Para", "Quando", "Dia"], ...linhas], ";");
}

export function basicoCsv(d: DadosExportacao): string {
  const { sprint, pessoa } = apoio(d);
  // Status no padrão do Jira; a coluna original vai em "Labels" para não se perder.
  const STATUS = {
    Backlog: "Backlog",
    "A fazer": "To Do",
    "Em andamento": "In Progress",
    "Em revisão": "In Review",
    Concluído: "Done",
  } as const;
  const linhas = d.cartoes.map((c) => [
    c.titulo,
    c.descricao ?? "",
    "Story",
    STATUS[c.coluna],
    c.pontos,
    c.sprintId ? sprint.get(c.sprintId) : "",
    c.responsavelId ? pessoa.get(c.responsavelId) : "",
    c.criadoEm.slice(0, 10),
    c.coluna.replaceAll(" ", "_"),
  ]);
  return paraCsv(
    [["Summary", "Description", "Issue Type", "Status", "Story Points", "Sprint", "Assignee", "Created", "Labels"], ...linhas],
    ",",
  );
}

export const FORMATO_SHELPER = "shelper-projeto";

export function completoJson(d: DadosExportacao): string {
  const { sprint, pessoa, metricas } = apoio(d);
  const porCartao = new Map<string, EventoCalculo[]>();
  for (const e of [...d.eventos].sort((a, b) => a.em.localeCompare(b.em)))
    porCartao.set(e.cartaoId, [...(porCartao.get(e.cartaoId) ?? []), e]);
  return JSON.stringify(
    {
      formato: FORMATO_SHELPER,
      versao: 1,
      geradoEm: d.geradoEm,
      projeto: d.projeto,
      sprints: d.sprints.map((s) => ({ numero: s.numero, inicio: s.inicio, fim: s.fim, meta: s.meta, encerrada: s.encerrada })),
      time: d.time.map((m) => ({ nome: m.nome, funcao: m.funcao })),
      cartoes: d.cartoes.map((c) => {
        const m = metricas.get(c.id);
        return {
          id: c.id,
          titulo: c.titulo,
          pontos: c.pontos,
          coluna: c.coluna,
          descricao: c.descricao,
          criadoEm: c.criadoEm,
          sprint: c.sprintId ? sprint.get(c.sprintId) : null,
          responsavel: c.responsavelId ? (pessoa.get(c.responsavelId) ?? null) : null,
          horasEstimadas: c.horasEstimadas,
          bloqueado: c.bloqueado,
          checklist: c.checklist.map((i) => ({ texto: i.texto, feito: i.feito })),
          metricas: {
            concluidoEm: m?.concluidoEm ?? null,
            leadTimeDias: m?.leadTimeDias ?? null,
            cycleTimeHoras: m?.cycleTimeHoras ?? null,
          },
          eventos: (porCartao.get(c.id) ?? []).map((e) => ({ de: e.de, para: e.para, em: e.em })),
        };
      }),
    },
    null,
    2,
  );
}

// Nome do arquivo: "shelper-meu-projeto-cartoes-2026-11-26.csv"
export function nomeDoArquivo(projeto: string, tipo: string, extensao: string, agora: string): string {
  const base = projeto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `shelper-${base || "projeto"}-${tipo}-${diaLocal(agora)}.${extensao}`;
}
