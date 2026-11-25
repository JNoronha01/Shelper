"use client";

import { useActionState, useState, useTransition } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import { Avatar } from "@/components/avatar";
import { Seletor } from "@/components/seletor";
import type { Convite, Membro } from "@/lib/board/dados";
import { NOME_DA_FUNCAO, SIGLA_DA_FUNCAO, type Funcao } from "@/lib/board/papeis";
import { DIAS_CONVITE, formatarDataHora } from "@/lib/board/regras";
import { cancelarConvite, definirFuncao, gerarConvite, removerMembro, transferirPo } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";

// Aba Time: quem está no projeto e o link de convite (ideia do professor: compartilhamento).
export function Time({
  projetoId,
  membros,
  convite,
  podeGerir,
  meuId,
  origem,
  agora,
}: {
  projetoId: string;
  membros: Membro[];
  convite: Convite | null;
  podeGerir: boolean;
  meuId: string;
  origem: string;
  agora: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <ListaDeMembros projetoId={projetoId} membros={membros} podeGerir={podeGerir} meuId={meuId} />
      {podeGerir ? (
        <LinkDeConvite projetoId={projetoId} convite={convite} origem={origem} agora={agora} />
      ) : (
        <p className="h-fit rounded-2xl border border-linha bg-painel p-5 text-sm text-suave">
          Para chamar mais alguém, peça o link de convite ao Product Owner.
        </p>
      )}
    </div>
  );
}

function ListaDeMembros({ projetoId, membros, podeGerir, meuId }: { projetoId: string; membros: Membro[]; podeGerir: boolean; meuId: string }) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const executar = (fn: () => Promise<{ ok: true } | { ok: false; mensagem: string }>) => {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) setErro(r.mensagem);
    });
  };

  return (
    <section aria-labelledby="titulo-membros" className="rounded-2xl border border-linha bg-painel p-5">
      <h2 id="titulo-membros" className="mb-3 font-semibold">
        Membros ({membros.length})
      </h2>
      <p className="mb-2 text-sm text-suave">
        PO: gestor, cria cartões e cuida do cadastro. SM: Sprint, WIP e votações. Desenvolvedor: move os cartões e vota.
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <ul className="divide-y divide-linha">
        {membros.map((m) => (
          <li key={m.usuarioId} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar nome={m.nome} foto={m.foto} tamanho="g" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.nome}
                {m.usuarioId === meuId && <span className="font-normal text-suave"> (você)</span>}
              </p>
              <p className="truncate text-xs text-suave">{m.email}</p>
            </div>
            {podeGerir && m.funcao !== "po" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Seletor
                  rotuloAcessivel={`Papel de ${m.nome}`}
                  valor={m.funcao}
                  opcoes={(["sm", "dev"] as const).map((f) => ({ valor: f, rotulo: NOME_DA_FUNCAO[f] }))}
                  onChange={(nova) => executar(() => definirFuncao(projetoId, m.usuarioId, nova as Funcao))}
                  className="w-44"
                />
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    if (!window.confirm(`Passar o papel de Product Owner para ${m.nome}? Você fica com o papel que essa pessoa tem hoje.`)) return;
                    executar(() => transferirPo(projetoId, m.usuarioId));
                  }}
                  className={BOTAO_MINI}
                >
                  Tornar PO
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    if (!window.confirm(`Remover ${m.nome} do projeto? A pessoa perde o acesso ao board.`)) return;
                    executar(() => removerMembro(projetoId, m.usuarioId));
                  }}
                  className={`${BOTAO_MINI} hover:!border-perigo/50 hover:!bg-perigo/10 hover:!text-perigo`}
                >
                  Remover
                </button>
              </div>
            ) : (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.funcao === "po" ? "bg-laranja/15 text-laranja-claro" : "bg-elevado text-suave"}`}
                title={NOME_DA_FUNCAO[m.funcao]}
              >
                {SIGLA_DA_FUNCAO[m.funcao]}
                <span className="sr-only">: {NOME_DA_FUNCAO[m.funcao]}</span>
              </span>
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
    <section aria-labelledby="titulo-convite" className="flex h-fit flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
      <h2 id="titulo-convite" className="font-semibold">
        Link de convite
      </h2>
      <p className="text-sm text-suave">Quem abrir o link (com conta no Shelper) entra no projeto como desenvolvedor. Depois você muda o papel na lista ao lado.</p>

      {link && (
        <div className="flex flex-col gap-2">
          <label htmlFor="link-convite" className="sr-only">
            Link de convite
          </label>
          <input id="link-convite" readOnly value={link} onFocus={(e) => e.target.select()} className={`${CAMPO} font-mono text-xs`} />
          <p className={`text-xs ${expirado ? "text-perigo" : "text-suave"}`}>
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

      <form action={acao} className="flex flex-wrap items-end gap-2 border-t border-linha pt-4">
        <input type="hidden" name="projeto" value={projetoId} />
        <div className="flex flex-col gap-1">
          <label htmlFor="dias-convite" className="text-sm font-medium">
            Validade
          </label>
          <Seletor
            id="dias-convite"
            name="dias"
            padrao="7"
            opcoes={DIAS_CONVITE.map((d) => ({ valor: String(d), rotulo: `${d} ${d === 1 ? "dia" : "dias"}` }))}
            className="w-32"
          />
        </div>
        <button aria-busy={enviando} type="submit" disabled={enviando} className={link ? BOTAO_SECUNDARIO : BOTAO_PRINCIPAL}>
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
