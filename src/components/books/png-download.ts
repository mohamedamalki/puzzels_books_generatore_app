import { zipSync } from "fflate";

export function bookFilename(title: string) {
  return title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "book";
}

export function pageFilename(title: string, page: number) {
  return `${bookFilename(title)}-page-${String(page).padStart(3, "0")}.png`;
}

export async function createPagesZip(title: string, pageCount: number, render: (page: number) => Promise<Blob>, progress: (completed: number) => void): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  for (let page = 1; page <= pageCount; page++) {
    files[pageFilename(title, page)] = new Uint8Array(await (await render(page)).arrayBuffer());
    progress(page);
  }
  // PNG is already compressed; storing it avoids unnecessary compression work.
  return new Blob([new Uint8Array(zipSync(files, { level: 0 }))], { type: "application/zip" });
}

export function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
