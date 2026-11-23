"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROTA_ENTRADA } from "@/lib/auth/rotas";
import { validarFoto, validarNomePerfil, validarTrocaDeEmail, validarTrocaDeSenha } from "@/lib/auth/validacao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoAcao, ResultadoSimples } from "../estado";

// Perfil do próprio usuário. Nome e foto ficam na tabela perfis (o time vê);
// e-mail e senha são do Supabase Auth. Tudo passa pelo servidor, com a sessão lida de novo.

const FALHA = "Não foi possível salvar agora. Tente novamente em instantes.";

async function sessao() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROTA_ENTRADA);
  return { supabase, user };
}

async function perfilAtual(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, id: string) {
  const { data } = await supabase.from("perfis").select("nome, foto").eq("id", id).maybeSingle();
  return data;
}

export async function salvarNome(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const r = validarNomePerfil(form);
  if (!r.ok) return { erros: r.erros, valores: { nome: String(form.get("nome") ?? "") } };
  const { supabase, user } = await sessao();
  const atual = await perfilAtual(supabase, user.id);
  const { error } = await supabase.rpc("salvar_perfil", { p_nome: r.dados.nome, p_foto: atual?.foto ?? null });
  if (error) return { mensagem: error.code === "22023" ? error.message : FALHA };
  // O nome também fica nos metadados da conta (usado como reserva no cabeçalho).
  await supabase.auth.updateUser({ data: { nome: r.dados.nome } });
  refresh();
  return { sucesso: "Nome salvo.", versao: Date.now() };
}

export async function salvarFoto(form: FormData): Promise<ResultadoSimples> {
  const r = validarFoto(form.get("foto"));
  if (!r.ok) return { ok: false, mensagem: r.erros.foto ?? FALHA };
  const { supabase, user } = await sessao();
  const atual = await perfilAtual(supabase, user.id);
  const extensao = r.dados.arquivo.type.split("/")[1];
  // Nome novo a cada troca: evita a foto antiga presa no cache do navegador.
  const caminho = `${user.id}/foto-${Date.now()}.${extensao}`;
  const envio = await supabase.storage.from("avatares").upload(caminho, r.dados.arquivo, { contentType: r.dados.arquivo.type });
  if (envio.error) {
    console.error("Falha ao enviar foto", { erro: envio.error.message });
    return { ok: false, mensagem: FALHA };
  }
  const { error } = await supabase.rpc("salvar_perfil", { p_nome: atual?.nome ?? "", p_foto: caminho });
  if (error) {
    await supabase.storage.from("avatares").remove([caminho]);
    return { ok: false, mensagem: error.code === "22023" ? error.message : FALHA };
  }
  if (atual?.foto) await supabase.storage.from("avatares").remove([atual.foto]);
  refresh();
  return { ok: true };
}

export async function removerFoto(): Promise<ResultadoSimples> {
  const { supabase, user } = await sessao();
  const atual = await perfilAtual(supabase, user.id);
  if (!atual?.foto) return { ok: true };
  const { error } = await supabase.rpc("salvar_perfil", { p_nome: atual.nome, p_foto: null });
  if (error) return { ok: false, mensagem: FALHA };
  await supabase.storage.from("avatares").remove([atual.foto]);
  refresh();
  return { ok: true };
}

export async function trocarSenha(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const r = validarTrocaDeSenha(form);
  if (!r.ok) return { erros: r.erros };
  const { supabase, user } = await sessao();
  // Confere a senha atual antes de trocar: quem pegar o computador aberto não troca a senha.
  const conferencia = await supabase.auth.signInWithPassword({ email: user.email ?? "", password: r.dados.atual });
  if (conferencia.error) return { erros: { atual: "Senha atual incorreta." } };
  const { error } = await supabase.auth.updateUser({ password: r.dados.nova });
  if (error) {
    if (error.code === "weak_password") return { erros: { nova: "Essa senha é fraca. Use uma mais longa e difícil de adivinhar." } };
    if (error.code === "same_password") return { erros: { nova: "A nova senha precisa ser diferente da atual." } };
    return { mensagem: FALHA };
  }
  return { sucesso: "Senha alterada.", versao: Date.now() };
}

export async function trocarEmail(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const { supabase, user } = await sessao();
  const r = validarTrocaDeEmail(form, user.email ?? "");
  if (!r.ok) return { erros: r.erros, valores: { email: String(form.get("email") ?? "") } };
  const conferencia = await supabase.auth.signInWithPassword({ email: user.email ?? "", password: r.dados.senha });
  if (conferencia.error) return { erros: { senha: "Senha incorreta." }, valores: { email: r.dados.email } };
  const origem = (await headers()).get("origin");
  const { error } = await supabase.auth.updateUser(
    { email: r.dados.email },
    { emailRedirectTo: origem ? `${origem}/auth/confirmar` : undefined },
  );
  if (error) {
    if (error.code === "email_exists")
      return { erros: { email: "Esse e-mail já tem uma conta no Shelper." }, valores: { email: r.dados.email } };
    if (error.code === "over_email_send_rate_limit") return { mensagem: "Muitas tentativas. Espere alguns minutos e tente de novo." };
    return { mensagem: FALHA };
  }
  // O Supabase só troca depois da confirmação pelo link enviado ao e-mail.
  // O gatilho no banco atualiza perfis.email quando a troca acontecer.
  return {
    sucesso: `Enviamos um link de confirmação para ${r.dados.email}. A troca vale depois que você clicar nele.`,
    versao: Date.now(),
  };
}
