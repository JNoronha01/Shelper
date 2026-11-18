"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_SECUNDARIO } from "@/components/botoes";
import { CampoNumero } from "@/components/numero";
import { WIP_MAXIMO, WIP_MINIMO } from "@/lib/board/regras";
import { definirLimitesWip } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

// Só aparece para o dono do projeto (o banco confere de novo ao salvar).
export function ConfiguracaoWip({ projetoId, andamento, revisao }: { projetoId: string; andamento: number; revisao: number }) {
  const [estado, acao, enviando] = useActionState(definirLimitesWip, ESTADO_INICIAL);

  return (
    <details className="group rounded-2xl border border-linha bg-painel transition-colors open:border-linha-forte">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition-colors marker:hidden hover:bg-elevado/40 focus-visible:outline-2 focus-visible:outline-laranja [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 text-fraco transition-transform duration-200 ease-suave group-open:rotate-90">
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium">Limites de WIP</span>
        <span className="text-suave">
          Em andamento <strong className="font-semibold text-texto tabular-nums">{andamento}</strong>, Em revisão{" "}
          <strong className="font-semibold text-texto tabular-nums">{revisao}</strong>
        </span>
        <span className="ml-auto hidden text-xs text-fraco sm:inline">Só o dono altera. O time pode decidir na aba Votação.</span>
      </summary>
      <form action={acao} className="surgir flex flex-wrap items-end gap-4 border-t border-linha px-4 py-4" noValidate>
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
    </details>
  );
}
