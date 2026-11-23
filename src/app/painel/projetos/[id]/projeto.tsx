"use client";

import { useActionState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import type { DadosBoard, Metas } from "@/lib/board/dados";
import { CamposCadastro } from "../../campos-cadastro";
import { editarProjeto } from "../../acoes";
import { ESTADO_INICIAL } from "../../estado";
import { ConfiguracaoWip } from "./configuracao-wip";

type Projeto = DadosBoard["projeto"];

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const data = (d: string | null) => (d ? DIA.format(new Date(`${d}T00:00:00Z`)) : "não informado");
const num = (n: number | null, sufixo: string) => (n === null ? "não informado" : `${n.toLocaleString("pt-BR")} ${sufixo}`);

// Aba Projeto: o cadastro (como um contrato) e os limites de WIP.
// O PO edita o cadastro; o SM só vê. Os dois alteram o WIP.
export function AbaProjeto({ projeto, metas, podeEditar }: { projeto: Projeto; metas: Metas; podeEditar: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {podeEditar ? <EditarCadastro projeto={projeto} metas={metas} /> : <Resumo projeto={projeto} metas={metas} />}
      <div className="flex flex-col gap-6">
        <ConfiguracaoWip projetoId={projeto.id} andamento={projeto.wipAndamento} revisao={projeto.wipRevisao} />
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
        <Aviso tipo="erro">Este projeto foi criado antes do cadastro completo. Preencha os campos que faltam para as métricas usarem as metas.</Aviso>
      )}
      <form key={estado.versao ?? 0} action={acao} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="projeto" value={projeto.id} />
        <CamposCadastro valores={{ ...atuais, ...(estado.erros || estado.mensagem ? estado.valores : {}) }} erros={estado.erros} />
        {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <div className="flex justify-end">
          <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
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
