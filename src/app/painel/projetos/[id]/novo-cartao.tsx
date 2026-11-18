"use client";

import { useActionState } from "react";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import { Modal } from "@/components/modal";
import { Seletor } from "@/components/seletor";
import { DESCRICAO_MAXIMO, TITULO_MAXIMO } from "@/lib/board/regras";
import { COLUNAS, type Coluna } from "@/lib/colunas";
import { criarCartao } from "../../acoes";
import { ESTADO_INICIAL, type EstadoAcao } from "../../estado";
import { Erro, SeletorDePontos } from "./campos-cartao";

// Pop-up "Novo cartão": o time escolhe em qual coluna o cartão entra (ideia do professor).
// coluna = null deixa o pop-up fechado.
export function NovoCartao({
  projetoId,
  coluna,
  onFechar,
  onCriado,
}: {
  projetoId: string;
  coluna: Coluna | null;
  onFechar: () => void;
  onCriado: (mensagem: string) => void;
}) {
  return (
    <Modal aberto={coluna !== null} onFechar={onFechar} titulo="Novo cartão">
      {coluna && <Formulario projetoId={projetoId} colunaInicial={coluna} onFechar={onFechar} onCriado={onCriado} />}
    </Modal>
  );
}

function Formulario({
  projetoId,
  colunaInicial,
  onFechar,
  onCriado,
}: {
  projetoId: string;
  colunaInicial: Coluna;
  onFechar: () => void;
  onCriado: (mensagem: string) => void;
}) {
  const [estado, acao, enviando] = useActionState(async (anterior: EstadoAcao, form: FormData) => {
    const r = await criarCartao(anterior, form);
    if (r.sucesso) {
      onCriado(r.sucesso);
      onFechar();
    }
    return r;
  }, ESTADO_INICIAL);
  const v = estado.valores;

  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="projeto" value={projetoId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="novo-titulo" className="text-sm font-medium">
          Título
        </label>
        <input
          id="novo-titulo"
          name="titulo"
          autoFocus
          maxLength={TITULO_MAXIMO}
          defaultValue={v?.titulo}
          placeholder="Ex.: Tela de login"
          aria-invalid={estado.erros?.titulo ? true : undefined}
          aria-describedby={estado.erros?.titulo ? "novo-titulo-erro" : undefined}
          className={CAMPO}
        />
        <Erro id="novo-titulo-erro" texto={estado.erros?.titulo} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novo-coluna" className="text-sm font-medium">
            Coluna
          </label>
          <Seletor
            id="novo-coluna"
            name="coluna"
            opcoes={COLUNAS.map((c) => ({ valor: c, rotulo: c }))}
            padrao={v?.coluna ?? colunaInicial}
            invalido={Boolean(estado.erros?.coluna)}
          />
          <Erro id="novo-coluna-erro" texto={estado.erros?.coluna} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novo-pontos" className="text-sm font-medium">
            Pontos (Fibonacci)
          </label>
          <SeletorDePontos id="novo-pontos" padrao={v?.pontos || "3"} erro={estado.erros?.pontos} />
          <Erro id="novo-pontos-erro" texto={estado.erros?.pontos} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="novo-descricao" className="text-sm font-medium">
          Descrição <span className="font-normal text-suave">(opcional)</span>
        </label>
        <textarea
          id="novo-descricao"
          name="descricao"
          rows={3}
          maxLength={DESCRICAO_MAXIMO}
          defaultValue={v?.descricao}
          aria-invalid={estado.erros?.descricao ? true : undefined}
          className={`${CAMPO} resize-y`}
        />
        <Erro id="novo-descricao-erro" texto={estado.erros?.descricao} />
      </div>

      {estado.mensagem && <p className="text-sm text-perigo">{estado.mensagem}</p>}

      {estado.wip ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-aviso/60 bg-aviso/10 p-3 text-sm text-aviso">
          <p>
            A coluna <strong>{estado.wip.coluna}</strong> está no limite de WIP ({estado.wip.ocupados} de {estado.wip.limite}). Criar
            mesmo assim? O evento ficará marcado como acima do limite.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onFechar} className={BOTAO_SECUNDARIO}>
              Cancelar
            </button>
            <button type="submit" name="confirmarWip" value="sim" disabled={enviando} className={BOTAO_PRINCIPAL}>
              {enviando ? "Criando…" : "Criar mesmo assim"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={BOTAO_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? "Criando…" : "Criar cartão"}
          </button>
        </div>
      )}
    </form>
  );
}
