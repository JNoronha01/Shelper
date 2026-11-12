// Colunas fixas do board do Shelper, na ordem do fluxo.
// "as const" faz o TypeScript tratar a lista como valores exatos (não apenas string[]),
// o que permite criar o tipo Coluna logo abaixo.
export const COLUNAS = [
  "Backlog",
  "A fazer",
  "Em andamento",
  "Em revisão",
  "Concluído",
] as const;

// Tipo que aceita apenas um dos 5 nomes acima.
export type Coluna = (typeof COLUNAS)[number];

// Devolve a próxima coluna (para o botão "Avançar"), ou null se já estiver em "Concluído".
export function proximaColuna(atual: Coluna): Coluna | null {
  const i = COLUNAS.indexOf(atual);
  return i < COLUNAS.length - 1 ? COLUNAS[i + 1] : null;
}

// Devolve a coluna anterior (para o botão "Voltar"), ou null se já estiver em "Backlog".
export function colunaAnterior(atual: Coluna): Coluna | null {
  const i = COLUNAS.indexOf(atual);
  return i > 0 ? COLUNAS[i - 1] : null;
}
