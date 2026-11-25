"use client";

import { useEffect } from "react";

// Check rápido no botão depois de salvar. Todo botão que mostra "Salvando…" tem aria-busy:
// quando ele deixa de estar ocupado e o formulário não mostra erro, o botão ganha data-feito
// por 1,2 s e o CSS (globals.css) desenha o check. Assim nenhum formulário precisa mudar.
export function Confirmacoes() {
  useEffect(() => {
    const timers = new Map<HTMLElement, number>();
    const observador = new MutationObserver((mudancas) => {
      for (const m of mudancas) {
        const botao = m.target as HTMLElement;
        if (m.attributeName !== "aria-busy" || m.oldValue !== "true" || botao.getAttribute("aria-busy") === "true") continue;
        // Espera a tela mostrar o resultado (erro ou sucesso) antes de decidir.
        window.setTimeout(() => {
          if (!botao.isConnected) return;
          const area = botao.closest("form, section, dialog") ?? botao.parentElement;
          if (area?.querySelector('[role="alert"], [aria-invalid="true"]')) return;
          botao.removeAttribute("data-feito");
          void botao.offsetWidth; // reinicia a animação se salvar duas vezes seguidas
          botao.setAttribute("data-feito", "");
          window.clearTimeout(timers.get(botao));
          timers.set(
            botao,
            window.setTimeout(() => botao.removeAttribute("data-feito"), 1200),
          );
        }, 80);
      }
    });
    observador.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-busy"], attributeOldValue: true });
    return () => {
      observador.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return null;
}
