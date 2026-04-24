import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Stricter checks for test files: disallow `any` and force explicit typing
  // on mocks. Production code stays on the relaxed baseline above so this
  // rollout is incremental and doesn't break the build.
  {
    files: [
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
    ],
    rules: {
      // Surface every `any` in tests so they're migrated to `unknown` +
      // helpers from `src/test/typing.ts`. Starts as warn so we don't block
      // CI; flip to "error" once the existing offenders are cleaned up.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description" },
      ],
    },
  },
);
