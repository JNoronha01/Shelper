"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { entrar } from "../acoes";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import { Aviso, Campo } from "../campo";
import { ESTADO_INICIAL } from "../estado";

const AVISOS_DA_URL: Record<string, string> = {
  confirmacao: "Não foi possível confirmar o e-mail. O link pode ter expirado; tente entrar ou cadastre-se de novo.",
};

export function FormularioEntrada() {
  const [estado, acao, enviando] = useActionState(entrar, ESTADO_INICIAL);
  const parametros = useSearchParams();
  const avisoDaUrl = AVISOS_DA_URL[parametros.get("erro") ?? ""];
  const mensagem = estado.mensagem ?? avisoDaUrl;
  const saiuDeTodos = parametros.get("saiu") === "todos" && !estado.mensagem;

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {mensagem && <Aviso tipo="erro">{mensagem}</Aviso>}
      {saiuDeTodos && <Aviso tipo="sucesso">Você saiu de todos os aparelhos. Entre de novo para continuar.</Aviso>}
      <input type="hidden" name="proximo" value={parametros.get("proximo") ?? ""} />
      <Campo
        name="email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        required
        defaultValue={estado.valores?.email}
        erro={estado.erros?.email}
      />
      <Campo
        name="senha"
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        required
        erro={estado.erros?.senha}
      />
      <Link href="/esqueci-senha" className="-mt-2 self-end text-sm text-suave underline-offset-4 hover:text-texto hover:underline">
        Esqueci minha senha
      </Link>
      <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
