import Link from "next/link";

// Marca do Shelper: cartões do board empilhados, o da frente com o S de Scrum + helper.
// O mesmo desenho está em src/app/icon.svg (ícone da aba do navegador).
export function Marca({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="8.5" y="4.5" width="18" height="21.5" rx="4" transform="rotate(10 17 15)" className="fill-laranja" opacity="0.3" />
      <rect x="5.5" y="7" width="18" height="21.5" rx="4" className="fill-laranja" />
      <path
        d="M18.3 12.3h-4.6a2.6 2.6 0 0 0 0 5.2h2.6a2.6 2.6 0 0 1 0 5.2H10.6"
        fill="none"
        strokeWidth="2.9"
        strokeLinecap="round"
        className="stroke-sobre-laranja"
      />
    </svg>
  );
}

export function Logo({ href = "/", tipos }: { href?: string; tipos?: string[] }) {
  return (
    <Link href={href} transitionTypes={tipos} className="inline-flex items-center gap-2 font-bold tracking-tight text-texto">
      <Marca />
      <span className="text-lg tracking-[-0.02em]">Shelper</span>
    </Link>
  );
}
