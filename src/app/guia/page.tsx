import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Rodape } from "@/components/rodape";
import { TopoPublico } from "@/components/topo-publico";

export const metadata: Metadata = {
  title: "Guia do Shelper",
  description: "Passo a passo para usar o Shelper do jeito certo: do cadastro à Review da Sprint, com o que cada papel faz.",
};

// Guia de uso, na ordem do ciclo de um projeto Scrum. Cada passo diz quem faz.
// Mantenha em dia com as regras do site (papeis.ts e as funções do banco).

type Papel = "PO" | "SM" | "Dev" | "Todos";

const PASSOS: { id: string; titulo: string; quem: Papel[] }[] = [
  { id: "conta", titulo: "Crie a sua conta", quem: ["Todos"] },
  { id: "projeto", titulo: "Crie o projeto", quem: ["PO"] },
  { id: "time", titulo: "Convide o time", quem: ["PO"] },
  { id: "backlog", titulo: "Monte o Backlog", quem: ["PO"] },
  { id: "pontos", titulo: "Estime com o Planning Poker", quem: ["Todos"] },
  { id: "sprint", titulo: "Planeje a Sprint", quem: ["PO", "SM"] },
  { id: "board", titulo: "Trabalhe no board", quem: ["Todos"] },
  { id: "metricas", titulo: "Acompanhe as métricas", quem: ["Todos"] },
  { id: "encerrar", titulo: "Encerre a Sprint e faça a Review", quem: ["PO", "SM"] },
  { id: "dados", titulo: "Exporte, importe e conecte uma IA", quem: ["PO", "SM"] },
];

const PAPEIS: [string, string, string][] = [
  [
    "Product Owner (PO)",
    "Dono do projeto",
    "Cria o projeto e o cadastro, convida e organiza o time, cria e prioriza os cartões do Backlog. Pode tudo o que os outros podem.",
  ],
  [
    "Scrum Master (SM)",
    "Facilita o processo",
    "Planeja, monta e encerra a Sprint, conduz as votações, ajusta os limites de WIP e acompanha as métricas do time e o histórico.",
  ],
  [
    "Desenvolvedor (Dev)",
    "Faz a entrega",
    "Pega cartões, move pelo board, cuida do checklist e da descrição, bloqueia o que travou, vota e vê as próprias métricas.",
  ],
];

const ERROS: [string, string][] = [
  [
    "Criar o cartão direto em Em andamento ou Concluído.",
    "Todo cartão nasce no Backlog. Se ele pular colunas, o Lead Time e o Cycle Time ficam errados, porque saem dos movimentos.",
  ],
  [
    "Mover os cartões só no fim do dia ou da semana.",
    "Mova na hora em que o trabalho muda. O Shelper grava a hora de cada movimento; mover atrasado distorce todas as métricas.",
  ],
  [
    "Criar a Sprint nova sem encerrar a anterior.",
    "Só existe uma Sprint ativa por vez. Encerre a atual na aba Sprint; os cartões não concluídos continuam no board.",
  ],
  [
    "Usar Nova Sprint para uma Sprint que já passou.",
    "Para registrar uma Sprint feita antes de usar o Shelper, use Registrar Sprint anterior: ela entra já encerrada.",
  ],
  [
    "Voltar o cartão de coluna quando ele trava.",
    "Marque como bloqueado e escreva o motivo. Ele continua onde está e aparece em vermelho para o PO e o SM.",
  ],
  [
    "Passar do limite de WIP sem conversar.",
    "O limite existe para o time terminar antes de começar coisa nova. Se precisar passar, combine com o time ou mude o limite por votação.",
  ],
];

function Quem({ papeis }: { papeis: Papel[] }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-suave">
      Quem faz:
      {papeis.map((p) => (
        <span key={p} className="rounded-full border border-linha bg-elevado px-2 py-0.5 font-medium text-texto">
          {p === "Todos" ? "todo o time" : p}
        </span>
      ))}
    </p>
  );
}

