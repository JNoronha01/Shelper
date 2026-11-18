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
      className={`m-auto w-[calc(100%-2rem)] ${largura} rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/50 backdrop:backdrop-blur-[2px] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100`}
    >
      {aberto && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 id="modal-titulo" className="text-lg font-semibold leading-snug break-words">
              {titulo}
            </h2>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="-mr-1 rounded-md px-2 py-1 text-xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              ×
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
