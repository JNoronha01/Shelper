"use client";

import Link from "next/link";
import { useActionState } from "react";
import { NOME_MAXIMO, SENHA_MAXIMO, SENHA_MINIMO } from "@/lib/auth/validacao";
import { cadastrar } from "../acoes";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import { Aviso, Campo } from "../campo";
import { ESTADO_INICIAL } from "../estado";

export function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrar, ESTADO_INICIAL);

  if (estado.sucesso) {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tipo="sucesso">{estado.sucesso}</Aviso>
        <Link href="/entrar" className="text-sm font-medium underline underline-offset-4">
          Ir para a entrada
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo
        name="nome"
        rotulo="Nome completo"
        autoComplete="name"
        required
        maxLength={NOME_MAXIMO}
        defaultValue={estado.valores?.nome}
        erro={estado.erros?.nome}
      />
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
        autoComplete="new-password"
        required
        minLength={SENHA_MINIMO}
        maxLength={SENHA_MAXIMO}
        dica={`Mínimo de ${SENHA_MINIMO} caracteres.`}
        erro={estado.erros?.senha}
      />
      <Campo
        name="confirmacao"
        rotulo="Confirme a senha"
        type="password"
        autoComplete="new-password"
        required
        erro={estado.erros?.confirmacao}
      />
      <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
