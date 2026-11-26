"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import type { ChaveApi, DadosBoard, Metas } from "@/lib/board/dados";
import { CamposCadastro } from "../../campos-cadastro";
import { editarProjeto } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";
import { ConfiguracaoWip } from "./configuracao-wip";
import { ConectarIa } from "./conectar-ia";
import { ExportarProjeto } from "./exportar";
import { ImportarBoard } from "./importar-board";

type Projeto = DadosBoard["projeto"];

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const data = (d: string | null) => (d ? DIA.format(new Date(`${d}T00:00:00Z`)) : "não informado");
const num = (n: number | null, sufixo: string) => (n === null ? "não informado" : `${n.toLocaleString("pt-BR")} ${sufixo}`);

// Aba Projeto: o cadastro (como um contrato) e os limites de WIP.
// O PO edita o cadastro; o SM só vê. Os dois alteram o WIP.
type Horas = { usadas: number; planejadas: number; semEstimativa: number };

export function AbaProjeto({
  projeto,
  metas,
  podeEditar,
  horas,
  chaves,
}: {
  projeto: Projeto;
  metas: Metas;
  podeEditar: boolean;
  horas: Horas;
  chaves: ChaveApi[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {podeEditar ? <EditarCadastro projeto={projeto} metas={metas} /> : <Resumo projeto={projeto} metas={metas} />}
      <div className="flex flex-col gap-6">
        <HorasDoContrato contratadas={projeto.horasContratadas} horas={horas} />
        <ConfiguracaoWip projetoId={projeto.id} andamento={projeto.wipAndamento} revisao={projeto.wipRevisao} />
      </div>
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        <ConectarIa projetoId={projeto.id} chaves={chaves} />
        <ExportarProjeto projetoId={projeto.id} />
        {podeEditar && <ImportarBoard projetoId={projeto.id} />}
      </div>
    </div>
  );
}

function EditarCadastro({ projeto, metas }: { projeto: Projeto; metas: Metas }) {
  const [estado, acao, enviando] = useActionState(editarProjeto, ESTADO_INICIAL);
  const atuais = {
    nome: projeto.nome,
    cliente: projeto.cliente ?? "",
    objetivo: projeto.objetivo ?? "",
    horas: projeto.horasContratadas?.toString() ?? "",
    inicio: projeto.dataInicio ?? "",
    entrega: projeto.dataEntrega ?? "",
    duracao: projeto.duracaoSprint?.toString() ?? "14",
    lead: metas.leadDias?.toString().replace(".", ",") ?? "",
    cycle: metas.cycleHoras?.toString().replace(".", ",") ?? "",
    velocity: metas.velocity?.toString() ?? "",
  };

  return (
    <section aria-labelledby="titulo-cadastro" className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id="titulo-cadastro" className="font-semibold">
          Cadastro do projeto
        </h2>
        <p className="text-sm text-suave">Todos os campos são obrigatórios. Só o Product Owner altera.</p>
      </div>
      {!projeto.cadastroCompleto && (
        <Aviso tipo="erro">
          Este projeto foi criado antes do cadastro completo. Preencha os campos que faltam para as métricas usarem as metas.
        </Aviso>
      )}
      <form key={estado.versao ?? 0} action={acao} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="projeto" value={projeto.id} />
        <CamposCadastro valores={{ ...atuais, ...(estado.erros || estado.mensagem ? estado.valores : {}) }} erros={estado.erros} />
        {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <div className="flex justify-end">
          <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? "Salvando…" : "Salvar cadastro"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Resumo({ projeto, metas }: { projeto: Projeto; metas: Metas }) {
  const linhas: [string, string][] = [
    ["Cliente", projeto.cliente ?? "não informado"],
    ["Objetivo", projeto.objetivo ?? "não informado"],
    ["Horas contratadas", num(projeto.horasContratadas, "h")],
    ["Prazo", `${data(projeto.dataInicio)} a ${data(projeto.dataEntrega)}`],
    ["Duração da Sprint", num(projeto.duracaoSprint, "dias")],
    ["Meta de Lead Time", num(metas.leadDias, "dias")],
    ["Meta de Cycle Time", num(metas.cycleHoras, "h")],
    ["Meta de Velocity", num(metas.velocity, "pontos")],
  ];
  return (
    <section aria-labelledby="titulo-cadastro" className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id="titulo-cadastro" className="font-semibold">
          Cadastro do projeto
        </h2>
        <p className="text-sm text-suave">Só o Product Owner altera o cadastro.</p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="text-xs text-suave">{rotulo}</dt>
            <dd className="text-sm">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const h = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;

// Horas do contrato: as estimadas dos cartões concluídos contam como usadas.
function HorasDoContrato({ contratadas, horas }: { contratadas: number | null; horas: Horas }) {
  const usadasPct = contratadas ? Math.min(100, Math.round((horas.usadas / contratadas) * 100)) : 0;
  const planejadasPct = contratadas ? Math.min(100, Math.round((horas.planejadas / contratadas) * 100)) : 0;
  const estourou = contratadas !== null && horas.planejadas > contratadas;
  return (
    <section aria-labelledby="titulo-horas" className="flex flex-col gap-3 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id="titulo-horas" className="font-semibold">
          Horas do contrato
        </h2>
        <p className="text-sm text-suave">As horas estimadas dos cartões concluídos contam como usadas.</p>
      </div>
      {contratadas ? (
        <>
          <p className="text-2xl font-semibold tabular-nums">
            {h(horas.usadas)}{" "}
            <span className="text-base font-normal text-suave">
              de {h(contratadas)} usadas ({usadasPct}%)
            </span>
          </p>
          {/* Duas camadas: planejado (todos os cartões) e, por cima, o usado (concluídos). */}
          <div
            className="relative h-2 overflow-hidden rounded-full bg-elevado"
            role="progressbar"
            aria-label="Horas usadas do contrato"
            aria-valuenow={usadasPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-linha-forte" style={{ width: `${planejadasPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-laranja" style={{ width: `${usadasPct}%` }} />
          </div>
          <p className={`text-sm ${estourou ? "text-perigo" : "text-suave"}`}>
            {h(horas.planejadas)} planejadas em cartões
            {estourou ? ", acima do contratado." : "."}
            {horas.semEstimativa > 0 &&
              ` ${horas.semEstimativa} ${horas.semEstimativa === 1 ? "cartão está" : "cartões estão"} sem estimativa.`}
          </p>
        </>
      ) : (
        <p className="text-sm text-suave">Informe as horas contratadas no cadastro para acompanhar o contrato.</p>
      )}
    </section>
  );
}
