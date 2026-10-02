import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { LocalStorage } from "../../src/services/storage/local";

it("round trips private objects with generated keys and rejects traversal", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "nicheforge-storage-"));
  try {
    const storage = new LocalStorage(root, 10);
    const stored = await storage.put(randomUUID(), new TextEncoder().encode("test"), "text/plain");
    expect(stored.sha256).toHaveLength(64);
    expect(stored.byteSize).toBe(4);
    expect(new TextDecoder().decode(await storage.read(stored.key))).toBe("test");
    expect(() => storage.read("../../secret")).toThrow("Invalid storage key");
    expect(() => storage.read("C:\\Windows\\system.ini")).toThrow();
    await expect(storage.put("../../", new Uint8Array(), "text/plain")).rejects.toThrow();
    await expect(storage.put(randomUUID(), new Uint8Array(11), "text/plain")).rejects.toThrow();
    await expect(storage.put(randomUUID(), new Uint8Array(), "text/html")).rejects.toThrow();
    await storage.remove(stored.key);
    await expect(storage.read(stored.key)).rejects.toThrow();
  } finally {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("nicheforge-storage-")) throw new Error("Unsafe test cleanup path");
    await rm(resolved, { recursive: true });
  }
});
