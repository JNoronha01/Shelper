export type EstadoFormulario = {
  erros?: Partial<Record<string, string>>;
  mensagem?: string;
  sucesso?: string;
  valores?: Partial<Record<"nome" | "email", string>>;
};

export const ESTADO_INICIAL: EstadoFormulario = {};
