import "dotenv/config";
import { getDb } from "../lib/db";
import { PostgresJobQueue } from "./queue";
import { BookGenerationHandler } from "./book-generation";
import { runWorker } from "./worker";

const db = getDb(), queue = new PostgresJobQueue(db, 120), controller = new AbortController();
process.on("SIGINT", () => controller.abort());
process.on("SIGTERM", () => controller.abort());
console.log("NicheForge generation worker ready.");
try { await runWorker(queue, { BOOK_GENERATION: new BookGenerationHandler(db, queue) }, controller.signal); }
finally { await db.$disconnect(); }
