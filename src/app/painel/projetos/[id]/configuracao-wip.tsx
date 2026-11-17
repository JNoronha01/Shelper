"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import { WIP_MAXIMO, WIP_MINIMO } from "@/lib/board/regras";
import { definirLimitesWip } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

// Só aparece para o dono do projeto (o banco confere de novo ao salvar).
export function ConfiguracaoWip({ projetoId, andamento, revisao }: { projetoId: string; andamento: number; revisao: number }) {
  const [estado, acao, enviando] = useActionState(definirLimitesWip, ESTADO_INICIAL);

  return (
    <details className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden focus-visible:outline-2 focus-visible:outline-indigo-600">
        <span className="mr-2 inline-block transition group-open:rotate-90" aria-hidden="true">
          ▸
        </span>
        Limites de WIP: Em andamento {andamento} · Em revisão {revisao}
      </summary>
      <form action={acao} className="flex flex-wrap items-end gap-4 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800" noValidate>
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
            <input
              id={`wip-${nome}`}
              name={nome}
              type="number"
              min={WIP_MINIMO}
              max={WIP_MAXIMO}
              required
              defaultValue={estado.valores?.[nome] ?? valor}
              aria-invalid={estado.erros?.[nome] ? true : undefined}
              aria-describedby={estado.erros?.[nome] ? `wip-${nome}-erro` : undefined}
              className={`${CAMPO} w-28`}
            />
            {estado.erros?.[nome] && (
              <p id={`wip-${nome}-erro`} className="text-xs text-red-700 dark:text-red-400">
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
