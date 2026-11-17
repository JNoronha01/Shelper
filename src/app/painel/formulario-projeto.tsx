"use client";

import { useActionState } from "react";
import { Aviso, Campo } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import { NOME_PROJETO_MAXIMO } from "@/lib/board/regras";
import { criarProjeto } from "./acoes";
import { ESTADO_INICIAL } from "./estado";

export function FormularioProjeto() {
  const [estado, acao, enviando] = useActionState(criarProjeto, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-3" noValidate>
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo
        name="nome"
        rotulo="Nome do projeto"
        placeholder="Ex.: Shelper – Sprint 1"
        required
        maxLength={NOME_PROJETO_MAXIMO}
        defaultValue={estado.valores?.nome}
        erro={estado.erros?.nome}
        dica="Vem com Backlog, A fazer, Em andamento, Em revisão e Concluído. WIP inicial: 3 e 2."
      />
      <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
        {enviando ? "Criando…" : "Criar projeto"}
      </button>
    </form>
  );
}
