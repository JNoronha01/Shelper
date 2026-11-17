"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ROTA_ENTRADA } from "@/lib/auth/rotas";
import { eUuid, validarCartao, validarLimitesWip, validarNomeProjeto } from "@/lib/board/regras";
import { COLUNAS } from "@/lib/colunas";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoAcao, ResultadoMover } from "./estado";

// Cada ação lê a sessão de novo no servidor (não confia na tela) e chama uma
// função do banco que confere se o usuário é membro antes de gravar.

const SEM_ACESSO = "Você não tem acesso a este projeto.";
const FALHA = "Não foi possível concluir agora. Tente novamente em instantes.";

function mensagemDoBanco(erro: PostgrestError): string {
  // 22023 e 42501 são lançados pelas nossas funções com texto pronto para a tela.
  if (erro.code === "22023" || erro.code === "42501") return erro.message;
  if (erro.code === "28000") redirect(ROTA_ENTRADA);
  console.error("Falha no banco", { code: erro.code });
  return FALHA;
}

async function clienteComSessao() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROTA_ENTRADA);
  return supabase;
}

export async function criarProjeto(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const valores = { nome: String(form.get("nome") ?? "") };
  const validacao = validarNomeProjeto(form.get("nome"));
  if (!validacao.ok) return { erros: validacao.erros, valores };

  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("criar_projeto", { p_nome: validacao.dados.nome });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  redirect(`/painel/projetos/${data}`);
}

export async function definirLimitesWip(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const projeto = form.get("projeto");
  const valores = { andamento: String(form.get("andamento") ?? ""), revisao: String(form.get("revisao") ?? "") };
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const validacao = validarLimitesWip(form.get("andamento"), form.get("revisao"));
  if (!validacao.ok) return { erros: validacao.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("definir_limites_wip", {
    p_projeto: projeto,
    p_andamento: validacao.dados.andamento,
    p_revisao: validacao.dados.revisao,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Limites de WIP salvos.", versao: Date.now() };
}

export async function criarCartao(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const projeto = form.get("projeto");
  const valores = { titulo: String(form.get("titulo") ?? ""), pontos: String(form.get("pontos") ?? "") };
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const validacao = validarCartao(form.get("titulo"), form.get("pontos"));
  if (!validacao.ok) return { erros: validacao.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("criar_cartao", {
    p_projeto: projeto,
    p_titulo: validacao.dados.titulo,
    p_pontos: validacao.dados.pontos,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: `Cartão "${validacao.dados.titulo}" criado no Backlog.`, versao: Date.now() };
}

export async function editarCartao(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const cartao = form.get("cartao");
  const valores = { titulo: String(form.get("titulo") ?? ""), pontos: String(form.get("pontos") ?? "") };
  if (!eUuid(cartao)) return { mensagem: SEM_ACESSO };
  const validacao = validarCartao(form.get("titulo"), form.get("pontos"));
  if (!validacao.ok) return { erros: validacao.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("editar_cartao", {
    p_cartao: cartao,
    p_titulo: validacao.dados.titulo,
    p_pontos: validacao.dados.pontos,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Cartão atualizado.", versao: Date.now() };
}

export async function moverCartao(entrada: {
  cartao: string;
  para: string;
  confirmarWip: boolean;
}): Promise<ResultadoMover> {
  if (!eUuid(entrada.cartao)) return { status: "erro", mensagem: SEM_ACESSO };
  if (!(COLUNAS as readonly string[]).includes(entrada.para)) {
    return { status: "erro", mensagem: "Coluna de destino inválida." };
  }

  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("mover_cartao", {
    p_cartao: entrada.cartao,
    p_para: entrada.para,
    p_confirmar_wip: entrada.confirmarWip === true,
  });
  if (error) return { status: "erro", mensagem: mensagemDoBanco(error) };

  const r = data as { status: string; acima_do_wip?: boolean; coluna?: string; limite?: number; ocupados?: number };
  if (r.status === "wip") {
    return { status: "wip", coluna: r.coluna ?? entrada.para, limite: r.limite ?? 0, ocupados: r.ocupados ?? 0 };
  }
  if (r.status === "sem_mudanca") return { status: "sem_mudanca" };

  refresh();
  return { status: "ok", acimaDoWip: r.acima_do_wip === true };
}
