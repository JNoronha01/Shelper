"use client";

import { useActionState, useState } from "react";
import { Aviso, Campo } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Modal } from "@/components/modal";
import { NOME_PROJETO_MAXIMO, WIP_MAXIMO, WIP_MINIMO } from "@/lib/board/regras";
import { criarProjeto } from "./acoes";
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
      <Modal aberto={aberto} onFechar={() => setAberto(false)} titulo="Novo projeto">
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
      <Campo
        name="nome"
        rotulo="Nome do projeto"
        placeholder="Ex.: Shelper – Sprint 2"
        required
        autoFocus
        maxLength={NOME_PROJETO_MAXIMO}
        defaultValue={estado.valores?.nome}
        erro={estado.erros?.nome}
        dica="Vem com Backlog, A fazer, Em andamento, Em revisão e Concluído."
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Limites de WIP</legend>
        <p className="text-sm text-zinc-500">
          Quantos cartões cabem ao mesmo tempo em cada coluna. O time pode mudar depois (ou decidir por votação).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Campo
            name="andamento"
            rotulo="Em andamento"
            type="number"
            min={WIP_MINIMO}
            max={WIP_MAXIMO}
            required
            defaultValue={estado.valores?.andamento ?? "3"}
            erro={estado.erros?.andamento}
          />
          <Campo
            name="revisao"
            rotulo="Em revisão"
            type="number"
            min={WIP_MINIMO}
            max={WIP_MAXIMO}
            required
            defaultValue={estado.valores?.revisao ?? "2"}
            erro={estado.erros?.revisao}
          />
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
