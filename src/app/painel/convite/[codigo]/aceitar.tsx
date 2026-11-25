"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import { aceitarConvite } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

export function AceitarConvite({ codigo }: { codigo: string }) {
  const [estado, acao, enviando] = useActionState(aceitarConvite, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="codigo" value={codigo} />
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Entrando…" : "Entrar no projeto"}
      </button>
    </form>
  );
}
