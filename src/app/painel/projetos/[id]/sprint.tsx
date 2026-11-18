"use client";

import { useActionState, type ReactNode } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import type { Cartao, Sprint } from "@/lib/board/dados";
import { META_SPRINT_MAXIMO } from "@/lib/board/regras";
import { criarSprint, editarSprint, encerrarSprint, puxarCartoes } from "../../acoes";
import { ESTADO_INICIAL, type EstadoAcao } from "../../estado";

const formatarData = (iso: string) => iso.split("-").reverse().join("/");

function Mensagens({ estado }: { estado: EstadoAcao }) {
  return (
    <div className="basis-full empty:hidden">
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
    </div>
  );
}

function CampoData({ nome, rotulo, valor, erro }: { nome: string; rotulo: string; valor: string; erro?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`sprint-${nome}`} className="text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={`sprint-${nome}`}
        name={nome}
        type="date"
        required
        defaultValue={valor}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `sprint-${nome}-erro` : undefined}
        className={CAMPO}
      />
      {erro && (
        <p id={`sprint-${nome}-erro`} className="text-xs text-red-700 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}

function CampoMeta({ valor, erro }: { valor: string; erro?: string }) {
  return (
    <div className="flex basis-full flex-col gap-1">
      <label htmlFor="sprint-meta" className="text-sm font-medium">
        Meta da Sprint <span className="font-normal text-zinc-500">(opcional)</span>
      </label>
      <textarea
        id="sprint-meta"
        name="meta"
        rows={2}
        maxLength={META_SPRINT_MAXIMO}
        defaultValue={valor}
        aria-invalid={erro ? true : undefined}
        className={CAMPO}
      />
      {erro && <p className="text-xs text-red-700 dark:text-red-400">{erro}</p>}
    </div>
  );
}

function ListaBacklog({ cartoes }: { cartoes: Cartao[] }) {
  if (cartoes.length === 0) {
    return <p className="basis-full text-sm text-zinc-500">Não há cartões no Backlog para puxar.</p>;
  }
  return (
    <fieldset className="basis-full">
      <legend className="mb-1 text-sm font-medium">Cartões do Backlog que entram na Sprint</legend>
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
        {cartoes.map((c) => (
          <li key={c.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="cartoes" value={c.id} />
              <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
              <span className="tabular-nums text-xs text-zinc-500">{c.pontos} pts</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function NovaSprint({ projetoId, backlog, hoje, numero }: { projetoId: string; backlog: Cartao[]; hoje: string; numero: number }) {
  const [estado, acao, enviando] = useActionState(criarSprint, ESTADO_INICIAL);
  return (
    <form action={acao} noValidate className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <input type="hidden" name="projeto" value={projetoId} />
      <h2 className="basis-full font-semibold">Nova Sprint {numero}</h2>
      <CampoData nome="inicio" rotulo="Início" valor={estado.valores?.inicio ?? hoje} erro={estado.erros?.inicio} />
      <CampoData nome="fim" rotulo="Fim" valor={estado.valores?.fim ?? ""} erro={estado.erros?.fim} />
      <CampoMeta valor={estado.valores?.meta ?? ""} erro={estado.erros?.meta} />
      <ListaBacklog cartoes={backlog} />
      <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Criando…" : "Criar Sprint"}
      </button>
      <Mensagens estado={estado} />
    </form>
  );
}

export function SprintAtiva({ sprint, cartoes, backlog }: { sprint: Sprint; cartoes: Cartao[]; backlog: Cartao[] }) {
  const [edicao, editar, editando] = useActionState(editarSprint, ESTADO_INICIAL);
  const [puxe, puxar, puxando] = useActionState(puxarCartoes, ESTADO_INICIAL);
  const [fim, encerrar, encerrando] = useActionState(encerrarSprint, ESTADO_INICIAL);
  const daSprint = cartoes.filter((c) => c.sprintId === sprint.id);
  const comprometidos = daSprint.reduce((s, c) => s + c.pontos, 0);
  const feitos = daSprint.filter((c) => c.coluna === "Concluído").reduce((s, c) => s + c.pontos, 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
        <h2 className="font-semibold">
          Sprint {sprint.numero} · {formatarData(sprint.inicio)} a {formatarData(sprint.fim)}
        </h2>
        <p className="mt-1 text-sm">{sprint.meta ?? <span className="text-zinc-500">Sem Meta definida.</span>}</p>
        <p className="mt-2 text-sm tabular-nums">
          <strong>{comprometidos}</strong> pontos comprometidos em {daSprint.length} {daSprint.length === 1 ? "cartão" : "cartões"} ·{" "}
          <strong>{feitos}</strong> concluídos
        </p>
      </section>

      <form action={editar} noValidate className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <input type="hidden" name="sprint" value={sprint.id} />
        <h3 className="basis-full text-sm font-semibold">Editar datas e Meta</h3>
        <CampoData nome="inicio" rotulo="Início" valor={edicao.valores?.inicio ?? sprint.inicio} erro={edicao.erros?.inicio} />
        <CampoData nome="fim" rotulo="Fim" valor={edicao.valores?.fim ?? sprint.fim} erro={edicao.erros?.fim} />
        <CampoMeta valor={edicao.valores?.meta ?? sprint.meta ?? ""} erro={edicao.erros?.meta} />
        <button type="submit" disabled={editando} className={BOTAO_SECUNDARIO}>
          {editando ? "Salvando…" : "Salvar"}
        </button>
        <Mensagens estado={edicao} />
      </form>

      <form action={puxar} className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <input type="hidden" name="sprint" value={sprint.id} />
        <h3 className="basis-full text-sm font-semibold">Adicionar cartões do Backlog</h3>
        <ListaBacklog cartoes={backlog} />
        {backlog.length > 0 && (
          <button type="submit" disabled={puxando} className={BOTAO_SECUNDARIO}>
            {puxando ? "Movendo…" : "Mover para A fazer"}
          </button>
        )}
        <Mensagens estado={puxe} />
      </form>

      <form action={encerrar} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="sprint" value={sprint.id} />
        <button type="submit" disabled={encerrando} className={BOTAO_SECUNDARIO}>
          {encerrando ? "Encerrando…" : "Encerrar Sprint"}
        </button>
        <span className="text-sm text-zinc-500">Só pode haver uma Sprint ativa por vez. Encerre esta para criar a próxima.</span>
        <Mensagens estado={fim} />
      </form>
    </div>
  );
}

export function SprintsEncerradas({ sprints, cartoes }: { sprints: Sprint[]; cartoes: Cartao[] }): ReactNode {
  if (sprints.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Sprints encerradas</h2>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {sprints.map((s) => {
          const dela = cartoes.filter((c) => c.sprintId === s.id);
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
              <strong>Sprint {s.numero}</strong>
              <span className="text-zinc-500">
                {formatarData(s.inicio)} a {formatarData(s.fim)}
              </span>
              <span className="min-w-0 flex-1 truncate">{s.meta ?? ""}</span>
              <span className="tabular-nums text-zinc-500">{dela.length} cartões</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
