import type React from "react";
import Link from "next/link";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Rodape } from "@/components/rodape";
import { TopoPublico } from "@/components/topo-publico";
import { BoardVivo } from "./board-vivo";
import { DashboardExemplo } from "./dashboard-exemplo";

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

const PERGUNTAS = [
  ["O Shelper é pago?", "Não. É um projeto acadêmico e é gratuito. Basta criar uma conta com nome, e-mail e senha."],
  [
    "Quantas pessoas cabem num projeto?",
    "Até 10, como um time Scrum. Cada pessoa tem um papel: Product Owner, Scrum Master ou Desenvolvedor, e cada papel vê e pode fazer coisas diferentes.",
  ],
  [
    "Como convido o meu time?",
    "O Product Owner abre a aba Time do projeto e gera um link de convite. Quem abrir o link e entrar na conta já cai no projeto, como Desenvolvedor; o PO pode mudar o papel depois. O link tem prazo de validade e pode ser cancelado.",
  ],
  [
    "Posso ter duas Sprints ao mesmo tempo?",
    "Não. Como no Scrum, só existe uma Sprint ativa por vez: para começar a próxima, encerre a atual na aba Sprint. Sprints que já aconteceram antes de usar o Shelper entram por Registrar Sprint anterior, já encerradas.",
  ],
  [
    "Como as métricas são calculadas?",
    "Cada vez que um cartão muda de coluna, o Shelper grava um evento com a hora do servidor. Esse histórico não pode ser editado nem apagado, e é dele que saem Lead Time, Cycle Time, Throughput, WIP, Velocity e Burndown.",
  ],
  [
    "Já uso o Trello. Consigo trazer meu board?",
    "Sim. Exporte o board do Trello e envie o arquivo na aba Projeto. Os cartões entram com pontos, descrição, checklist e o histórico de movimentos, então as métricas já aparecem desde o começo.",
  ],
  [
    "O que é o limite de WIP?",
    "É o número máximo de cartões que podem estar ao mesmo tempo em Em andamento (3) e em Em revisão (2). O board avisa antes de passar do limite, porque muito trabalho começado ao mesmo tempo deixa tudo mais lento.",
  ],
  [
    "Meus dados ficam seguros?",
    "Cada projeto só é visto pelo próprio time: o banco de dados confere isso em cada consulta (RLS). A senha é guardada com hash, nunca em texto, e o login bloqueia o e-mail por 15 minutos depois de 5 tentativas erradas.",
  ],
  [
    "Funciona no celular?",
    "Sim. No celular as colunas do board passam de lado e os cartões têm os botões Avançar e Voltar, sem precisar arrastar.",
  ],
  [
    "Posso levar os dados para o Excel ou o Power BI?",
    "Sim. As métricas e os cartões podem ser exportados em CSV, que abre no Excel, no Google Planilhas e no Power BI.",
  ],
] as const;

const PASSOS = [
  ["Crie o projeto", "Ele já nasce com as 5 colunas do fluxo e limites de WIP de 3 e 2."],
  ["Mova os cartões", "Arrastando ou com os botões Avançar e Voltar. Cada movimento vira um evento com hora do servidor."],
  ["Veja as métricas", "O histórico de eventos alimenta o dashboard: ninguém anota datas à mão."],
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <TopoPublico />

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pt-12 pb-10 text-center sm:pt-20">
            <span
              className="entrada rounded-full border border-linha-forte px-3 py-1 text-xs font-medium text-suave"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              Board ágil para times de até 10 pessoas
            </span>
            <h1
              style={{ "--i": 1 } as React.CSSProperties}
              className="entrada max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl"
            >
              Mova os cartões. As métricas aparecem sozinhas.
            </h1>
            <p style={{ "--i": 2 } as React.CSSProperties} className="entrada max-w-2xl text-lg text-pretty text-suave">
              O Shelper grava cada movimentação do board e calcula Lead Time, Cycle Time, Throughput, WIP, Velocity e Burndown, sem
              planilha. Cada pessoa entra com a própria conta, e cada projeto só é visto pelo seu time.
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

        <section id="como-funciona" aria-labelledby="titulo-como" className="scroll-mt-6 border-y border-linha bg-fundo">
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

        <section id="metricas" aria-labelledby="titulo-metricas" className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 py-16">
          <h2 id="titulo-metricas" className="text-2xl font-bold tracking-tight sm:text-3xl">
            As métricas que respondem “a Sprint foi bem?”
          </h2>
          <p className="mt-2 max-w-2xl text-suave">
            Calculadas a partir do histórico de eventos, que não pode ser editado. O gargalo do fluxo fica destacado e os dados podem ser
            exportados em CSV para Excel ou Power BI.
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

        <section id="dashboard" aria-labelledby="titulo-dashboard" className="scroll-mt-6 border-t border-linha bg-fundo">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16">
            <div>
              <h2 id="titulo-dashboard" className="text-2xl font-bold tracking-tight sm:text-3xl">
                O dashboard de uma Sprint
              </h2>
              <p className="mt-2 max-w-2xl text-suave">
                Exemplo com dados fictícios: uma Sprint de 8 dias com 10 cartões e 34 pontos. É a mesma aba Métricas que o seu time vê no
                projeto. Passe o mouse nos gráficos para ver os números de cada dia.
              </p>
            </div>
            <DashboardExemplo />
          </div>
        </section>

        <section id="perguntas" aria-labelledby="titulo-perguntas" className="mx-auto w-full max-w-3xl scroll-mt-6 px-4 py-16">
          <h2 id="titulo-perguntas" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Perguntas frequentes
          </h2>
          <div className="mt-6 flex flex-col divide-y divide-linha rounded-2xl border border-linha bg-cartao">
            {PERGUNTAS.map(([pergunta, resposta]) => (
              <details key={pergunta} className="group px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium marker:hidden focus-visible:outline-2 focus-visible:outline-laranja [&::-webkit-details-marker]:hidden">
                  {pergunta}
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="size-4 shrink-0 text-suave transition-transform duration-200 ease-suave group-open:rotate-45"
                  >
                    <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="surgir pb-5 text-sm text-pretty text-suave">{resposta}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-suave">
            Não achou sua dúvida?{" "}
            <Link href="/contato" className="font-medium text-laranja underline underline-offset-4">
              Fale com a gente
            </Link>
            .
          </p>
        </section>
      </main>

      <Rodape />
    </div>
  );
}
