"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowDownToLine, BookOpenText, Check, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import { wordSearchScene } from "../../modules/puzzles/word-search/scene";
import { templateName, type TemplateKey } from "../../modules/puzzles/templates/catalog";
import { templateScene } from "../../modules/puzzles/templates/scene";
import type { TemplatePuzzle } from "../../modules/puzzles/templates/types";
import { TemplatePreview, ScenePreview } from "./template-preview";
import { renderScenePng } from "./template-png";
import { renderPagePng } from "./page-png";
import { bookFilename, pageFilename, createPagesZip, saveDownload } from "./png-download";
import { BookForm } from "../dashboard/forms";
import type { WordSearchData, WordSearchSolution } from "../../modules/puzzles/word-search/engine";

interface BookState {
  book: { id: string; title: string; status: string; pageCount: number; currentRevision: number; requestedActivityPages: number; uniquenessScore: number | null; jobs: { status: string; progress: number; currentStep: string; errorCode: string | null }[] };
  configuration: { title: string; theme: string; difficulty: string; wordsPerPuzzle?: number; templateKey?: TemplateKey; words?: string[] };
  approved: boolean;
  exports: { id: string; format: string }[];
  validation: { checkedPages: number; results: { id: string; message: string }[] } | null;
  uniqueness: { comparedPuzzles: number } | null;
  page: { pageNumber: number; role: string; title: string; puzzle: { data: WordSearchData; solution: WordSearchSolution } | Pick<TemplatePuzzle, "data" | "solution"> | null } | null;
}
const failureMessages: Record<string, string> = {
  CROSSWORD_PLACEMENT: "These answers did not form a connected crossword. Try a larger set of words with shared letters.",
  TEMPLATE_VARIATIONS_EXHAUSTED: "This template could not produce another distinct puzzle. Try fewer pages or different settings.",
  WORD_POOL_EXHAUSTED: "The word collection could not produce enough different puzzle sets. Use a larger custom list or another collection for your next book.",
  TEXT_OVERFLOW: "The title or theme is too long for the print layout. Please create a book with a shorter title or theme.",
  HANDLER_FAILED: "Generation was interrupted. You can retry and keep your completed pages.",
  LEASE_EXHAUSTED: "The worker stopped before completing this book. Retry to resume saved pages.",
};

