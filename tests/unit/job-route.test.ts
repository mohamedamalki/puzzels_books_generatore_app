import { beforeEach, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({ userId: vi.fn(), findFirst: vi.fn() }));
vi.mock("../../src/modules/auth/session", () => ({ currentUserId: dependencies.userId }));
vi.mock("../../src/lib/db", () => ({ getDb: () => ({ generationJob: { findFirst: dependencies.findFirst } }) }));

import { GET } from "../../src/app/api/jobs/[id]/route";

const id = "118317c9-ded1-4b80-b7f2-d0d6f4b56696";
const request = new Request(`http://localhost/api/jobs/${id}`);
beforeEach(() => { vi.clearAllMocks(); });

it("rejects unauthenticated requests without querying jobs", async () => {
  dependencies.userId.mockResolvedValue(null);
  const response = await GET(request, { params: Promise.resolve({ id }) });
  expect(response.status).toBe(401);
  expect(dependencies.findFirst).not.toHaveBeenCalled();
});

it("validates identifiers before querying", async () => {
  dependencies.userId.mockResolvedValue("owner");
  const response = await GET(request, { params: Promise.resolve({ id: "invalid" }) });
  expect(response.status).toBe(400);
  expect(dependencies.findFirst).not.toHaveBeenCalled();
});

it("scopes queries to the session owner and hides absent or foreign jobs", async () => {
  dependencies.userId.mockResolvedValue("owner");
  dependencies.findFirst.mockResolvedValue(null);
  const response = await GET(request, { params: Promise.resolve({ id }) });
  expect(response.status).toBe(404);
  expect(dependencies.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id, userId: "owner" } }));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("returns only the selected job progress fields", async () => {
  dependencies.userId.mockResolvedValue("owner");
  dependencies.findFirst.mockResolvedValue({ id, status: "RUNNING", progress: 20 });
  const response = await GET(request, { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  const query = dependencies.findFirst.mock.calls[0]?.[0];
  expect(query.select.payload).toBeUndefined();
  expect(query.select.leaseToken).toBeUndefined();
  expect(query.select.userId).toBeUndefined();
});
