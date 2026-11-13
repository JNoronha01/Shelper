// Regras de cadastro e login. Rodam no servidor (Server Actions) antes de qualquer
// chamada ao Supabase; o formulário usa os mesmos limites nos atributos HTML.
export const SENHA_MINIMO = 8;
// O Supabase Auth usa bcrypt, que considera no máximo 72 bytes da senha.
export const SENHA_MAXIMO = 72;
export const NOME_MAXIMO = 120;
const EMAIL_MAXIMO = 254;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DadosCadastro = { nome: string; email: string; senha: string };
export type DadosLogin = { email: string; senha: string };

export type ErrosCampos<Campo extends string> = Partial<Record<Campo, string>>;

export type Validacao<Dados, Campo extends string> =
  | { ok: true; dados: Dados }
  | { ok: false; erros: ErrosCampos<Campo> };

type CampoCadastro = "nome" | "email" | "senha" | "confirmacao";
type CampoLogin = "email" | "senha";

function texto(form: FormData, campo: string): string {
  const valor = form.get(campo);
  return typeof valor === "string" ? valor : "";
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function erroEmail(email: string): string | undefined {
  if (!email) return "Informe seu e-mail.";
  if (email.length > EMAIL_MAXIMO || !FORMATO_EMAIL.test(email)) {
    return "Informe um e-mail válido, como nome@exemplo.com.";
  }
  return undefined;
}

export function validarCadastro(
  form: FormData,
): Validacao<DadosCadastro, CampoCadastro> {
  const nome = texto(form, "nome").trim().replace(/\s+/g, " ");
  const email = normalizarEmail(texto(form, "email"));
  const senha = texto(form, "senha");
  const confirmacao = texto(form, "confirmacao");
  const erros: ErrosCampos<CampoCadastro> = {};

  if (!nome) erros.nome = "Informe seu nome completo.";
  else if (nome.length > NOME_MAXIMO) {
    erros.nome = `O nome pode ter no máximo ${NOME_MAXIMO} caracteres.`;
  }

  const problemaEmail = erroEmail(email);
  if (problemaEmail) erros.email = problemaEmail;

  if (!senha) erros.senha = "Crie uma senha.";
  else if (senha.length < SENHA_MINIMO) {
    erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`;
  } else if (new TextEncoder().encode(senha).length > SENHA_MAXIMO) {
    erros.senha = `A senha pode ter no máximo ${SENHA_MAXIMO} caracteres.`;
  }

  if (!confirmacao) erros.confirmacao = "Repita a senha.";
  else if (confirmacao !== senha) erros.confirmacao = "As senhas não coincidem.";

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { nome, email, senha } };
}

export function validarLogin(form: FormData): Validacao<DadosLogin, CampoLogin> {
  const email = normalizarEmail(texto(form, "email"));
  const senha = texto(form, "senha");
  const erros: ErrosCampos<CampoLogin> = {};

  const problemaEmail = erroEmail(email);
  if (problemaEmail) erros.email = problemaEmail;
  if (!senha) erros.senha = "Informe sua senha.";

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { email, senha } };
}
