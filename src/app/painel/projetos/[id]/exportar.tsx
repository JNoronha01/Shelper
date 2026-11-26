// Exportar o projeto: quatro arquivos, cada um para um uso (ver src/lib/exportacao/exportar.ts).
// São links comuns: o servidor monta o arquivo na hora e o navegador baixa.
const ARQUIVOS = [
  {
    tipo: "cartoes",
    nome: "Cartões",
    formato: "CSV",
    texto: "Um cartão por linha, com Lead Time e Cycle Time. Abre no Excel e no Power BI.",
  },
  {
    tipo: "movimentos",
    nome: "Movimentos",
    formato: "CSV",
    texto: "Cada mudança de coluna com data e hora, para montar gráficos próprios.",
  },
  { tipo: "completo", nome: "Completo", formato: "JSON", texto: "Tudo, com o histórico. Dá para importar em outro projeto do Shelper." },
  {
    tipo: "basico",
    nome: "Básico",
    formato: "CSV",
    texto: "Título, descrição, status e pontos, com nomes em inglês que o Jira e outras ferramentas leem.",
  },
] as const;

export function ExportarProjeto({ projetoId }: { projetoId: string }) {
  return (
    <section aria-labelledby="titulo-exportar" className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
      <div>
        <h2 id="titulo-exportar" className="font-semibold">
          Exportar
        </h2>
        <p className="text-sm text-suave">Baixe os dados do projeto como estão agora.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ARQUIVOS.map((a) => (
          <li key={a.tipo}>
            <a
              href={`/painel/projetos/${projetoId}/exportar?tipo=${a.tipo}`}
              download
              className="group flex h-full flex-col gap-1 rounded-xl border border-linha bg-cartao p-4 transition duration-150 ease-suave hover:-translate-y-px hover:border-linha-forte focus-visible:outline-2 focus-visible:outline-laranja active:translate-y-0"
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                {a.nome}
                <span className="rounded-md bg-elevado px-1.5 py-0.5 text-xs text-suave group-hover:text-texto">
                  .{a.formato.toLowerCase()}
                </span>
              </span>
              <span className="text-sm text-suave">{a.texto}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
