import type React from "react";
import Link from "next/link";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Logo } from "@/components/logo";
import { BoardVivo } from "./board-vivo";

// Página inicial pública (rota "/"): explica o Shelper e leva ao cadastro.
// Ao abrir, selo, título, texto, botões e prévia entram em sequência, uma vez só (classe "entrada").

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
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pt-12 pb-10 text-center sm:pt-20">
            <span className="entrada rounded-full border border-linha-forte px-3 py-1 text-xs font-medium text-suave" style={{ "--i": 0 } as React.CSSProperties}>
              Board ágil para times de até 10 pessoas
            </span>
            <h1 style={{ "--i": 1 } as React.CSSProperties} className="entrada max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              Mova os cartões. As métricas aparecem sozinhas.
            </h1>
            <p style={{ "--i": 2 } as React.CSSProperties} className="entrada max-w-2xl text-lg text-pretty text-suave">
              O Shelper grava cada movimentação do board e calcula Lead Time, Cycle Time, Throughput, WIP, Velocity e
              Burndown, sem planilha. Cada pessoa entra com a própria conta, e cada projeto só é visto pelo seu time.
            </p>
            <div style={{ "--i": 3 } as React.CSSProperties} className="entrada flex flex-wrap justify-center gap-3">
              <Link href="/cadastro" className={`${BOTAO_PRINCIPAL} !px-5 !py-3 text-base`}>
                Começar grátis
              </Link>
              <Link href="/entrar" className={`${BOTAO_SECUNDARIO} !px-5 !py-3 text-base`}>
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* Prévia do board: um cartão anda sozinho pelas colunas. */}
          <div className="entrada mx-auto w-full max-w-6xl px-4 pb-16" style={{ "--i": 5 } as React.CSSProperties}>
            <BoardVivo />
          </div>
        </section>

        <section aria-labelledby="titulo-como" className="border-y border-linha bg-fundo">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
            <h2 id="titulo-como" className="sr-only">
              Como funciona
            </h2>
            {PASSOS.map(([titulo, texto], i) => (
              <div key={titulo} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-linha-forte text-sm font-semibold text-texto">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{titulo}</h3>
                  <p className="text-sm text-suave">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="titulo-metricas" className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 id="titulo-metricas" className="text-2xl font-bold tracking-tight sm:text-3xl">
            As métricas que respondem “a Sprint foi bem?”
          </h2>
          <p className="mt-2 max-w-2xl text-suave">
            Calculadas a partir do histórico de eventos, que não pode ser editado. O gargalo do fluxo fica destacado e os
            dados podem ser exportados em CSV para Excel ou Power BI.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METRICAS.map(([nome, texto]) => (
              <li key={nome} className="rounded-xl border border-linha bg-cartao p-5">
                <h3 className="font-semibold">{nome}</h3>
                <p className="mt-1 text-sm text-suave">{texto}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-linha">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-suave sm:flex-row sm:justify-between">
          <span>Shelper · Projeto M2 de Métodos Ágeis · Engenharia de Software · UMC</span>
          <span>Feito com Next.js e Supabase</span>
        </div>
      </footer>
    </div>
  );
}
