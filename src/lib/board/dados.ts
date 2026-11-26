import { COLUNAS, type Coluna } from "@/lib/colunas";
import { cadastroCompleto } from "./regras";
import type { Funcao } from "./papeis";
import { criarClienteServidor } from "@/lib/supabase/server";

// Leitura dos dados do board. Usa o cliente com a sessão do usuário, então as
// políticas de RLS do banco devolvem apenas projetos dos quais ele é membro.

export type ResumoProjeto = {
  id: string;
  nome: string;
  criadoEm: string;
  funcao: Funcao;
  membros: number;
  cartoes: number;
  pontosTotais: number;
  pontosFeitos: number;
  // Cartões por coluna, na ordem do fluxo (para a mini barra do card do projeto).
  porColuna: number[];
  sprintAtiva: { numero: number; fim: string } | null;
};

export type ItemChecklist = { id: string; texto: string; feito: boolean };

export type Cartao = {
  id: string;
  titulo: string;
  pontos: number;
  coluna: Coluna;
  criadoEm: string;
  sprintId: string | null;
  descricao: string | null;
  checklist: ItemChecklist[];
  responsavelId: string | null;
  horasEstimadas: number | null;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  bloqueadoEm: string | null;
  // Última entrada em "Em andamento": é daí que conta o prazo do gargalo.
  inicioAndamento: string | null;
};

export type Votacao = {
  id: string;
  tipo: "pontos" | "wip";
  cartaoId: string | null;
  coluna: "Em andamento" | "Em revisão" | null;
  situacao: "aberta" | "revelada" | "encerrada";
  resultado: number | null;
  criadoEm: string;
};

// valor = null quando o voto ainda está escondido (votação aberta e o voto é de outra pessoa).
export type Voto = { votacaoId: string; usuarioId: string; nome: string; valor: number | null };

export type Membro = { usuarioId: string; nome: string; email: string; funcao: Funcao; entrouEm: string; foto: string | null };

export type Convite = { codigo: string; expiraEm: string };

// foraDoBacklog: a Sprint recebeu cartões que já estavam em outras colunas (ver aba Projeto).
export type Sprint = {
  id: string;
  numero: number;
  inicio: string;
  fim: string;
  meta: string | null;
  encerrada: boolean;
  foraDoBacklog: boolean;
};

// Metas das métricas, digitadas pelo time. Qualquer uma pode ficar em branco (null).
export type Metas = { leadDias: number | null; cycleHoras: number | null; velocity: number | null };

// Evento reduzido, só o que o cálculo das métricas precisa.
export type EventoCalculo = { cartaoId: string; de: Coluna | null; para: Coluna; em: string };

export type Evento = {
  id: number;
  titulo: string;
  de: Coluna | null;
  para: Coluna;
  em: string;
  meu: boolean;
  acimaDoWip: boolean;
};

export type DadosBoard = {
  projeto: {
    id: string;
    nome: string;
    wipAndamento: number;
    wipRevisao: number;
    cliente: string | null;
    objetivo: string | null;
    horasContratadas: number | null;
    dataInicio: string | null;
    dataEntrega: string | null;
    duracaoSprint: number | null;
    cadastroCompleto: boolean;
    // Interruptor da aba Projeto: o Planejar Sprint aceita cartões fora do Backlog.
    sprintForaBacklog: boolean;
  };
  metas: Metas;
  sprints: Sprint[];
  votacoes: Votacao[];
  funcao: Funcao;
  membros: number;
  time: Membro[];
  cartoes: Cartao[];
  eventos: Evento[];
};

const eColuna = (v: unknown): v is Coluna => (COLUNAS as readonly unknown[]).includes(v);

