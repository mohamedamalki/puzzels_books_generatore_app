import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: { baseURL: process.env.BROWSER_TEST_URL ?? "http://localhost:3101", channel: process.env.BROWSER_CHANNEL ?? "msedge", headless: true },
});
