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
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Estratégia gradual de strict typing — Fase 1
      // `any` explícito vira warn em todo o código (visível em PRs sem
      // quebrar a build). Será promovido a `error` em fases futuras à
      // medida que os hotspots forem migrados (ver docs/TYPESCRIPT_STRICT_MIGRATION.md).
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description" },
      ],
    },
  },
  // DOMAIN BOUNDARY ENFORCEMENT — Bloqueia importações diretas entre domínios.
  // Exige que o acesso a componentes/hooks de outra feature seja feito via 
  // barrel file (`@/features/name`), preservando o encapsulamento interno.
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              // Bloqueia imports profundos de UMA feature de DENTRO de outra feature.
              // Ex: DENTRO de src/features/inbox, bloqueia src/features/admin/components/X
              // MAS permite @/features/admin (que aponta para o index.ts).
              "group": ["@/features/*/**", "src/features/*/**", "@/admin/**", "@/auth/**", "@/connections/**", "@/inbox/**", "@/sla/**"],
              "message": "Domain violation: Access other features only through their main entry point (@/features/name). Internal details should remain encapsulated."
            }
          ]
        }
      ]
    }
  },
  // Stricter checks for test files: forbid `any` and force explicit typing
  // on mocks. Tests already run under tsconfig.test.json with `strict: true`.
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
  // Toda leitura de mensagens deve passar por queryExternalProxy → external-db-proxy → FATOR X.
  // Envio (useEvolutionApi para editMessage/sendSticker/etc.) continua permitido por R2.
  // Veja docs/INBOX_READ_CONTRACT.md.
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
  // STRICT ZONE — código novo / já migrado. Adicione globs aqui ao
  // limpar uma área. Tudo nesta zona é tratado como produção strict:
  // `any` explícito = error, casts inseguros bloqueados em PR.
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
);
