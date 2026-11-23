// Foto da pessoa (do bucket "avatares" do Supabase Storage) ou, sem foto, as iniciais do nome.

export function urlDaFoto(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/avatares/${caminho}` : null;
}

// "Jorge Noronha" -> "JN"; "Andryws" -> "A".
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "?") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

const TAMANHO = { p: "size-6 text-[10px]", m: "size-8 text-xs", g: "size-9 text-sm", gg: "size-20 text-2xl" } as const;

export function Avatar({
  nome,
  foto,
  tamanho = "m",
  titulo,
}: {
  nome: string;
  foto?: string | null;
  tamanho?: keyof typeof TAMANHO;
  titulo?: string;
}) {
  const url = urlDaFoto(foto);
  return (
    <span
      title={titulo}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-linha-forte bg-elevado font-semibold text-texto ${TAMANHO[tamanho]}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto pequena vinda do Storage, sem otimização do Next
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden="true">{iniciais(nome)}</span>
      )}
    </span>
  );
}
