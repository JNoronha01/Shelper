"use client";

import Link from "next/link";
import { useActionState } from "react";
import { redefinirSenha } from "@/app/(acesso)/acoes";
import { Aviso, Campo } from "@/app/(acesso)/campo";
import { CampoSenhaForte } from "@/app/(acesso)/campo-senha";
import { ESTADO_INICIAL } from "@/app/(acesso)/estado";
import { BOTAO_PRINCIPAL } from "@/components/botoes";

export function FormularioNovaSenha() {
  const [estado, acao, enviando] = useActionState(redefinirSenha, ESTADO_INICIAL);
  if (estado.sucesso)
    return (
      <div className="flex flex-col gap-4">
        <Aviso tipo="sucesso">{estado.sucesso}</Aviso>
        <Link href="/painel" className={BOTAO_PRINCIPAL}>
          Ir para Meus projetos
        </Link>
      </div>
    );
  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <CampoSenhaForte name="senha" rotulo="Nova senha" erro={estado.erros?.senha} />
      <Campo name="confirmacao" rotulo="Repita a nova senha" type="password" autoComplete="new-password" required erro={estado.erros?.confirmacao} />
      <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
