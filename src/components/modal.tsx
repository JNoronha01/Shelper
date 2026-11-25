"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Pop-up com o <dialog> nativo do navegador: ele já prende o foco dentro da janela,
// fecha com Esc e escurece o fundo. Aqui ligamos "aberto" ao showModal()/close().
// Para fechar animado, o conteúdo continua na tela por 140 ms com data-fechando (ver globals.css).
const SAIDA_MS = 140;
export function Modal({
  aberto,
  onFechar,
  titulo,
  largura = "max-w-lg",
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  largura?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // O que estava na tela continua visível durante a saída (o pai já trocou para fechado).
  const [visivel, setVisivel] = useState(aberto);
  const [ultimo, setUltimo] = useState({ titulo, children });
  if (aberto && !visivel) setVisivel(true);
  if (aberto && (ultimo.titulo !== titulo || ultimo.children !== children)) setUltimo({ titulo, children });

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto) {
      dialogo.removeAttribute("data-fechando");
      if (!dialogo.open) dialogo.showModal();
      return;
    }
    if (!dialogo.open) return;
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dialogo.setAttribute("data-fechando", "");
    const t = window.setTimeout(
      () => {
        dialogo.removeAttribute("data-fechando");
        dialogo.close();
        setVisivel(false);
      },
      semMovimento ? 0 : SAIDA_MS,
    );
    return () => window.clearTimeout(t);
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setVisivel(false);
        if (aberto) onFechar();
      }}
      // Esc: em vez de fechar na hora, avisa o pai, que fecha com a animação.
      onCancel={(e) => {
        e.preventDefault();
        onFechar();
      }}
      // Clicar fora da janela (no fundo escuro) também fecha.
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      aria-labelledby="modal-titulo"
      className={`m-auto w-[calc(100%-2rem)] ${largura} rounded-2xl border border-linha-forte bg-painel p-0 text-texto shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]`}
    >
      {visivel && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-linha px-6 py-4">
            <h2 id="modal-titulo" className="text-lg font-semibold leading-snug break-words">
              {aberto ? titulo : ultimo.titulo}
            </h2>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="-mr-1.5 grid size-8 place-items-center rounded-lg text-xl leading-none text-suave transition hover:bg-elevado hover:text-texto focus-visible:outline-2 focus-visible:outline-laranja"
            >
              ×
            </button>
          </header>
          <div className="overflow-y-auto px-6 py-5">{aberto ? children : ultimo.children}</div>
        </div>
      )}
    </dialog>
  );
}
