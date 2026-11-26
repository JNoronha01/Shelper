import { describe, expect, it } from "vitest";
import { explicarErroDeAuth, explicarErroDoBanco } from "./erros";

describe("explicarErroDoBanco", () => {
  it("devolve o texto das nossas funções como está", () => {
    expect(explicarErroDoBanco({ code: "22023", message: "Já existe uma Sprint ativa. Encerre-a antes de criar outra." })).toBe(
      "Já existe uma Sprint ativa. Encerre-a antes de criar outra.",
    );
    expect(explicarErroDoBanco({ code: "42501", message: "Só o PO e o SM criam Sprints." })).toBe("Só o PO e o SM criam Sprints.");
  });

  it("explica a permissão negada do Postgres (site e banco em versões diferentes)", () => {
    const m = explicarErroDoBanco({ code: "42501", message: "permission denied for function criar_sprint_flex" });
    expect(m).toMatch(/Recarregue a página/);
    expect(m).toMatch(/código 42501/);
    expect(m).not.toMatch(/permission denied/);
  });

  it("explica função que não existe (migração não rodada)", () => {
    expect(explicarErroDoBanco({ code: "PGRST202", message: "Could not find the function" })).toMatch(/migração/);
  });

  it("sem código: problema de conexão", () => {
    expect(explicarErroDoBanco({ code: "", message: "fetch failed" })).toMatch(/internet/);
  });

  it("código desconhecido: mostra a mensagem e o código", () => {
    const m = explicarErroDoBanco({ code: "XX000", message: "algo estranho" });
    expect(m).toContain("algo estranho");
    expect(m).toContain("XX000");
  });
});

describe("explicarErroDeAuth", () => {
  it("explica link expirado", () => {
    expect(explicarErroDeAuth({ code: "otp_expired", message: "Email link is invalid or has expired" })).toMatch(/expirou/);
  });
});
