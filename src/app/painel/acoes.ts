"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ROTA_ENTRADA } from "@/lib/auth/rotas";
import {
  eUuid,
  validarCartao,
  validarDescricao,
  validarDiasConvite,
  validarItemChecklist,
  validarLimitesWip,
  validarMetas,
  validarNovoCartao,
  validarCadastroProjeto,
  validarHoras,
  validarMotivo,
  type CadastroProjeto,
  validarSprint,
  valorDeVotoValido,
  type TipoVotacao,
} from "@/lib/board/regras";
import { COLUNAS } from "@/lib/colunas";
import { validarCartoesImportados } from "@/lib/importacao/trello";
import { explicarErroDoBanco } from "@/lib/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Funcao } from "@/lib/board/papeis";
import type { EstadoAcao, ResultadoMover, ResultadoSimples } from "./estado";

// Cada ação lê a sessão de novo no servidor (não confia na tela) e chama uma
// função do banco que confere se o usuário é membro antes de gravar.

const SEM_ACESSO = "Você não tem acesso a este projeto.";

// Sempre devolve o motivo do erro e o que fazer (ver src/lib/erros.ts).
function mensagemDoBanco(erro: PostgrestError): string {
  if (erro.code === "28000") redirect(ROTA_ENTRADA);
  console.error("Falha no banco", { code: erro.code, message: erro.message });
  return explicarErroDoBanco(erro);
}

async function clienteComSessao() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROTA_ENTRADA);
  return supabase;
}

const CAMPOS_CADASTRO = ["nome", "cliente", "objetivo", "horas", "inicio", "entrega", "duracao", "lead", "cycle", "velocity"] as const;

const valoresDoForm = (form: FormData, campos: readonly string[]) => Object.fromEntries(campos.map((c) => [c, String(form.get(c) ?? "")]));

const argumentosDoCadastro = (d: CadastroProjeto) => ({
  p_nome: d.nome,
  p_cliente: d.cliente,
  p_objetivo: d.objetivo,
  p_horas: d.horas,
  p_inicio: d.inicio,
  p_entrega: d.entrega,
  p_duracao: d.duracao,
  p_lead: d.lead,
  p_cycle: d.cycle,
  p_velocity: d.velocity,
});