function Passo({ n, children }: { n: number; children: ReactNode }) {
  const passo = PASSOS[n - 1];
  return (
    <section id={passo.id} aria-labelledby={`t-${passo.id}`} className="grid scroll-mt-6 gap-x-5 gap-y-3 sm:grid-cols-[2.5rem_1fr]">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full border border-laranja/50 font-semibold text-laranja-claro tabular-nums"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`t-${passo.id}`} className="text-xl font-semibold">
            <span className="sr-only">Passo {n}: </span>
            {passo.titulo}
          </h2>
          <Quem papeis={passo.quem} />
        </div>
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-suave [&_strong]:font-medium [&_strong]:text-texto [&_a]:text-laranja-claro [&_a]:underline-offset-4 [&_a:hover]:underline">
          {children}
        </div>
      </div>
    </section>
  );
}

function Lista({ itens }: { itens: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-linha-forte">
      {itens.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Dica({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-linha bg-cartao px-4 py-3 text-texto">{children}</p>;
}

export default function PaginaGuia() {
  return (
    <div className="flex flex-1 flex-col">
      <TopoPublico />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-4 py-12 text-pretty">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Guia do Shelper</h1>
          <p className="text-suave">
            O passo a passo de um projeto no Shelper, na ordem em que as coisas acontecem: do cadastro à Review da Sprint. Seguindo a ordem,
            as métricas saem certas sozinhas, porque o Shelper calcula tudo a partir dos movimentos dos cartões.
          </p>
        </div>

        <nav aria-label="Passos do guia" className="rounded-2xl border border-linha bg-painel p-5">
          <h2 className="mb-3 text-sm font-semibold">Neste guia</h2>
          <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {PASSOS.map((p, i) => (
              <li key={p.id}>
                <a href={`#${p.id}`} className="text-suave transition-colors hover:text-texto">
                  <span className="mr-2 text-laranja-claro tabular-nums">{i + 1}.</span>
                  {p.titulo}
                </a>
              </li>
            ))}
            <li>
              <a href="#erros" className="text-suave transition-colors hover:text-texto">
                <span className="mr-2 text-laranja-claro">!</span>
                Erros comuns
              </a>
            </li>
          </ol>
        </nav>

        <section aria-labelledby="t-papeis" className="flex flex-col gap-4">
          <h2 id="t-papeis" className="text-xl font-semibold">
            Antes de começar: os três papéis
          </h2>
          <p className="text-sm text-suave">
            Cada pessoa do time tem um papel, como no Scrum. O site mostra a cada um só o que ele pode usar, e o banco confere de novo a
            cada ação.
          </p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {PAPEIS.map(([nome, resumo, texto]) => (
              <li key={nome} className="flex flex-col gap-1 rounded-xl border border-linha bg-cartao p-4 text-sm">
                <strong className="font-semibold">{nome}</strong>
                <span className="text-xs text-laranja-claro">{resumo}</span>
                <span className="text-suave">{texto}</span>
              </li>
            ))}
          </ul>
        </section>

        <Passo n={1}>
          <p>
            Em <Link href="/cadastro">Criar conta</Link>, informe nome, e-mail e uma senha forte: pelo menos 8 caracteres, com uma letra
            maiúscula, um número e um caractere especial. A tela mostra cada regra sendo cumprida enquanto você digita.
          </p>
          <Lista
            itens={[
              <>Depois de 5 senhas erradas seguidas, o login daquele e-mail fica bloqueado por 15 minutos, para proteger a conta.</>,
              <>
                Esqueceu a senha? Use <Link href="/esqueci-senha">Esqueci minha senha</Link>: chega um link no e-mail para criar outra.
              </>,
              <>
                Em <strong>Meu perfil</strong> (clique no seu nome, no topo), você muda nome e foto, troca a senha e pode{" "}
                <strong>sair de todos os aparelhos</strong> de uma vez.
              </>,
            ]}
          />
        </Passo>

        <Passo n={2}>
          <p>
            No painel, clique em <strong>Novo projeto</strong> e preencha o cadastro completo, como um contrato com o cliente:
          </p>
          <Lista
            itens={[
              <>Nome, cliente e objetivo do projeto.</>,
              <>Horas contratadas: o Shelper compara com as horas estimadas dos cartões concluídos.</>,
              <>Data de início, data de entrega e duração de cada Sprint (o fim da Sprint nova já vem calculado com ela).</>,
              <>Limites de WIP de Em andamento e Em revisão.</>,
              <>Metas de Lead Time, Cycle Time e Velocity: as métricas ficam verdes ou vermelhas conforme elas.</>,
            ]}
          />
          <p>
            Quem cria o projeto vira o PO. O cadastro pode ser revisto depois na aba <strong>Projeto</strong>.
          </p>
        </Passo>

        <Passo n={3}>
          <p>
            Na aba <strong>Time</strong>, clique em <strong>Gerar link</strong> e mande para o time. Quem abrir o link e entrar na conta já
            cai no projeto como Desenvolvedor.
          </p>
          <Lista
            itens={[
              <>Depois, troque o papel de quem vai ser Scrum Master. Um projeto tem um PO; o PO pode passar o papel para outra pessoa.</>,
              <>O link tem prazo de validade. Gerar um link novo cancela o anterior.</>,
              <>Quem sai do time perde o acesso na hora, inclusive pelas chaves de IA.</>,
            ]}
          />
        </Passo>

        <Passo n={4}>
          <p>
            No Board, o PO cria os cartões com <strong>Novo cartão</strong>, sempre na coluna <strong>Backlog</strong>. O Backlog é a lista
            de tudo o que o produto precisa, em ordem de prioridade.
          </p>
          <Lista
            itens={[
              <>
                Título com um código e o nome da história, por exemplo <strong>H12 - Exportar CSV</strong>. Tarefas técnicas podem usar T1,
                T2…
              </>,
              <>
                Na descrição, a história de usuário: <em>Como [papel], quero [ação], para [benefício]</em>.
              </>,
              <>No checklist, os critérios de aceite: o cartão só está pronto quando todos estiverem marcados.</>,
              <>Pontos na escala de Fibonacci (1, 2, 3, 5, 8, 13…) e horas estimadas, que alimentam o alerta de gargalo.</>,
            ]}
          />
          <Dica>Já tem um board no Trello ou numa planilha? Traga tudo pela aba Projeto, em Importar board (passo 10).</Dica>
        </Passo>

        <Passo n={5}>
          <p>
            Na aba <strong>Votação</strong>, o PO ou o SM abre uma votação de <strong>pontos</strong> para um cartão. Cada pessoa vota sem
            ver o voto dos outros; quando todos votarem, quem abriu revela os votos.
          </p>
          <Lista
            itens={[
              <>Se os votos ficarem muito diferentes, o time conversa e faz uma nova rodada.</>,
              <>No fim, o PO ou o SM aplica o valor combinado no cartão.</>,
              <>A mesma tela vota o limite de WIP de uma coluna, quando o time quiser mudar.</>,
            ]}
          />
        </Passo>

        <Passo n={6}>
          <p>
            Na aba <strong>Sprint</strong>, em <strong>Nova Sprint</strong>, informe o início, o fim e a Meta da Sprint (o que o time quer
            entregar, em uma frase). Depois marque os cartões do Backlog que entram nela e clique em <strong>Criar Sprint</strong>.
          </p>
          <Lista
            itens={[
              <>
                <strong>A Sprint nasce do Backlog:</strong> só cartões do Backlog podem entrar, e eles vão para A fazer. Por isso o passo 4
                vem antes.
              </>,
              <>
                <strong>Uma Sprint ativa por vez:</strong> ela vale até ser encerrada, mesmo depois da data de fim. A próxima só pode ser
                criada depois disso.
              </>,
              <>Com a Sprint em andamento, ainda dá para trazer mais cartões do Backlog e ajustar as datas e a Meta.</>,
              <>
                Projeto que já tinha Sprints antes do Shelper? Use <strong>Registrar Sprint anterior</strong>: ela entra já encerrada, com
                os cartões concluídos naquelas datas.
              </>,
            ]}
          />
        </Passo>

        <Passo n={7}>
          <p>
            O fluxo é sempre <strong>Backlog → A fazer → Em andamento → Em revisão → Concluído</strong>. Arraste o cartão ou use as setas
            dele; cada movimento é gravado com a hora do servidor e não pode ser editado nem apagado.
          </p>
          <Lista
            itens={[
              <>
                Abra o cartão e clique em <strong>Pegar este cartão</strong> antes de começar: ele fica no seu nome e entra nas suas
                métricas.
              </>,
              <>Marque o checklist conforme os critérios forem cumpridos.</>,
              <>Se a coluna estiver no limite de WIP, o Shelper pergunta antes de passar. O certo é terminar algo antes de puxar mais.</>,
              <>
                Travou? Marque como <strong>bloqueado</strong> e escreva o motivo. O responsável, o PO e o SM podem bloquear e desbloquear.
              </>,
              <>
                Se o cartão passar das horas estimadas em Em andamento ou Em revisão, ele vira <strong>gargalo</strong> e aparece em
                destaque para o PO e o SM.
              </>,
              <>Atalhos: as teclas 1 a 8 trocam de aba dentro do projeto.</>,
            ]}
          />
        </Passo>

        <Passo n={8}>
          <p>
            A aba <strong>Métricas</strong> (PO e SM) mostra o time todo, com filtro por Sprint e por pessoa. O Dev vê a aba{" "}
            <strong>Minhas métricas</strong>, só com os cartões em que ele é responsável.
          </p>
          <Lista
            itens={[
              <>
                <strong>Lead Time:</strong> da criação do cartão até ele ser concluído, em dias.
              </>,
              <>
                <strong>Cycle Time:</strong> da entrada em Em andamento até a conclusão, em horas.
              </>,
              <>
                <strong>Throughput:</strong> quantos cartões foram concluídos no período.
              </>,
              <>
                <strong>Velocity:</strong> quantos pontos foram concluídos na Sprint.
              </>,
              <>
                <strong>Burndown, WIP por dia e gargalo:</strong> mostram se a Sprint vai fechar no prazo e em qual coluna o trabalho
                empaca.
              </>,
            ]}
          />
          <p>
            A aba <strong>Histórico</strong> (PO e SM) lista todos os movimentos, com filtros por Sprint, pessoa, cartão e movimentos acima
            do WIP.
          </p>
        </Passo>

        <Passo n={9}>
          <p>
            No fim da Sprint, abra o <strong>Relatório em PDF</strong> na aba Sprint: Meta, pontos planejados e entregues, Burndown e os
            cartões. Ele serve de roteiro para a Sprint Review.
          </p>
          <Lista
            itens={[
              <>
                Depois da Review, clique em <strong>Encerrar Sprint</strong>. Os cartões não concluídos continuam no board e podem entrar na
                próxima.
              </>,
              <>Na Retrospectiva, use as métricas e o histórico para decidir o que melhorar, como mudar um limite de WIP por votação.</>,
              <>Volte ao passo 4: o PO reprioriza o Backlog e o time planeja a próxima Sprint.</>,
            ]}
          />
        </Passo>

        <Passo n={10}>
          <p>
            Na aba <strong>Projeto</strong> ficam as ferramentas para levar os dados para fora e trazer de dentro:
          </p>
          <Lista
            itens={[
              <>
                <strong>Exportar:</strong> cartões e movimentos em CSV (Excel, Power BI), o projeto completo em JSON, ou um CSV básico para
                levar ao Jira ou ao Trello.
              </>,
              <>
                <strong>Importar board:</strong> JSON do Trello, CSV ou um JSON exportado pelo próprio Shelper.
              </>,
              <>
                <strong>Conectar com IA:</strong> gere uma chave e ligue o Shelper ao Claude, ao Cursor ou a outro programa. O passo a passo
                está em <Link href="/api">API e MCP</Link>.
              </>,
            ]}
          />
        </Passo>

        <section id="erros" aria-labelledby="t-erros" className="flex scroll-mt-6 flex-col gap-4">
          <h2 id="t-erros" className="text-xl font-semibold">
            Erros comuns e como evitar
          </h2>
          <dl className="divide-y divide-linha rounded-2xl border border-linha bg-painel text-sm">
            {ERROS.map(([erro, certo]) => (
              <div key={erro} className="flex flex-col gap-1 px-5 py-3.5">
                <dt className="font-medium">{erro}</dt>
                <dd className="text-suave">{certo}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-suave [&_a]:text-laranja-claro [&_a]:underline-offset-4 [&_a:hover]:underline">
            Ficou alguma dúvida? Veja as <Link href="/#perguntas">perguntas frequentes</Link> ou{" "}
            <Link href="/contato">fale com a gente</Link>.
          </p>
        </section>
      </main>
      <Rodape />
    </div>
  );
}
