"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { useAvisar } from "@/components/avisos";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_TEXTO, CAMPO } from "@/components/botoes";
import { Seletor } from "@/components/seletor";
import type { ChaveApi } from "@/lib/board/dados";
import { criarChaveApi, revogarChaveApi } from "../../acoes";

// Conectar com IA: gera a chave da API deste projeto e mostra como ligar no Claude, no Cursor
// ou em qualquer programa. A chave aparece uma vez só; o Shelper guarda apenas o hash.
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const nada = () => () => {};

function situacao(c: ChaveApi): { texto: string; ativa: boolean } {
  if (c.revogadaEm) return { texto: `revogada em ${DATA.format(new Date(c.revogadaEm))}`, ativa: false };
  if (c.expiraEm && new Date(c.expiraEm) < new Date()) return { texto: "expirada", ativa: false };
  return { texto: c.expiraEm ? `vale até ${DATA.format(new Date(c.expiraEm))}` : "sem validade", ativa: true };
}

export function ConectarIa({ projetoId, chaves }: { projetoId: string; chaves: ChaveApi[] }) {
  const avisar = useAvisar();
  const origem = useSyncExternalStore(
    nada,
    () => window.location.origin,
    () => "https://shelper.vercel.app",
  );
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("90");
  const [nova, setNova] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function gerar() {
    setErro(null);
    iniciar(async () => {
      const r = await criarChaveApi(projetoId, nome, validade === "sem" ? null : Number(validade));
      if (!r.ok) setErro(r.mensagem);
      else {
        setNova(r.chave);
        setNome("");
      }
    });
  }

  function revogar(id: string) {
    iniciar(async () => {
      const r = await revogarChaveApi(id);
      avisar(r.ok ? "Chave revogada. Quem usava essa chave perde o acesso na hora." : r.mensagem, r.ok ? "ok" : "erro");
    });
  }

  const copiar = (texto: string, oque: string) => {
    void navigator.clipboard.writeText(texto).then(() => avisar(`${oque} copiado.`));
  };

  return (
    <section aria-labelledby="titulo-ia" className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id="titulo-ia" className="font-semibold">
          Conectar com IA
        </h2>
        <p className="text-sm text-suave">
          Gere uma chave e o Claude, o Cursor ou outro programa passa a ler o board e as métricas e a criar, mover e editar cartões. A IA
          age como você, com o seu papel no projeto.{" "}
          <Link href="/api" target="_blank" className="text-laranja underline underline-offset-4">
            Ver a documentação
          </Link>
        </p>
      </div>

      {nova ? (
        <div className="surgir flex flex-col gap-3 rounded-xl border border-laranja/40 bg-laranja/[0.04] p-4">
          <p className="text-sm font-medium">Copie a chave agora: ela não aparece de novo.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-fundo px-3 py-2 text-xs">{nova}</code>
            <button type="button" className={BOTAO_MINI} onClick={() => copiar(nova, "Chave")}>
              Copiar chave
            </button>
          </div>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-suave">Claude Code (terminal)</dt>
              <dd className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-fundo px-3 py-2 text-xs">
                  {`claude mcp add --transport http shelper ${origem}/api/mcp --header "Authorization: Bearer ${nova}"`}
                </code>
                <button
                  type="button"
                  className={BOTAO_MINI}
                  onClick={() =>
                    copiar(`claude mcp add --transport http shelper ${origem}/api/mcp --header "Authorization: Bearer ${nova}"`, "Comando")
                  }
                >
                  Copiar
                </button>
              </dd>
            </div>
            <div>
              <dt className="text-suave">
                claude.ai ou Claude Desktop: Configurações → Conectores → Adicionar conector personalizado. Autenticação: Sem login. Em
                Cabeçalhos de requisição, adicione os dois valores abaixo.
              </dt>
              <dd className="flex flex-col gap-2">
                {[
                  ["Endereço", `${origem}/api/mcp`],
                  ["Nome do cabeçalho", "Authorization"],
                  ["Valor do cabeçalho", `Bearer ${nova}`],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-xs text-suave">{rotulo}</span>
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-fundo px-3 py-2 text-xs">{valor}</code>
                    <button type="button" className={BOTAO_MINI} onClick={() => copiar(valor, rotulo)}>
                      Copiar
                    </button>
                  </div>
                ))}
              </dd>
            </div>
          </dl>
          <button type="button" className={`${BOTAO_TEXTO} self-end`} onClick={() => setNova(null)}>
            Já copiei
          </button>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            gerar();
          }}
        >
          <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium">
            Nome da chave
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={60}
              placeholder="Ex.: Claude do Jorge"
              className={CAMPO}
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <span>Validade</span>
            <Seletor
              className="w-40"
              rotuloAcessivel="Validade da chave"
              valor={validade}
              onChange={setValidade}
              opcoes={[
                { valor: "30", rotulo: "30 dias" },
                { valor: "90", rotulo: "90 dias" },
                { valor: "sem", rotulo: "Sem validade" },
              ]}
            />
          </div>
          <button type="submit" aria-busy={enviando} disabled={enviando || !nome.trim()} className={BOTAO_PRINCIPAL}>
            {enviando ? "Gerando…" : "Gerar chave"}
          </button>
        </form>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {chaves.length > 0 && (
        <ul className="flex flex-col divide-y divide-linha rounded-xl border border-linha text-sm">
          {chaves.map((c) => {
            const s = situacao(c);
            return (
              <li key={c.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 ${s.ativa ? "" : "text-suave"}`}>
                <span className="font-medium">{c.nome}</span>
                <code className="text-xs text-suave">{c.prefixo}…</code>
                <span className="text-xs text-suave">
                  {s.texto}
                  {c.ultimoUsoEm ? ` · usada em ${DATA.format(new Date(c.ultimoUsoEm))}` : " · nunca usada"}
                </span>
                {s.ativa && (
                  <button type="button" disabled={enviando} className={`${BOTAO_MINI} ml-auto`} onClick={() => revogar(c.id)}>
                    Revogar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
