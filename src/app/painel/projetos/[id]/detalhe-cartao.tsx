"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, BOTAO_TEXTO, CAIXA, CAMPO } from "@/components/botoes";
import { Modal } from "@/components/modal";
import { useAvisar } from "@/components/avisos";
import { Seletor } from "@/components/seletor";
import type { Cartao, Membro } from "@/lib/board/dados";
import { formatarDuracao, prazoDoCartao } from "@/lib/board/gargalo";
import { SIGLA_DA_FUNCAO } from "@/lib/board/papeis";
import { DESCRICAO_MAXIMO, ITEM_CHECKLIST_MAXIMO, MOTIVO_MAXIMO, TITULO_MAXIMO, formatarDataHora } from "@/lib/board/regras";
import {
  abrirVotacao,
  adicionarItem,
  bloquearCartao,
  definirResponsavel,
  desbloquearCartao,
  editarCartao,
  marcarItem,
  removerItem,
  salvarDescricao,
} from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";
import { Erro, SeletorDePontos } from "./campos-cartao";

// Pop-up de detalhe do cartão, no estilo do Trello (ideia do professor):
// título e pontos, descrição, checklist e o atalho para votar os pontos.
export function DetalheCartao({
  projetoId,
  cartao,
  emVotacao,
  onFechar,
  podeEditar,
  podeConduzir,
  time,
  meuId,
  agora,
}: {
  projetoId: string;
  cartao: Cartao | null;
  emVotacao: boolean;
  onFechar: () => void;
  // PO: título, pontos e horas. PO e SM: responsável de qualquer um e votação. Todos: descrição e checklist.
  podeEditar: boolean;
  podeConduzir: boolean;
  time: Membro[];
  meuId: string;
  agora: string;
}) {
  return (
    <Modal aberto={cartao !== null} onFechar={onFechar} titulo={cartao?.titulo ?? ""} largura="max-w-2xl">
      {cartao && (
        // key: ao trocar de cartão, os formulários começam do zero.
        <div key={cartao.id} className="flex flex-col gap-6">
          <p className="text-sm text-suave">
            Em <strong className="font-medium text-texto">{cartao.coluna}</strong> · criado em{" "}
            {formatarDataHora(cartao.criadoEm)}
          </p>
          <Prazo cartao={cartao} agora={agora} />
          {podeEditar ? (
            <TituloEPontos cartao={cartao} />
          ) : (
            <p className="text-sm">
              <span className="text-suave">Pontos: </span>
              <strong className="font-semibold tabular-nums">{cartao.pontos}</strong>
              <span className="text-suave"> · Horas estimadas: </span>
              <strong className="font-semibold tabular-nums">{cartao.horasEstimadas === null ? "sem estimativa" : formatarDuracao(cartao.horasEstimadas)}</strong>
            </p>
          )}
          <Responsavel cartao={cartao} time={time} meuId={meuId} podeEscolher={podeConduzir} />
          <Bloqueio cartao={cartao} podeMarcar={podeConduzir || cartao.responsavelId === meuId} />
          <Descricao cartao={cartao} />
          <Checklist cartao={cartao} />
          {(podeConduzir || emVotacao) && (
            <VotarPontos projetoId={projetoId} cartao={cartao} emVotacao={emVotacao} />
          )}
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
  if (erro) return <p className="text-xs text-perigo">{erro}</p>;
  if (ok)
    return (
      <p role="status" className="text-xs text-bom">
        {ok}
      </p>
    );
  return null;
}

function TituloEPontos({ cartao }: { cartao: Cartao }) {
  const [estado, acao, enviando] = useActionState(editarCartao, ESTADO_INICIAL);
  const id = `det-${cartao.id}`;
  return (
    <Secao titulo="Título, pontos e horas estimadas">
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
          <label htmlFor={`${id}-horas`} className="sr-only">
            Horas estimadas
          </label>
          <span className="flex items-center gap-1.5">
            <input
              id={`${id}-horas`}
              name="horas"
              inputMode="decimal"
              placeholder="horas"
              defaultValue={estado.valores?.horas ?? cartao.horasEstimadas?.toString().replace(".", ",") ?? ""}
              aria-invalid={estado.erros?.horas ? true : undefined}
              className={`${CAMPO} w-20 text-right tabular-nums`}
            />
            <span className="text-sm text-suave">h</span>
          </span>
          <button type="submit" disabled={enviando} className={BOTAO_SECUNDARIO}>
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
        <Erro id={`${id}-pontos-erro`} texto={estado.erros?.pontos} />
        <Erro id={`${id}-horas-erro`} texto={estado.erros?.horas} />
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
          className="h-1.5 overflow-hidden rounded-full bg-elevado"
          role="progressbar"
          aria-valuenow={porcentagem}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Checklist concluído"
        >
          <div className="h-full bg-bom transition-all" style={{ width: `${porcentagem}%` }} />
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {cartao.checklist.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-fundo">
            <input
              id={`item-${item.id}`}
              type="checkbox"
              checked={item.feito}
              disabled={ocupado}
              onChange={(e) => executar(() => marcarItem(item.id, e.target.checked))}
              className={CAIXA}
            />
            <label
              htmlFor={`item-${item.id}`}
              className={`flex-1 text-sm break-words ${item.feito ? "text-suave line-through" : ""}`}
            >
              {item.texto}
            </label>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar(() => removerItem(item.id))}
              className={`${BOTAO_TEXTO} opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:!text-perigo`}
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
      <p className="text-sm text-suave">
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

// Prazo do cartão: quanto já passou desde Em andamento contra as horas estimadas.
function Prazo({ cartao, agora }: { cartao: Cartao; agora: string }) {
  const prazo = prazoDoCartao(cartao, agora);
  if (!prazo) return null;
  const largura = Math.min(100, prazo.porcentagem);
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl border px-4 py-3 ${prazo.atrasado ? "border-perigo/50 bg-perigo/10" : "border-linha bg-cartao"}`}>
      <p className="text-sm">
        {prazo.atrasado ? (
          <strong className="font-semibold text-perigo">Gargalo: passou do tempo estimado. </strong>
        ) : (
          <strong className="font-semibold">Dentro do prazo. </strong>
        )}
        <span className="text-suave">
          {formatarDuracao(prazo.decorridoHoras)} desde Em andamento, de {formatarDuracao(prazo.estimadoHoras)} estimadas.
        </span>
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-elevado"
        role="progressbar"
        aria-label="Tempo usado do estimado"
        aria-valuenow={prazo.porcentagem}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${prazo.atrasado ? "bg-perigo" : "bg-laranja"}`} style={{ width: `${largura}%` }} />
      </div>
    </div>
  );
}

function Responsavel({ cartao, time, meuId, podeEscolher }: { cartao: Cartao; time: Membro[]; meuId: string; podeEscolher: boolean }) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAvisar();
  const atual = time.find((m) => m.usuarioId === cartao.responsavelId) ?? null;
  const trocar = (usuario: string | null, aviso: string) => {
    setErro(null);
    iniciar(async () => {
      const r = await definirResponsavel(cartao.id, usuario);
      if (r.ok) avisar(aviso);
      else setErro(r.mensagem);
    });
  };

  return (
    <Secao titulo="Responsável">
      {podeEscolher ? (
        <Seletor
          rotuloAcessivel="Responsável pelo cartão"
          valor={cartao.responsavelId ?? ""}
          onChange={(v) => trocar(v || null, v ? `Responsável: ${time.find((m) => m.usuarioId === v)?.nome ?? ""}.` : "Cartão sem responsável.")}
          opcoes={[{ valor: "", rotulo: "Sem responsável" }, ...time.map((m) => ({ valor: m.usuarioId, rotulo: m.nome, detalhe: SIGLA_DA_FUNCAO[m.funcao] }))]}
          className="w-full sm:w-72"
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">{atual ? atual.nome : <span className="text-suave">Sem responsável</span>}</span>
          {!atual && (
            <button type="button" disabled={ocupado} onClick={() => trocar(meuId, "Você pegou este cartão.")} className={BOTAO_SECUNDARIO}>
              Pegar este cartão
            </button>
          )}
          {atual?.usuarioId === meuId && (
            <button type="button" disabled={ocupado} onClick={() => trocar(null, "Você largou este cartão.")} className={BOTAO_MINI}>
              Largar
            </button>
          )}
        </div>
      )}
      <Status erro={erro ?? undefined} />
    </Secao>
  );
}

function Bloqueio({ cartao, podeMarcar }: { cartao: Cartao; podeMarcar: boolean }) {
  const [estado, acao, enviando] = useActionState(bloquearCartao, ESTADO_INICIAL);
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [abrir, setAbrir] = useState(false);

  if (cartao.bloqueado) {
    return (
      <Secao titulo="Bloqueio">
        <div className="flex flex-col gap-2 rounded-xl border border-perigo/50 bg-perigo/10 px-4 py-3">
          <p className="text-sm">
            <strong className="font-semibold text-perigo">Bloqueado</strong>
            {cartao.bloqueadoEm && <span className="text-suave"> desde {formatarDataHora(cartao.bloqueadoEm)}</span>}
          </p>
          <p className="text-sm break-words">{cartao.motivoBloqueio}</p>
          {podeMarcar && (
            <div>
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  iniciar(async () => {
                    setErro(null);
                    const r = await desbloquearCartao(cartao.id);
                    if (!r.ok) setErro(r.mensagem);
                  })
                }
                className={BOTAO_SECUNDARIO}
              >
                Desbloquear
              </button>
            </div>
          )}
          <Status erro={erro ?? undefined} />
        </div>
      </Secao>
    );
  }
  if (!podeMarcar) return null;
  return (
    <Secao titulo="Bloqueio">
      {abrir || estado.erros || estado.mensagem ? (
        <form action={acao} noValidate className="flex flex-col gap-2">
          <input type="hidden" name="cartao" value={cartao.id} />
          <label htmlFor={`motivo-${cartao.id}`} className="text-sm text-suave">
            Por que o cartão está parado?
          </label>
          <textarea
            id={`motivo-${cartao.id}`}
            name="motivo"
            rows={2}
            autoFocus
            maxLength={MOTIVO_MAXIMO}
            defaultValue={estado.valores?.motivo}
            placeholder="Ex.: esperando a API do cliente"
            aria-invalid={estado.erros?.motivo ? true : undefined}
            className={`${CAMPO} resize-y`}
          />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={enviando} className={BOTAO_SECUNDARIO}>
              {enviando ? "Salvando…" : "Marcar como bloqueado"}
            </button>
            <button type="button" onClick={() => setAbrir(false)} className={BOTAO_TEXTO}>
              Cancelar
            </button>
          </div>
          <Status erro={estado.erros?.motivo ?? estado.mensagem} />
        </form>
      ) : (
        <div>
          <button type="button" onClick={() => setAbrir(true)} className={BOTAO_MINI}>
            Marcar como bloqueado
          </button>
        </div>
      )}
    </Secao>
  );
}
