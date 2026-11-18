import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { exigirUsuario } from "@/lib/auth/usuario";
import { criarClienteServidor } from "@/lib/supabase/server";
import { AceitarConvite } from "./aceitar";

export const metadata: Metadata = { title: "Convite · Shelper" };

// Quem abre o link de convite cai aqui. Se não estiver logado, o proxy manda para o
// login e depois volta para esta página (parâmetro "proximo").
type Situacao =
  | { status: "invalido" }
  | { status: "expirado"; projeto: string }
  | { status: "valido" | "ja_membro"; projeto: string; projeto_id: string };

type Props = PageProps<"/painel/convite/[codigo]">;

// Dados da sessão e do banco ficam dentro do Suspense (o resto da página é estático).
export default function PaginaConvite({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <Suspense fallback={<p className="text-center text-zinc-500">Abrindo o convite…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ params }: Pick<Props, "params">) {
  const { codigo } = await params;
  await exigirUsuario();

  let situacao: Situacao = { status: "invalido" };
  if (/^[0-9a-f]{64}$/.test(codigo)) {
    const supabase = await criarClienteServidor();
    const { data, error } = await supabase.rpc("ver_convite", { p_codigo: codigo });
    if (!error && data) situacao = data as Situacao;
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {situacao.status === "valido" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Convite para um projeto</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Você foi convidado para o projeto <strong className="text-zinc-900 dark:text-zinc-100">{situacao.projeto}</strong>. Ao
              entrar, você vê o board e pode criar e mover cartões.
            </p>
            <AceitarConvite codigo={codigo} />
          </>
        )}
        {situacao.status === "ja_membro" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Você já está neste projeto</h1>
            <p className="text-zinc-600 dark:text-zinc-400">{situacao.projeto}</p>
            <Link href={`/painel/projetos/${situacao.projeto_id}`} className={BOTAO_PRINCIPAL}>
              Abrir o board
            </Link>
          </>
        )}
        {(situacao.status === "expirado" || situacao.status === "invalido") && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              {situacao.status === "expirado" ? "Este convite expirou" : "Convite inválido"}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Peça um link novo ao dono do projeto. O dono gera o link na aba <strong>Time</strong> do projeto.
            </p>
            <Link href="/painel" className={BOTAO_SECUNDARIO}>
              Ir para meus projetos
            </Link>
          </>
        )}
    </div>
  );
}
