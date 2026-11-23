"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Seletor } from "@/components/seletor";

// Filtro "Time / pessoa" da aba Métricas (PO e SM). Muda o endereço; o servidor recalcula.
export function FiltroPessoa({
  projetoId,
  periodo,
  pessoa,
  time,
}: {
  projetoId: string;
  periodo: string;
  pessoa: string;
  time: { usuarioId: string; nome: string }[];
}) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const ir = (valor: string) => {
    const q = new URLSearchParams({ aba: "metricas", periodo });
    if (valor) q.set("pessoa", valor);
    iniciar(() => router.push(`/painel/projetos/${projetoId}?${q.toString()}`, { scroll: false }));
  };
  return (
    <div className={`flex items-center gap-2 transition-opacity ${carregando ? "opacity-60" : ""}`} aria-busy={carregando}>
      <span className="text-sm text-suave">Ver</span>
      <Seletor
        rotuloAcessivel="Ver métricas do time ou de uma pessoa"
        valor={pessoa}
        onChange={ir}
        opcoes={[{ valor: "", rotulo: "Time todo" }, ...time.map((m) => ({ valor: m.usuarioId, rotulo: m.nome }))]}
        className="w-48"
      />
    </div>
  );
}
