"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import type { Metas } from "@/lib/board/dados";
import { definirMetas } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

// Metas opcionais digitadas pelo time. Em branco = sem meta (a métrica aparece sem faixa).
export function FormularioMetas({ projetoId, metas }: { projetoId: string; metas: Metas }) {
  const [estado, acao, enviando] = useActionState(definirMetas, ESTADO_INICIAL);
  const campos = [
    ["lead", "Lead Time (dias)", metas.leadDias, "decimal"],
    ["cycle", "Cycle Time (horas)", metas.cycleHoras, "decimal"],
    ["velocity", "Velocity (pontos)", metas.velocity, "numeric"],
  ] as const;

  return (
    <details className="group rounded-2xl border border-linha bg-painel">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden focus-visible:outline-2 focus-visible:outline-laranja">
        <span className="mr-2 inline-block transition group-open:rotate-90" aria-hidden="true">
          ▸
        </span>
        Metas do time (opcional)
      </summary>
      <form action={acao} noValidate className="flex flex-wrap items-end gap-4 border-t border-linha px-4 py-4">
        <input type="hidden" name="projeto" value={projetoId} />
        {campos.map(([nome, rotulo, valor, modo]) => (
          <div key={nome} className="flex flex-col gap-1">
            <label htmlFor={`meta-${nome}`} className="text-sm font-medium">
              {rotulo}
            </label>
            <input
              id={`meta-${nome}`}
              name={nome}
              inputMode={modo}
              defaultValue={estado.valores?.[nome] ?? valor ?? ""}
              aria-invalid={estado.erros?.[nome] ? true : undefined}
              className={`${CAMPO} w-36`}
            />
            {estado.erros?.[nome] && <p className="max-w-44 text-xs text-perigo">{estado.erros[nome]}</p>}
          </div>
        ))}
        <button type="submit" disabled={enviando} className={BOTAO_SECUNDARIO}>
          {enviando ? "Salvando…" : "Salvar metas"}
        </button>
        <div className="basis-full empty:hidden">
          {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
          {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        </div>
      </form>
    </details>
  );
}
