import { fileURLToPath } from "node:url";
import { compile } from "@mdx-js/mdx";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Compile les fichiers .mdx (src/content) pour les tests, comme @next/mdx le
 * fait au build : mêmes composants (src/mdx-components.tsx), même JSX. Les
 * tests rendent ainsi les pages légales avec les vraies données.
 */
function mdx(): Plugin {
  return {
    name: "allee-nette:mdx",
    enforce: "pre",
    async transform(source, id) {
      if (!id.endsWith(".mdx")) return null;
      const resultat = await compile(source, { providerImportSource: "@/mdx-components" });
      return { code: String(resultat), map: null };
    },
  };
}

export default defineConfig({
  plugins: [mdx()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
