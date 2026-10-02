import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".next-*/**", ".storage/**", "tmp/**", "test-results/**", "playwright-report/**", "src/generated/**", "next-env.d.ts", "coverage/**"]),
]);
