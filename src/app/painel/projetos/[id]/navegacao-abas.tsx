"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  ViewTransition,
  type ReactNode,
} from "react";
import { COLUNAS } from "@/lib/colunas";
import { ABAS, type IdAba } from "./abas";

// Navegação entre as abas do projeto.
// - A aba clicada fica ativa na hora (useOptimistic), antes de o servidor responder.
// - O marcador desliza até ela; se o servidor demorar, um esqueleto cobre o conteúdo antigo.
// - O conteúdo novo entra com um fade (View Transition do navegador, ver globals.css).
// - Teclas 1 a 8 trocam de aba (fora de campos de texto e de pop-ups).
// O endereço continua sendo ?aba=..., então o link pode ser copiado e enviado ao time.

type Contexto = { atual: IdAba; aba: IdAba; pendente: boolean };
const Ctx = createContext<Contexto>({ atual: "board", aba: "board", pendente: false });

export function ProvedorAbas({
  projetoId,
  atual,
  visiveis,
  caminho = `/painel/projetos/${projetoId}`,
  children,
}: {
  projetoId: string;
  atual: IdAba;
  visiveis: IdAba[];
  caminho?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [aba, setAba] = useOptimistic(atual);
  const [pendente, iniciar] = useTransition();
  const abas = ABAS.filter((a) => visiveis.includes(a.id));

  function ir(id: IdAba) {
    if (id === aba) return;
    iniciar(() => {
      setAba(id);
      router.push(`${caminho}?aba=${id}`, { scroll: false, transitionTypes: ["aba"] });
    });
  }

  // Atalhos 1–8. O ref guarda a função mais recente para o ouvinte não precisar ser trocado.
  const irRef = useRef(ir);
  useEffect(() => {
    irRef.current = ir;
  });
  const ids = abas.map((a) => a.id).join(",");
  useEffect(() => {
    const lista = ids.split(",") as IdAba[];
    function tecla(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, select, [contenteditable=true]") || document.querySelector("dialog[open]")) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > lista.length) return;
      e.preventDefault();
      irRef.current(lista[n - 1]);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ids]);

  return (
    <Ctx.Provider value={{ atual, aba, pendente }}>
      <Abas caminho={caminho} abas={abas} aba={aba} pendente={pendente} onIr={ir} />
      {children}
    </Ctx.Provider>
  );
}

function Abas({
  caminho,
  abas,
  aba,
  pendente,
  onIr,
}: {
  caminho: string;
  abas: (typeof ABAS)[number][];
  aba: IdAba;
  pendente: boolean;
  onIr: (id: IdAba) => void;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const [marcador, setMarcador] = useState<{ x: number; w: number; animar: boolean } | null>(null);

  // Mede a aba ativa e posiciona o marcador; a primeira medida não anima (só as trocas).
  useLayoutEffect(() => {
    const el = lista.current?.querySelector<HTMLElement>(`[data-aba="${aba}"]`);
    if (!el) return;
    const medir = () => setMarcador((m) => ({ x: el.offsetLeft, w: el.offsetWidth, animar: m !== null }));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aba]);

  return (
    <nav aria-label="Seções do projeto" className="sem-barra relative -mx-4 shrink-0 overflow-x-auto px-4">
      <div ref={lista} className="relative flex w-max gap-1 rounded-xl border border-linha bg-painel p-1">
        {marcador && (
          <span
            aria-hidden="true"
            className={`absolute top-1 bottom-1 left-0 rounded-lg bg-elevado shadow-[inset_0_-2px_0_var(--color-laranja)] ${
              marcador.animar ? "transition-[translate,width] duration-200 ease-suave" : ""
            }`}
            style={{ translate: `${marcador.x}px 0`, width: marcador.w }}
          />
        )}
        {abas.map((a, i) => {
          const ativa = a.id === aba;
          return (
            <Link
              key={a.id}
              data-aba={a.id}
              href={`${caminho}?aba=${a.id}`}
              scroll={false}
              aria-current={ativa ? "page" : undefined}
              aria-keyshortcuts={String(i + 1)}
              title={`${a.rotulo} (tecla ${i + 1})`}
              onClick={(e) => {
                // Ctrl/Cmd/botão do meio continuam abrindo em outra aba do navegador.
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                onIr(a.id);
              }}
              className={`relative rounded-lg px-4 py-1.5 text-sm font-medium transition-colors duration-150 ease-suave focus-visible:outline-2 focus-visible:outline-laranja active:scale-[0.97] ${
                ativa ? "text-texto" : "text-suave hover:bg-elevado/50 hover:text-texto"
              } ${!marcador && ativa ? "bg-elevado shadow-[inset_0_-2px_0_var(--color-laranja)]" : ""}`}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </div>
      {/* Barra que corre embaixo das abas enquanto a próxima carrega. */}
      {pendente && (
        <span aria-hidden="true" className="pointer-events-none absolute right-4 -bottom-1.5 left-4 h-0.5 overflow-hidden rounded-full">
          <span className="barra-carregando block h-full w-1/3 rounded-full bg-laranja/80" />
        </span>
      )}
    </nav>
  );
}

// Conteúdo da aba: troca com fade e, enquanto a próxima carrega, mostra o esqueleto por cima.
export function ConteudoAba({ children, telaCheia }: { children: ReactNode; telaCheia: boolean }) {
  const { atual, aba, pendente } = useContext(Ctx);
  return (
    <div
      data-tela-cheia={telaCheia ? "" : undefined}
      aria-busy={pendente || undefined}
      className={`relative flex flex-col gap-4 ${telaCheia ? "md:min-h-0 md:flex-1" : ""}`}
    >
      <ViewTransition key={atual} name="conteudo-aba" share="aba" default="none">
        <div className={`flex flex-col gap-4 ${telaCheia ? "md:min-h-0 md:flex-1" : ""}`}>{children}</div>
      </ViewTransition>
      {pendente && aba !== atual && <Esqueleto aba={aba} />}
    </div>
  );
}

function Esqueleto({ aba }: { aba: IdAba }) {
  return (
    <div className="carregando-aba absolute inset-0 z-10 flex flex-col gap-3 bg-fundo">
      <p className="sr-only">Carregando…</p>
      {aba === "board" ? (
        <>
          <div className="esqueleto h-10 w-80 max-w-full rounded-xl" />
          <div className="grid min-h-0 flex-1 grid-flow-col auto-cols-[17.5rem] gap-3 overflow-hidden xl:auto-cols-fr">
            {COLUNAS.map((c) => (
              <div key={c} className="esqueleto h-72 rounded-coluna md:h-full" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="esqueleto h-10 w-72 max-w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="esqueleto h-24 rounded-2xl" />
            ))}
          </div>
          <div className="esqueleto h-64 rounded-2xl" />
        </>
      )}
    </div>
  );
}
