"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Pop-up com o <dialog> nativo do navegador: ele já prende o foco dentro da janela,
// fecha com Esc e escurece o fundo. Aqui só ligamos "aberto" ao showModal()/close().
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

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      // Clicar fora da janela (no fundo escuro) também fecha.
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      aria-labelledby="modal-titulo"
      className={`m-auto w-[calc(100%-2rem)] ${largura} rounded-2xl border border-linha-forte bg-painel p-0 text-texto shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]`}
    >
      {aberto && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-linha px-6 py-4">
            <h2 id="modal-titulo" className="text-lg font-semibold leading-snug break-words">
              {titulo}
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
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
