"use client";
import { useState, useRef, type FormEvent } from "react";
import { LoaderCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import { puzzleTemplates, minimumTemplateWords, templateWordHelp, type TemplateKey } from "../../modules/puzzles/templates/catalog";
import { mathTopics, type MathTopic } from "../../modules/puzzles/templates/math-topics";
import { themeOptions, themeKey } from "../../modules/books/word-banks";

export function AuthForm({ initialMode, connected, done }: { initialMode: "login" | "register"; connected: boolean; done: () => void }) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, name: mode === "register" ? fields.get("name") : undefined, email: fields.get("email"), password: fields.get("password") }) });
      const result = await response.json();
      if (!response.ok) setError(result.error); else done();
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form-stack">
    <p className="muted">{mode === "register" ? "A home for your next great book. Create your private publishing workspace." : "Welcome back. Your publishing workspace is waiting."}</p>
    {!connected && <div className="notice">A database connection is needed to save accounts. Open Settings for the local setup steps.</div>}
    {mode === "register" && <label>Your name<input name="name" placeholder="Alex Morgan" autoComplete="name" maxLength={80} required /></label>}
    <label>Email address<input name="email" type="email" placeholder="you@example.com" autoComplete="email" maxLength={320} required /></label>
    <label>Password<input name="password" type="password" placeholder="At least 12 characters" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={12} maxLength={128} required /></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    <Button type="submit" disabled={busy || !connected}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{mode === "register" ? "Create account" : "Sign in"}<ArrowRight size={16} /></Button>
    <p className="form-switch">{mode === "register" ? "Already have an account?" : "New to NicheForge?"} <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>{mode === "register" ? "Sign in" : "Create an account"}</button></p>
    <div className="security-note"><ShieldCheck size={15} /> Your books and content stay in your workspace.</div>
  </form>;
}

export function BookForm({ initialTitle = "", initialTheme = "", existingBookId, initialTemplateKey = "word-search", done }: { initialTemplateKey?: TemplateKey; initialTitle?: string; initialTheme?: string; existingBookId?: string; done: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState(themeKey(initialTheme) || (initialTheme ? "custom" : "gardening"));
  const [pages, setPages] = useState(20);
  const [templateKey, setTemplateKey] = useState<TemplateKey>(initialTemplateKey);
  const [mathTopic, setMathTopic] = useState<MathTopic>(mathTopics.find(topic => topic.label === initialTheme)?.key ?? "addition");
  const isMathMaze = templateKey === "math-maze";
  const [customClues, setCustomClues] = useState(false);
  const usesOwnClues = templateKey === "crossword" && customClues;
  const requestId = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      requestId.current ??= crypto.randomUUID();
      const response = await fetch(existingBookId ? `/api/books/${existingBookId}/generate` : "/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: fields.get("title"), mathTopic: isMathMaze ? mathTopic : undefined, theme: isMathMaze ? mathTopics.find(topic => topic.key === mathTopic)!.label : source === "custom" ? fields.get("theme") : themeOptions.find(option => option.key === source)?.label, audience: fields.get("audience"), difficulty: fields.get("difficulty"), activityPages: Number(fields.get("pages")), templateKey, picture: templateKey === "color-by-code" ? fields.get("picture") : undefined, clueList: templateKey === "crossword" && customClues ? fields.get("clueList") : undefined, wordSource: isMathMaze ? undefined : source, customWords: !isMathMaze && source === "custom" && !usesOwnClues ? fields.get("words") : undefined, requestId: requestId.current }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error); requestId.current = null; } else done(result.id);
    } catch { setError("Could not start generation. Please try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form-stack"><p className="muted">Choose a reusable puzzle template. Each book includes activity pages, checked answer keys, PDF downloads, and individual page PNGs. No AI key needed.</p>
    <label>Puzzle template<select aria-label="Puzzle template" value={templateKey} onChange={event => setTemplateKey(event.target.value as TemplateKey)}>{puzzleTemplates.map(template => <option key={template.key} value={template.key}>{template.name}</option>)}</select></label>
    <p className="small muted">{puzzleTemplates.find(template => template.key === templateKey)?.details}</p>
    <label>Book title<input name="title" defaultValue={initialTitle} placeholder="Cottage Garden Word Search" minLength={3} maxLength={120} required /></label>
    <div className="form-grid">{isMathMaze ? <label>Math topic<select aria-label="Math topic" value={mathTopic} onChange={event => setMathTopic(event.target.value as MathTopic)}>{mathTopics.map(topic => <option key={topic.key} value={topic.key}>{topic.label}</option>)}</select></label> : <label>Word collection<select aria-label="Word collection" value={source} onChange={event => setSource(event.target.value)}>{themeOptions.map(option => <option value={option.key} key={option.key}>{option.label}</option>)}<option value="custom">My own words</option></select></label>}<label>Audience<select name="audience"><option>Adults</option><option>Seniors</option><option>Kids 6–8</option><option>Teens</option><option>Language learners</option></select></label></div>
    {!isMathMaze && source === "custom" && <><label>Topic<input name="theme" defaultValue={initialTheme} placeholder="For example: Halloween, dinosaurs, or space" maxLength={80} required /></label>{!usesOwnClues && <label>Your words<textarea name="words" placeholder={`Paste at least ${minimumTemplateWords[templateKey]} different words, separated by commas or new lines.`} rows={5} maxLength={12000} required /><span className="small muted">At least {minimumTemplateWords[templateKey]} different words, each {templateKey === "secret-code" ? 2 : 3}-{templateKey === "crossword" ? 12 : 15} English letters. Numbered and bulleted lists work too.</span></label>}</>}
    <p className="small muted">{templateWordHelp[templateKey]}</p>
    {templateKey === "crossword" && <><label>Clue style<select value={customClues ? "custom" : "builtin"} onChange={event => setCustomClues(event.target.value === "custom")}><option value="builtin">Automatic scrambled-letter hints</option><option value="custom">My own answers and clues</option></select></label>{customClues && <label>Answers and clues<textarea name="clueList" rows={6} maxLength={8000} placeholder={"APPLE | A crisp fruit that grows on a tree\nTRAIN | A vehicle that travels on rails"} required /><span className="small muted">12-60 different answers, one ANSWER | clue per line. Answers: 3-12 English letters. Clues: 5-70 characters.</span></label>}</>}
    {templateKey === "color-by-code" && <label>Mystery picture<select name="picture"><option value="surprise">Mix all four pictures</option><option value="heart">Heart</option><option value="tree">Tree</option><option value="flower">Flower</option><option value="rocket">Rocket</option></select></label>}
    <div className="form-grid"><label>Number of puzzles<input name="pages" type="number" min={1} max={100} value={pages} onChange={event => setPages(Number(event.target.value))} required /></label><label>Difficulty<select name="difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></div>
    <div className="draft-spec"><span>{puzzleTemplates.find(template => template.key === templateKey)?.name}</span><span>8.5 x 11 in</span><span>{templateKey === "color-by-code" ? "Color answer key" : "Print-friendly"}</span></div>
    <p className="small muted">{pages || 0} puzzle pages + {pages || 0} answer pages + 1 title page = <strong>{2 * (pages || 0) + 1} total pages</strong>. {templateKey === "word-search" && "Each puzzle has 20 words in a 15 x 15 grid. "}Review and approve your book before downloading.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <Button disabled={busy} type="submit">{busy && <LoaderCircle className="spin" size={16} />}{busy ? "Starting generation…" : "Generate my book"}<ArrowRight size={16} /></Button>
  </form>;
}
