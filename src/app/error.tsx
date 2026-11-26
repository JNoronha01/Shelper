"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { TelaDeErro } from "@/components/tela-de-erro";

// Falha inesperada numa página: mostra o código para o time achar no log e deixa tentar de novo.
export default function Erro({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const codigo = typeof error === "object" && error && "digest" in error ? String(error.digest) : null;
  return (
    <TelaDeErro
      codigo={codigo ? `Código ${codigo.slice(0, 10)}` : "Erro"}
      titulo="Algo deu errado aqui"
      texto="Não foi culpa sua. Tente de novo; se continuar, mande o código acima pelo contato que a gente investiga."
    >
      <button type="button" onClick={() => retry()} className={BOTAO_PRINCIPAL}>
        Tentar de novo
      </button>
      <Link href="/contato" className={BOTAO_SECUNDARIO}>
        Avisar o time
      </Link>
    </TelaDeErro>
  );
}
