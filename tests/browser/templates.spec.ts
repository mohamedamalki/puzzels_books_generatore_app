import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { puzzleTemplates } from "../../src/modules/puzzles/templates/catalog";
const topicWords = "PUMPKIN GHOST WITCH BROOM SPIDER CANDY COSTUME BAT MOON NIGHT TRICK TREAT MASK CANDLE LANTERN RAVEN BLACK ORANGE SKELETON MONSTER VAMPIRE CAULDRON COBWEB HAUNTED".split(" ");

test("all templates create, approve, preview, and download complete books", async ({ page, baseURL }, testInfo) => {
  test.skip(!process.env.AUTH_BROWSER_TEST, "Requires the isolated migrated test database");
  test.setTimeout(240000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const response = await page.request.post("/api/auth", { headers: { origin: baseURL! }, data: { mode: "register", name: "Template Tester", email: `templates-${Date.now()}@example.test`, password: "Template testing password 123!" } });
  expect(response.ok()).toBe(true);
  for (const template of puzzleTemplates) {
    await page.goto("/");
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: template.name, exact: true }) });
    await card.getByRole("button", { name: "Use template" }).click();
    await expect(page.getByLabel("Puzzle template", { exact: true })).toHaveValue(template.key);
    await page.getByLabel("Book title", { exact: true }).fill(`Halloween ${template.name}`);
    await page.getByLabel("Word collection", { exact: true }).selectOption("custom");
    await page.getByLabel("Topic", { exact: true }).fill("Halloween");
    await page.getByLabel("Your words", { exact: false }).fill(topicWords.join("\n"));
    await page.getByLabel("Number of puzzles").fill("3");
    await page.getByRole("button", { name: "Generate my book" }).click();
    await expect(page).toHaveURL(/\/books\/[a-f0-9-]+/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Ready for your review" })).toBeVisible({ timeout: 60000 });
    const saved = await (await page.request.get(`/api${new URL(page.url()).pathname}?page=2`)).json();
    expect(saved.configuration.theme).toBe("Halloween");
    expect(saved.configuration.words).toEqual(topicWords);
    await page.getByLabel("Book page", { exact: true }).selectOption("2");
    if (template.key !== "word-search") await expect(page.getByRole("img", { name: "Puzzle page 2" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${template.key}-activity.png`), fullPage: true });
    await page.getByLabel("Book page", { exact: true }).selectOption("5");
    if (template.key !== "word-search") await expect(page.getByRole("img", { name: "Answer page 5" })).toBeVisible();
    await page.getByRole("checkbox").check();
    if (template.key === "word-search") {
      // Polling the book must not silently erase a failed approval message.
      await page.route("**/approve", route => route.fulfill({ status: 503, json: { error: "Approval is temporarily unavailable. Try again." } }), { times: 1 });
      await page.getByRole("button", { name: "Approve this book" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "Approval is temporarily unavailable" })).toBeVisible();
      await page.waitForResponse(response => response.url().includes("?page=") && response.status() === 200);
      await expect(page.getByRole("alert").filter({ hasText: "Approval is temporarily unavailable" })).toBeVisible();
    }
    const approval = page.waitForResponse(response => response.url().endsWith("/approve") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Approve this book" }).click();
    expect((await approval).status()).toBe(200);
    await expect(page.getByRole("link", { name: "Download book PDF", exact: true })).toBeVisible();
    const href = await page.getByRole("link", { name: "Download book PDF", exact: true }).getAttribute("href");
    const pdfResponse = await page.request.get(href!);
    expect(pdfResponse.status()).toBe(200);
    expect((await PDFDocument.load(await pdfResponse.body())).getPageCount()).toBe(7);
    const answersHref = await page.getByRole("link", { name: "Answer key PDF", exact: true }).getAttribute("href");
    const answersResponse = await page.request.get(answersHref!);
    expect(answersResponse.status()).toBe(200);
    expect((await PDFDocument.load(await answersResponse.body())).getPageCount()).toBe(3);
    await page.getByLabel("Choose a page for PNG").selectOption("2");
    const single = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download selected page PNG", exact: true }).click();
    const pngDownload = await single, pngPath = testInfo.outputPath(`${template.key}.png`);
    await pngDownload.saveAs(pngPath);
    const png = await readFile(pngPath);
    expect(png.readUInt32BE(16)).toBe(2550); expect(png.readUInt32BE(20)).toBe(3300);
    expect(pngDownload.suggestedFilename()).toContain("page-002");
    const bulk = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download all pages PNG (ZIP)", exact: true }).click();
    const zipPath = testInfo.outputPath(`${template.key}.zip`); await (await bulk).saveAs(zipPath);
    const files = unzipSync(await readFile(zipPath));
    expect(Object.keys(files)).toHaveLength(7);
    expect(Object.keys(files).every(name => name.endsWith(".png"))).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("template catalog fits on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await expect(page.locator(".puzzle-template-card")).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
