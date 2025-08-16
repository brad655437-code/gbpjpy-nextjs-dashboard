import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "src/generated/**/*",
      "prisma/generated/**/*",
      ".next/**/*",
      "node_modules/**/*",
      "out/**/*",
      "build/**/*"
    ]
  },
  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];

export default eslintConfig;
