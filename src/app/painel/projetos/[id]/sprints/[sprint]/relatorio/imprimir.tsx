"use client";

import { BOTAO_PRINCIPAL } from "@/components/botoes";

// Abre a janela de impressão do navegador; lá a pessoa escolhe "Salvar como PDF".
export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={BOTAO_PRINCIPAL}>
      Salvar em PDF
    </button>
  );
}
