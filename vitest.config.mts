import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Configuração do Vitest (testes automatizados).
export default defineConfig({
  resolve: {
    // Mesmo atalho do tsconfig.json: "@/lib/colunas" aponta para "src/lib/colunas".
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Testes ficam ao lado do código, com o final .test.ts
    include: ["src/**/*.test.ts"],
  },
});
