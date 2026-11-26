"use client";

import { useEffect, useRef, useState } from "react";

// Número que conta até o valor: do 0 quando aparece na tela e do valor antigo quando muda
// (trocar Sprint ou pessoa no filtro). Recebe o texto já formatado ("2,5", "9,5 h", "12")
// e anima só a parte numérica, com as mesmas casas decimais. Sem número ("—"), mostra o texto.
// Leitor de tela ouve só o valor final; quem pede menos movimento vê o valor direto.

const DURACAO_MS = 700;

function separar(texto: string): { valor: number; casas: number; resto: string } | null {
  const m = texto.match(/^(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d+))?(.*)$/);
  if (!m) return null;
  const casas = m[2]?.length ?? 0;
  const valor = Number(`${m[1].replaceAll(".", "")}${casas ? `.${m[2]}` : ""}`);
  return Number.isFinite(valor) ? { valor, casas, resto: m[3] } : null;
}

const formatar = (n: number, casas: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function NumeroAnimado({ texto, className }: { texto: string; className?: string }) {
  const alvo = separar(texto);
  const ref = useRef<HTMLSpanElement>(null);
  const [mostrado, setMostrado] = useState<number | null>(null);
  const anterior = useRef(0);

  useEffect(() => {
    if (!alvo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const de = anterior.current;
    const ate = alvo.valor;
    if (de === ate) return;
    let quadro = 0;
    // Só começa quando o número aparece na tela (na página inicial ele fica mais abaixo).
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const inicio = performance.now();
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / DURACAO_MS);
        const suave = 1 - (1 - t) ** 3;
        setMostrado(t >= 1 ? null : de + (ate - de) * suave);
        if (t < 1) quadro = requestAnimationFrame(passo);
        else anterior.current = ate; // a próxima mudança anima a partir daqui
      };
      quadro = requestAnimationFrame(passo);
    });
    setMostrado(de);
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(quadro);
      setMostrado(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- anima quando o texto muda
  }, [texto]);

  if (!alvo) return <span className={className}>{texto}</span>;
  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{mostrado === null ? texto : `${formatar(mostrado, alvo.casas)}${alvo.resto}`}</span>
      <span className="sr-only">{texto}</span>
    </span>
  );
}
