import { expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { layoutBookTitle } from "../../src/modules/books/title-layout";

for (const fontName of [StandardFonts.Helvetica, StandardFonts.TimesRoman]) {
  it(`keeps the Halloween title's words intact using ${fontName} metrics`, async () => {
    const font = await (await PDFDocument.create()).embedFont(fontName);
    const input = "Halloween Word Search Puzzles for Kids";
    const { lines, size } = layoutBookTitle(input, (text, size) => font.widthOfTextAtSize(text, size));
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(input);
    expect(lines.some(line => line.split(" ").includes("Puzzles"))).toBe(true);
    expect(size).toBe(34);
    lines.forEach(line => expect(font.widthOfTextAtSize(line, size)).toBeLessThanOrEqual(464));
  });
}

it("fits a long title and an oversized single word without splitting or dropping words", async () => {
  const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  for (const input of ["Wonderful Halloween Adventures ".repeat(4).trim(), "W".repeat(120)]) {
    const { lines, size } = layoutBookTitle(input, (text, size) => font.widthOfTextAtSize(text, size));
    expect(lines.join(" ")).toBe(input);
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(size).toBeGreaterThan(0);
    lines.forEach(line => expect(font.widthOfTextAtSize(line, size)).toBeLessThanOrEqual(464.000001));
  }
});
