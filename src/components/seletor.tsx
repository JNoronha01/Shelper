"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type Opcao = { valor: string; rotulo: string; detalhe?: string };

// Lista de escolha desenhada por nós, no lugar do <select> do navegador (que no Windows
// abre com cara de sistema antigo). Usa a API "popover" do navegador: a lista abre por cima
// de tudo, até de um pop-up, e fecha sozinha ao clicar fora ou apertar Esc.
// Teclado: setas, Home/End, Enter ou Espaço para escolher, Esc para fechar.
// Dentro de um <form>, envia o valor por um campo escondido com o mesmo "name".
export function Seletor({
  id,
  name,
  opcoes,
  valor,
  padrao,
  onChange,
  invalido,
  descritoPor,
  rotuloAcessivel,
  className = "w-full",
}: {
  id?: string;
  name?: string;
  opcoes: Opcao[];
  valor?: string;
  padrao?: string;
  onChange?: (valor: string) => void;
  invalido?: boolean;
  descritoPor?: string;
  rotuloAcessivel?: string;
  className?: string;
}) {
  const automatico = useId();
  const idBotao = id ?? `seletor-${automatico}`;
  const idLista = `${idBotao}-lista`;
  const [interno, setInterno] = useState(padrao ?? opcoes[0]?.valor ?? "");
  const atual = valor ?? interno;
  const escolhida = opcoes.find((o) => o.valor === atual);

  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [posicao, setPosicao] = useState({ top: 0, left: 0, width: 0, acima: false });
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  // Clicar no botão com a lista aberta: o navegador já fecha a lista no "pointerdown";
  // sem isto, o "click" logo depois abriria de novo.
  const estavaAberto = useRef(false);

  // A lista fica em posição fixa na tela: se a página rolar, ela fecha para não ficar solta.
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: Event) => {
      if (e.target instanceof Node && lista.current?.contains(e.target)) return;
      lista.current?.hidePopover();
    };
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto]);

  function abrir() {
    const b = botao.current;
    const l = lista.current;
    if (!b || !l) return;
    const r = b.getBoundingClientRect();
    const alturaLista = Math.min(opcoes.length * 40 + 12, 288);
    const acima = r.bottom + alturaLista + 8 > window.innerHeight && r.top > alturaLista + 8;
    setPosicao({ top: acima ? r.top - alturaLista - 6 : r.bottom + 6, left: r.left, width: r.width, acima });
    setAtivo(Math.max(0, opcoes.findIndex((o) => o.valor === atual)));
    l.showPopover();
    l.focus();
  }

  function escolher(i: number) {
    const o = opcoes[i];
    if (!o) return;
    if (valor === undefined) setInterno(o.valor);
    onChange?.(o.valor);
    lista.current?.hidePopover();
    botao.current?.focus();
  }

  function teclaNaLista(e: KeyboardEvent<HTMLUListElement>) {
    const ultimo = opcoes.length - 1;
    if (e.key === "ArrowDown") setAtivo((a) => Math.min(ultimo, a + 1));
    else if (e.key === "ArrowUp") setAtivo((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setAtivo(0);
    else if (e.key === "End") setAtivo(ultimo);
    else if (e.key === "Enter" || e.key === " ") escolher(ativo);
    else if (e.key === "Tab") lista.current?.hidePopover();
    else return;
    e.preventDefault();
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={atual} />}
      <button
        ref={botao}
        id={idBotao}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={idLista}
        data-invalido={invalido || undefined}
        aria-describedby={descritoPor}
        aria-label={rotuloAcessivel}
        onPointerDown={() => {
          estavaAberto.current = aberto;
        }}
        onClick={() => {
          if (estavaAberto.current) {
            estavaAberto.current = false;
            return;
          }
          abrir();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            abrir();
          }
        }}
        className={`group flex items-center justify-between gap-3 rounded-xl border border-linha-forte bg-fundo/60 px-3 py-2 text-left text-sm text-texto transition duration-150 ease-suave hover:border-fraco focus-visible:border-laranja focus-visible:ring-3 focus-visible:ring-laranja/20 focus-visible:outline-none aria-expanded:border-laranja data-invalido:border-perigo ${className}`}
      >
        <span className="truncate">{escolhida?.rotulo ?? "Escolha…"}</span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="size-4 shrink-0 text-fraco transition-transform duration-200 ease-suave group-aria-expanded:rotate-180"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ul
        ref={lista}
        id={idLista}
        role="listbox"
        popover="auto"
        tabIndex={-1}
        aria-labelledby={idBotao}
        aria-activedescendant={aberto ? `${idLista}-${ativo}` : undefined}
        onToggle={(e) => setAberto(e.newState === "open")}
        onKeyDown={teclaNaLista}
        style={{ top: posicao.top, left: posicao.left, right: "auto", bottom: "auto", minWidth: posicao.width }}
        className={`fixed m-0 max-h-72 overflow-y-auto rounded-xl border border-linha-forte bg-elevado p-1.5 text-sm text-texto shadow-[0_16px_40px_-12px_rgb(0_0_0/0.8)] outline-none transition-[opacity,translate] duration-150 ease-suave starting:opacity-0 ${
          posicao.acima ? "starting:translate-y-1" : "starting:-translate-y-1"
        }`}
      >
        {opcoes.map((o, i) => {
          const selecionada = o.valor === atual;
          return (
            <li
              key={o.valor}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={selecionada}
              onPointerEnter={() => setAtivo(i)}
              onClick={() => escolher(i)}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2 ${
                i === ativo ? "bg-linha-forte/70" : ""
              } ${selecionada ? "font-medium text-laranja" : ""}`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{o.rotulo}</span>
                {o.detalhe && <span className="truncate text-xs font-normal text-suave">{o.detalhe}</span>}
              </span>
              {selecionada && (
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
