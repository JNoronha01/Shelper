// Classes dos botões e links com aparência de botão, compartilhadas entre as páginas.
const BASE =
  "inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100";

export const BOTAO_PRINCIPAL = `${BASE} bg-zinc-900 px-4 py-2.5 text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300`;

export const BOTAO_SECUNDARIO = `${BASE} border border-zinc-300 px-4 py-2.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900`;
