"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { marcarTour } from "@/app/painel/perfil/acoes";
import { BOTAO_PRINCIPAL, BOTAO_TEXTO } from "./botoes";

// Tour de primeiro acesso (H45): balões que apontam para partes da tela, com Próximo,
// Voltar e Pular. Cada passo aponta para um elemento com data-tour="...". Passo cujo alvo
// não está na tela (ex.: Novo cartão para quem não é PO) é pulado sozinho.
// Ao concluir ou pular, o banco guarda (marcar_tour) e ele não aparece mais nesta conta.
// Para ver de novo: Meu perfil → Refazer o tour.

export type PassoTour = { alvo: string; titulo: string; texto: string };

type Caixa = { top: number; left: number; width: number; height: number };

const MARGEM = 8;
const LARGURA_BALAO = 340;

function medir(alvo: string): Caixa | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${alvo}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top - MARGEM, left: r.left - MARGEM, width: r.width + MARGEM * 2, height: r.height + MARGEM * 2 };
}

export function Tour({ qual, passos }: { qual: "painel" | "projeto"; passos: PassoTour[] }) {
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [visiveis, setVisiveis] = useState<PassoTour[]>([]);
  const [, salvar] = useTransition();
  const balao = useRef<HTMLDivElement>(null);
  const [altura, setAltura] = useState(180);
  const [janela, setJanela] = useState({ largura: 1280, altura: 800 });

  // Espera a tela assentar (transições de página) antes de começar e descarta os passos sem alvo.
  useEffect(() => {
    const t = setTimeout(() => {
      const existentes = passos.filter((p) => medir(p.alvo));
      if (existentes.length === 0) return;
      setVisiveis(existentes);
      setAberto(true);
    }, 700);
    return () => clearTimeout(t);
  }, [passos]);

  const passo = visiveis[indice];

  // Mede o alvo do passo atual e acompanha rolagem e mudança de tamanho da janela.
  useLayoutEffect(() => {
    if (!aberto || !passo) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${passo.alvo}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const atualizar = () => {
      setCaixa(medir(passo.alvo));
      setJanela({ largura: window.innerWidth, altura: window.innerHeight });
    };
    atualizar();
    window.addEventListener("resize", atualizar);
    window.addEventListener("scroll", atualizar, true);
    return () => {
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("scroll", atualizar, true);
    };
  }, [aberto, passo]);

  useEffect(() => {
    if (aberto) balao.current?.focus();
  }, [aberto, indice]);

  // Altura real do balão (o texto muda a cada passo), para decidir se ele cabe embaixo do alvo.
  useLayoutEffect(() => {
    const h = balao.current?.offsetHeight;
    if (h && h !== altura) setAltura(h);
  }, [altura, indice, aberto, caixa]);

  const fechar = useCallback(() => {
    setAberto(false);
    salvar(async () => {
      await marcarTour(qual);
    });
  }, [qual]);

  useEffect(() => {
    if (!aberto) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") setIndice((i) => Math.min(i + 1, visiveis.length - 1));
      if (e.key === "ArrowLeft") setIndice((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto, fechar, visiveis.length]);

  if (!aberto || !passo || !caixa) return null;

  // Balão embaixo do alvo; se não couber, em cima. Sempre dentro da janela.
  const largura = Math.min(LARGURA_BALAO, janela.largura - 32);
  // Alvo grande (o board inteiro) não deixa espaço em volta: o balão vai para baixo, no centro.
  const cabeEmbaixo = caixa.top + caixa.height + 12 + altura < janela.altura;
  const cabeEmCima = caixa.top - altura - 12 >= 16;
  const top = cabeEmbaixo ? caixa.top + caixa.height + 12 : cabeEmCima ? caixa.top - altura - 12 : janela.altura - altura - 24;
  const left =
    cabeEmbaixo || cabeEmCima
      ? Math.min(Math.max(16, caixa.left), janela.largura - largura - 16)
      : Math.round((janela.largura - largura) / 2);
  const ultimo = indice === visiveis.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Clique fora não fecha: só os botões, para ninguém perder o tour sem querer. */}
      <div className="absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-xl ring-2 ring-laranja transition-all duration-300 ease-suave"
        style={{ ...caixa, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.62)" }}
      />
      <div
        ref={balao}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titulo"
        aria-describedby="tour-texto"
        tabIndex={-1}
        className="surgir absolute flex flex-col gap-3 rounded-2xl border border-linha-forte bg-cartao p-4 shadow-2xl outline-none"
        style={{ top, left, width: largura }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="tour-titulo" className="font-semibold">
            {passo.titulo}
          </h2>
          <span className="shrink-0 text-xs text-suave tabular-nums">
            {indice + 1} de {visiveis.length}
          </span>
        </div>
        <p id="tour-texto" className="text-sm leading-relaxed text-suave">
          {passo.texto}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fechar} className={`${BOTAO_TEXTO} !text-sm`}>
            Pular tour
          </button>
          <span className="ml-auto" />
          {indice > 0 && (
            <button type="button" onClick={() => setIndice(indice - 1)} className={`${BOTAO_TEXTO} !text-sm`}>
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={() => (ultimo ? fechar() : setIndice(indice + 1))}
            className={`${BOTAO_PRINCIPAL} !px-3 !py-1.5 !text-sm`}
          >
            {ultimo ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
