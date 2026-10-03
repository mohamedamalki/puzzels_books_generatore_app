import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { embedPageFonts } from "../../src/services/pdf/fonts";
import { pageTextSize } from "../../src/modules/puzzles/templates/page-typography";

it("fits wide titles and puzzle words using the embedded print fonts in every renderer", async () => {
  const fonts = await embedPageFonts(await PDFDocument.create());
  for (const face of ["regular", "bold", "display"] as const) {
    for (const text of ["W".repeat(25), "FRANKENSTEIN", "My Little Book of Discoveries"]) {
      const op = { kind: "text" as const, text, x: 0, y: 0, width: 84, size: 32, bold: face === "bold", display: face === "display", center: true, color: "#000000" };
      const size = pageTextSize(op);
      expect(size).toBeGreaterThan(0);
      expect(fonts[face].widthOfTextAtSize(text, size)).toBeLessThanOrEqual(op.width + .01);
    }
  }
});
