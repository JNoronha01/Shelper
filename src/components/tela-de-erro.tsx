import type { ReactNode } from "react";

// Tela de erro do Shelper (404 e falhas): um cartão solto fora das colunas do board.
export function TelaDeErro({ codigo, titulo, texto, children }: { codigo: string; titulo: string; texto: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div aria-hidden="true" className="relative grid w-full grid-cols-5 gap-2 opacity-60">
          {["Backlog", "A fazer", "Em andamento", "Em revisão", "Concluído"].map((c) => (
            <div key={c} className="flex h-24 flex-col gap-1.5 rounded-xl border border-dashed border-linha-forte p-2">
              <span className="truncate text-[10px] text-fraco">{c}</span>
            </div>
          ))}
          <div className="pousar absolute top-9 left-1/2 w-44 -translate-x-1/2 rotate-[-4deg] rounded-xl border border-laranja/60 bg-cartao p-3 text-left shadow-[0_20px_40px_-16px_rgb(0_0_0/0.9)]">
            <span className="text-xs text-suave">{codigo}</span>
            <p className="text-sm font-medium">Cartão sem coluna</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-balance">{titulo}</h1>
          <p className="text-pretty text-suave">{texto}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </main>
  );
}