export function BookWorkspace({ id }: { id: string }) {
  const [data, setData] = useState<BookState | null>(null), [page, setPage] = useState(1), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [actionError, setActionError] = useState("");
  const [downloading, setDownloading] = useState(false), [downloadError, setDownloadError] = useState("");
  const [pngPage, setPngPage] = useState(1), [downloadProgress, setDownloadProgress] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/books/${id}?page=${page}`, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) { setError(result.error); return; }
      setData(result); setError("");
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setError("Connection interrupted. Your saved pages are safe."); }
  }, [id, page]);
  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => { void load(controller.signal); }, 0);
    const timer = window.setInterval(() => { void load(controller.signal); }, 2000);
    return () => { controller.abort(); window.clearTimeout(initialLoad); window.clearInterval(timer); };
  }, [load]);
  async function action(name: "approve" | "retry") {
    setBusy(true); setActionError("");
    try {
      const response = await fetch(`/api/books/${id}/${name}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) setActionError(result.error ?? "Could not complete this action."); else await load();
    } catch { setActionError("Could not complete this action. Please try again."); }
    finally { setBusy(false); }
  }
  async function downloadPng(allPages = false) {
    if (!data?.approved || downloading) return;
    setDownloading(true); setDownloadError("");
    setDownloadProgress(allPages ? `Preparing 0 of ${data.book.pageCount} pages...` : `Preparing page ${pngPage}...`);
    try {
      const render = async (pageNumber: number) => {
        const response = await fetch(`/api/books/${id}?page=${pageNumber}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load a page. Please try again or sign in again.");
        const result: BookState = await response.json();
        if (!result.approved || result.book.currentRevision !== data.book.currentRevision) throw new Error("This book has changed. Refresh and approve the current edition before downloading.");
        if (!result.page || result.page.pageNumber !== pageNumber) throw new Error(`Page ${pageNumber} is not ready to download.`);
        if (result.configuration.templateKey && result.configuration.templateKey !== "word-search") {
          return renderScenePng(templateScene({ ...result.configuration, title: result.book.title, activityPages: result.book.requestedActivityPages }, result.page.pageNumber, result.page.role, result.page.puzzle as Pick<TemplatePuzzle, "data" | "solution"> | null));
        }
        return renderPagePng({ ...result.page, puzzle: result.page.puzzle as { data: WordSearchData; solution: WordSearchSolution } | null }, result.book, result.configuration);
      };
      if (allPages) {
        const blob = await createPagesZip(data.book.title, data.book.pageCount, render, completed => setDownloadProgress(`Preparing ${completed} of ${data.book.pageCount} pages...`));
        saveDownload(blob, `${bookFilename(data.book.title)}-all-pages.zip`);
      } else {
        saveDownload(await render(pngPage), pageFilename(data.book.title, pngPage));
      }
      setDownloadProgress(allPages ? "All pages are ready. Your ZIP download has started." : `Page ${pngPage} PNG download has started.`);
    } catch (error) { setDownloadProgress(""); setDownloadError(error instanceof Error ? error.message : "Could not download the pages. Please try again."); }
    finally { setDownloading(false); }
  }
  const job = data?.book.jobs[0], generating = job && ["QUEUED", "RUNNING", "RETRY_WAIT"].includes(job.status);
  const failed = job && ["NEEDS_REVIEW", "FAILED"].includes(job.status);
  const total = data?.book.pageCount || 1 + 2 * (data?.book.requestedActivityPages ?? 0);
  const preview = data?.page;
  const isTemplate = !!data?.configuration.templateKey && data.configuration.templateKey !== "word-search";
  const puzzle = !isTemplate ? preview?.puzzle as { data: WordSearchData; solution: WordSearchSolution } | null : null;
  return <main className="book-workspace"><header className="book-toolbar"><Link href="/" className="text-button"><ArrowLeft size={17} /> Back to library</Link><span><BookOpenText size={18} /> NicheForge Books</span></header>
    {error && <p role="alert" className="notice">{error}</p>}
    {actionError && <p role="alert" className="notice">{actionError}</p>}
    {!data ? <div className="collection-empty"><LoaderCircle className="spin" /><p>Loading your book…</p></div> : <>
      <div className="book-workspace-heading"><div className="eyebrow">{templateName(data.configuration.templateKey, !!data.configuration.words?.length).toUpperCase()} STUDIO</div><h1>{data.book.title}</h1><p className="muted">{data.book.requestedActivityPages} puzzles · Complete answer keys · 8.5 × 11 inches{!isTemplate && " · Large print"}</p></div>
      {data.book.status === "DRAFT" ? <section className="panel existing-draft"><h2>Turn your draft into a complete book</h2><BookForm existingBookId={id} initialTitle={data.book.title} initialTheme={data.configuration.theme} initialTemplateKey={data.configuration.templateKey} done={() => void load()} /></section> : <div className="reader-layout"><section className="reader-main">
        {generating && <div className="generation-progress" role="status"><div><LoaderCircle size={18} className="spin" /><strong>{job.currentStep}</strong><span>{job.progress}%</span></div><progress max={100} value={job.progress} /><p>You can leave this page. Generation continues in the background.</p>{job.status === "QUEUED" && <p>The background worker picks up queued books automatically when running. If this stays queued, run <code>npm run worker</code>.</p>}</div>}
        {failed && <div role="alert" className="notice"><strong>Generation needs attention</strong><p>{failureMessages[job.errorCode ?? ""] ?? "A validation check did not pass. Retry to resume saved pages, or create a new book with different settings."}</p><Button variant="outline" disabled={busy} onClick={() => void action("retry")}><RefreshCw size={15} />Retry saved book</Button></div>}
        <div className="reader-controls"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)} aria-label="Previous page"><ChevronLeft size={17} /></Button><label>Page <select aria-label="Book page" value={page} onChange={event => setPage(Number(event.target.value))}>{Array.from({ length: total }, (_, i) => <option key={i} value={i + 1}>{i + 1} — {i === 0 ? "Title page" : i <= data.book.requestedActivityPages ? `Puzzle ${i}` : `Answer ${i - data.book.requestedActivityPages}`}</option>)}</select> of {total}</label><Button variant="outline" disabled={page >= total} onClick={() => setPage(value => value + 1)} aria-label="Next page"><ChevronRight size={17} /></Button></div>
        {isTemplate && preview ? <TemplatePreview book={{ ...data.configuration, title: data.book.title, activityPages: data.book.requestedActivityPages }} page={{ ...preview, puzzle: preview.puzzle as Pick<TemplatePuzzle, "data" | "solution"> | null }} /> : preview ? <ScenePreview label="Book page preview" scene={wordSearchScene({ ...data.configuration, title: data.book.title, activityPages: data.book.requestedActivityPages }, preview.pageNumber, preview.role, puzzle)} /> : <div className="preview-wait"><LoaderCircle className="spin" /><p>This page is still being generated.</p></div>}

      </section><aside className="reader-sidebar"><div className="panel review-card"><ShieldCheck size={25} /><h2>{data.approved ? "Approved and ready" : data.book.status === "VALIDATED" ? "Ready for your review" : "Your book is taking shape"}</h2><p>{data.approved ? "Your PDF includes the title page, every puzzle, and all answer keys." : "Check the puzzles and answer pages, then approve this edition to download it."}</p>
        {data.validation && <ul>{data.validation.results.map(result => <li key={result.id}><Check size={14} />{result.message}</li>)}</ul>}
        {data.book.uniquenessScore !== null && <div className="differentiation"><strong>{data.book.uniquenessScore}%</strong><span>Word-set differentiation</span><small>Based on word overlap with this book and {data.uniqueness?.comparedPuzzles ?? 0} recent library puzzles. Exact duplicate puzzles and sets are blocked. This is not an originality guarantee.</small></div>}
        {!data.approved && data.book.status === "VALIDATED" && <><label className="approval-checkbox"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I have reviewed the content and answer pages.</label><Button disabled={!reviewed || busy} onClick={() => void action("approve")}>Approve this book <Check size={16} /></Button></>}
        <div className="download-buttons">
          <h3>Downloads</h3>
          {data.approved ? <><Button asChild><a href={`/api/books/${id}/download`}><ArrowDownToLine size={16} />Download book PDF</a></Button><Button variant="outline" asChild><a href={`/api/books/${id}/download?format=answers`}><ArrowDownToLine size={16} />Answer key PDF</a></Button></> : <><Button disabled><ArrowDownToLine size={16} />Download book PDF</Button><Button variant="outline" disabled><ArrowDownToLine size={16} />Answer key PDF</Button></>}
          <label className="png-page-picker" htmlFor="png-page">Choose a page for PNG
            <select id="png-page" value={pngPage} disabled={!data.approved || downloading} onChange={event => setPngPage(Number(event.target.value))}>
              {Array.from({ length: total }, (_, i) => <option key={i + 1} value={i + 1}>Page {i + 1} - {i === 0 ? "Title page" : i <= data.book.requestedActivityPages ? `Puzzle ${i}` : `Answer ${i - data.book.requestedActivityPages}`}</option>)}
            </select>
          </label>
          <Button variant="outline" disabled={!data.approved || downloading} onClick={() => void downloadPng()}><ArrowDownToLine size={16} />Download selected page PNG</Button>
          <Button variant="outline" disabled={!data.approved || downloading} onClick={() => void downloadPng(true)}><ArrowDownToLine size={16} />Download all pages PNG (ZIP)</Button>
          {downloadProgress && <p role="status">{downloading && <LoaderCircle size={16} className="spin" />} {downloadProgress}</p>}
          <p className="muted">{data.approved ? "Choose any page above, or save every title, puzzle, and answer page in one ZIP. Each PNG is 2550 x 3300 pixels." : "Downloads unlock after generation finishes and you review and approve this book."}</p>
          {downloadError && <p role="alert">{downloadError}</p>}
        </div>
      </div><div className="panel book-specifications"><h3>Inside your book</h3><dl><div><dt>Puzzle pages</dt><dd>{data.book.requestedActivityPages}</dd></div><div><dt>Answer pages</dt><dd>{data.book.requestedActivityPages}</dd></div><div><dt>Title page</dt><dd>1</dd></div><div><dt>Total pages</dt><dd>{total}</dd></div>{!isTemplate && <div><dt>Words per puzzle</dt><dd>{data.configuration.wordsPerPuzzle ?? 20}</dd></div>}<div><dt>Template</dt><dd>{templateName(data.configuration.templateKey, !!data.configuration.words?.length)}</dd></div><div><dt>Language</dt><dd>English</dd></div></dl></div></aside></div>}
    </>}
  </main>;
}
