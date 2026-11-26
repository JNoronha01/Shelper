// Regras do formulário "Entre em contato". O banco repete os limites (tabela contatos).
export const ASSUNTOS = [
  { valor: "duvida", rotulo: "Dúvida sobre o Shelper" },
  { valor: "problema", rotulo: "Encontrei um problema" },
  { valor: "sugestao", rotulo: "Sugestão" },
  { valor: "outro", rotulo: "Outro assunto" },
] as const;
export type Assunto = (typeof ASSUNTOS)[number]["valor"];
export const MENSAGEM_MAXIMO = 2000;

export type DadosContato = { nome: string; email: string; assunto: Assunto; mensagem: string };
type Campo = "nome" | "email" | "assunto" | "mensagem";

export function validarContato(form: FormData): { ok: true; dados: DadosContato } | { ok: false; erros: Partial<Record<Campo, string>> } {
  const t = (c: string) => {
    const v = form.get(c);
    return typeof v === "string" ? v.trim() : "";
  };
  const nome = t("nome").replace(/\s+/g, " ");
  const email = t("email").toLowerCase();
  const assunto = t("assunto");
  const mensagem = t("mensagem");
  const erros: Partial<Record<Campo, string>> = {};
  if (nome.length < 2) erros.nome = "Informe seu nome.";
  else if (nome.length > 120) erros.nome = "O nome pode ter no máximo 120 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) erros.email = "Informe um e-mail válido, para podermos responder.";
  if (!ASSUNTOS.some((a) => a.valor === assunto)) erros.assunto = "Escolha o assunto.";
  if (mensagem.length < 10) erros.mensagem = "Escreva a mensagem (pelo menos 10 caracteres).";
  else if (mensagem.length > MENSAGEM_MAXIMO) erros.mensagem = `A mensagem pode ter no máximo ${MENSAGEM_MAXIMO} caracteres.`;
  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados: { nome, email, assunto: assunto as Assunto, mensagem } };
}
