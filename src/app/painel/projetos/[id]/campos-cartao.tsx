import { CAMPO } from "@/components/botoes";
import { PONTOS_VALIDOS } from "@/lib/board/regras";

// Pedaços de formulário usados no pop-up de criar e no de detalhe do cartão.

export function SeletorDePontos({ id, padrao, erro }: { id: string; padrao: string; erro?: string }) {
  return (
    <select
      id={id}
      name="pontos"
      defaultValue={padrao}
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro ? `${id}-erro` : undefined}
      className={`${CAMPO} w-24`}
    >
      {PONTOS_VALIDOS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

export function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-xs text-red-700 dark:text-red-400">
      {texto}
    </p>
  );
}
