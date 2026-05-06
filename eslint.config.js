// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

import tailwind from "eslint-plugin-tailwindcss";

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
      "tailwindcss": tailwind,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Tailwind specific rules
      "tailwindcss/no-arbitrary-value": "error",
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/enforce-shorthand": "warn",
      "tailwindcss/no-custom-classname": "off",
      // Estratégia gradual de strict typing
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description" },
      ],
    },
    settings: {
      tailwindcss: {
        callees: ["cn", "cva", "clsx"],
        config: "tailwind.config.ts",
      },
    },
  },
  // DOMAIN BOUNDARY ENFORCEMENT — Bloqueia importações diretas entre domínios.
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["@/features/*/**", "src/features/*/**", "@/admin/**", "@/auth/**", "@/connections/**", "@/inbox/**", "@/sla/**"],
              "message": "Domain violation: Access other features only through their main entry point (@/features/name). Internal details should remain encapsulated."
            }
          ]
        }
      ]
    }
  },
  // Stricter checks for test files: forbid `any` and force explicit typing
  {
    files: [
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
  // INBOX READ CONTRACT — bloqueia leitura via Evolution API dentro do inbox.
  {
    files: [
      "src/components/inbox/**/*.{ts,tsx}",
      "src/hooks/inbox/**/*.{ts,tsx}",
      "src/pages/Inbox*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["**/features/*/**"],
              "message": "Use direct feature entry points or internal aliases. Avoid deep imports across features."
            },
            {
              "group": ["../../*", "../../../*"],
              "message": "Use '@/features/...' aliases instead of deep relative paths."
            },
            {
              "group": [
                "**/evolution-api/**/find*",
                "**/evolution-api/**/list-messages*",
                "**/evolution-api/**/find-messages*",
                "**/evolution-api/**/find-chats*"
              ],
              "message":
                "Inbox lê do FATOR X via queryExternalProxy → external-db-proxy. Não consulte Evolution API para popular UI. Para envio, use externalMessageSender. Veja docs/INBOX_READ_CONTRACT.md"
            }
          ]
        }
      ],
    },
  },
  // STRICT ZONE — código novo / já migrado.
  {
    files: [
      "src/lib/runtimeGuards.ts",
      "src/lib/externalProxy.ts",
      "src/lib/evolutionCircuitBreaker.ts",
      "src/lib/evolutionSendRetry.ts",
      "src/test/typing.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
      ],
    },
  },
  ...storybook.configs["flat/recommended"]
);
