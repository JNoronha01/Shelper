import Link from "next/link";

// Marca do Shelper: cinco barras (as cinco colunas do board) subindo como um burndown ao contrário.
export function Marca({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" className="fill-indigo-600 dark:fill-indigo-500" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={6 + i * 4.4} y={22 - i * 3} width="3" height={4 + i * 3} rx="1.2" fill="white" opacity={0.55 + i * 0.1} />
      ))}
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
      <Marca />
      <span className="text-lg">Shelper</span>
    </Link>
  );
}
