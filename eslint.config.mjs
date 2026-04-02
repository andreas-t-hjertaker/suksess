import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Strenger jsx-a11y regler (allerede inkludert av next/core-web-vitals)
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/label-has-associated-control": ["warn", {
        assert: "either",
        controlComponents: ["Input", "Select", "Textarea"],
        depth: 3,
      }],
    },
  },
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
    // Kompilert Cloud Functions output
    "functions/lib/**",
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
