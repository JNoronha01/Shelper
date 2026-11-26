// Regras de cadastro e login. Rodam no servidor (Server Actions) antes de qualquer
// chamada ao Supabase; o formulário usa os mesmos limites nos atributos HTML.
export const SENHA_MINIMO = 8;
// O Supabase Auth usa bcrypt, que considera no máximo 72 bytes da senha.
export const SENHA_MAXIMO = 72;
export const NOME_MAXIMO = 120;
const EMAIL_MAXIMO = 254;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Senha forte: as mesmas quatro regras no cadastro, na troca de senha e na redefinição.
// A tela mostra cada regra ficando verde enquanto a pessoa digita (componente RegrasDaSenha).
export const REGRAS_SENHA = [
  { id: "tamanho", texto: `Pelo menos ${SENHA_MINIMO} caracteres`, ok: (s: string) => s.length >= SENHA_MINIMO },
  { id: "maiuscula", texto: "Uma letra maiúscula", ok: (s: string) => /\p{Lu}/u.test(s) },
  { id: "numero", texto: "Um número", ok: (s: string) => /\d/.test(s) },
  { id: "especial", texto: "Um caractere especial (!@#$%&*…)", ok: (s: string) => /[^\p{L}\p{N}\s]/u.test(s) },
] as const;

// Primeiro problema da senha, ou undefined se ela passa em todas as regras.
export function problemaDaSenha(senha: string): string | undefined {
  if (new TextEncoder().encode(senha).length > SENHA_MAXIMO) return `A senha pode ter no máximo ${SENHA_MAXIMO} caracteres.`;
  const faltam = REGRAS_SENHA.filter((r) => !r.ok(senha)).map((r) => r.texto.toLowerCase());
  if (faltam.length === 0) return undefined;
  return `A senha precisa de: ${faltam.join(", ")}.`;
}

export type DadosCadastro = { nome: string; email: string; senha: string };
export type DadosLogin = { email: string; senha: string };

export type ErrosCampos<Campo extends string> = Partial<Record<Campo, string>>;

export type Validacao<Dados, Campo extends string> = { ok: true; dados: Dados } | { ok: false; erros: ErrosCampos<Campo> };

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

export function validarCadastro(form: FormData): Validacao<DadosCadastro, CampoCadastro> {
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
  else {
    const problema = problemaDaSenha(senha);
    if (problema) erros.senha = problema;
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

// ---------------------------------------------------------------- Perfil (editar dados)

export function validarNomePerfil(form: FormData): Validacao<{ nome: string }, "nome"> {
  const nome = texto(form, "nome").trim().replace(/\s+/g, " ");
  if (nome.length < 2) return { ok: false, erros: { nome: "Informe seu nome (pelo menos 2 letras)." } };
  if (nome.length > NOME_MAXIMO) return { ok: false, erros: { nome: `O nome pode ter no máximo ${NOME_MAXIMO} caracteres.` } };
  return { ok: true, dados: { nome } };
}

export function validarTrocaDeSenha(form: FormData): Validacao<{ atual: string; nova: string }, "atual" | "nova" | "confirmacao"> {
  const atual = texto(form, "atual");
  const nova = texto(form, "nova");
  const confirmacao = texto(form, "confirmacao");
  const erros: ErrosCampos<"atual" | "nova" | "confirmacao"> = {};
  if (!atual) erros.atual = "Informe a senha atual.";
  if (!nova) erros.nova = "Crie a nova senha.";
  else if (problemaDaSenha(nova)) erros.nova = problemaDaSenha(nova);
  else if (nova === atual) erros.nova = "A nova senha precisa ser diferente da atual.";
  if (!confirmacao) erros.confirmacao = "Repita a nova senha.";
  else if (confirmacao !== nova) erros.confirmacao = "As senhas não coincidem.";
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { atual, nova } };
}

export function validarTrocaDeEmail(form: FormData, emailAtual: string): Validacao<{ email: string; senha: string }, "email" | "senha"> {
  const email = normalizarEmail(texto(form, "email"));
  const senha = texto(form, "senha");
  const erros: ErrosCampos<"email" | "senha"> = {};
  const problema = erroEmail(email);
  if (problema) erros.email = problema;
  else if (email === normalizarEmail(emailAtual)) erros.email = "Esse já é o seu e-mail.";
  if (!senha) erros.senha = "Confirme com a sua senha.";
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { email, senha } };
}

// Redefinir a senha pelo link do e-mail ("esqueci minha senha").
export function validarNovaSenha(form: FormData): Validacao<{ senha: string }, "senha" | "confirmacao"> {
  const senha = texto(form, "senha");
  const confirmacao = texto(form, "confirmacao");
  const erros: ErrosCampos<"senha" | "confirmacao"> = {};
  if (!senha) erros.senha = "Crie a nova senha.";
  else if (problemaDaSenha(senha)) erros.senha = problemaDaSenha(senha);
  if (!confirmacao) erros.confirmacao = "Repita a nova senha.";
  else if (confirmacao !== senha) erros.confirmacao = "As senhas não coincidem.";
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { senha } };
}

// Pedido do link: só o e-mail.
export function validarPedidoDeSenha(form: FormData): Validacao<{ email: string }, "email"> {
  const email = normalizarEmail(texto(form, "email"));
  const problema = erroEmail(email);
  if (problema) return { ok: false, erros: { email: problema } };
  return { ok: true, dados: { email } };
}

// Foto: só imagens pequenas (a tela já reduz para 256 px antes de enviar).
export const FOTO_MAXIMO_BYTES = 1024 * 1024;
export const FOTO_TIPOS = ["image/webp", "image/png", "image/jpeg"] as const;

export function validarFoto(arquivo: FormDataEntryValue | null): Validacao<{ arquivo: File }, "foto"> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erros: { foto: "Escolha uma imagem." } };
  if (!(FOTO_TIPOS as readonly string[]).includes(arquivo.type)) return { ok: false, erros: { foto: "Use uma imagem JPG, PNG ou WEBP." } };
  if (arquivo.size > FOTO_MAXIMO_BYTES) return { ok: false, erros: { foto: "A imagem pode ter no máximo 1 MB." } };
  return { ok: true, dados: { arquivo } };
}