// Cadastro completo do projeto (como um contrato) + WIP. Quem cria vira o PO.
export async function criarProjeto(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const valores = valoresDoForm(form, [...CAMPOS_CADASTRO, "andamento", "revisao"]);
  const cadastro = validarCadastroProjeto(form);
  const wip = validarLimitesWip(form.get("andamento"), form.get("revisao"));
  if (!cadastro.ok || !wip.ok) {
    return { erros: { ...(cadastro.ok ? {} : cadastro.erros), ...(wip.ok ? {} : wip.erros) }, valores };
  }

  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("criar_projeto_completo", {
    ...argumentosDoCadastro(cadastro.dados),
    p_andamento: wip.dados.andamento,
    p_revisao: wip.dados.revisao,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  redirect(`/painel/projetos/${data}`);
}

export async function editarProjeto(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const projeto = form.get("projeto");
  const valores = valoresDoForm(form, CAMPOS_CADASTRO);
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const cadastro = validarCadastroProjeto(form);
  if (!cadastro.ok) return { erros: cadastro.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("editar_projeto", { p_projeto: projeto, ...argumentosDoCadastro(cadastro.dados) });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Cadastro do projeto salvo.", versao: Date.now() };
}

export async function definirFuncao(projeto: string, usuario: string, funcao: Funcao): Promise<ResultadoSimples> {
  if (!eUuid(projeto) || !eUuid(usuario)) return { ok: false, mensagem: SEM_ACESSO };
  if (funcao !== "sm" && funcao !== "dev") return { ok: false, mensagem: "Escolha SM ou Desenvolvedor." };
  return chamar("definir_funcao", { p_projeto: projeto, p_usuario: usuario, p_funcao: funcao });
}

export async function transferirPo(projeto: string, usuario: string): Promise<ResultadoSimples> {
  if (!eUuid(projeto) || !eUuid(usuario)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("transferir_po", { p_projeto: projeto, p_usuario: usuario });
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
  const valores = {
    titulo: String(form.get("titulo") ?? ""),
    pontos: String(form.get("pontos") ?? ""),
    coluna: String(form.get("coluna") ?? ""),
    descricao: String(form.get("descricao") ?? ""),
    horas: String(form.get("horas") ?? ""),
    responsavel: String(form.get("responsavel") ?? ""),
  };
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const v = validarNovoCartao(form.get("titulo"), form.get("pontos"), form.get("coluna"), form.get("descricao"));
  const h = validarHoras(form.get("horas"));
  if (!v.ok || !h.ok) return { erros: { ...(v.ok ? {} : v.erros), ...(h.ok ? {} : h.erros) }, valores };
  const responsavel = eUuid(form.get("responsavel")) ? valores.responsavel : null;

  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("criar_cartao_completo", {
    p_projeto: projeto,
    p_titulo: v.dados.titulo,
    p_pontos: v.dados.pontos,
    p_coluna: v.dados.coluna,
    p_descricao: v.dados.descricao,
    p_horas: h.dados.horas,
    p_responsavel: responsavel,
    p_confirmar_wip: form.get("confirmarWip") === "sim",
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  const r = data as { status: string; coluna?: string; limite?: number; ocupados?: number; acima_do_wip?: boolean };
  if (r.status === "wip") {
    return { valores, wip: { coluna: r.coluna ?? v.dados.coluna, limite: r.limite ?? 0, ocupados: r.ocupados ?? 0 } };
  }
  refresh();
  return {
    sucesso: `Cartão "${v.dados.titulo}" criado em ${v.dados.coluna}${r.acima_do_wip ? ", acima do limite de WIP" : ""}.`,
    versao: Date.now(),
  };
}

export async function editarCartao(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const cartao = form.get("cartao");
  const valores = {
    titulo: String(form.get("titulo") ?? ""),
    pontos: String(form.get("pontos") ?? ""),
    horas: String(form.get("horas") ?? ""),
  };
  if (!eUuid(cartao)) return { mensagem: SEM_ACESSO };
  const validacao = validarCartao(form.get("titulo"), form.get("pontos"));
  const h = validarHoras(form.get("horas"));
  if (!validacao.ok || !h.ok) return { erros: { ...(validacao.ok ? {} : validacao.erros), ...(h.ok ? {} : h.erros) }, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("editar_cartao_completo", {
    p_cartao: cartao,
    p_titulo: validacao.dados.titulo,
    p_pontos: validacao.dados.pontos,
    p_horas: h.dados.horas,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Cartão atualizado.", versao: Date.now() };
}

export async function moverCartao(entrada: { cartao: string; para: string; confirmarWip: boolean }): Promise<ResultadoMover> {
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

// ---------------------------------------------------------------- Sprint e metas

const idsDe = (form: FormData) => form.getAll("cartoes").filter((v): v is string => typeof v === "string" && eUuid(v));

export async function criarSprint(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const projeto = form.get("projeto");
  const valores = { inicio: String(form.get("inicio") ?? ""), fim: String(form.get("fim") ?? ""), meta: String(form.get("meta") ?? "") };
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const v = validarSprint(form.get("inicio"), form.get("fim"), form.get("meta"));
  if (!v.ok) return { erros: v.erros, valores };

  const supabase = await clienteComSessao();
  // A Sprint nasce do Backlog: criar_sprint só aceita cartões do Backlog e os leva para A fazer.
  const { error } = await supabase.rpc("criar_sprint", {
    p_projeto: projeto,
    p_inicio: v.dados.inicio,
    p_fim: v.dados.fim,
    p_meta: v.dados.meta,
    p_cartoes: idsDe(form),
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Sprint criada.", versao: Date.now() };
}

export async function editarSprint(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const sprint = form.get("sprint");
  const valores = { inicio: String(form.get("inicio") ?? ""), fim: String(form.get("fim") ?? ""), meta: String(form.get("meta") ?? "") };
  if (!eUuid(sprint)) return { mensagem: SEM_ACESSO };
  const v = validarSprint(form.get("inicio"), form.get("fim"), form.get("meta"));
  if (!v.ok) return { erros: v.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("editar_sprint", {
    p_sprint: sprint,
    p_inicio: v.dados.inicio,
    p_fim: v.dados.fim,
    p_meta: v.dados.meta,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Sprint atualizada.", versao: Date.now() };
}

export async function puxarCartoes(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const sprint = form.get("sprint");
  if (!eUuid(sprint)) return { mensagem: SEM_ACESSO };
  const ids = idsDe(form);
  if (ids.length === 0) return { mensagem: "Marque ao menos um cartão do Backlog." };

  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("puxar_cartoes_para_sprint", { p_sprint: sprint, p_cartoes: ids });
  if (error) return { mensagem: mensagemDoBanco(error) };

  refresh();
  return { sucesso: `${data} ${data === 1 ? "cartão foi" : "cartões foram"} para A fazer.`, versao: Date.now() };
}

export async function encerrarSprint(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const sprint = form.get("sprint");
  if (!eUuid(sprint)) return { mensagem: SEM_ACESSO };
  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("encerrar_sprint", { p_sprint: sprint });
  if (error) return { mensagem: mensagemDoBanco(error) };

  refresh();
  return { sucesso: "Sprint encerrada.", versao: Date.now() };
}

export async function definirMetas(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const projeto = form.get("projeto");
  const valores = {
    lead: String(form.get("lead") ?? ""),
    cycle: String(form.get("cycle") ?? ""),
    velocity: String(form.get("velocity") ?? ""),
  };
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const v = validarMetas(form.get("lead"), form.get("cycle"), form.get("velocity"));
  if (!v.ok) return { erros: v.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("definir_metas", {
    p_projeto: projeto,
    p_lead: v.dados.lead,
    p_cycle: v.dados.cycle,
    p_velocity: v.dados.velocity,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Metas salvas.", versao: Date.now() };
}

// ---------------------------------------------------------------- Detalhe do cartão

export async function salvarDescricao(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const cartao = form.get("cartao");
  const valores = { descricao: String(form.get("descricao") ?? "") };
  if (!eUuid(cartao)) return { mensagem: SEM_ACESSO };
  const v = validarDescricao(form.get("descricao"));
  if (!v.ok) return { erros: v.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("salvar_descricao", { p_cartao: cartao, p_descricao: v.dados.descricao });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { sucesso: "Descrição salva.", versao: Date.now() };
}

export async function adicionarItem(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const cartao = form.get("cartao");
  const valores = { texto: String(form.get("texto") ?? "") };
  if (!eUuid(cartao)) return { mensagem: SEM_ACESSO };
  const v = validarItemChecklist(form.get("texto"));
  if (!v.ok) return { erros: v.erros, valores };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("adicionar_item_checklist", { p_cartao: cartao, p_texto: v.dados.texto });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  return { versao: Date.now() };
}

async function chamar(funcao: string, argumentos: Record<string, unknown>): Promise<ResultadoSimples> {
  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc(funcao, argumentos);
  if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
  refresh();
  return { ok: true };
}

export async function marcarItem(item: string, feito: boolean): Promise<ResultadoSimples> {
  if (!eUuid(item)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("marcar_item_checklist", { p_item: item, p_feito: feito === true });
}

export async function removerItem(item: string): Promise<ResultadoSimples> {
  if (!eUuid(item)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("remover_item_checklist", { p_item: item });
}

// ---------------------------------------------------------------- Time e convite

export async function gerarConvite(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const projeto = form.get("projeto");
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const v = validarDiasConvite(form.get("dias"));
  if (!v.ok) return { erros: v.erros };

  const supabase = await clienteComSessao();
  const { error } = await supabase.rpc("gerar_convite", { p_projeto: projeto, p_dias: v.dados.dias });
  if (error) return { mensagem: mensagemDoBanco(error) };

  refresh();
  return { sucesso: "Link novo gerado. O link anterior parou de funcionar.", versao: Date.now() };
}

export async function cancelarConvite(projeto: string): Promise<ResultadoSimples> {
  if (!eUuid(projeto)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("cancelar_convite", { p_projeto: projeto });
}

export async function removerMembro(projeto: string, usuario: string): Promise<ResultadoSimples> {
  if (!eUuid(projeto) || !eUuid(usuario)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("remover_membro", { p_projeto: projeto, p_usuario: usuario });
}

const CODIGO_CONVITE = /^[0-9a-f]{64}$/;

export async function aceitarConvite(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const codigo = form.get("codigo");
  if (typeof codigo !== "string" || !CODIGO_CONVITE.test(codigo)) return { mensagem: "Convite inválido." };
  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("aceitar_convite", { p_codigo: codigo });
  if (error) return { mensagem: mensagemDoBanco(error) };
  redirect(`/painel/projetos/${data}`);
}

// ---------------------------------------------------------------- Votação (Planning Poker)

export async function abrirVotacao(entrada: {
  projeto: string;
  tipo: TipoVotacao;
  cartao?: string;
  coluna?: string;
}): Promise<ResultadoSimples> {
  if (!eUuid(entrada.projeto)) return { ok: false, mensagem: SEM_ACESSO };
  if (entrada.tipo === "pontos" && !eUuid(entrada.cartao)) return { ok: false, mensagem: "Escolha o cartão." };
  if (entrada.tipo === "wip" && entrada.coluna !== "Em andamento" && entrada.coluna !== "Em revisão") {
    return { ok: false, mensagem: "Escolha a coluna." };
  }
  return chamar("abrir_votacao", {
    p_projeto: entrada.projeto,
    p_tipo: entrada.tipo,
    p_cartao: entrada.tipo === "pontos" ? entrada.cartao : null,
    p_coluna: entrada.tipo === "wip" ? entrada.coluna : null,
  });
}

export async function votar(votacao: string, tipo: TipoVotacao, valor: number): Promise<ResultadoSimples> {
  if (!eUuid(votacao)) return { ok: false, mensagem: SEM_ACESSO };
  if (!valorDeVotoValido(tipo, valor)) return { ok: false, mensagem: "Valor fora do baralho." };
  return chamar("votar", { p_votacao: votacao, p_valor: valor });
}

export async function revelarVotacao(votacao: string): Promise<ResultadoSimples> {
  if (!eUuid(votacao)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("revelar_votacao", { p_votacao: votacao });
}

export async function novaRodada(votacao: string): Promise<ResultadoSimples> {
  if (!eUuid(votacao)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("nova_rodada", { p_votacao: votacao });
}

export async function encerrarVotacao(votacao: string, tipo: TipoVotacao, resultado: number): Promise<ResultadoSimples> {
  if (!eUuid(votacao)) return { ok: false, mensagem: SEM_ACESSO };
  if (!valorDeVotoValido(tipo, resultado)) return { ok: false, mensagem: "Valor fora do baralho." };
  return chamar("encerrar_votacao", { p_votacao: votacao, p_resultado: resultado });
}

export async function cancelarVotacao(votacao: string): Promise<ResultadoSimples> {
  if (!eUuid(votacao)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("cancelar_votacao", { p_votacao: votacao });
}

// ---------------------------------------------------------------- Responsável e bloqueio

// usuario = null tira o responsável. O desenvolvedor só pega um cartão sem dono ou larga o seu
// (o banco confere).
export async function definirResponsavel(cartao: string, usuario: string | null): Promise<ResultadoSimples> {
  if (!eUuid(cartao) || (usuario !== null && !eUuid(usuario))) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("definir_responsavel", { p_cartao: cartao, p_usuario: usuario });
}

export async function bloquearCartao(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const cartao = form.get("cartao");
  const valores = { motivo: String(form.get("motivo") ?? "") };
  if (!eUuid(cartao)) return { mensagem: SEM_ACESSO };
  const v = validarMotivo(form.get("motivo"));
  if (!v.ok) return { erros: v.erros, valores };
  const r = await chamar("definir_bloqueio", { p_cartao: cartao, p_bloqueado: true, p_motivo: v.dados.motivo });
  if (!r.ok) return { mensagem: r.mensagem, valores };
  return { sucesso: "Cartão marcado como bloqueado.", versao: Date.now() };
}

export async function desbloquearCartao(cartao: string): Promise<ResultadoSimples> {
  if (!eUuid(cartao)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("definir_bloqueio", { p_cartao: cartao, p_bloqueado: false, p_motivo: null });
}

// ---------------------------------------------------------------- Importação do Trello

export type ResultadoImportacao = { ok: true; criados: number; ignorados: number; eventos: number } | { ok: false; mensagem: string };

export async function importarTrello(projeto: string, cartoes: unknown): Promise<ResultadoImportacao> {
  if (!eUuid(projeto)) return { ok: false, mensagem: SEM_ACESSO };
  const validacao = validarCartoesImportados(cartoes);
  if (!validacao.ok) return { ok: false, mensagem: validacao.erro };
  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("importar_trello", { p_projeto: projeto, p_cartoes: validacao.cartoes });
  if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
  refresh();
  const r = data as { criados: number; ignorados: number; eventos: number };
  return { ok: true, criados: r.criados, ignorados: r.ignorados, eventos: r.eventos };
}

// ---------------------------------------------------------------- Sprint anterior

export async function registrarSprintAnterior(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const projeto = form.get("projeto");
  const valores = { inicio: String(form.get("inicio") ?? ""), fim: String(form.get("fim") ?? ""), meta: String(form.get("meta") ?? "") };
  if (!eUuid(projeto)) return { mensagem: SEM_ACESSO };
  const v = validarSprint(form.get("inicio"), form.get("fim"), form.get("meta"));
  if (!v.ok) return { erros: v.erros, valores };

  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("registrar_sprint_anterior", {
    p_projeto: projeto,
    p_inicio: v.dados.inicio,
    p_fim: v.dados.fim,
    p_meta: v.dados.meta,
  });
  if (error) return { mensagem: mensagemDoBanco(error), valores };

  refresh();
  const r = data as { numero: number; cartoes: number };
  return {
    sucesso: `Sprint ${r.numero} registrada com ${r.cartoes} ${r.cartoes === 1 ? "cartão concluído" : "cartões concluídos"} nessas datas.`,
    versao: Date.now(),
  };
}

// ---------------------------------------------------------------- Chaves da API (conectar IAs)

export type ResultadoChave = { ok: true; chave: string } | { ok: false; mensagem: string };

export async function criarChaveApi(projeto: string, nome: string, dias: number | null): Promise<ResultadoChave> {
  if (!eUuid(projeto)) return { ok: false, mensagem: SEM_ACESSO };
  const n = nome.trim();
  if (!n || n.length > 60) return { ok: false, mensagem: 'Dê um nome à chave (até 60 caracteres), por exemplo "Claude do Jorge".' };
  if (dias !== null && dias !== 30 && dias !== 90) return { ok: false, mensagem: "Validade inválida." };
  const supabase = await clienteComSessao();
  const { data, error } = await supabase.rpc("criar_chave_api", { p_projeto: projeto, p_nome: n, p_dias: dias });
  if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
  refresh();
  return { ok: true, chave: data as string };
}

export async function revogarChaveApi(chave: string): Promise<ResultadoSimples> {
  if (!eUuid(chave)) return { ok: false, mensagem: SEM_ACESSO };
  return chamar("revogar_chave_api", { p_chave: chave });
}
