import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { templateScene } from "../../modules/puzzles/templates/scene";
import type { TemplatePuzzle } from "../../modules/puzzles/templates/types";
import type { GenerationConfig } from "../../modules/books/generation-input";
export const TEMPLATE_RENDER_VERSION = "templates-1.2.0";
const color = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
export async function renderTemplatePdf(config: GenerationConfig, puzzles: TemplatePuzzle[], answersOnly = false): Promise<Uint8Array> {
  if (puzzles.length !== config.activityPages) throw new Error("Missing puzzle pages");
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(config.title);
  const pages = [
    ...(!answersOnly ? [{ number: 1, role: "FRONT_MATTER", puzzle: null }, ...puzzles.map((puzzle, i) => ({ number: i + 2, role: "ACTIVITY", puzzle }))] : []),
    ...puzzles.map((puzzle, i) => ({ number: config.activityPages + i + 2, role: "ANSWER", puzzle })),
  ];
  for (const item of pages) {
    const page = pdf.addPage([612, 792]);
    for (const op of templateScene(config, item.number, item.role, item.puzzle)) {
      switch (op.kind) {
        case "text": {
          const font = op.bold ? bold : regular, size = Math.min(op.size, op.width / Math.max(font.widthOfTextAtSize(op.text, 1), 1));
          page.drawText(op.text, { x: op.x - (op.center ? font.widthOfTextAtSize(op.text, size) / 2 : 0), y: 792 - op.y, size, font, color: color(op.color) }); break;
        }
        case "rect": page.drawRectangle({ x: op.x, y: 792 - op.y - op.h, width: op.w, height: op.h, ...(op.fill !== "none" ? { color: color(op.fill) } : {}), borderColor: color(op.stroke), borderWidth: op.weight }); break;
        case "line": page.drawLine({ start: { x: op.x, y: 792 - op.y }, end: { x: op.x2, y: 792 - op.y2 }, thickness: op.weight, color: color(op.color) }); break;
        case "path": page.drawSvgPath(op.path, { x: op.x, y: 792 - op.y, scale: op.scale, rotate: degrees(-op.angle), borderColor: color(op.stroke), borderWidth: op.weight }); break;
      }
    }
  }
  return pdf.save();
}
