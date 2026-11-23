"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_SECUNDARIO } from "@/components/botoes";
import { CampoNumero } from "@/components/numero";
import { WIP_MAXIMO, WIP_MINIMO } from "@/lib/board/regras";
import { definirLimitesWip } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

// Aba Projeto: só o PO e o SM veem (o banco confere de novo ao salvar).
export function ConfiguracaoWip({ projetoId, andamento, revisao }: { projetoId: string; andamento: number; revisao: number }) {
  const [estado, acao, enviando] = useActionState(definirLimitesWip, ESTADO_INICIAL);

  return (
    <section aria-labelledby="titulo-wip" className="flex flex-col gap-3 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id="titulo-wip" className="font-semibold">
          Limites de WIP
        </h2>
        <p className="text-sm text-suave">
          Quantos cartões cabem ao mesmo tempo em cada coluna. O PO e o SM alteram aqui; o time também pode decidir na aba Votação.
        </p>
      </div>
      <form action={acao} className="flex flex-wrap items-end gap-4" noValidate>
        <input type="hidden" name="projeto" value={projetoId} />
        {(
          [
            ["andamento", "Em andamento", andamento],
            ["revisao", "Em revisão", revisao],
          ] as const
        ).map(([nome, rotulo, valor]) => (
          <div key={nome} className="flex flex-col gap-1">
            <label htmlFor={`wip-${nome}`} className="text-sm font-medium">
              {rotulo}
            </label>
            <CampoNumero
              id={`wip-${nome}`}
              name={nome}
              min={WIP_MINIMO}
              max={WIP_MAXIMO}
              padrao={estado.valores?.[nome] ?? valor}
              invalido={Boolean(estado.erros?.[nome])}
              descritoPor={estado.erros?.[nome] ? `wip-${nome}-erro` : undefined}
            />
            {estado.erros?.[nome] && (
              <p id={`wip-${nome}-erro`} className="text-xs text-perigo">
                {estado.erros[nome]}
              </p>
            )}
          </div>
        ))}
        <button type="submit" disabled={enviando} className={BOTAO_SECUNDARIO}>
          {enviando ? "Salvando…" : "Salvar limites"}
        </button>
        <div className="basis-full empty:hidden">
          {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
          {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        </div>
      </form>
    </section>
  );
}
