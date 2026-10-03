import { pageTextSize } from "../../modules/puzzles/templates/page-typography";
import { templateScene } from "../../modules/puzzles/templates/scene";
import type { Scene } from "../../modules/puzzles/templates/scene";
import type { TemplatePuzzle } from "../../modules/puzzles/templates/types";

export function TemplatePreview({ book, page }: { book: { title: string; theme: string; activityPages: number; templateKey?: string }; page: { pageNumber: number; role: string; puzzle: Pick<TemplatePuzzle, "data" | "solution"> | null } }) {
  return <ScenePreview scene={templateScene(book, page.pageNumber, page.role, page.puzzle)} label={`${page.role === "ANSWER" ? "Answer" : "Puzzle"} page ${page.pageNumber}`} />;
}

export function ScenePreview({ scene, label }: { scene: Scene; label: string }) {
  return <svg className="template-page-preview" viewBox="0 0 612 792" role="img" aria-label={label}>
    <rect width="612" height="792" fill="white" />
    {scene.map((op, i) => {
      switch (op.kind) {
        case "text": return <text key={i} x={op.x} y={op.y} fontSize={pageTextSize(op)} fontFamily={op.display ? "Fredoka, sans-serif" : "Nunito, sans-serif"} fontWeight={!op.display && op.bold ? "bold" : "normal"} textAnchor={op.center ? "middle" : "start"} fill={op.color}>{op.text}</text>;
        case "rect": return <rect key={i} x={op.x} y={op.y} width={op.w} height={op.h} fill={op.fill} stroke={op.stroke} strokeWidth={op.weight} />;
        case "line": return <line key={i} x1={op.x} y1={op.y} x2={op.x2} y2={op.y2} stroke={op.color} strokeWidth={op.weight} />;
        case "path": return <path key={i} d={op.path} transform={`translate(${op.x} ${op.y}) rotate(${op.angle}) scale(${op.scale})`} fill={op.fill} stroke={op.stroke} strokeWidth={op.weight} />;
      }
    })}
  </svg>;
}
