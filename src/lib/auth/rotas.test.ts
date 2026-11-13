import { describe, expect, it } from "vitest";
import { destinoAposEntrar, eRotaDeVisitante, exigeSessao } from "@/lib/auth/rotas";

describe("rotas de acesso", () => {
  it("protege o painel e suas subpáginas, mas não as páginas públicas", () => {
    expect(exigeSessao("/painel")).toBe(true);
    expect(exigeSessao("/painel/qualquer")).toBe(true);
    expect(exigeSessao("/")).toBe(false);
    expect(exigeSessao("/entrar")).toBe(false);
    expect(exigeSessao("/painelx")).toBe(false);
  });

  it("identifica as páginas de visitante", () => {
    expect(eRotaDeVisitante("/entrar")).toBe(true);
    expect(eRotaDeVisitante("/cadastro")).toBe(true);
    expect(eRotaDeVisitante("/painel")).toBe(false);
  });

  it("só redireciona após o login para caminhos internos protegidos", () => {
    expect(destinoAposEntrar("/painel/x?y=1")).toBe("/painel/x?y=1");
    expect(destinoAposEntrar(null)).toBe("/painel");
    expect(destinoAposEntrar("")).toBe("/painel");
    expect(destinoAposEntrar("https://malicioso.com")).toBe("/painel");
    expect(destinoAposEntrar("//malicioso.com/painel")).toBe("/painel");
    expect(destinoAposEntrar("/\\malicioso.com")).toBe("/painel");
    expect(destinoAposEntrar("/entrar")).toBe("/painel");
  });
});
