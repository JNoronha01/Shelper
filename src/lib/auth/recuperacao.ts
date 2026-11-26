// A sessão foi aberta pelo link do e-mail (método "otp"/"recovery") há menos de 15 minutos?
// O Supabase guarda no token (claim "amr") como e quando a pessoa entrou.
const RECUPERACAO_MINUTOS = 15;
export function sessaoDeRecuperacao(amr: unknown, agora = Date.now()): boolean {
  if (!Array.isArray(amr) || amr.length === 0) return false;
  const recente = amr
    .filter((e): e is { method: string; timestamp: number } => typeof e === "object" && e !== null && "method" in e && "timestamp" in e)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!recente) return false;
  return ["otp", "recovery", "magiclink"].includes(recente.method) && agora / 1000 - recente.timestamp < RECUPERACAO_MINUTOS * 60;
}
