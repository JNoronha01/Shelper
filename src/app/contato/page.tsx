import type { Metadata } from "next";
import Link from "next/link";
import { Rodape } from "@/components/rodape";
import { TopoPublico } from "@/components/topo-publico";
import { EMAIL_CONTATO, REPOSITORIO } from "@/lib/site";
import { FormularioContato } from "./formulario";

export const metadata: Metadata = { title: "Entre em contato · Shelper" };

export default function PaginaContato() {
  return (
    <div className="flex flex-1 flex-col">
      <TopoPublico />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Entre em contato</h1>
            <p className="text-pretty text-suave">
              Dúvida, problema ou sugestão sobre o Shelper? Mande uma mensagem. Quem responde é o próprio time que fez o site.
            </p>
          </div>
          <ul className="flex flex-col gap-4 text-sm">
            {EMAIL_CONTATO && (
              <li className="flex flex-col gap-0.5">
                <span className="text-suave">E-mail</span>
                <a href={`mailto:${EMAIL_CONTATO}`} className="w-fit font-medium underline-offset-4 hover:underline">
                  {EMAIL_CONTATO}
                </a>
              </li>
            )}
            <li className="flex flex-col gap-0.5">
              <span className="text-suave">Antes de escrever</span>
              <Link href="/#perguntas" className="w-fit font-medium underline-offset-4 hover:underline">
                Veja as perguntas frequentes
              </Link>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-suave">Achou um erro no código?</span>
              <a
                href={`${REPOSITORIO}/issues`}
                target="_blank"
                rel="noreferrer"
                className="w-fit font-medium underline-offset-4 hover:underline"
              >
                Abra uma issue no GitHub<span className="sr-only"> (abre em outra aba)</span>
              </a>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-suave">Seus dados</span>
              <Link href="/normas#lgpd" className="w-fit font-medium underline-offset-4 hover:underline">
                Como tratamos seus dados (LGPD)
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-linha bg-cartao p-6">
          <FormularioContato />
        </div>
      </main>
      <Rodape />
    </div>
  );
}
