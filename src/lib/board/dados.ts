import { COLUNAS, type Coluna } from "@/lib/colunas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Leitura dos dados do board. Usa o cliente com a sessão do usuário, então as
// políticas de RLS do banco devolvem apenas projetos dos quais ele é membro.

export type ResumoProjeto = { id: string; nome: string; criadoEm: string; papel: "dono" | "membro" };

export type Cartao = { id: string; titulo: string; pontos: number; coluna: Coluna; criadoEm: string };

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

  const [projeto, membros, cartoes, eventos] = await Promise.all([
    supabase.from("projetos").select("id, nome, wip_andamento, wip_revisao").eq("id", projetoId).maybeSingle(),
    supabase.from("membros").select("usuario_id, papel").eq("projeto_id", projetoId),
    supabase
      .from("cartoes")
      .select("id, titulo, pontos, coluna_atual, criado_em")
      .eq("projeto_id", projetoId)
      .order("criado_em", { ascending: true }),
    supabase
      .from("eventos")
      .select("id, de_coluna, para_coluna, em, usuario_id, acima_do_wip, cartoes!inner(titulo, projeto_id)")
      .eq("cartoes.projeto_id", projetoId)
      .order("em", { ascending: false })
      .limit(12),
  ]);

  for (const r of [projeto, membros, cartoes, eventos]) {
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
    papel: eu.papel,
    membros: listaMembros.length,
    cartoes: (cartoes.data ?? [])
      .filter((c) => eColuna(c.coluna_atual))
      .map((c) => ({ id: c.id, titulo: c.titulo, pontos: c.pontos, coluna: c.coluna_atual as Coluna, criadoEm: c.criado_em })),
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
