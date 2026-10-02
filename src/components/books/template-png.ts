import type { Scene } from "../../modules/puzzles/templates/scene";
export async function renderScenePng(scene: Scene): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = 2550; canvas.height = 3300;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create a page image.");
  ctx.scale(2550 / 612, 3300 / 792); ctx.fillStyle = "white"; ctx.fillRect(0, 0, 612, 792);
  for (const op of scene) {
    switch (op.kind) {
      case "text": ctx.font = `${op.bold ? "bold " : ""}${op.size}px Arial`; ctx.textAlign = op.center ? "center" : "left"; ctx.fillStyle = op.color; ctx.fillText(op.text, op.x, op.y, op.width); break;
      case "rect": if (op.fill !== "none") { ctx.fillStyle = op.fill; ctx.fillRect(op.x, op.y, op.w, op.h); } ctx.strokeStyle = op.stroke; ctx.lineWidth = op.weight; ctx.strokeRect(op.x, op.y, op.w, op.h); break;
      case "line": ctx.strokeStyle = op.color; ctx.lineWidth = op.weight; ctx.beginPath(); ctx.moveTo(op.x, op.y); ctx.lineTo(op.x2, op.y2); ctx.stroke(); break;
      case "path": ctx.save(); ctx.translate(op.x, op.y); ctx.rotate(op.angle * Math.PI / 180); ctx.scale(op.scale, op.scale); ctx.strokeStyle = op.stroke; ctx.lineWidth = op.weight; ctx.stroke(new Path2D(op.path)); ctx.restore(); break;
    }
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => { canvas.width = 0; canvas.height = 0; if (blob) resolve(blob); else reject(new Error("Could not create the PNG.")); }, "image/png"));
}
