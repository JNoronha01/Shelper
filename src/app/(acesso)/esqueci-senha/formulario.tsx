"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import { pedirNovaSenha } from "../acoes";
import { Aviso, Campo } from "../campo";
import { ESTADO_INICIAL } from "../estado";

export function FormularioEsqueci() {
  const [estado, acao, enviando] = useActionState(pedirNovaSenha, ESTADO_INICIAL);
  const linkRuim = useSearchParams().get("erro") === "link";
  if (estado.sucesso) return <Aviso tipo="sucesso">{estado.sucesso}</Aviso>;
  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {linkRuim && !estado.mensagem && <Aviso tipo="erro">O link expirou ou já foi usado. Peça um novo abaixo.</Aviso>}
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo
        name="email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        required
        defaultValue={estado.valores?.email}
        erro={estado.erros?.email}
      />
      <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}
