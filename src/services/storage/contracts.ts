export interface StoredObject {
  key: string;
  byteSize: number;
  sha256: string;
  mediaType: string;
}

/** Keys are generated internally; private downloads require an ownership check first. */
export interface StorageService {
  put(ownerId: string, data: Uint8Array, mediaType: string): Promise<StoredObject>;
  read(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}
