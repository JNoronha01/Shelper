// Papéis no time (pedido do professor em 21/11). O banco confere cada ação de novo
// (função exigir_funcao); aqui a regra serve para a tela mostrar só o que a pessoa pode usar.
//
//  * PO: é o gestor do projeto. Pode tudo.
//  * SM: Sprint, métricas do time, WIP e votações.
//  * Desenvolvedor: move cartões, checklist, descrição e vota. Não cria nem altera regras.

export type Funcao = "po" | "sm" | "dev";

export const FUNCOES: readonly Funcao[] = ["po", "sm", "dev"];

export const NOME_DA_FUNCAO: Record<Funcao, string> = {
  po: "Product Owner",
  sm: "Scrum Master",
  dev: "Desenvolvedor",
};

export const SIGLA_DA_FUNCAO: Record<Funcao, string> = { po: "PO", sm: "SM", dev: "Dev" };

export const eFuncao = (v: unknown): v is Funcao => FUNCOES.includes(v as Funcao);

export type Permissao =
  | "criarCartao" // criar cartão e editar título e pontos
  | "gerirSprint" // criar, editar, montar e encerrar Sprint
  | "verMetricasTime"
  | "verHistorico"
  | "conduzirVotacao" // abrir, revelar, nova rodada, decidir e cancelar
  | "alterarWip"
  | "editarCadastro" // dados do projeto e metas
  | "gerirTime"; // convite, papéis e remover pessoas

const QUEM_PODE: Record<Permissao, readonly Funcao[]> = {
  criarCartao: ["po"],
  gerirSprint: ["po", "sm"],
  verMetricasTime: ["po", "sm"],
  verHistorico: ["po", "sm"],
  conduzirVotacao: ["po", "sm"],
  alterarWip: ["po", "sm"],
  editarCadastro: ["po"],
  gerirTime: ["po"],
};

export const pode = (funcao: Funcao, permissao: Permissao) => QUEM_PODE[permissao].includes(funcao);

// Abas do projeto que cada papel vê, na ordem da tela.
export type IdAba = "board" | "sprint" | "metricas" | "minhas" | "votacao" | "historico" | "time" | "projeto";

export function abasDoPapel(funcao: Funcao): IdAba[] {
  const abas: IdAba[] = ["board", "sprint"];
  // PO e SM veem as métricas do time (com filtro por pessoa); o Dev vê só as dele.
  abas.push(pode(funcao, "verMetricasTime") ? "metricas" : "minhas");
  abas.push("votacao");
  if (pode(funcao, "verHistorico")) abas.push("historico");
  abas.push("time");
  if (pode(funcao, "alterarWip") || pode(funcao, "editarCadastro")) abas.push("projeto");
  return abas;
}
