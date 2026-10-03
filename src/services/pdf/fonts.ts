import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument } from "pdf-lib";

const fontBytes = Promise.all([
  "@fontsource/nunito/files/nunito-latin-400-normal.woff",
  "@fontsource/nunito/files/nunito-latin-700-normal.woff",
  "@fontsource/fredoka/files/fredoka-latin-400-normal.woff",
].map(file => readFile(path.join(process.cwd(), "node_modules", file))));

export async function embedPageFonts(pdf: PDFDocument) {
  pdf.registerFontkit(fontkit);
  const bytes = await fontBytes;
  const [regular, bold, display] = await Promise.all(bytes.map(data => pdf.embedFont(data, { subset: true })));
  return { regular: regular!, bold: bold!, display: display! };
}
