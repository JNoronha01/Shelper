"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROTA_ENTRADA, ROTA_REDEFINIR, destinoAposEntrar } from "@/lib/auth/rotas";
import { sessaoDeRecuperacao } from "@/lib/auth/recuperacao";
import { validarCadastro, validarLogin, validarNovaSenha, validarPedidoDeSenha } from "@/lib/auth/validacao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoFormulario } from "./estado";

const MENSAGEM_EMAIL_DUPLICADO = "Já existe uma conta com este e-mail. Entre ou use outro e-mail.";

function mensagemDeErro(erro: AuthError): string {
  switch (erro.code) {
    case "user_already_exists":
    case "email_exists":
      return MENSAGEM_EMAIL_DUPLICADO;
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. O link foi enviado para sua caixa de entrada.";
    case "weak_password":
      return "Senha considerada fraca pelo serviço de autenticação. Escolha outra.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
    default:
      console.error("Falha no Supabase Auth", { code: erro.code, status: erro.status });
      return "Não foi possível concluir agora. Tente novamente em instantes.";
  }
}

export async function cadastrar(
  _anterior: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const validacao = validarCadastro(form);
  const valores = {
    nome: String(form.get("nome") ?? ""),
    email: String(form.get("email") ?? ""),
  };
  if (!validacao.ok) return { erros: validacao.erros, valores };

  const { nome, email, senha } = validacao.dados;
  const origem = (await headers()).get("origin");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome },
      emailRedirectTo: origem ? `${origem}/auth/confirmar` : undefined,
    },
  });

  if (error) return { mensagem: mensagemDeErro(error), valores };

  // Com confirmação de e-mail ativa, o Supabase não acusa erro para e-mail já
  // cadastrado: devolve um usuário sem identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { mensagem: MENSAGEM_EMAIL_DUPLICADO, valores };
  }

  if (data.session) redirect(destinoAposEntrar(null));

  return {
    sucesso: `Conta criada. Enviamos um link de confirmação para ${email}; abra-o para ativar a conta.`,
  };
}

// "15 minutos", "1 minuto"
function minutos(segundos: number): string {
  const m = Math.max(1, Math.ceil(segundos / 60));
  return `${m} ${m === 1 ? "minuto" : "minutos"}`;
}

export async function entrar(
  _anterior: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const validacao = validarLogin(form);
  const valores = { email: String(form.get("email") ?? "") };
  if (!validacao.ok) return { erros: validacao.erros, valores };
  const { email, senha } = validacao.dados;

  const supabase = await criarClienteServidor();
  // Bloqueio por tentativas (5 erros seguidos → 15 minutos). Contado por e-mail no banco
  // (função login_falhou); a senha nem é conferida enquanto o e-mail está bloqueado.
  const bloqueio = await supabase.rpc("login_bloqueado", { p_email: email });
  if (typeof bloqueio.data === "number" && bloqueio.data > 0) {
    return { mensagem: `Muitas tentativas erradas. Por segurança, este e-mail está bloqueado por mais ${minutos(bloqueio.data)}.`, valores };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (error.code !== "invalid_credentials") return { mensagem: mensagemDeErro(error), valores };
    const falha = await supabase.rpc("login_falhou", { p_email: email });
    const r = falha.data as { restantes: number; segundos: number } | null;
    if (r && r.segundos > 0) {
      return { mensagem: `Muitas tentativas erradas. Por segurança, este e-mail ficou bloqueado por ${minutos(r.segundos)}.`, valores };
    }
    const aviso = r && r.restantes <= 2 ? ` Mais ${r.restantes} ${r.restantes === 1 ? "tentativa" : "tentativas"} antes de bloquear por 15 minutos.` : "";
    return { mensagem: `E-mail ou senha incorretos.${aviso}`, valores };
  }
  await supabase.rpc("login_ok");

  const proximo = form.get("proximo");
  redirect(destinoAposEntrar(typeof proximo === "string" ? proximo : null));
}

// "Esqueci minha senha": o Supabase manda um link para o e-mail. A resposta é sempre a mesma,
// exista ou não a conta, para a tela não revelar quais e-mails estão cadastrados.
export async function pedirNovaSenha(_anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const v = validarPedidoDeSenha(form);
  const valores = { email: String(form.get("email") ?? "") };
  if (!v.ok) return { erros: v.erros, valores };
  const origem = (await headers()).get("origin");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(v.dados.email, {
    redirectTo: origem ? `${origem}/auth/confirmar?proximo=${ROTA_REDEFINIR}` : undefined,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { mensagem: "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.", valores };
  }
  if (error) console.error("Falha ao pedir nova senha", { code: error.code, status: error.status });
  return {
    sucesso: `Se existir uma conta com ${v.dados.email}, enviamos um link para criar uma nova senha. Ele vale por 1 hora; confira também o spam.`,
  };
}

// Nova senha pelo link do e-mail. Só vale para uma sessão aberta pelo próprio link há pouco tempo:
// quem pegar um computador com o Shelper aberto não troca a senha por aqui (no perfil pede a atual).
export async function redefinirSenha(_anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const v = validarNovaSenha(form);
  if (!v.ok) return { erros: v.erros };
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (!sessaoDeRecuperacao(data?.claims?.amr)) {
    return { mensagem: "O link expirou. Peça um novo em Esqueci minha senha." };
  }
  const { error } = await supabase.auth.updateUser({ password: v.dados.senha });
  if (error) {
    if (error.code === "same_password") return { erros: { senha: "A nova senha precisa ser diferente da anterior." } };
    if (error.code === "weak_password") return { erros: { senha: "Essa senha é fraca. Escolha outra." } };
    return { mensagem: mensagemDeErro(error) };
  }
  // Senha nova: as outras sessões (outros aparelhos) deixam de valer.
  await supabase.auth.signOut({ scope: "others" });
  return { sucesso: "Senha alterada. Os outros aparelhos em que sua conta estava aberta foram desconectados." };
}

// Sair de todos os aparelhos: o Supabase invalida todas as sessões da conta (escopo global).
export async function sairDeTodos(): Promise<void> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    console.error("Falha ao encerrar todas as sessões", { code: error.code, status: error.status });
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect(`${ROTA_ENTRADA}?saiu=todos`);
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Falha ao encerrar sessão", { code: error.code, status: error.status });
    // Mesmo se o servidor não responder, removemos a sessão deste navegador.
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect(ROTA_ENTRADA);
}
