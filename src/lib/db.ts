import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalDb = globalThis as unknown as { nicheforgeDb?: PrismaClient };

export function getDb(): PrismaClient {
  if (!globalDb.nicheforgeDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    globalDb.nicheforgeDb = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return globalDb.nicheforgeDb;
}
