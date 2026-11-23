"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Modal } from "@/components/modal";
import { CampoNumero } from "@/components/numero";
import { DURACAO_SPRINT_PADRAO, WIP_MAXIMO, WIP_MINIMO } from "@/lib/board/regras";
import { criarProjeto } from "./acoes";
import { CamposCadastro } from "./campos-cadastro";
import { ESTADO_INICIAL } from "./estado";

// Botão "Novo projeto" que abre o cadastro em pop-up (ideia do professor),
// já com os limites de WIP definidos pelo time na criação.
export function NovoProjeto({ destaque = false }: { destaque?: boolean }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={destaque ? BOTAO_PRINCIPAL : BOTAO_SECUNDARIO}>
        <span aria-hidden="true">+</span> Novo projeto
      </button>
      <Modal aberto={aberto} onFechar={() => setAberto(false)} titulo="Novo projeto" largura="max-w-2xl">
        <FormularioProjeto onCancelar={() => setAberto(false)} />
      </Modal>
    </>
  );
}

function FormularioProjeto({ onCancelar }: { onCancelar: () => void }) {
  const [estado, acao, enviando] = useActionState(criarProjeto, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <p className="text-sm text-suave">
        Todos os campos são obrigatórios: são eles que o Shelper usa para calcular as métricas e acompanhar o contrato. Quem cria o
        projeto é o Product Owner (gestor).
      </p>
      <CamposCadastro valores={{ duracao: String(DURACAO_SPRINT_PADRAO), ...estado.valores }} erros={estado.erros} autoFocus />
      <fieldset className="flex flex-col gap-2 border-t border-linha pt-4">
        <legend className="sr-only">Limites de WIP</legend>
        <p className="font-semibold">Limites de WIP</p>
        <p className="text-sm text-suave">
          Quantos cartões cabem ao mesmo tempo em cada coluna. O time pode mudar depois (ou decidir por votação).
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["andamento", "Em andamento", "3"],
              ["revisao", "Em revisão", "2"],
            ] as const
          ).map(([nome, rotulo, padrao]) => (
            <div key={nome} className="flex flex-col gap-1.5">
              <label htmlFor={`projeto-${nome}`} className="text-sm text-suave">
                {rotulo}
              </label>
              <CampoNumero
                id={`projeto-${nome}`}
                name={nome}
                min={WIP_MINIMO}
                max={WIP_MAXIMO}
                padrao={estado.valores?.[nome] ?? padrao}
                invalido={Boolean(estado.erros?.[nome])}
                descritoPor={estado.erros?.[nome] ? `projeto-${nome}-erro` : undefined}
              />
              {estado.erros?.[nome] && (
                <p id={`projeto-${nome}-erro`} className="text-xs text-perigo">
                  {estado.erros[nome]}
                </p>
              )}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className={BOTAO_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
          {enviando ? "Criando…" : "Criar projeto"}
        </button>
      </div>
    </form>
  );
}
