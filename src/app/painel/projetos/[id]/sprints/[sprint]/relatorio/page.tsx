import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import { carregarBoard, carregarEventosParaCalculo } from "@/lib/board/dados";
import { FolhaRelatorio } from "./folha";

export const metadata: Metadata = { title: "Relatório da Sprint · Shelper" };

// Relatório da Sprint em formato de folha A4. Na tela aparece como uma folha branca; o botão
// abre a impressão do navegador ("Salvar como PDF"). O CSS de impressão (globals.css, .folha)
// esconde o cabeçalho do site e o botão, e deixa só a folha.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Relatorio({ params }: { params: Promise<{ id: string; sprint: string }> }) {
  const { id, sprint: sprintId } = await params;
  if (!UUID.test(id) || !UUID.test(sprintId)) notFound();
  const usuario = await exigirUsuario();
  const board = await carregarBoard(id, usuario.id);
  const sprint = board?.sprints.find((s) => s.id === sprintId);
  if (!board || !sprint) notFound();

  const eventos = await carregarEventosParaCalculo(id);
  return (
    <FolhaRelatorio
      projeto={{ id, nome: board.projeto.nome }}
      sprint={sprint}
      cartoes={board.cartoes}
      eventos={eventos}
      metas={board.metas}
      time={board.time}
      agora={new Date().toISOString()}
    />
  );
}

export default function PaginaRelatorio({ params }: PageProps<"/painel/projetos/[id]/sprints/[sprint]/relatorio">) {
  return (
    <Suspense fallback={<p className="p-8 text-suave">Montando o relatório…</p>}>
      <Relatorio params={params} />
    </Suspense>
  );
}
