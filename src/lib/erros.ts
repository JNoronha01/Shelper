// Mensagens de erro para a tela: sempre dizem o motivo e o que fazer.
//
// As funções do Shelper no banco já lançam texto pronto (códigos 22023, 23514 e 42501 com
// mensagem em português). Os outros códigos vêm do próprio Postgres, do PostgREST ou do
// Supabase Auth, em inglês e técnicos; aqui eles viram uma explicação, com o código no fim
// para o time achar o problema nos logs.

type ErroComCodigo = { code?: string | null; message?: string | null };

const comCodigo = (texto: string, codigo?: string | null) => (codigo ? `${texto} (código ${codigo})` : texto);

// Texto em português lançado pelas nossas funções (não começa com termos do Postgres em inglês).
const eTextoNosso = (m: string) =>
  !/^(permission denied|new row violates|null value|duplicate key|insert or update|invalid input)/i.test(m);

export function explicarErroDoBanco(erro: ErroComCodigo): string {
  const codigo = erro.code ?? "";
  const msg = erro.message ?? "";

  if ((codigo === "22023" || codigo === "23514" || codigo === "42501") && msg && eTextoNosso(msg)) return msg;

  switch (codigo) {
    case "42501":
      // O banco recusou a função ou a tabela, sem texto nosso. Acontece quando a página é de uma
      // versão anterior do site e a migração nova já tirou essa permissão (ou o contrário).
      return comCodigo(
        "O banco recusou esta ação: a tela que você está usando chama uma função que não está mais liberada. Recarregue a página (F5). Se o erro continuar, o site e o banco estão em versões diferentes: confira se o último PR foi publicado depois da migração.",
        codigo,
      );
    case "PGRST202":
    case "42883":
      return comCodigo(
        "Esta ação usa uma função que ainda não existe no banco. Falta rodar a migração mais recente no Supabase (SQL Editor) antes de usar esta parte do site.",
        codigo,
      );
    case "PGRST204":
    case "42703":
      return comCodigo("O banco não tem um campo que esta tela usa. Falta rodar a migração mais recente no Supabase (SQL Editor).", codigo);
    case "23505":
      return comCodigo("Já existe um registro igual a este. Confira se ele já não foi criado (recarregue a página).", codigo);
    case "23503":
      return comCodigo(
        "Algo que esta ação usa foi apagado ou não existe mais (por exemplo, um cartão ou uma pessoa que saiu do time). Recarregue a página e tente de novo.",
        codigo,
      );
    case "23502":
      return comCodigo("Faltou preencher um campo obrigatório. Confira o formulário e tente de novo.", codigo);
    case "22P02":
    case "22007":
    case "22008":
      return comCodigo("Algum valor está num formato que o banco não aceita (data, número ou identificador). Confira os campos.", codigo);
    case "22001":
      return comCodigo("Algum texto passou do tamanho máximo permitido. Encurte e tente de novo.", codigo);
    case "40001":
    case "40P01":
      return comCodigo("Outra pessoa mudou isto ao mesmo tempo que você. Recarregue a página e tente de novo.", codigo);
    case "57014":
      return comCodigo("O banco demorou demais para responder e a ação foi cancelada. Tente de novo em instantes.", codigo);
    case "PGRST301":
    case "PGRST303":
      return comCodigo("Sua sessão expirou. Saia e entre de novo na sua conta.", codigo);
    case "":
      return "Não foi possível falar com o servidor. Confira a sua internet e tente de novo.";
    default:
      return comCodigo(
        `O banco recusou a ação com uma mensagem inesperada: "${msg || "sem detalhes"}". Tente de novo; se continuar, avise o time.`,
        codigo,
      );
  }
}

// Erros do Supabase Auth que não têm mensagem própria nas telas de acesso e de perfil.
export function explicarErroDeAuth(erro: ErroComCodigo & { status?: number }): string {
  const codigo = erro.code ?? "";
  switch (codigo) {
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
      return comCodigo("Sua sessão expirou. Entre de novo na sua conta.", codigo);
    case "otp_expired":
      return comCodigo("O link do e-mail expirou. Peça um novo e use o mais recente.", codigo);
    case "reauthentication_needed":
      return comCodigo("Por segurança, entre de novo na conta antes de fazer esta alteração.", codigo);
    case "signup_disabled":
      return comCodigo("Novos cadastros estão desligados no momento.", codigo);
    case "email_address_invalid":
      return comCodigo("Esse endereço de e-mail não é aceito. Confira se digitou certo.", codigo);
    case "":
      return "Não foi possível falar com o servidor de login. Confira a sua internet e tente de novo.";
    default:
      return comCodigo(
        `O serviço de login recusou a ação: "${erro.message || "sem detalhes"}". Tente de novo em instantes; se continuar, avise o time.`,
        codigo,
      );
  }
}
