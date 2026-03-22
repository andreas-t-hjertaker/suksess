import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // E2E-tester krever @playwright/test som ikke er installert lokalt
    "e2e/**",
    "playwright.config.ts",
  ]),
  {
    rules: {
      // react-hooks/set-state-in-effect er for aggressiv for Firebase onSnapshot-patterns.
      // Mønsteret if (!user) { setState(null); return; } er standard og korrekt.
      "react-hooks/set-state-in-effect": "off",
      // Tillat ubrukte variabler som starter med _ (konvensjon for "bevisst ubrukt")
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
