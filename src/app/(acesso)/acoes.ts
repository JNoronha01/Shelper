"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROTA_ENTRADA, destinoAposEntrar } from "@/lib/auth/rotas";
import { validarCadastro, validarLogin } from "@/lib/auth/validacao";
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

export async function entrar(
  _anterior: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const validacao = validarLogin(form);
  const valores = { email: String(form.get("email") ?? "") };
  if (!validacao.ok) return { erros: validacao.erros, valores };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: validacao.dados.email,
    password: validacao.dados.senha,
  });
  if (error) return { mensagem: mensagemDeErro(error), valores };

  const proximo = form.get("proximo");
  redirect(destinoAposEntrar(typeof proximo === "string" ? proximo : null));
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
