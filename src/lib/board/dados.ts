import { COLUNAS, type Coluna } from "@/lib/colunas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Leitura dos dados do board. Usa o cliente com a sessão do usuário, então as
// políticas de RLS do banco devolvem apenas projetos dos quais ele é membro.

export type ResumoProjeto = { id: string; nome: string; criadoEm: string; papel: "dono" | "membro" };

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

export type Membro = { usuarioId: string; nome: string; email: string; papel: "dono" | "membro"; entrouEm: string };

export type Convite = { codigo: string; expiraEm: string };

export type Sprint = { id: string; numero: number; inicio: string; fim: string; meta: string | null; encerrada: boolean };

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
  projeto: { id: string; nome: string; wipAndamento: number; wipRevisao: number };
  metas: Metas;
  sprints: Sprint[];
  votacoes: Votacao[];
  papel: "dono" | "membro";
  membros: number;
  cartoes: Cartao[];
  eventos: Evento[];
};

const eColuna = (v: unknown): v is Coluna => (COLUNAS as readonly unknown[]).includes(v);

export async function listarProjetos(usuarioId: string): Promise<ResumoProjeto[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("membros")
    .select("papel, projetos(id, nome, criado_em)")
    .eq("usuario_id", usuarioId);
  if (error) {
    console.error("Falha ao listar projetos", { code: error.code });
    throw new Error("Não foi possível carregar os projetos.");
  }
  type Linha = { papel: "dono" | "membro"; projetos: { id: string; nome: string; criado_em: string } | null };
  return ((data ?? []) as unknown as Linha[])
    .filter((l) => l.projetos)
    .map((l) => ({ id: l.projetos!.id, nome: l.projetos!.nome, criadoEm: l.projetos!.criado_em, papel: l.papel }))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function carregarBoard(projetoId: string, usuarioId: string): Promise<DadosBoard | null> {
  const supabase = await criarClienteServidor();

  const [projeto, membros, cartoes, eventos, sprints, votacoes] = await Promise.all([
    supabase
      .from("projetos")
      .select("id, nome, wip_andamento, wip_revisao, meta_lead_dias, meta_cycle_horas, meta_velocity")
      .eq("id", projetoId)
      .maybeSingle(),
    supabase.from("membros").select("usuario_id, papel").eq("projeto_id", projetoId),
    supabase
      .from("cartoes")
      .select("id, titulo, pontos, coluna_atual, criado_em, sprint_id, descricao, checklist_itens(id, texto, feito, criado_em)")
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
      .select("id, numero, inicio, fim, meta, encerrada")
      .eq("projeto_id", projetoId)
      .order("numero", { ascending: true }),
    supabase
      .from("votacoes")
      .select("id, tipo, cartao_id, coluna, situacao, resultado, criado_em")
      .eq("projeto_id", projetoId)
      .order("criado_em", { ascending: false })
      .limit(30),
  ]);

  for (const r of [projeto, membros, cartoes, eventos, sprints, votacoes]) {
    if (r.error) {
      console.error("Falha ao carregar o board", { code: r.error.code });
      throw new Error("Não foi possível carregar o board.");
    }
  }
  // Sem linha = projeto inexistente ou de outro time (o RLS esconde).
  if (!projeto.data) return null;

  const listaMembros = (membros.data ?? []) as { usuario_id: string; papel: "dono" | "membro" }[];
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

  return {
    projeto: {
      id: projeto.data.id,
      nome: projeto.data.nome,
      wipAndamento: projeto.data.wip_andamento,
      wipRevisao: projeto.data.wip_revisao,
    },
    metas: {
      leadDias: projeto.data.meta_lead_dias,
      cycleHoras: projeto.data.meta_cycle_horas,
      velocity: projeto.data.meta_velocity,
    },
    sprints: (sprints.data ?? []) as Sprint[],
    votacoes: (votacoes.data ?? []).map((v) => ({
      id: v.id,
      tipo: v.tipo,
      cartaoId: v.cartao_id,
      coluna: v.coluna,
      situacao: v.situacao,
      resultado: v.resultado,
      criadoEm: v.criado_em,
    })),
    papel: eu.papel,
    membros: listaMembros.length,
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
  const { data, error } = await supabase.rpc("listar_membros", { p_projeto: projetoId });
  if (error) falhar("os membros", error.code);
  return ((data ?? []) as { usuario_id: string; nome: string; email: string; papel: "dono" | "membro"; entrou_em: string }[]).map(
    (m) => ({ usuarioId: m.usuario_id, nome: m.nome, email: m.email, papel: m.papel, entrouEm: m.entrou_em }),
  );
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
