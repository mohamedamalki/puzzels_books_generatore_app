import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), book: vi.fn(), artifact: vi.fn(), revision: vi.fn(), pages: vi.fn(), render: vi.fn(), read: vi.fn() }));
vi.mock("../../src/modules/auth/session", () => ({ currentUserId: mocks.user }));
vi.mock("../../src/lib/db", () => ({ getDb: () => ({ book: { findFirst: mocks.book }, export: { findFirst: mocks.artifact }, bookRevision: { findFirstOrThrow: mocks.revision }, bookPage: { findMany: mocks.pages } }) }));
vi.mock("../../src/services/pdf/word-search", () => ({ WORD_SEARCH_RENDER_VERSION: "1.4.0", renderWordSearchPdf: mocks.render }));
vi.mock("../../src/services/storage/local", () => ({ LocalStorage: class { read = mocks.read; } }));
import { GET } from "../../src/app/api/books/[id]/download/route";
const id = "118317c9-ded1-4b80-b7f2-d0d6f4b56696";
const context = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue("owner");
  mocks.book.mockResolvedValue({ id, slug: "autumn", currentRevision: 1 });
  mocks.artifact.mockResolvedValue({ revisionId: "revision", renderVersion: "1.0.0", asset: { storageKey: "saved" } });
  mocks.revision.mockResolvedValue({ id: "revision", configuration: { activityPages: 1 } });
  mocks.pages.mockResolvedValue([{ puzzle: { engineVersion: "1.0.0", seed: "original", data: { grid: [] }, solution: { placements: [] } } }]);
  mocks.render.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
});
it("refreshes old answer PDFs from approved saved puzzles without replacing their content", async () => {
  const result = await GET(new Request(`http://localhost/api/books/${id}/download?format=answers`), context);
  expect(result.status).toBe(200);
  expect(mocks.render).toHaveBeenCalledWith({ activityPages: 1 }, [expect.objectContaining({ seed: "original", solution: { placements: [] } })], true);
  expect(mocks.pages).toHaveBeenCalledWith(expect.objectContaining({ where: { revisionId: "revision", userId: "owner", role: "ACTIVITY" }, orderBy: { pageNumber: "asc" } }));
  expect(mocks.read).not.toHaveBeenCalled();
});
it("does not expose downloads before approval", async () => {
  mocks.book.mockResolvedValue(null);
  expect((await GET(new Request(`http://localhost/api/books/${id}/download`), context)).status).toBe(403);
  expect(mocks.render).not.toHaveBeenCalled();
});
it("re-renders existing 1.3 covers with the corrected whole-word title layout", async () => {
  mocks.artifact.mockResolvedValue({ revisionId: "revision", renderVersion: "1.3.0", asset: { storageKey: "saved" } });
  expect((await GET(new Request(`http://localhost/api/books/${id}/download`), context)).status).toBe(200);
  expect(mocks.render).toHaveBeenCalledWith({ activityPages: 1 }, [expect.objectContaining({ seed: "original" })], false);
  expect(mocks.read).not.toHaveBeenCalled();
});
it("serves current stored PDFs without re-rendering", async () => {
  mocks.artifact.mockResolvedValue({ renderVersion: "1.4.0", asset: { storageKey: "saved" } });
  mocks.read.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  expect((await GET(new Request(`http://localhost/api/books/${id}/download`), context)).status).toBe(200);
  expect(mocks.read).toHaveBeenCalledWith("saved");
  expect(mocks.render).not.toHaveBeenCalled();
});
