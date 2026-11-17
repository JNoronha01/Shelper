import Link from "next/link";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Logo } from "@/components/logo";
import { COLUNAS } from "@/lib/colunas";

// Página inicial pública (rota "/"): explica o Shelper e leva ao cadastro.

// Cartões de exemplo do Apêndice B.4 do Relatório, só para ilustrar o board.
const EXEMPLO: Record<string, { titulo: string; pontos: number }[]> = {
  Backlog: [{ titulo: "Exportar CSV", pontos: 2 }],
  "A fazer": [{ titulo: "Ver Burndown", pontos: 5 }],
  "Em andamento": [{ titulo: "Mover cartão", pontos: 2 }],
  "Em revisão": [{ titulo: "Criar cartão", pontos: 3 }],
  Concluído: [
    { titulo: "Criar conta", pontos: 5 },
    { titulo: "Criar projeto", pontos: 3 },
  ],
};

const METRICAS = [
  ["Lead Time", "Quanto tempo um pedido leva da criação até ser entregue."],
  ["Cycle Time", "Quanto tempo o trabalho em si leva, do início à conclusão."],
  ["Throughput", "Quantos cartões o time conclui em cada Sprint."],
  ["WIP", "Quantos cartões estão em andamento por dia, contra o limite."],
  ["Velocity", "Quantos pontos o time entrega por Sprint, para planejar a próxima."],
  ["Burndown", "Pontos restantes dia a dia, contra a linha ideal."],
] as const;

const PASSOS = [
  ["Crie o projeto", "Ele já nasce com as 5 colunas do fluxo e limites de WIP de 3 e 2."],
  ["Mova os cartões", "Arrastando ou com os botões Avançar e Voltar. Cada movimento vira um evento com hora do servidor."],
  ["Veja as métricas", "O histórico de eventos alimenta o dashboard: ninguém anota datas à mão."],
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5">
        <Logo />
        <nav aria-label="Conta" className="flex items-center gap-2">
          <Link href="/entrar" className={`${BOTAO_SECUNDARIO} !px-3 !py-2`}>
            Entrar
          </Link>
          <Link href="/cadastro" className={`${BOTAO_PRINCIPAL} !px-3 !py-2`}>
            Criar conta
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[28rem] max-w-4xl rounded-full bg-gradient-to-tr from-indigo-300/40 via-violet-300/30 to-sky-300/30 blur-3xl dark:from-indigo-600/20 dark:via-violet-600/15 dark:to-sky-600/10"
          />
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pt-12 pb-10 text-center sm:pt-20">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              Board ágil para times de até 10 pessoas
            </span>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              Mova os cartões. <span className="text-indigo-600 dark:text-indigo-400">As métricas aparecem sozinhas.</span>
            </h1>
            <p className="max-w-2xl text-lg text-pretty text-zinc-600 dark:text-zinc-400">
              O Shelper grava cada movimentação do board e calcula Lead Time, Cycle Time, Throughput, WIP, Velocity e
              Burndown, sem planilha. Cada pessoa entra com a própria conta, e cada projeto só é visto pelo seu time.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/cadastro" className={`${BOTAO_PRINCIPAL} !px-5 !py-3 text-base`}>
                Começar grátis
              </Link>
              <Link href="/entrar" className={`${BOTAO_SECUNDARIO} !px-5 !py-3 text-base`}>
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* Ilustração do board com os cartões de exemplo. */}
          <div className="mx-auto w-full max-w-6xl px-4 pb-16">
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-3 shadow-xl shadow-indigo-900/5 backdrop-blur sm:p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="mb-3 flex items-center gap-1.5 px-1" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <ol aria-label="Exemplo das 5 colunas do board" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {COLUNAS.map((coluna, i) => (
                  <li key={coluna} className="flex flex-col gap-2 rounded-xl bg-zinc-100/80 p-2.5 text-left dark:bg-zinc-950/60">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{coluna}</span>
                      <span className="text-zinc-500">
                        {i === 2 ? "1/3" : i === 3 ? "1/2" : EXEMPLO[coluna].length}
                      </span>
                    </div>
                    {EXEMPLO[coluna].map((c) => (
                      <div
                        key={c.titulo}
                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <span className={coluna === "Concluído" ? "text-zinc-500 line-through decoration-emerald-500/60" : ""}>
                          {c.titulo}
                        </span>
                        <span className="rounded bg-indigo-50 px-1.5 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                          {c.pontos}
                        </span>
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="titulo-como" className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
            <h2 id="titulo-como" className="sr-only">
              Como funciona
            </h2>
            {PASSOS.map(([titulo, texto], i) => (
              <div key={titulo} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white dark:bg-indigo-500">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{titulo}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="titulo-metricas" className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 id="titulo-metricas" className="text-2xl font-bold tracking-tight sm:text-3xl">
            As métricas que respondem “a Sprint foi bem?”
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Calculadas a partir do histórico de eventos, que não pode ser editado. O gargalo do fluxo fica destacado e os
            dados podem ser exportados em CSV para Excel ou Power BI.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METRICAS.map(([nome, texto]) => (
              <li key={nome} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">{nome}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:justify-between">
          <span>Shelper · Projeto M2 de Métodos Ágeis · Engenharia de Software · UMC</span>
          <span>Feito com Next.js e Supabase</span>
        </div>
      </footer>
    </div>
  );
}
