import type { Linter } from "eslint";

const config: Linter.Config = {
  plugins: ["tailwindcss"],
  rules: {
    "tailwindcss/no-arbitrary-value": "error",
    "tailwindcss/no-custom-classname": "off",
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/enforce-shorthand": "warn",
  },
  settings: {
    tailwindcss: {
      callees: ["cn", "cva", "clsx"],
      config: "tailwind.config.ts",
      whitelist: [], // Adicione classes personalizadas que devem ser permitidas aqui
    },
  },
};

export default config;
