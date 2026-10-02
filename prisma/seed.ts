import "dotenv/config";
import { getDb } from "../src/lib/db";
import { puzzleTemplates, TEMPLATE_ENGINE_VERSION } from "../src/modules/puzzles/templates/catalog";

const db = getDb();
try {
  for (const template of puzzleTemplates) {
  await db.bookType.upsert({ where: { key: template.key }, update: { enabled: true, name: template.name }, create: {
    key: template.key, name: template.name, pluginVersion: "1.0.0", enabled: true,
    configurationSchema: { type: "object", description: "Reserved catalog entry. Runtime plugin validation is authoritative." },
  } });
  const engineVersion = template.key === "word-search" ? "1.0.0" : TEMPLATE_ENGINE_VERSION;
  await db.puzzleType.upsert({ where: { key: template.key }, update: { engineVersion }, create: { key: template.key, engineVersion } });
  }
} finally { await db.$disconnect(); }
