import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Rodape } from "@/components/rodape";
import { TopoPublico } from "@/components/topo-publico";
import { FERRAMENTAS } from "@/lib/api/mcp";

export const metadata: Metadata = { title: "API e MCP · Shelper" };

// Documentação da API (REST) e do servidor MCP do Shelper.
const BASE = "https://shelper.vercel.app";

const ROTAS: [string, string, string][] = [
  ["GET", "/api/v1/projeto", "Resumo: cartões e pontos por coluna, Sprint ativa, time, limites de WIP, metas e bloqueados."],
  ["GET", "/api/v1/cartoes", "Lista cartões. Filtros: coluna, sprint (ativa, número, id ou nenhuma), responsavel, busca."],
  ["POST", "/api/v1/cartoes", "Cria cartão: titulo, pontos, coluna, descricao, horas, responsavel, confirmar_wip."],
  ["GET", "/api/v1/cartoes/{id}", "Um cartão, com checklist."],
  ["PATCH", "/api/v1/cartoes/{id}", "Edita titulo, pontos, horas, descricao ou responsavel."],
  ["POST", "/api/v1/cartoes/{id}/mover", "Move para outra coluna: coluna, confirmar_wip."],
  ["POST", "/api/v1/cartoes/{id}/checklist", "Adiciona item ao checklist: texto."],
  ["PATCH", "/api/v1/cartoes/{id}/checklist/{item}", "Marca ou desmarca um item: feito."],
  [
    "GET",
    "/api/v1/metricas",
    "Lead Time, Cycle Time, Throughput, Velocity e gargalo. Com ?sprint=ativa, também Burndown e números por pessoa.",
  ],
];

const ERROS: [string, string][] = [
  ["400", "Dados inválidos (ex.: pontos fora da escala de Fibonacci, coluna que não existe)."],
  ["401", "Chave ausente, errada, revogada ou expirada."],
  ["403", "Seu papel não permite essa ação (a API segue as mesmas regras do site)."],
  ["404", "Cartão ou rota não encontrados neste projeto."],
  ["409", "Coluna no limite de WIP: nada mudou. Repita com confirmar_wip: true para passar do limite."],
];

