import { ViewTransition, type ReactNode } from "react";

// Transição entre páginas do painel. Os links dizem a direção:
//   transitionTypes={["ir"]}     entrar (Meus projetos → projeto, perfil): conteúdo desliza para a esquerda
//   transitionTypes={["voltar"]} voltar (←, logo):                         conteúdo desliza para a direita
// Sem tipo (botão Voltar do navegador, recarregar dados) não anima. O CSS está em globals.css.
const DIRECAO = { ir: "ir", voltar: "voltar", default: "none" };

export function TransicaoPagina({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECAO} exit={DIRECAO} default="none">
      {children}
    </ViewTransition>
  );
}

// O nome do projeto é "o mesmo objeto" no cartão de Meus projetos e no título da página do projeto:
// o navegador anima um até o outro.
export function NomeDoProjeto({ id, children }: { id: string; children: ReactNode }) {
  return (
    <ViewTransition name={`projeto-${id}`} share="nome" default="none">
      {children}
    </ViewTransition>
  );
}
