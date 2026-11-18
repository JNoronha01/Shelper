// Classes dos botões, campos e caixas de seleção, compartilhadas entre as páginas.
// Laranja só no botão principal e no foco: é o que o olho deve achar primeiro.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition duration-150 ease-suave select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laranja active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const BOTAO_PRINCIPAL = `${BASE} bg-laranja px-4 py-2.5 font-semibold text-sobre-laranja shadow-[0_1px_0_rgb(255_255_255/0.25)_inset] hover:bg-laranja-claro`;

export const BOTAO_SECUNDARIO = `${BASE} border border-linha-forte bg-elevado/60 px-4 py-2.5 text-texto hover:border-fraco hover:bg-elevado`;

// Botões pequenos dentro dos cartões e listas.
export const BOTAO_MINI = `${BASE} rounded-lg border border-linha px-2.5 py-1 text-xs text-suave hover:border-linha-forte hover:bg-elevado hover:text-texto`;

// Botão só com texto (ações discretas, como "Remover").
export const BOTAO_TEXTO = `${BASE} rounded-lg px-2 py-1 text-xs text-suave hover:bg-elevado hover:text-texto`;

export const CAMPO =
  "rounded-xl border border-linha-forte bg-fundo/60 px-3 py-2 text-sm text-texto placeholder:text-fraco outline-none transition duration-150 ease-suave hover:border-fraco focus-visible:border-laranja focus-visible:ring-3 focus-visible:ring-laranja/20 aria-invalid:border-perigo";

// Caixa de marcar desenhada por nós (a padrão do navegador fica com cara de sistema antigo).
export const CAIXA =
  "peer grid size-4.5 shrink-0 cursor-pointer appearance-none place-content-center rounded-md border border-linha-forte bg-fundo transition duration-150 ease-suave checked:border-laranja checked:bg-laranja hover:border-fraco focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laranja disabled:opacity-50 before:size-2.5 before:scale-0 before:bg-sobre-laranja before:transition before:[clip-path:polygon(14%_44%,0_65%,50%_100%,100%_16%,80%_0%,43%_62%)] checked:before:scale-100";

// Superfícies: painel (seções e colunas) e cartão (itens dentro delas).
export const PAINEL = "rounded-2xl border border-linha bg-painel";
