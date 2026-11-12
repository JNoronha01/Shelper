import { COLUNAS } from "@/lib/colunas";

// Página inicial pública (rota "/").
// No H1 ela ganhará o botão que leva ao cadastro.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Shelper</h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Board ágil para times pequenos. Planeje Sprints, mova cartões entre
          colunas e acompanhe Lead Time, Cycle Time, Throughput, WIP, Velocity
          e Burndown calculados automaticamente — sem planilha.
        </p>
      </header>

      <section aria-labelledby="titulo-colunas" className="flex flex-col gap-3">
        <h2 id="titulo-colunas" className="text-sm font-semibold uppercase text-zinc-500">
          Fluxo do board
        </h2>
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {COLUNAS.map((coluna) => (
            <li
              key={coluna}
              className="rounded-lg border border-zinc-200 px-3 py-4 text-center font-medium dark:border-zinc-800"
            >
              {coluna}
            </li>
          ))}
        </ol>
      </section>

      <p className="text-sm text-zinc-500">Cadastro disponível em breve.</p>
    </main>
  );
}
