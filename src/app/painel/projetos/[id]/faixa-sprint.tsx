import Link from "next/link";
import type { Cartao, Sprint } from "@/lib/board/dados";

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const formatar = (data: string) => DIA.format(new Date(`${data}T00:00:00Z`));
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

function prazo(hoje: string, sprint: Sprint): { texto: string; atrasada: boolean } {
  const faltam = diasEntre(hoje, sprint.fim);
  if (faltam > 1) return { texto: `faltam ${faltam} dias`, atrasada: false };
  if (faltam === 1) return { texto: "termina amanhã", atrasada: false };
  if (faltam === 0) return { texto: "termina hoje", atrasada: false };
  return { texto: `passou do fim há ${-faltam} ${faltam === -1 ? "dia" : "dias"}`, atrasada: true };
}

// Sprint ativa sempre à vista, numa pílula de uma linha na barra do board (ao lado de Novo cartão):
// número, datas, prazo e progresso; a Meta aparece cortada e inteira ao passar o mouse.
// Ocupa a mesma linha do botão para sobrar altura para as colunas no notebook.
const PILULA = "flex h-10 min-w-0 shrink items-center gap-3 rounded-xl border px-3 text-sm";

export function FaixaSprint({
  projetoId,
  sprint,
  cartoes,
  hoje,
}: {
  projetoId: string;
  sprint: Sprint | null;
  cartoes: Cartao[];
  hoje: string;
}) {
  const link = `/painel/projetos/${projetoId}?aba=sprint`;
  if (!sprint) {
    return (
      <div data-tour="sprint" className={`${PILULA} border-dashed border-linha-forte`}>
        <span className="truncate text-suave">Nenhuma Sprint ativa</span>
        <Link href={link} className="shrink-0 font-medium text-laranja-claro transition-colors hover:text-laranja">
          Planejar Sprint
        </Link>
      </div>
    );
  }

  const daSprint = cartoes.filter((c) => c.sprintId === sprint.id);
  const comprometidos = daSprint.reduce((s, c) => s + c.pontos, 0);
  const feitos = daSprint.filter((c) => c.coluna === "Concluído").reduce((s, c) => s + c.pontos, 0);
  const porcentagem = comprometidos ? Math.round((feitos / comprometidos) * 100) : 0;
  const p = prazo(hoje, sprint);

  return (
    <div data-tour="sprint" className={`${PILULA} border-linha bg-painel`} title={sprint.meta ? `Meta: ${sprint.meta}` : undefined}>
      <Link href={link} className="shrink-0 font-semibold transition-colors hover:text-laranja-claro">
        Sprint {sprint.numero}
      </Link>
      <span className="hidden shrink-0 text-suave tabular-nums lg:inline">
        {formatar(sprint.inicio)} a {formatar(sprint.fim)}
      </span>
      <span className={`shrink-0 ${p.atrasada ? "text-aviso" : "text-suave"}`}>{p.texto}</span>
      {sprint.meta && <span className="hidden min-w-0 truncate text-texto/85 xl:inline">Meta: {sprint.meta}</span>}
      <div
        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-elevado"
        role="progressbar"
        aria-valuenow={porcentagem}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Pontos da Sprint concluídos"
      >
        <div className="h-full rounded-full bg-laranja transition-[width] duration-500 ease-suave" style={{ width: `${porcentagem}%` }} />
      </div>
      <span className="shrink-0 text-suave tabular-nums">
        <strong className="font-semibold text-texto">{feitos}</strong>/{comprometidos} pts
      </span>
    </div>
  );
}

// Aviso de cadastro incompleto (só o PO vê), também em formato de pílula.
export function AvisoCadastro({ projetoId }: { projetoId: string }) {
  return (
    <div
      className={`${PILULA} shrink-0 border-aviso/40 bg-aviso/10`}
      title="Falta completar o cadastro do projeto (horas, prazo e metas). Sem ele, as métricas ficam sem referência."
    >
      <span className="truncate">Cadastro incompleto</span>
      <Link href={`/painel/projetos/${projetoId}?aba=projeto`} className="shrink-0 font-medium text-laranja-claro hover:text-laranja">
        Completar
      </Link>
    </div>
  );
}
