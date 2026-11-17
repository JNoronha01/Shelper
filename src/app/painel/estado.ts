export type EstadoAcao = {
  erros?: Partial<Record<string, string>>;
  mensagem?: string;
  sucesso?: string;
  valores?: Partial<Record<string, string>>;
  // Muda a cada envio bem-sucedido, para o formulário ser limpo.
  versao?: number;
};

export const ESTADO_INICIAL: EstadoAcao = {};

export type ResultadoMover =
  | { status: "ok"; acimaDoWip: boolean }
  | { status: "sem_mudanca" }
  | { status: "wip"; coluna: string; limite: number; ocupados: number }
  | { status: "erro"; mensagem: string };
