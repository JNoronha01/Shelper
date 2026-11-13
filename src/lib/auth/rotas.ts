// Rotas que exigem sessão e para onde o usuário vai antes e depois de entrar.
export const ROTA_ENTRADA = "/entrar";
export const ROTA_CADASTRO = "/cadastro";
export const ROTA_INTERNA = "/painel";

const PREFIXOS_PROTEGIDOS = [ROTA_INTERNA];
const ROTAS_DE_VISITANTE = [ROTA_ENTRADA, ROTA_CADASTRO];

function correspondeA(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

export function exigeSessao(caminho: string): boolean {
  return PREFIXOS_PROTEGIDOS.some((prefixo) => correspondeA(caminho, prefixo));
}

export function eRotaDeVisitante(caminho: string): boolean {
  return ROTAS_DE_VISITANTE.includes(caminho);
}

// Aceita apenas caminhos internos protegidos ("/painel..."), para que o parâmetro
// "proximo" não possa mandar o usuário para outro site depois do login.
export function destinoAposEntrar(proximo: string | null | undefined): string {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//")) {
    return ROTA_INTERNA;
  }
  if (proximo.includes("\\")) return ROTA_INTERNA;
  const caminho = proximo.split(/[?#]/, 1)[0];
  return exigeSessao(caminho) ? proximo : ROTA_INTERNA;
}
