// Classes dos botões e links com aparência de botão, compartilhadas entre as páginas.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:outline-indigo-400";

export const BOTAO_PRINCIPAL = `${BASE} bg-indigo-600 px-4 py-2.5 text-white shadow-sm hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400`;

export const BOTAO_SECUNDARIO = `${BASE} border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800`;

// Botões pequenos dentro dos cartões do board.
export const BOTAO_MINI = `${BASE} rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300`;

export const CAMPO =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-indigo-400 dark:aria-invalid:border-red-400";
