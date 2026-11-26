"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_SECUNDARIO } from "@/components/botoes";
import { definirSprintForaBacklog } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

// Aba Projeto: libera o Planejar Sprint a puxar cartões que já saíram do Backlog.
// Vem desligado porque o certo no Scrum é a Sprint nascer do Backlog; serve para quando o
// time começou a trabalhar antes de criar a Sprint (por exemplo, depois de importar o board).
export function SprintForaBacklog({ projetoId, ligado }: { projetoId: string; ligado: boolean }) {
  const [estado, acao, enviando] = useActionState(definirSprintForaBacklog, ESTADO_INICIAL);

  return (
    <section aria-labelledby="titulo-fora-backlog" className="flex flex-col gap-3 rounded-2xl border border-linha bg-painel p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="titulo-fora-backlog" className="font-semibold">
          Sprint com cartões fora do Backlog
        </h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            ligado ? "bg-aviso/15 text-aviso" : "bg-elevado text-suave"
          }`}
        >
          {ligado ? "Ligado" : "Desligado"}
        </span>
      </div>
      <p className="text-sm text-suave">
        O normal é a Sprint receber cartões do Backlog, que vão para A fazer. Ligado, o Planejar Sprint também mostra os cartões sem Sprint
        das outras colunas, e eles entram sem mudar de coluna.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-suave">
        <li>Cartão concluído antes do início da Sprint não entra.</li>
        <li>Burndown e Velocity contam esses cartões, e a Sprint fica marcada nas métricas e no relatório.</li>
        <li>Lead Time e Cycle Time não mudam: nenhum movimento novo é gravado.</li>
      </ul>
      <form action={acao} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="projeto" value={projetoId} />
        <input type="hidden" name="ligado" value={ligado ? "nao" : "sim"} />
        <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_SECUNDARIO}>
          {enviando ? "Salvando…" : ligado ? "Desligar" : "Ligar"}
        </button>
        <div className="basis-full empty:hidden">
          {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
          {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        </div>
      </form>
    </section>
  );
}
