import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import { listarProjetos, type ResumoProjeto } from "@/lib/board/dados";
import { COLUNAS } from "@/lib/colunas";
import { SIGLA_DA_FUNCAO } from "@/lib/board/papeis";
import { NomeDoProjeto, TransicaoPagina } from "@/components/transicao-pagina";
import { NovoProjeto } from "./formulario-projeto";
import { LinkDoProjeto } from "./projeto-aberto";

export const metadata: Metadata = { title: "Meus projetos · Shelper" };

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" });
const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });

// Tons da mini barra do fluxo: neutros, com laranja só em "Em andamento" e verde em "Concluído",
// iguais aos pontos das colunas no board.
const TOM = ["bg-fraco/60", "bg-suave/60", "bg-laranja", "bg-texto/60", "bg-bom"];

function CartaoProjeto({ p }: { p: ResumoProjeto }) {
  const porcentagem = p.pontosTotais ? Math.round((p.pontosFeitos / p.pontosTotais) * 100) : 0;
  return (
    <LinkDoProjeto
      id={p.id}
      nome={p.nome}
      className="group flex h-full flex-col gap-4 rounded-2xl border border-linha bg-painel p-5 transition duration-200 ease-suave hover:-translate-y-1 hover:border-linha-forte hover:bg-cartao hover:shadow-[0_20px_40px_-20px_rgb(0_0_0/0.9),0_0_0_1px_color-mix(in_srgb,var(--color-laranja)_25%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laranja active:translate-y-0 active:scale-[0.985] active:duration-75"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <NomeDoProjeto id={p.id}>
            <span className="truncate font-semibold transition-colors group-hover:text-laranja-claro">{p.nome}</span>
          </NomeDoProjeto>
          <span className="text-xs text-suave">
            {p.sprintAtiva ? `Sprint ${p.sprintAtiva.numero} até ${DIA.format(new Date(`${p.sprintAtiva.fim}T00:00:00Z`))}` : "Sem Sprint ativa"}
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-linha px-2 py-0.5 text-xs text-suave">
          {SIGLA_DA_FUNCAO[p.funcao]}
        </span>
      </div>

      {/* Quantos cartões há em cada coluna, na ordem do fluxo. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-elevado" aria-hidden="true">
          {p.cartoes > 0 &&
            p.porColuna.map((n, i) =>
              n > 0 ? <span key={COLUNAS[i]} className={TOM[i]} style={{ flexGrow: n }} title={`${COLUNAS[i]}: ${n}`} /> : null,
            )}
        </div>
        <p className="sr-only">
          {COLUNAS.map((c, i) => `${c}: ${p.porColuna[i]}`).join(", ")}
        </p>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-suave">Cartões</dt>
          <dd className="font-semibold tabular-nums">{p.cartoes}</dd>
        </div>
        <div>
          <dt className="text-xs text-suave">Pontos feitos</dt>
          <dd className="font-semibold tabular-nums">
            {p.pontosFeitos}/{p.pontosTotais}
            <span className="ml-1 text-xs font-normal text-suave">{porcentagem}%</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-suave">Time</dt>
          <dd className="font-semibold tabular-nums">
            {p.membros} {p.membros === 1 ? "pessoa" : "pessoas"}
          </dd>
        </div>
      </dl>
      <span className="text-xs text-fraco">Criado em {DATA.format(new Date(p.criadoEm))}</span>
    </LinkDoProjeto>
  );
}

async function ListaDeProjetos() {
  const usuario = await exigirUsuario();
  const projetos = await listarProjetos(usuario.id);

  if (projetos.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-linha-forte p-8">
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Olá, {usuario.nome.split(" ")[0]}. Comece criando um projeto em “Novo projeto”.</p>
          <p className="text-sm text-suave">
            Ele já vem com as 5 colunas do fluxo. Depois é só convidar o time pelo link na aba Time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projetos.map((p) => (
        <li key={p.id}>
          <CartaoProjeto p={p} />
        </li>
      ))}
    </ul>
  );
}

// Esqueleto no formato dos cartões enquanto a lista chega.
function CarregandoProjetos() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <li className="sr-only">Carregando projetos…</li>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex h-52 flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
          <div className="esqueleto h-5 w-2/3 rounded-md" />
          <div className="esqueleto h-3 w-1/3 rounded-md" />
          <div className="esqueleto h-1.5 w-full rounded-full" />
          <div className="mt-auto grid grid-cols-3 gap-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="esqueleto h-9 rounded-md" />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PaginaPainel() {
  return (
    <TransicaoPagina>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meus projetos</h1>
            <p className="text-sm text-suave">Escolha um projeto para abrir o board.</p>
          </div>
          <NovoProjeto destaque />
        </div>
        <Suspense fallback={<CarregandoProjetos />}>
          <ListaDeProjetos />
        </Suspense>
      </main>
    </TransicaoPagina>
  );
}
