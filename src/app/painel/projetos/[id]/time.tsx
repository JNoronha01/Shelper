"use client";

import { useActionState, useState, useTransition } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import type { Convite, Membro } from "@/lib/board/dados";
import { DIAS_CONVITE, formatarDataHora } from "@/lib/board/regras";
import { cancelarConvite, gerarConvite, removerMembro } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

// Aba Time: quem está no projeto e o link de convite (ideia do professor: compartilhamento).
export function Time({
  projetoId,
  membros,
  convite,
  souDono,
  meuId,
  origem,
  agora,
}: {
  projetoId: string;
  membros: Membro[];
  convite: Convite | null;
  souDono: boolean;
  meuId: string;
  origem: string;
  agora: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <ListaDeMembros projetoId={projetoId} membros={membros} souDono={souDono} meuId={meuId} />
      {souDono ? (
        <LinkDeConvite projetoId={projetoId} convite={convite} origem={origem} agora={agora} />
      ) : (
        <p className="h-fit rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Para chamar mais alguém, peça o link de convite ao dono do projeto.
        </p>
      )}
    </div>
  );
}

function ListaDeMembros({ projetoId, membros, souDono, meuId }: { projetoId: string; membros: Membro[]; souDono: boolean; meuId: string }) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <section aria-labelledby="titulo-membros" className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 id="titulo-membros" className="mb-3 font-semibold">
        Membros ({membros.length})
      </h2>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {membros.map((m) => (
          <li key={m.usuarioId} className="flex flex-wrap items-center gap-3 py-3">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
            >
              {m.nome.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.nome}
                {m.usuarioId === meuId && <span className="font-normal text-zinc-500"> (você)</span>}
              </p>
              <p className="truncate text-xs text-zinc-500">{m.email}</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {m.papel === "dono" ? "Dono" : "Membro"}
            </span>
            {souDono && m.papel === "membro" && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  if (!window.confirm(`Remover ${m.nome} do projeto? A pessoa perde o acesso ao board.`)) return;
                  setErro(null);
                  iniciar(async () => {
                    const r = await removerMembro(projetoId, m.usuarioId);
                    if (!r.ok) setErro(r.mensagem);
                  });
                }}
                className={`${BOTAO_MINI} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700 dark:hover:!bg-red-500/10 dark:hover:!text-red-300`}
              >
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LinkDeConvite({ projetoId, convite, origem, agora }: { projetoId: string; convite: Convite | null; origem: string; agora: string }) {
  const [estado, acao, enviando] = useActionState(gerarConvite, ESTADO_INICIAL);
  const [copiado, setCopiado] = useState(false);
  const [cancelando, iniciar] = useTransition();
  const link = convite ? `${origem}/painel/convite/${convite.codigo}` : null;
  const expirado = convite ? convite.expiraEm < agora : false;

  return (
    <section aria-labelledby="titulo-convite" className="flex h-fit flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 id="titulo-convite" className="font-semibold">
        Link de convite
      </h2>
      <p className="text-sm text-zinc-500">Quem abrir o link (com conta no Shelper) entra no projeto como membro.</p>

      {link && (
        <div className="flex flex-col gap-2">
          <label htmlFor="link-convite" className="sr-only">
            Link de convite
          </label>
          <input id="link-convite" readOnly value={link} onFocus={(e) => e.target.select()} className={`${CAMPO} font-mono text-xs`} />
          <p className={`text-xs ${expirado ? "text-red-700 dark:text-red-400" : "text-zinc-500"}`}>
            {expirado ? "Expirou em " : "Vale até "}
            {formatarDataHora(convite!.expiraEm)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={expirado}
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className={BOTAO_PRINCIPAL}
            >
              {copiado ? "Copiado!" : "Copiar link"}
            </button>
            <button
              type="button"
              disabled={cancelando}
              onClick={() => iniciar(async () => void (await cancelarConvite(projetoId)))}
              className={BOTAO_SECUNDARIO}
            >
              Desativar
            </button>
          </div>
        </div>
      )}

      <form action={acao} className="flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <input type="hidden" name="projeto" value={projetoId} />
        <div className="flex flex-col gap-1">
          <label htmlFor="dias-convite" className="text-sm font-medium">
            Validade
          </label>
          <select id="dias-convite" name="dias" defaultValue="7" className={CAMPO}>
            {DIAS_CONVITE.map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? "dia" : "dias"}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={enviando} className={link ? BOTAO_SECUNDARIO : BOTAO_PRINCIPAL}>
          {enviando ? "Gerando…" : link ? "Gerar link novo" : "Gerar link"}
        </button>
        <div className="basis-full empty:hidden">
          {(estado.mensagem || estado.erros?.dias) && <Aviso tipo="erro">{estado.mensagem ?? estado.erros!.dias!}</Aviso>}
          {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        </div>
      </form>
    </section>
  );
}
