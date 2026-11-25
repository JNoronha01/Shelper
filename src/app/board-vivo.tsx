"use client";

import { startTransition, useEffect, useRef, useState, ViewTransition } from "react";
import { COLUNAS, type Coluna } from "@/lib/colunas";

// Prévia viva da página inicial: um cartão anda sozinho pelas colunas, como no board de verdade.
// O movimento usa a mesma View Transition do board (CSS em globals.css). Para quem pede menos
// movimento no sistema, e enquanto a prévia está fora da tela, o cartão fica parado.

type Exemplo = { id: string; titulo: string; pontos: number; coluna: Coluna };

const FIXOS: Exemplo[] = [
  { id: "csv", titulo: "Exportar CSV", pontos: 2, coluna: "Backlog" },
  { id: "burndown", titulo: "Ver Burndown", pontos: 5, coluna: "A fazer" },
  { id: "revisao", titulo: "Criar cartão", pontos: 3, coluna: "Em revisão" },
  { id: "conta", titulo: "Criar conta", pontos: 5, coluna: "Concluído" },
  { id: "projeto", titulo: "Criar projeto", pontos: 3, coluna: "Concluído" },
];
const ANDANDO = { id: "mover", titulo: "Mover cartão", pontos: 2 };
const LIMITE: Partial<Record<Coluna, number>> = { "Em andamento": 3, "Em revisão": 2 };
const INTERVALO_MS = 2200;

export function BoardVivo() {
  const [passo, setPasso] = useState(2); // começa em "Em andamento"
  const caixa = useRef<HTMLDivElement>(null);
  const passoAtual = useRef(passo);
  useEffect(() => {
    passoAtual.current = passo;
  }, [passo]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visivel = false;
    const io = new IntersectionObserver(([e]) => (visivel = e.isIntersecting));
    if (caixa.current) io.observe(caixa.current);
    const t = window.setInterval(() => {
      if (!visivel || document.hidden) return;
      // Do Concluído volta ao Backlog sem animação: é o recomeço do exemplo, não um movimento.
      if (passoAtual.current === COLUNAS.length - 1) setPasso(0);
      else startTransition(() => setPasso(passoAtual.current + 1));
    }, INTERVALO_MS);
    return () => {
      window.clearInterval(t);
      io.disconnect();
    };
  }, []);

  const cartoes: Exemplo[] = [...FIXOS, { ...ANDANDO, coluna: COLUNAS[passo] }];

  return (
    <div ref={caixa} className="rounded-2xl border border-linha bg-cartao/80 p-3 shadow-2xl shadow-black/40 sm:p-4">
      <div className="mb-3 flex items-center gap-1.5 px-1" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-linha-forte" />
        <span className="size-2.5 rounded-full bg-linha-forte" />
        <span className="size-2.5 rounded-full bg-linha-forte" />
      </div>
      <ol aria-label="Exemplo das 5 colunas do board" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COLUNAS.map((coluna) => {
          const daColuna = cartoes.filter((c) => c.coluna === coluna);
          const limite = LIMITE[coluna];
          return (
            <li key={coluna} className="flex min-h-28 flex-col gap-2 rounded-xl bg-elevado/80 p-2.5 text-left">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{coluna}</span>
                <span className="text-suave tabular-nums">{limite ? `${daColuna.length}/${limite}` : daColuna.length}</span>
              </div>
              {daColuna.map((c) => (
                <ViewTransition key={c.id} name={`exemplo-${c.id}`} share="cartao" update="cartao" default="none">
                  <div
                    className={`flex items-center justify-between gap-2 rounded-lg border bg-cartao px-2.5 py-2 text-xs shadow-sm ${
                      c.id === ANDANDO.id ? "border-laranja/50" : "border-linha"
                    }`}
                  >
                    <span className={coluna === "Concluído" ? "text-suave line-through decoration-bom/60" : ""}>{c.titulo}</span>
                    <span className="rounded bg-elevado px-1.5 font-semibold text-texto">{c.pontos}</span>
                  </div>
                </ViewTransition>
              ))}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
