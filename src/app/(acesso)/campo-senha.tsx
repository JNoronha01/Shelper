"use client";

import { useState } from "react";
import { REGRAS_SENHA, SENHA_MAXIMO } from "@/lib/auth/validacao";
import { Campo } from "./campo";

// Campo de senha nova com as regras de senha forte embaixo: cada uma fica verde quando é cumprida.
// O servidor confere as mesmas regras (validacao.ts); isto é só para a pessoa ver enquanto digita.
export function CampoSenhaForte({ name, rotulo, erro }: { name: string; rotulo: string; erro?: string }) {
  const [senha, setSenha] = useState("");
  const id = `regras-${name}`;
  return (
    <div className="flex flex-col gap-2">
      <Campo
        name={name}
        rotulo={rotulo}
        type="password"
        autoComplete="new-password"
        required
        maxLength={SENHA_MAXIMO}
        aria-describedby={id}
        erro={erro}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />
      <ul id={id} aria-label="Regras da senha" className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {REGRAS_SENHA.map((r) => {
          const ok = r.ok(senha);
          return (
            <li key={r.id} className={`flex items-center gap-1.5 transition-colors duration-150 ${ok ? "text-bom" : "text-suave"}`}>
              <span
                aria-hidden="true"
                className={`grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                  ok ? "border-bom bg-bom text-fundo" : "border-linha-forte"
                }`}
              >
                {ok && (
                  <svg viewBox="0 0 12 12" className="size-2.5">
                    <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {r.texto}
              <span className="sr-only">{ok ? ": cumprida" : ": falta"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