function Codigo({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-linha bg-fundo p-4 text-xs leading-relaxed text-texto">
      <code>{children}</code>
    </pre>
  );
}

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`t-${id}`} className="flex scroll-mt-6 flex-col gap-4">
      <h2 id={`t-${id}`} className="text-xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function PaginaApi() {
  return (
    <div className="flex flex-1 flex-col">
      <TopoPublico />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-4 py-12 text-pretty">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">API e MCP do Shelper</h1>
          <p className="text-suave">
            Conecte o Shelper ao Claude, ao Cursor ou a qualquer programa. A IA lê o board e as métricas e pode criar, mover e editar
            cartões, sempre com as mesmas regras do site: limite de WIP, pontos de Fibonacci e o papel de quem gerou a chave.
          </p>
        </div>

        <Secao id="chave" titulo="1. Gere a chave">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-suave">
            <li>Abra o projeto, aba Projeto, seção Conectar com IA (PO e Scrum Master).</li>
            <li>Dê um nome (por exemplo, &quot;Claude do Jorge&quot;) e escolha a validade: 30 dias, 90 dias ou sem validade.</li>
            <li>Copie a chave na hora: ela começa com shp_ e não aparece de novo. O Shelper guarda só o hash dela, como faz com senhas.</li>
          </ol>
          <p className="text-sm text-suave">
            A chave age como você: com o seu papel e só neste projeto. Se você sair do time, ou revogar a chave, ela para de funcionar na
            hora.
          </p>
        </Secao>

        <Secao id="mcp" titulo="2. Conecte a IA (MCP)">
          <p className="text-sm text-suave">
            MCP (Model Context Protocol) é o padrão aberto que as IAs usam para chamar ferramentas. O Shelper oferece estas ferramentas:
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {FERRAMENTAS.map((f) => (
              <li key={f.name} className="rounded-xl border border-linha bg-cartao p-3">
                <code className="text-xs text-laranja-claro">{f.name}</code>
                <p className="mt-1 text-suave">{f.description.split(". ")[0].replace(/\.$/, "")}.</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-2 font-semibold">Claude Code (terminal)</h3>
          <Codigo>{`claude mcp add --transport http shelper ${BASE}/api/mcp \\
  --header "Authorization: Bearer shp_SUA_CHAVE"`}</Codigo>
          <h3 className="mt-2 font-semibold">claude.ai e Claude Desktop</h3>
          <p className="text-sm text-suave">
            Configurações → Conectores → Adicionar conector personalizado. Em Autenticação, escolha Sem login; em Cabeçalhos de requisição,
            adicione o cabeçalho com a chave. Assim o endereço sozinho não dá acesso a nada.
          </p>
          <Codigo>{`Endereço:  ${BASE}/api/mcp
Cabeçalho: Authorization
Valor:     Bearer shp_SUA_CHAVE`}</Codigo>
          <p className="text-sm text-suave">
            Se o seu cliente não aceitar cabeçalho, use o endereço com a chave no fim (trate como senha): {BASE}/api/mcp/shp_SUA_CHAVE
          </p>
          <h3 className="mt-2 font-semibold">Cursor e outros clientes MCP</h3>
          <Codigo>{`{
  "mcpServers": {
    "shelper": {
      "url": "${BASE}/api/mcp",
      "headers": { "Authorization": "Bearer shp_SUA_CHAVE" }
    }
  }
}`}</Codigo>
          <p className="text-sm text-suave">Depois é só pedir em português, por exemplo:</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-suave">
            <li>Qual o Lead Time médio da Sprint ativa e qual coluna é o gargalo?</li>
            <li>Crie o cartão &quot;H46 - Exportar relatório&quot; com 3 pontos no Backlog.</li>
            <li>Mova o H12 para Em andamento e marque o primeiro item do checklist dele.</li>
          </ul>
        </Secao>

        <Secao id="rest" titulo="3. API REST">
          <p className="text-sm text-suave">
            Para scripts e outros programas. Mande a chave no cabeçalho <code>Authorization: Bearer shp_...</code>. Respostas em JSON,
            campos em português.
          </p>
          <div className="overflow-x-auto rounded-xl border border-linha">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-linha">
                {ROTAS.map(([metodo, rota, texto]) => (
                  <tr key={metodo + rota} className="align-top">
                    <td className="py-2 pr-3 pl-3 font-mono text-xs font-semibold text-laranja-claro">{metodo}</td>
                    <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">{rota}</td>
                    <td className="py-2 pr-3 text-suave">{texto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Codigo>{`# Cartões da Sprint ativa que estão Em andamento
curl "${BASE}/api/v1/cartoes?sprint=ativa&coluna=Em%20andamento" \\
  -H "Authorization: Bearer shp_SUA_CHAVE"

# Mover um cartão
curl -X POST "${BASE}/api/v1/cartoes/ID_DO_CARTAO/mover" \\
  -H "Authorization: Bearer shp_SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"coluna": "Em revisão"}'`}</Codigo>
          <h3 className="font-semibold">Erros</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {ERROS.map(([codigo, texto]) => (
              <li key={codigo}>
                <code className="mr-2 text-laranja-claro">{codigo}</code>
                <span className="text-suave">{texto}</span>
              </li>
            ))}
          </ul>
        </Secao>

        <Secao id="seguranca" titulo="Segurança">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-suave">
            <li>A chave é guardada como hash SHA-256; nem o time do Shelper consegue ver a chave depois de gerada.</li>
            <li>Cada chamada passa pelas mesmas funções do banco que o site usa: papel, limite de WIP e validações valem igual.</li>
            <li>Os movimentos feitos pela IA entram no histórico com o seu nome, como se você tivesse movido.</li>
            <li>Revogue a chave na aba Projeto se ela vazar. Cada pessoa pode ter até 5 chaves ativas por projeto.</li>
          </ul>
        </Secao>
      </main>
      <Rodape />
    </div>
  );
}
