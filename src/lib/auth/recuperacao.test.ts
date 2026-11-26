import { describe, expect, it } from "vitest";
import { sessaoDeRecuperacao } from "./recuperacao";

describe("sessão aberta pelo link de nova senha", () => {
  const agora = 1_800_000_000_000;
  const s = agora / 1000;
  it("aceita link do e-mail usado há menos de 15 minutos", () => {
    expect(sessaoDeRecuperacao([{ method: "otp", timestamp: s - 60 }], agora)).toBe(true);
    expect(sessaoDeRecuperacao([{ method: "password", timestamp: s - 3600 }, { method: "recovery", timestamp: s - 5 }], agora)).toBe(true);
  });
  it("recusa login com senha, link antigo ou claim ausente", () => {
    expect(sessaoDeRecuperacao([{ method: "password", timestamp: s - 10 }], agora)).toBe(false);
    expect(sessaoDeRecuperacao([{ method: "otp", timestamp: s - 16 * 60 }], agora)).toBe(false);
    expect(sessaoDeRecuperacao(undefined, agora)).toBe(false);
    expect(sessaoDeRecuperacao(["otp"], agora)).toBe(false);
  });
});
