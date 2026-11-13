import type { InputHTMLAttributes } from "react";

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  rotulo: string;
  erro?: string;
  dica?: string;
};

export function Campo({ name, rotulo, erro, dica, ...input }: CampoProps) {
  const id = `campo-${name}`;
  const descricoes = [dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricoes || undefined}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-base outline-none focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/15 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus-visible:border-zinc-100 dark:focus-visible:ring-zinc-100/20 dark:aria-invalid:border-red-400"
        {...input}
      />
      {dica && (
        <p id={`${id}-dica`} className="text-sm text-zinc-500">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-red-700 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "sucesso"; children: string }) {
  const cores =
    tipo === "erro"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${cores}`}>
      {children}
    </p>
  );
}

