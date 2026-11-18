import { Seletor } from "@/components/seletor";
import { PONTOS_VALIDOS } from "@/lib/board/regras";

// Pedaços de formulário usados no pop-up de criar e no de detalhe do cartão.

const OPCOES_PONTOS = PONTOS_VALIDOS.map((p) => ({ valor: String(p), rotulo: `${p} ${p === 1 ? "ponto" : "pontos"}` }));

export function SeletorDePontos({ id, padrao, erro }: { id: string; padrao: string; erro?: string }) {
  return (
    <Seletor
      id={id}
      name="pontos"
      opcoes={OPCOES_PONTOS}
      padrao={padrao}
      invalido={Boolean(erro)}
      descritoPor={erro ? `${id}-erro` : undefined}
      className="w-32"
    />
  );
}

export function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-xs text-perigo">
      {texto}
    </p>
  );
}
