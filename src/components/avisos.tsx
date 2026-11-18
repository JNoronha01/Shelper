"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// Avisos rápidos no canto da tela ("Cartão criado", "Movido para…"): aparecem e somem
// sozinhos depois de alguns segundos. Ficam no layout do painel, então continuam na tela
// mesmo quando a página recarrega os dados depois de salvar.
type Tipo = "ok" | "info" | "erro";
type Aviso = { id: number; tipo: Tipo; texto: string };

const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => {});

export function useAvisar() {
  return useContext(Contexto);
}

const COR: Record<Tipo, string> = {
  ok: "bg-bom",
  info: "bg-aviso",
  erro: "bg-perigo",
};

export function Avisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const fechar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);
  const avisar = useCallback(
    (texto: string, tipo: Tipo = "ok") => {
      const id = Date.now() + Math.random();
      setAvisos((a) => [...a.slice(-2), { id, tipo, texto }]);
      setTimeout(() => fechar(id), tipo === "erro" ? 7000 : 4000);
    },
    [fechar],
  );

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <ol
        aria-live="polite"
        aria-label="Avisos"
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto"
      >
        {avisos.map((a) => (
          <li
            key={a.id}
            role={a.tipo === "erro" ? "alert" : "status"}
            className="surgir pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-linha-forte bg-elevado px-4 py-3 text-sm text-texto shadow-[0_16px_40px_-12px_rgb(0_0_0/0.8)]"
          >
            <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${COR[a.tipo]}`} />
            <span className="flex-1">{a.texto}</span>
            <button
              type="button"
              onClick={() => fechar(a.id)}
              aria-label="Fechar aviso"
              className="-mr-1 rounded-md px-1 text-suave hover:text-texto focus-visible:outline-2 focus-visible:outline-laranja"
            >
              ×
            </button>
          </li>
        ))}
      </ol>
    </Contexto.Provider>
  );
}
