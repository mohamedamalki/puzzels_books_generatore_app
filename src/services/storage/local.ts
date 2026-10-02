import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageService, StoredObject } from "./contracts";

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ownerPattern = new RegExp(`^${uuid}$`);
const keyPattern = new RegExp(`^${uuid}/${uuid}$`);
const allowedTypes = new Set(["application/pdf", "application/json", "application/zip", "image/png", "image/jpeg", "text/plain"]);

export class LocalStorage implements StorageService {
  private readonly root: string;
  constructor(root: string, private readonly maxBytes = 100 * 1024 * 1024) { this.root = path.resolve(root); }

  async put(ownerId: string, data: Uint8Array, mediaType: string): Promise<StoredObject> {
    if (!ownerPattern.test(ownerId) || !allowedTypes.has(mediaType) || data.byteLength > this.maxBytes) throw new Error("Invalid storage input");
    const key = `${ownerId}/${randomUUID()}`;
    const destination = this.resolve(key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, data, { flag: "wx", mode: 0o600 });
    return { key, byteSize: data.byteLength, sha256: createHash("sha256").update(data).digest("hex"), mediaType };
  }

  read(key: string): Promise<Uint8Array> { return readFile(this.resolve(key)); }
  async remove(key: string): Promise<void> { await unlink(this.resolve(key)); }

  private resolve(key: string): string {
    if (!keyPattern.test(key)) throw new Error("Invalid storage key");
    const target = path.resolve(this.root, ...key.split("/"));
    const relative = path.relative(this.root, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Storage path escapes root");
    return target;
  }
}
