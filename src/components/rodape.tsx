import Link from "next/link";
import { EMAIL_CONTATO, REPOSITORIO, TIME } from "@/lib/site";
import { Logo } from "./logo";

// Rodapé das páginas públicas (início, normas, contato, 404).
const GRUPOS = [
  {
    titulo: "Produto",
    links: [
      ["Como funciona", "/#como-funciona"],
      ["Métricas", "/#metricas"],
      ["Exemplo de dashboard", "/#dashboard"],
      ["Perguntas frequentes", "/#perguntas"],
    ],
  },
  {
    titulo: "Conta",
    links: [
      ["Criar conta", "/cadastro"],
      ["Entrar", "/entrar"],
      ["Esqueci minha senha", "/esqueci-senha"],
    ],
  },
  {
    titulo: "Shelper",
    links: [
      ["Entre em contato", "/contato"],
      ["Normas que seguimos", "/normas"],
      ["API e MCP para IAs", "/api"],
      ["Privacidade (LGPD)", "/normas#lgpd"],
      ["Código no GitHub", REPOSITORIO],
    ],
  },
] as const;

export function Rodape() {
  return (
    <footer className="border-t border-linha bg-painel/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-suave">
            Board ágil com métricas automáticas. Projeto da disciplina de Métodos Ágeis, Engenharia de Software, Universidade de Mogi das
            Cruzes (UMC).
          </p>
          {EMAIL_CONTATO && (
            <a href={`mailto:${EMAIL_CONTATO}`} className="w-fit text-sm text-texto underline-offset-4 hover:underline">
              {EMAIL_CONTATO}
            </a>
          )}
        </div>
        {GRUPOS.map((g) => (
          <nav key={g.titulo} aria-label={g.titulo} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{g.titulo}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {g.links.map(([rotulo, href]) => (
                <li key={href}>
                  {href.startsWith("http") ? (
                    <a href={href} target="_blank" rel="noreferrer" className="text-suave transition-colors hover:text-texto">
                      {rotulo}
                      <span className="sr-only"> (abre em outra aba)</span>
                    </a>
                  ) : (
                    <Link href={href} className="text-suave transition-colors hover:text-texto">
                      {rotulo}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-linha">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-suave sm:flex-row sm:items-center sm:justify-between">
          <p>Time: {TIME.map((p) => `${p.nome} (${p.papel})`).join(", ")}.</p>
          <p className="shrink-0">© 2026 Shelper</p>
        </div>
      </div>
    </footer>
  );
}
