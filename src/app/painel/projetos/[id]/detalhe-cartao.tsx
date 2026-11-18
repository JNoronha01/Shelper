"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import { Modal } from "@/components/modal";
import type { Cartao } from "@/lib/board/dados";
import { DESCRICAO_MAXIMO, ITEM_CHECKLIST_MAXIMO, TITULO_MAXIMO, formatarDataHora } from "@/lib/board/regras";
import { abrirVotacao, adicionarItem, editarCartao, marcarItem, removerItem, salvarDescricao } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";
import { Erro, SeletorDePontos } from "./campos-cartao";

// Pop-up de detalhe do cartão, no estilo do Trello (ideia do professor):
// título e pontos, descrição, checklist e o atalho para votar os pontos.
export function DetalheCartao({
  projetoId,
  cartao,
  emVotacao,
  onFechar,
}: {
  projetoId: string;
  cartao: Cartao | null;
  emVotacao: boolean;
  onFechar: () => void;
}) {
  return (
    <Modal aberto={cartao !== null} onFechar={onFechar} titulo={cartao?.titulo ?? ""} largura="max-w-2xl">
      {cartao && (
        // key: ao trocar de cartão, os formulários começam do zero.
        <div key={cartao.id} className="flex flex-col gap-6">
          <p className="text-sm text-zinc-500">
            Em <strong className="font-medium text-zinc-700 dark:text-zinc-300">{cartao.coluna}</strong> · criado em{" "}
            {formatarDataHora(cartao.criadoEm)}
          </p>
          <TituloEPontos cartao={cartao} />
          <Descricao cartao={cartao} />
          <Checklist cartao={cartao} />
          <VotarPontos projetoId={projetoId} cartao={cartao} emVotacao={emVotacao} />
        </div>
      )}
    </Modal>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

function Status({ erro, ok }: { erro?: string; ok?: string }) {
  if (erro) return <p className="text-xs text-red-700 dark:text-red-400">{erro}</p>;
  if (ok)
    return (
      <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">
        {ok}
      </p>
    );
  return null;
}

function TituloEPontos({ cartao }: { cartao: Cartao }) {
  const [estado, acao, enviando] = useActionState(editarCartao, ESTADO_INICIAL);
  const id = `det-${cartao.id}`;
  return (
    <Secao titulo="Título e pontos">
      <form action={acao} noValidate className="flex flex-col gap-2">
        <input type="hidden" name="cartao" value={cartao.id} />
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={`${id}-titulo`} className="sr-only">
              Título
            </label>
            <input
              id={`${id}-titulo`}
              name="titulo"
              defaultValue={estado.valores?.titulo ?? cartao.titulo}
              maxLength={TITULO_MAXIMO}
              aria-invalid={estado.erros?.titulo ? true : undefined}
              className={`${CAMPO} w-full`}
            />
            <Erro id={`${id}-titulo-erro`} texto={estado.erros?.titulo} />
          </div>
          <label htmlFor={`${id}-pontos`} className="sr-only">
            Pontos
          </label>
          <SeletorDePontos id={`${id}-pontos`} padrao={estado.valores?.pontos ?? String(cartao.pontos)} erro={estado.erros?.pontos} />
          <button type="submit" disabled={enviando} className={BOTAO_SECUNDARIO}>
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
        <Erro id={`${id}-pontos-erro`} texto={estado.erros?.pontos} />
        <Status erro={estado.mensagem} ok={estado.sucesso} />
      </form>
    </Secao>
  );
}

function Descricao({ cartao }: { cartao: Cartao }) {
  const [estado, acao, enviando] = useActionState(salvarDescricao, ESTADO_INICIAL);
  return (
    <Secao titulo="Descrição">
      <form action={acao} noValidate className="flex flex-col gap-2">
        <input type="hidden" name="cartao" value={cartao.id} />
        <label htmlFor={`desc-${cartao.id}`} className="sr-only">
          Descrição
        </label>
        <textarea
          id={`desc-${cartao.id}`}
          name="descricao"
          rows={4}
          maxLength={DESCRICAO_MAXIMO}
          placeholder="Detalhes, critérios de aceite, links…"
          defaultValue={estado.valores?.descricao ?? cartao.descricao ?? ""}
          aria-invalid={estado.erros?.descricao ? true : undefined}
          className={`${CAMPO} resize-y`}
        />
        <div className="flex items-center justify-between gap-2">
          <Status erro={estado.erros?.descricao ?? estado.mensagem} ok={estado.sucesso} />
          <button type="submit" disabled={enviando} className={`${BOTAO_SECUNDARIO} ml-auto`}>
            {enviando ? "Salvando…" : "Salvar descrição"}
          </button>
        </div>
      </form>
    </Secao>
  );
}

function Checklist({ cartao }: { cartao: Cartao }) {
  const [estado, acao, enviando] = useActionState(adicionarItem, ESTADO_INICIAL);
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const feitos = cartao.checklist.filter((i) => i.feito).length;
  const total = cartao.checklist.length;
  const porcentagem = total ? Math.round((feitos / total) * 100) : 0;

  function executar(acaoRapida: () => Promise<{ ok: boolean; mensagem?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acaoRapida();
      if (!r.ok) setErro(r.mensagem ?? "Não foi possível salvar.");
    });
  }

  return (
    <Secao titulo={`Checklist${total ? ` (${feitos}/${total})` : ""}`}>
      {total > 0 && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={porcentagem}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Checklist concluído"
        >
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${porcentagem}%` }} />
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {cartao.checklist.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
            <input
              id={`item-${item.id}`}
              type="checkbox"
              checked={item.feito}
              disabled={ocupado}
              onChange={(e) => executar(() => marcarItem(item.id, e.target.checked))}
              className="size-4 accent-indigo-600"
            />
            <label
              htmlFor={`item-${item.id}`}
              className={`flex-1 text-sm break-words ${item.feito ? "text-zinc-500 line-through" : ""}`}
            >
              {item.texto}
            </label>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar(() => removerItem(item.id))}
              className="rounded px-1.5 text-xs text-zinc-500 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:text-red-400"
              aria-label={`Remover o item "${item.texto}"`}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
      <form key={estado.versao ?? 0} action={acao} noValidate className="flex gap-2">
        <input type="hidden" name="cartao" value={cartao.id} />
        <label htmlFor={`novo-item-${cartao.id}`} className="sr-only">
          Novo item do checklist
        </label>
        <input
          id={`novo-item-${cartao.id}`}
          name="texto"
          placeholder="Novo item…"
          maxLength={ITEM_CHECKLIST_MAXIMO}
          defaultValue={estado.erros || estado.mensagem ? estado.valores?.texto : undefined}
          aria-invalid={estado.erros?.texto ? true : undefined}
          className={`${CAMPO} min-w-0 flex-1`}
        />
        <button type="submit" disabled={enviando} className={BOTAO_SECUNDARIO}>
          {enviando ? "…" : "Adicionar"}
        </button>
      </form>
      <Status erro={estado.erros?.texto ?? estado.mensagem ?? erro ?? undefined} />
    </Secao>
  );
}

function VotarPontos({ projetoId, cartao, emVotacao }: { projetoId: string; cartao: Cartao; emVotacao: boolean }) {
  const router = useRouter();
  const [abrindo, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const irParaVotacao = () => router.push(`/painel/projetos/${projetoId}?aba=votacao`);

  return (
    <Secao titulo="Planning Poker">
      <p className="text-sm text-zinc-500">
        O time vota os pontos escondido, revela junto e decide o valor final. O valor escolhido substitui os pontos do cartão.
      </p>
      <div>
        {emVotacao ? (
          <button type="button" onClick={irParaVotacao} className={BOTAO_MINI}>
            Ir para a votação em andamento →
          </button>
        ) : (
          <button
            type="button"
            disabled={abrindo}
            onClick={() =>
              iniciar(async () => {
                setErro(null);
                const r = await abrirVotacao({ projeto: projetoId, tipo: "pontos", cartao: cartao.id });
                if (r.ok) irParaVotacao();
                else setErro(r.mensagem);
              })
            }
            className={BOTAO_PRINCIPAL}
          >
            {abrindo ? "Abrindo…" : "Votar os pontos"}
          </button>
        )}
      </div>
      <Status erro={erro ?? undefined} />
    </Secao>
  );
}
