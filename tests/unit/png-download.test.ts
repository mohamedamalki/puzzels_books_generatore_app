import { expect, it, vi } from "vitest";
import { unzipSync } from "fflate";
import { createPagesZip, pageFilename } from "../../src/components/books/png-download";

it("packages every page in order with distinct filenames and intact image bytes", async () => {
  const progress = vi.fn();
  const render = vi.fn(async (page: number) => new Blob([new Uint8Array([137, 80, 78, 71, page])]));
  const blob = await createPagesZip("Garden Book", 3, render, progress);
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  expect(blob.type).toBe("application/zip");
  expect(Object.keys(files)).toEqual(["Garden-Book-page-001.png", "Garden-Book-page-002.png", "Garden-Book-page-003.png"]);
  expect([...files["Garden-Book-page-003.png"]!]).toEqual([137, 80, 78, 71, 3]);
  expect(render.mock.calls.map(([page]) => page)).toEqual([1, 2, 3]);
  expect(progress.mock.calls).toEqual([[1], [2], [3]]);
});

it("rejects an incomplete export instead of downloading a ZIP with missing pages", async () => {
  const render = vi.fn(async (page: number) => {
    if (page === 2) throw new Error("Page unavailable");
    return new Blob(["page"]);
  });
  await expect(createPagesZip("Book", 3, render, () => {})).rejects.toThrow("Page unavailable");
  expect(render).toHaveBeenCalledTimes(2);
});

it("uses a safe fallback name and preserves the selected page number", () => {
  expect(pageFilename("/../", 101)).toBe("book-page-101.png");
});
