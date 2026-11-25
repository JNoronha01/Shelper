import Link from "next/link";

// Marca do Shelper: cinco barras (as cinco colunas do board) subindo como um burndown ao contrário.
export function Marca({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" className="fill-laranja" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={6 + i * 4.4} y={22 - i * 3} width="3" height={4 + i * 3} rx="1.2" className="fill-sobre-laranja" opacity={0.55 + i * 0.1} />
      ))}
    </svg>
  );
}

export function Logo({ href = "/", tipos }: { href?: string; tipos?: string[] }) {
  return (
    <Link href={href} transitionTypes={tipos} className="inline-flex items-center gap-2 font-semibold tracking-tight text-texto">
      <Marca />
      <span className="text-lg">Shelper</span>
    </Link>
  );
}
