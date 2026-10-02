import { test, expect } from "@playwright/test";

test("dashboard navigation, search, dialogs, and mobile layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Room for your next great idea." })).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page.getByRole("textbox", { name: "Search ideas" }).fill("garden");
  await expect(page.getByRole("button", { name: /A little garden/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /A passport/ })).toHaveCount(0);
  await page.getByRole("button", { name: /A little garden/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Room for your next great idea." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: /^Books\b/ }).click();
  await expect(page.getByRole("heading", { name: "Your growing bookshelf." })).toBeVisible();
});

test("register, persist a draft, sign out, and sign in", async ({ page }) => {
  test.skip(!process.env.AUTH_BROWSER_TEST, "Requires an isolated migrated test database");
  const email = `browser-${Date.now()}@example.test`;
  const password = "A long browser test password 123!";
  await page.goto("/");
  await page.getByRole("button", { name: "New book", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Browser Tester");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Private workspace", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New book", exact: true }).click();
  await page.getByLabel("Book title", { exact: true }).fill("Garden Words Test Book");
  await page.getByLabel("Theme", { exact: true }).fill("Gardening");
  await page.getByRole("button", { name: "Save book draft", exact: true }).click();
  await expect(page.getByRole("button", { name: /Garden Words Test Book/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Garden Words Test Book/ })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Workspace preview", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByText("Private workspace", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Books\b/ }).click();
  await expect(page.getByRole("button", { name: /Garden Words Test Book/ })).toBeVisible();
});

test("mutation endpoints require a session and a matching origin", async ({ request, baseURL }) => {
  const anonymous = await request.post("/api/books", { headers: { origin: baseURL! }, data: {} });
  expect(anonymous.status()).toBe(401);
  const crossOrigin = await request.post("/api/auth", { headers: { origin: "https://untrusted.example" }, data: {} });
  expect(crossOrigin.status()).toBe(403);
});
