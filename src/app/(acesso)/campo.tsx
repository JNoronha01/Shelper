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
        className="rounded-xl border border-linha-forte bg-fundo/60 px-3 py-2.5 text-base text-texto placeholder:text-fraco outline-none transition duration-150 ease-suave hover:border-fraco focus-visible:border-laranja focus-visible:ring-3 focus-visible:ring-laranja/20 aria-invalid:border-perigo"
        {...input}
      />
      {dica && (
        <p id={`${id}-dica`} className="text-sm text-suave">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-perigo">
          {erro}
        </p>
      )}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "sucesso"; children: string }) {
  const cores =
    tipo === "erro"
      ? "border-perigo/50 bg-perigo/10 text-perigo"
      : "border-linha bg-fundo text-texto";
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-sm ${cores}`}>
      {children}
    </p>
  );
}

