"use client";

import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import { Aviso, Campo } from "@/app/(acesso)/campo";
import { Avatar } from "@/components/avatar";
import { useAvisar } from "@/components/avisos";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, BOTAO_TEXTO } from "@/components/botoes";
import { CampoSenhaForte } from "@/app/(acesso)/campo-senha";
import { sairDeTodos } from "@/app/(acesso)/acoes";
import { ESTADO_INICIAL } from "../estado";
import { removerFoto, salvarFoto, salvarNome, trocarEmail, trocarSenha } from "./acoes";

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id={id} className="font-semibold">
          {titulo}
        </h2>
        <p className="text-sm text-suave">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

// Reduz a imagem escolhida para no máximo 256 px (lado maior) em WEBP antes de enviar:
// a foto aparece pequena no site e o envio fica leve.
async function reduzirImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const lado = 256;
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolver, rejeitar) =>
    canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error("imagem"))), "image/webp", 0.85),
  );
}

export function FotoENome({ nome, foto }: { nome: string; foto: string | null }) {
  const avisar = useAvisar();
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, iniciar] = useTransition();
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [estado, acao, salvando] = useActionState(salvarNome, ESTADO_INICIAL);

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroFoto(null);
    if (!arquivo.type.startsWith("image/")) {
      setErroFoto("Escolha um arquivo de imagem (JPG, PNG ou WEBP).");
      return;
    }
    iniciar(async () => {
      try {
        const blob = await reduzirImagem(arquivo);
        const form = new FormData();
        form.set("foto", new File([blob], "foto.webp", { type: "image/webp" }));
        const r = await salvarFoto(form);
        if (r.ok) avisar("Foto atualizada.");
        else setErroFoto(r.mensagem);
      } catch {
        setErroFoto("Não foi possível ler essa imagem. Tente outra.");
      }
      if (entrada.current) entrada.current.value = "";
    });
  }

  function tirar() {
    iniciar(async () => {
      const r = await removerFoto();
      if (r.ok) avisar("Foto removida.");
      else setErroFoto(r.mensagem);
    });
  }

  return (
    <Secao id="titulo-identidade" titulo="Nome e foto" descricao="É assim que o time vê você nos cartões, no Time e no histórico.">
      <div className="flex flex-wrap items-center gap-4">
        <div className={enviando ? "opacity-50 transition-opacity" : "transition-opacity"}>
          <Avatar nome={nome} foto={foto} tamanho="gg" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button aria-busy={enviando} type="button" className={BOTAO_SECUNDARIO} disabled={enviando} onClick={() => entrada.current?.click()}>
              {enviando ? "Enviando…" : foto ? "Trocar foto" : "Enviar foto"}
            </button>
            {foto && (
              <button type="button" className={BOTAO_TEXTO} disabled={enviando} onClick={tirar}>
                Remover foto
              </button>
            )}
          </div>
          <p className="text-sm text-suave">JPG, PNG ou WEBP. A imagem é reduzida antes do envio.</p>
          <input
            ref={entrada}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Escolher foto"
            onChange={(e) => escolher(e.target.files?.[0])}
          />
        </div>
      </div>
      {erroFoto && <Aviso tipo="erro">{erroFoto}</Aviso>}

      <form key={estado.versao ?? 0} action={acao} noValidate className="flex flex-col gap-3 border-t border-linha pt-4">
        <Campo
          name="nome"
          rotulo="Nome"
          defaultValue={estado.erros ? estado.valores?.nome : nome}
          erro={estado.erros?.nome}
          autoComplete="name"
          maxLength={120}
          required
        />
        {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <div className="flex justify-end">
          <button aria-busy={salvando} type="submit" disabled={salvando} className={BOTAO_PRINCIPAL}>
            {salvando ? "Salvando…" : "Salvar nome"}
          </button>
        </div>
      </form>
    </Secao>
  );
}

export function TrocarEmail({ email }: { email: string }) {
  const [estado, acao, enviando] = useActionState(trocarEmail, ESTADO_INICIAL);
  return (
    <Secao id="titulo-email" titulo="E-mail" descricao={`Você entra no Shelper com ${email}.`}>
      <form key={estado.versao ?? 0} action={acao} noValidate className="flex flex-col gap-3">
        <Campo
          name="email"
          type="email"
          rotulo="Novo e-mail"
          defaultValue={estado.valores?.email}
          erro={estado.erros?.email}
          autoComplete="email"
          required
        />
        <Campo name="senha" type="password" rotulo="Sua senha" erro={estado.erros?.senha} autoComplete="current-password" required />
        {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <div className="flex justify-end">
          <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? "Enviando…" : "Trocar e-mail"}
          </button>
        </div>
      </form>
    </Secao>
  );
}

export function TrocarSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, ESTADO_INICIAL);
  return (
    <Secao id="titulo-senha" titulo="Senha" descricao="A senha nova segue as mesmas regras do cadastro.">
      <form key={estado.versao ?? 0} action={acao} noValidate className="flex flex-col gap-3">
        <Campo name="atual" type="password" rotulo="Senha atual" erro={estado.erros?.atual} autoComplete="current-password" required />
        <CampoSenhaForte name="nova" rotulo="Nova senha" erro={estado.erros?.nova} />
        <Campo
          name="confirmacao"
          type="password"
          rotulo="Repita a nova senha"
          erro={estado.erros?.confirmacao}
          autoComplete="new-password"
          required
        />
        {estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <div className="flex justify-end">
          <button aria-busy={enviando} type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? "Salvando…" : "Trocar senha"}
          </button>
        </div>
      </form>
    </Secao>
  );
}

// Sair de todos os aparelhos: encerra a sessão em todos os navegadores e celulares onde a conta
// está aberta (inclusive este). Útil se a pessoa esqueceu a conta aberta num computador da faculdade.
export function SairDeTodos() {
  const [confirmando, setConfirmando] = useState(false);
  const [saindo, iniciar] = useTransition();
  return (
    <Secao
      id="titulo-aparelhos"
      titulo="Aparelhos conectados"
      descricao="Esqueceu a conta aberta em outro computador ou celular? Saia de todos de uma vez. Você também sai deste e entra de novo depois."
    >
      {!confirmando ? (
        <div className="flex justify-end">
          <button type="button" className={BOTAO_SECUNDARIO} onClick={() => setConfirmando(true)}>
            Sair de todos os aparelhos
          </button>
        </div>
      ) : (
        <div className="surgir flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-sm">Encerrar a sessão em todos os aparelhos agora?</span>
          <button type="button" className={BOTAO_TEXTO} disabled={saindo} onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
          <button
            type="button"
            aria-busy={saindo}
            disabled={saindo}
            className={`${BOTAO_SECUNDARIO} !border-perigo/60 !text-perigo hover:!bg-perigo/10`}
            onClick={() => iniciar(() => sairDeTodos())}
          >
            {saindo ? "Saindo…" : "Sair de todos"}
          </button>
        </div>
      )}
    </Secao>
  );
}
