"use client";

import { useActionState, type ReactNode } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, CAMPO, CAIXA } from "@/components/botoes";
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
        <p id={`sprint-${nome}-erro`} className="text-xs text-perigo">
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
        Meta da Sprint <span className="font-normal text-suave">(opcional)</span>
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
      {erro && <p className="text-xs text-perigo">{erro}</p>}
    </div>
  );
}

function ListaBacklog({ cartoes }: { cartoes: Cartao[] }) {
  if (cartoes.length === 0) {
    return <p className="basis-full text-sm text-suave">Não há cartões no Backlog para puxar.</p>;
  }
  return (
    <fieldset className="basis-full">
      <legend className="mb-1 text-sm font-medium">Cartões do Backlog que entram na Sprint</legend>
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-linha p-2">
        {cartoes.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-elevado">
              <input type="checkbox" name="cartoes" value={c.id} className={CAIXA} />
              <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
              <span className="tabular-nums text-xs text-suave">{c.pontos} pts</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

// Data AAAA-MM-DD somada de n dias (sem fuso: trabalha em UTC só para contar os dias).
function somarDias(data: string, n: number) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function NovaSprint({
  projetoId,
  backlog,
  hoje,
  numero,
  duracao,
}: {
  projetoId: string;
  backlog: Cartao[];
  hoje: string;
  numero: number;
  duracao: number;
}) {
  const [estado, acao, enviando] = useActionState(criarSprint, ESTADO_INICIAL);
  return (
    <form action={acao} noValidate className="flex flex-wrap items-end gap-4 rounded-2xl border border-linha bg-painel p-4">
      <input type="hidden" name="projeto" value={projetoId} />
      <h2 className="basis-full font-semibold">Nova Sprint {numero}</h2>
      <CampoData nome="inicio" rotulo="Início" valor={estado.valores?.inicio ?? hoje} erro={estado.erros?.inicio} />
      <CampoData nome="fim" rotulo="Fim" valor={estado.valores?.fim ?? somarDias(hoje, duracao - 1)} erro={estado.erros?.fim} />
      <CampoMeta valor={estado.valores?.meta ?? ""} erro={estado.erros?.meta} />
      <p className="basis-full text-xs text-suave">O fim já vem com a duração de Sprint do cadastro ({duracao} dias); pode mudar.</p>
      <ListaBacklog cartoes={backlog} />
      <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Criando…" : "Criar Sprint"}
      </button>
      <Mensagens estado={estado} />
    </form>
  );
}

export function SprintAtiva({
  sprint,
  cartoes,
  backlog,
  podeGerir,
}: {
  sprint: Sprint;
  cartoes: Cartao[];
  backlog: Cartao[];
  // PO e SM editam, montam e encerram; o desenvolvedor só vê.
  podeGerir: boolean;
}) {
  const [edicao, editar, editando] = useActionState(editarSprint, ESTADO_INICIAL);
  const [puxe, puxar, puxando] = useActionState(puxarCartoes, ESTADO_INICIAL);
  const [fim, encerrar, encerrando] = useActionState(encerrarSprint, ESTADO_INICIAL);
  const daSprint = cartoes.filter((c) => c.sprintId === sprint.id);
  const comprometidos = daSprint.reduce((s, c) => s + c.pontos, 0);
  const feitos = daSprint.filter((c) => c.coluna === "Concluído").reduce((s, c) => s + c.pontos, 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-linha-forte bg-painel p-5 shadow-[inset_3px_0_0_var(--color-laranja)]">
        <h2 className="font-semibold">
          Sprint {sprint.numero} · {formatarData(sprint.inicio)} a {formatarData(sprint.fim)}
        </h2>
        <p className="mt-1 text-sm">{sprint.meta ?? <span className="text-suave">Sem Meta definida.</span>}</p>
        <p className="mt-2 text-sm tabular-nums">
          <strong>{comprometidos}</strong> pontos comprometidos em {daSprint.length} {daSprint.length === 1 ? "cartão" : "cartões"} ·{" "}
          <strong>{feitos}</strong> concluídos
        </p>
      </section>

      {podeGerir && (
        <>
          <form action={editar} noValidate className="flex flex-wrap items-end gap-4 rounded-2xl border border-linha bg-painel p-4">
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

          <form action={puxar} className="flex flex-wrap items-end gap-4 rounded-2xl border border-linha bg-painel p-4">
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
            <span className="text-sm text-suave">Só pode haver uma Sprint ativa por vez. Encerre esta para criar a próxima.</span>
            <Mensagens estado={fim} />
          </form>
        </>
      )}
    </div>
  );
}

export function SprintsEncerradas({ sprints, cartoes }: { sprints: Sprint[]; cartoes: Cartao[] }): ReactNode {
  if (sprints.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Sprints encerradas</h2>
      <ul className="divide-y divide-linha rounded-2xl border border-linha bg-painel text-sm">
        {sprints.map((s) => {
          const dela = cartoes.filter((c) => c.sprintId === s.id);
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
              <strong>Sprint {s.numero}</strong>
              <span className="text-suave">
                {formatarData(s.inicio)} a {formatarData(s.fim)}
              </span>
              <span className="min-w-0 flex-1 truncate">{s.meta ?? ""}</span>
              <span className="tabular-nums text-suave">{dela.length} cartões</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