export async function listarProjetos(usuarioId: string): Promise<ResumoProjeto[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("membros")
    .select("funcao, projetos(id, nome, criado_em, cartoes(pontos, coluna_atual), sprints(numero, fim, encerrada), membros(count))")
    .eq("usuario_id", usuarioId);
  if (error) {
    console.error("Falha ao listar projetos", { code: error.code });
    throw new Error("Não foi possível carregar os projetos.");
  }
  type Linha = {
    funcao: Funcao;
    projetos: {
      id: string;
      nome: string;
      criado_em: string;
      cartoes: { pontos: number; coluna_atual: string }[];
      sprints: { numero: number; fim: string; encerrada: boolean }[];
      membros: { count: number }[];
    } | null;
  };
  return ((data ?? []) as unknown as Linha[])
    .filter((l) => l.projetos)
    .map((l) => {
      const p = l.projetos!;
      const ativa = p.sprints.find((x) => !x.encerrada);
      const feitos = p.cartoes.filter((c) => c.coluna_atual === "Concluído");
      return {
        id: p.id,
        nome: p.nome,
        criadoEm: p.criado_em,
        funcao: l.funcao,
        membros: p.membros[0]?.count ?? 1,
        cartoes: p.cartoes.length,
        pontosTotais: p.cartoes.reduce((s, c) => s + c.pontos, 0),
        pontosFeitos: feitos.reduce((s, c) => s + c.pontos, 0),
        porColuna: COLUNAS.map((col) => p.cartoes.filter((c) => c.coluna_atual === col).length),
        sprintAtiva: ativa ? { numero: ativa.numero, fim: ativa.fim } : null,
      };
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function carregarBoard(projetoId: string, usuarioId: string): Promise<DadosBoard | null> {
  const supabase = await criarClienteServidor();

  const [projeto, membros, cartoes, eventos, sprints, votacoes, inicios] = await Promise.all([
    supabase
      .from("projetos")
      .select(
        "id, nome, wip_andamento, wip_revisao, meta_lead_dias, meta_cycle_horas, meta_velocity, cliente, objetivo, horas_contratadas, data_inicio, data_entrega, duracao_sprint, sprint_fora_backlog",
      )
      .eq("id", projetoId)
      .maybeSingle(),
    supabase.rpc("listar_time", { p_projeto: projetoId }),
    supabase
      .from("cartoes")
      .select(
        "id, titulo, pontos, coluna_atual, criado_em, sprint_id, descricao, responsavel_id, horas_estimadas, bloqueado, motivo_bloqueio, bloqueado_em, checklist_itens(id, texto, feito, criado_em)",
      )
      .eq("projeto_id", projetoId)
      .order("criado_em", { ascending: true }),
    supabase
      .from("eventos")
      .select("id, de_coluna, para_coluna, em, usuario_id, acima_do_wip, cartoes!inner(titulo, projeto_id)")
      .eq("cartoes.projeto_id", projetoId)
      .order("em", { ascending: false })
      .limit(50),
    supabase
      .from("sprints")
      .select("id, numero, inicio, fim, meta, encerrada, fora_do_backlog")
      .eq("projeto_id", projetoId)
      .order("numero", { ascending: true }),
    supabase
      .from("votacoes")
      .select("id, tipo, cartao_id, coluna, situacao, resultado, criado_em")
      .eq("projeto_id", projetoId)
      .order("criado_em", { ascending: false })
      .limit(30),
    // Entradas em Em andamento de cada cartão, para saber quando o prazo começou.
    supabase
      .from("eventos")
      .select("cartao_id, em, cartoes!inner(projeto_id)")
      .eq("cartoes.projeto_id", projetoId)
      .eq("para_coluna", "Em andamento")
      .limit(5000),
  ]);

  for (const r of [projeto, membros, cartoes, eventos, sprints, votacoes, inicios]) {
    if (r.error) {
      console.error("Falha ao carregar o board", { code: r.error.code });
      throw new Error("Não foi possível carregar o board.");
    }
  }
  // Sem linha = projeto inexistente ou de outro time (o RLS esconde).
  if (!projeto.data) return null;

  const listaMembros = (membros.data ?? []) as {
    usuario_id: string;
    nome: string;
    email: string;
    funcao: Funcao;
    entrou_em: string;
    foto: string | null;
  }[];
  const inicioPorCartao = new Map<string, string>();
  for (const e of (inicios.data ?? []) as { cartao_id: string; em: string }[]) {
    const atual = inicioPorCartao.get(e.cartao_id);
    if (!atual || e.em > atual) inicioPorCartao.set(e.cartao_id, e.em);
  }
  const eu = listaMembros.find((m) => m.usuario_id === usuarioId);
  if (!eu) return null;

  type LinhaEvento = {
    id: number;
    de_coluna: string | null;
    para_coluna: string;
    em: string;
    usuario_id: string | null;
    acima_do_wip: boolean;
    cartoes: { titulo: string } | null;
  };

  const metas: Metas = {
    leadDias: projeto.data.meta_lead_dias === null ? null : Number(projeto.data.meta_lead_dias),
    cycleHoras: projeto.data.meta_cycle_horas === null ? null : Number(projeto.data.meta_cycle_horas),
    velocity: projeto.data.meta_velocity,
  };
  const cadastro = {
    cliente: projeto.data.cliente,
    objetivo: projeto.data.objetivo,
    horasContratadas: projeto.data.horas_contratadas,
    dataInicio: projeto.data.data_inicio,
    dataEntrega: projeto.data.data_entrega,
    duracaoSprint: projeto.data.duracao_sprint,
  };

  return {
    projeto: {
      id: projeto.data.id,
      nome: projeto.data.nome,
      wipAndamento: projeto.data.wip_andamento,
      wipRevisao: projeto.data.wip_revisao,
      ...cadastro,
      cadastroCompleto: cadastroCompleto({ ...cadastro, metas }),
      sprintForaBacklog: projeto.data.sprint_fora_backlog === true,
    },
    metas,
    sprints: (sprints.data ?? []).map((s) => ({
      id: s.id,
      numero: s.numero,
      inicio: s.inicio,
      fim: s.fim,
      meta: s.meta,
      encerrada: s.encerrada,
      foraDoBacklog: s.fora_do_backlog === true,
    })),
    votacoes: (votacoes.data ?? []).map((v) => ({
      id: v.id,
      tipo: v.tipo,
      cartaoId: v.cartao_id,
      coluna: v.coluna,
      situacao: v.situacao,
      resultado: v.resultado,
      criadoEm: v.criado_em,
    })),
    funcao: eu.funcao,
    membros: listaMembros.length,
    time: listaMembros.map((m) => ({
      usuarioId: m.usuario_id,
      nome: m.nome,
      email: m.email,
      funcao: m.funcao,
      entrouEm: m.entrou_em,
      foto: m.foto,
    })),
    cartoes: (cartoes.data ?? [])
      .filter((c) => eColuna(c.coluna_atual))
      .map((c) => ({
        id: c.id,
        titulo: c.titulo,
        pontos: c.pontos,
        coluna: c.coluna_atual as Coluna,
        criadoEm: c.criado_em,
        sprintId: c.sprint_id,
        descricao: c.descricao,
        checklist: ((c.checklist_itens ?? []) as { id: string; texto: string; feito: boolean; criado_em: string }[])
          .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
          .map((i) => ({ id: i.id, texto: i.texto, feito: i.feito })),
        responsavelId: c.responsavel_id,
        horasEstimadas: c.horas_estimadas === null ? null : Number(c.horas_estimadas),
        bloqueado: c.bloqueado,
        motivoBloqueio: c.motivo_bloqueio,
        bloqueadoEm: c.bloqueado_em,
        inicioAndamento: inicioPorCartao.get(c.id) ?? null,
      })),
    eventos: ((eventos.data ?? []) as unknown as LinhaEvento[])
      .filter((e) => eColuna(e.para_coluna))
      .map((e) => ({
        id: e.id,
        titulo: e.cartoes?.titulo ?? "",
        de: eColuna(e.de_coluna) ? e.de_coluna : null,
        para: e.para_coluna as Coluna,
        em: e.em,
        meu: e.usuario_id === usuarioId,
        acimaDoWip: e.acima_do_wip,
      })),
  };
}

// Todos os eventos do projeto, para as métricas. O histórico da tela mostra só os últimos 50;
// o cálculo precisa de todos. Limite de 10 mil só como trava de segurança.
export async function carregarEventosParaCalculo(projetoId: string): Promise<EventoCalculo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("eventos")
    .select("cartao_id, de_coluna, para_coluna, em, cartoes!inner(projeto_id)")
    .eq("cartoes.projeto_id", projetoId)
    .order("em", { ascending: true })
    .limit(10000);
  if (error) {
    console.error("Falha ao carregar eventos", { code: error.code });
    throw new Error("Não foi possível carregar os eventos.");
  }
  return (data ?? [])
    .filter((e) => eColuna(e.para_coluna))
    .map((e) => ({
      cartaoId: e.cartao_id,
      de: eColuna(e.de_coluna) ? e.de_coluna : null,
      para: e.para_coluna as Coluna,
      em: e.em,
    }));
}

function falhar(onde: string, code: string | undefined): never {
  console.error(`Falha ao carregar ${onde}`, { code });
  throw new Error(`Não foi possível carregar ${onde}.`);
}

// Colegas de projeto com nome e e-mail (o RLS de perfis só deixa ler o próprio perfil,
// então a função do banco confere se você é membro e devolve a lista).
export async function carregarMembros(projetoId: string): Promise<Membro[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("listar_time", { p_projeto: projetoId });
  if (error) falhar("os membros", error.code);
  return (
    (data ?? []) as { usuario_id: string; nome: string; email: string; funcao: Funcao; entrou_em: string; foto: string | null }[]
  ).map((m) => ({
    usuarioId: m.usuario_id,
    nome: m.nome,
    email: m.email,
    funcao: m.funcao,
    entrouEm: m.entrou_em,
    foto: m.foto,
  }));
}

// Só o dono consegue ler o convite (RLS); para os outros volta null.
export async function carregarConvite(projetoId: string): Promise<Convite | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("convites").select("codigo, expira_em").eq("projeto_id", projetoId).maybeSingle();
  if (error) falhar("o convite", error.code);
  return data ? { codigo: data.codigo, expiraEm: data.expira_em } : null;
}

export async function carregarVotos(projetoId: string): Promise<Voto[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("votos_do_projeto", { p_projeto: projetoId });
  if (error) falhar("os votos", error.code);
  return ((data ?? []) as { votacao_id: string; usuario_id: string; nome: string; valor: number | null }[]).map((v) => ({
    votacaoId: v.votacao_id,
    usuarioId: v.usuario_id,
    nome: v.nome,
    valor: v.valor,
  }));
}

// ---------------------------------------------------------------- Histórico paginado

export const ITENS_POR_PAGINA = 20;

export type ItemHistorico = {
  id: string;
  tipo: "movimento" | "bloqueio" | "desbloqueio" | "responsavel";
  cartaoId: string;
  cartaoTitulo: string;
  usuarioId: string | null;
  de: Coluna | null;
  para: Coluna | null;
  acimaDoWip: boolean;
  detalhe: string | null;
  em: string;
};

export type FiltrosHistorico = {
  sprint?: { inicio: string; fim: string };
  pessoa?: string;
  cartao?: string;
  acimaDoWip?: boolean;
};

// Lê a view "historico" (movimentos + outras atividades), já filtrada e paginada no banco.
export async function carregarHistorico(
  projetoId: string,
  filtros: FiltrosHistorico,
  pagina: number,
): Promise<{ itens: ItemHistorico[]; total: number }> {
  const supabase = await criarClienteServidor();
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  let consulta = supabase
    .from("historico")
    .select("id, tipo, cartao_id, cartao_titulo, usuario_id, de_coluna, para_coluna, acima_do_wip, detalhe, em", { count: "exact" })
    .eq("projeto_id", projetoId);
  if (filtros.pessoa) consulta = consulta.eq("usuario_id", filtros.pessoa);
  if (filtros.cartao) consulta = consulta.eq("cartao_id", filtros.cartao);
  if (filtros.acimaDoWip) consulta = consulta.eq("acima_do_wip", true);
  if (filtros.sprint) {
    // Dias da Sprint no horário de Brasília: do início às 00:00 até o fim às 23:59.
    const depois = new Date(`${filtros.sprint.fim}T00:00:00Z`);
    depois.setUTCDate(depois.getUTCDate() + 1);
    consulta = consulta
      .gte("em", `${filtros.sprint.inicio}T00:00:00-03:00`)
      .lt("em", `${depois.toISOString().slice(0, 10)}T00:00:00-03:00`);
  }
  const { data, error, count } = await consulta.order("em", { ascending: false }).range(inicio, inicio + ITENS_POR_PAGINA - 1);
  if (error) falhar("o histórico", error.code);
  return {
    total: count ?? 0,
    itens: (data ?? []).map((l) => ({
      id: l.id,
      tipo: l.tipo,
      cartaoId: l.cartao_id,
      cartaoTitulo: l.cartao_titulo,
      usuarioId: l.usuario_id,
      de: eColuna(l.de_coluna) ? l.de_coluna : null,
      para: eColuna(l.para_coluna) ? l.para_coluna : null,
      acimaDoWip: l.acima_do_wip,
      detalhe: l.detalhe,
      em: l.em,
    })),
  };
}

// Perfil do próprio usuário (o RLS de perfis só deixa ler o próprio).
export async function carregarMeuPerfil(usuarioId: string): Promise<{ nome: string; email: string; foto: string | null } | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("perfis").select("nome, email, foto").eq("id", usuarioId).maybeSingle();
  if (error) falhar("o perfil", error.code);
  return data;
}

// Chaves da API que a própria pessoa criou neste projeto (o RLS só devolve as dela, e sem o hash).
export type ChaveApi = {
  id: string;
  nome: string;
  prefixo: string;
  criadoEm: string;
  expiraEm: string | null;
  revogadaEm: string | null;
  ultimoUsoEm: string | null;
};

export async function carregarMinhasChaves(projetoId: string): Promise<ChaveApi[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("api_chaves")
    .select("id, nome, prefixo, criado_em, expira_em, revogada_em, ultimo_uso_em")
    .eq("projeto_id", projetoId)
    .order("criado_em", { ascending: false })
    .limit(20);
  // Antes de rodar a migração a tabela não existe: a seção só aparece vazia.
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("Falha ao carregar chaves", { code: error.code });
    return [];
  }
  return (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    prefixo: c.prefixo,
    criadoEm: c.criado_em,
    expiraEm: c.expira_em,
    revogadaEm: c.revogada_em,
    ultimoUsoEm: c.ultimo_uso_em,
  }));
}
