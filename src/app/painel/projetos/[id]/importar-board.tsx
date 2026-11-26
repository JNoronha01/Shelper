"use client";

import { useRef, useState, useTransition } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { useAvisar } from "@/components/avisos";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, BOTAO_TEXTO } from "@/components/botoes";
import { Seletor } from "@/components/seletor";
import { COLUNAS, type Coluna } from "@/lib/colunas";
import { MODELO_CSV } from "@/lib/importacao/csv";
import { lerArquivo, type Fonte } from "@/lib/importacao/fonte";
import { resumoDaImportacao, type ListaTrello, type MapaListas } from "@/lib/importacao/trello";
import { importarTrello } from "../../acoes";

// Importar board (só o PO): JSON do Trello, JSON do Shelper ou CSV (Trello Premium, Jira, planilha).
// O arquivo é lido aqui no navegador: a pessoa confere a prévia, escolhe a coluna de cada lista
// e só então os cartões vão para o servidor.
const NAO_IMPORTAR = "";
const MAX_ARQUIVO = 20 * 1024 * 1024;

export function ImportarBoard({ projetoId }: { projetoId: string }) {
  const avisar = useAvisar();
  const entrada = useRef<HTMLInputElement>(null);
  const [dados, setDados] = useState<Fonte | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [listas, setListas] = useState<ListaTrello[]>([]);
  const [mapa, setMapa] = useState<MapaListas>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  async function ler(arquivo: File | undefined) {
    setErro(null);
    if (!arquivo) return;
    if (arquivo.size > MAX_ARQUIVO) {
      setErro("O arquivo passa de 20 MB. Exporte só o board do projeto.");
      return;
    }
    try {
      const r = lerArquivo(arquivo.name, await arquivo.text());
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setDados(r.fonte);
      setNomeArquivo(arquivo.name);
      setListas(r.fonte.listas);
      setMapa(Object.fromEntries(r.fonte.listas.map((l) => [l.id, l.sugestao])));
    } catch {
      setErro("Não foi possível ler o arquivo. Ele precisa ser um JSON (Trello ou Shelper) ou um CSV.");
    } finally {
      if (entrada.current) entrada.current.value = "";
    }
  }

  const importacao = dados ? dados.montar(mapa) : null;
  const resumo = importacao ? resumoDaImportacao(importacao) : [];
  const eventos = importacao?.cartoes.reduce((s, c) => s + c.eventos.length, 0) ?? 0;

  function confirmar() {
    if (!importacao || importacao.cartoes.length === 0) return;
    iniciar(async () => {
      const r = await importarTrello(projetoId, importacao.cartoes);
      if (!r.ok) {
        setErro(r.mensagem);
        return;
      }
      avisar(
        `${r.criados} ${r.criados === 1 ? "cartão importado" : "cartões importados"} com ${r.eventos} movimentos` +
          (r.ignorados ? `; ${r.ignorados} já estavam no projeto` : "") +
          ".",
      );
      setDados(null);
      setListas([]);
    });
  }

  return (
    <section aria-labelledby="titulo-importar" className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id="titulo-importar" className="font-semibold">
          Importar board
        </h2>
        <p className="text-sm text-suave">Traga os cartões de outra ferramenta. Importar o mesmo arquivo de novo não duplica cartões.</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-suave">
          <li>
            <strong className="font-medium text-texto">Trello (.json):</strong> no board, menu Imprimir, exportar e compartilhar → Exportar
            como JSON (plano grátis). Vem com o histórico de movimentos.
          </li>
          <li>
            <strong className="font-medium text-texto">Shelper (.json):</strong> o arquivo Completo da seção Exportar, de outro projeto. Vem
            com o histórico.
          </li>
          <li>
            <strong className="font-medium text-texto">CSV:</strong> do Trello (Premium), do Jira ou de uma planilha. Sem histórico: valem
            as datas de criação e conclusão.{" "}
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent("\uFEFF" + MODELO_CSV)}`}
              download="modelo-shelper.csv"
              className="text-laranja underline underline-offset-4"
            >
              Baixar modelo CSV
            </a>
          </li>
        </ul>
      </div>

      {!dados ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={BOTAO_SECUNDARIO} onClick={() => entrada.current?.click()}>
            Escolher arquivo .json ou .csv
          </button>
          <input
            ref={entrada}
            type="file"
            accept="application/json,.json,text/csv,.csv"
            className="sr-only"
            tabIndex={-1}
            aria-label="Arquivo JSON ou CSV do board"
            onChange={(e) => ler(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Arquivo: <strong className="font-medium">{nomeArquivo}</strong> <span className="text-suave">({dados.descricao})</span>
          </p>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              {dados.origem === "csv" ? "Para qual coluna vai cada status" : "Para qual coluna vai cada lista"}
            </h3>
            <ul className="flex flex-col divide-y divide-linha rounded-xl border border-linha">
              {listas.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 text-sm">
                    {l.nome}{" "}
                    <span className="text-suave">
                      ({l.cartoes} {l.cartoes === 1 ? "cartão" : "cartões"})
                    </span>
                  </span>
                  <Seletor
                    className="w-48"
                    rotuloAcessivel={`Coluna do Shelper para a lista ${l.nome}`}
                    valor={mapa[l.id] ?? NAO_IMPORTAR}
                    onChange={(v) => setMapa((m) => ({ ...m, [l.id]: v === NAO_IMPORTAR ? null : (v as Coluna) }))}
                    opcoes={[{ valor: NAO_IMPORTAR, rotulo: "Não importar" }, ...COLUNAS.map((c) => ({ valor: c, rotulo: c }))]}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Prévia</h3>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-suave">
                <tr>
                  <th className="py-1 font-medium">Coluna</th>
                  <th className="py-1 text-right font-medium">Cartões</th>
                  <th className="py-1 text-right font-medium">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {resumo.map((r) => (
                  <tr key={r.coluna}>
                    <td className="py-1.5">{r.coluna}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.cartoes}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.pontos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-suave">
              {importacao?.cartoes.length ?? 0} cartões e {eventos} movimentos. Responsáveis, horas estimadas e Sprints não vêm no arquivo:
              ajuste depois no board e na aba Sprint (Registrar Sprint anterior liga os concluídos às Sprints passadas).
            </p>
            {importacao && importacao.avisos.length > 0 && (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-aviso">
                {importacao.avisos.slice(0, 6).map((a) => (
                  <li key={a}>{a}</li>
                ))}
                {importacao.avisos.length > 6 && <li>e mais {importacao.avisos.length - 6} avisos.</li>}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={BOTAO_TEXTO}
              disabled={enviando}
              onClick={() => {
                setDados(null);
                setListas([]);
                setErro(null);
              }}
            >
              Cancelar
            </button>
            <button
              aria-busy={enviando}
              type="button"
              className={BOTAO_PRINCIPAL}
              disabled={enviando || !importacao?.cartoes.length}
              onClick={confirmar}
            >
              {enviando ? "Importando…" : `Importar ${importacao?.cartoes.length ?? 0} cartões`}
            </button>
          </div>
        </div>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </section>
  );
}
