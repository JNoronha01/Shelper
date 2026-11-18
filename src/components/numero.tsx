"use client";

import { useState } from "react";

// Campo de número inteiro com botões − e + (no lugar das setinhas do navegador).
// Aceita digitar também; o valor vai no formulário pelo próprio "name".
export function CampoNumero({
  id,
  name,
  padrao,
  min,
  max,
  invalido,
  descritoPor,
}: {
  id: string;
  name: string;
  padrao: number | string;
  min: number;
  max: number;
  invalido?: boolean;
  descritoPor?: string;
}) {
  const [texto, setTexto] = useState(String(padrao));
  const numero = Number(texto);
  const mudar = (delta: number) => {
    const base = Number.isFinite(numero) ? numero : min;
    setTexto(String(Math.min(max, Math.max(min, Math.round(base) + delta))));
  };
  const botao =
    "grid size-9 place-items-center text-lg text-suave transition hover:bg-elevado hover:text-texto focus-visible:bg-elevado focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div
      className={`inline-flex w-fit items-stretch overflow-hidden rounded-xl border bg-fundo/60 transition duration-150 ease-suave focus-within:border-laranja focus-within:ring-3 focus-within:ring-laranja/20 ${
        invalido ? "border-perigo" : "border-linha-forte hover:border-fraco"
      }`}
    >
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => mudar(-1)} disabled={numero <= min} className={botao}>
        −
      </button>
      <input
        id={id}
        name={name}
        inputMode="numeric"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            mudar(e.key === "ArrowUp" ? 1 : -1);
          }
        }}
        aria-invalid={invalido || undefined}
        aria-describedby={descritoPor}
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number.isFinite(numero) ? numero : undefined}
        className="w-12 border-x border-linha bg-transparent text-center text-sm font-semibold tabular-nums text-texto outline-none"
      />
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => mudar(1)} disabled={numero >= max} className={botao}>
        +
      </button>
    </div>
  );
}
