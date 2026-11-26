"use client";

import { useActionState, useState } from "react";
import { Aviso, Campo } from "@/app/(acesso)/campo";
import { BOTAO_PRINCIPAL } from "@/components/botoes";
import { Seletor } from "@/components/seletor";
import { ASSUNTOS, MENSAGEM_MAXIMO } from "@/lib/contato/validacao";
import { enviarContato, type EstadoContato } from "./acoes";

export function FormularioContato() {
  const [estado, acao, enviando] = useActionState(enviarContato, {} as EstadoContato);
  const [tamanho, setTamanho] = useState(estado.valores?.mensagem?.length ?? 0);
  if (estado.sucesso) return <Aviso tipo="sucesso">{estado.sucesso}</Aviso>;
  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo name="nome" rotulo="Seu nome" autoComplete="name" required defaultValue={estado.valores?.nome} erro={estado.erros?.nome} />
        <Campo
          name="email"
          rotulo="Seu e-mail"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.valores?.email}
          erro={estado.erros?.email}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Assunto</span>
        <Seletor
          name="assunto"
          rotuloAcessivel="Assunto"
          padrao={estado.valores?.assunto || "duvida"}
          opcoes={ASSUNTOS.map((a) => ({ valor: a.valor, rotulo: a.rotulo }))}
        />
        {estado.erros?.assunto && <p className="text-sm text-perigo">{estado.erros.assunto}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="campo-mensagem" className="text-sm font-medium">
          Mensagem
        </label>
        <textarea
          id="campo-mensagem"
          name="mensagem"
          rows={6}
          maxLength={MENSAGEM_MAXIMO}
          required
          defaultValue={estado.valores?.mensagem}
          onChange={(e) => setTamanho(e.target.value.length)}
          aria-invalid={estado.erros?.mensagem ? true : undefined}
          aria-describedby="contador-mensagem"
          className="resize-y rounded-xl border border-linha-forte bg-fundo/60 px-3 py-2.5 text-base text-texto outline-none transition duration-150 ease-suave hover:border-fraco focus-visible:border-laranja focus-visible:ring-3 focus-visible:ring-laranja/20 aria-invalid:border-perigo"
        />
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-perigo">{estado.erros?.mensagem}</span>
          <span id="contador-mensagem" className="shrink-0 text-xs text-suave tabular-nums">
            {tamanho}/{MENSAGEM_MAXIMO}
          </span>
        </div>
      </div>
      {/* Armadilha para robôs: escondido de pessoas e de leitores de tela. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-xs text-suave">
        Usamos seu nome e e-mail só para responder esta mensagem. Ela não entra em lista de e-mails nem é passado a ninguém.
      </p>
      <div className="flex justify-end">
        <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
          {enviando ? "Enviando…" : "Enviar mensagem"}
        </button>
      </div>
    </form>
  );
}
