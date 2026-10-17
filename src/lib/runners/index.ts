"use client";
/*
  Code execution adapters for the Coding Lab.

  All runners execute in the learner's browser (WebAssembly), isolated from
  BDIM's servers:
    - Python: Pyodide in a dedicated module Web Worker
    - SQL:    SQLite (sql.js) in a dedicated Web Worker, fresh DB per run
    - R:      webR (which manages its own worker)

  Workers are terminated on timeout, which hard-stops runaway code.
  To add a server-side sandbox later (e.g. Judge0 or a container service),
  implement CodeRunner and register it in getRunner().
*/
import type { LabDataset, LabLanguage } from "@/lib/types";

export interface SqlTable {
  columns: string[];
  values: (string | number | null)[][];
  truncated: boolean;
  rowCount: number;
}

export interface RunResult {
  ok: boolean;
  /** Real program output, or empty. Never simulated. */
  stdout: string;
  stderr: string;
  error?: string;
  tables?: SqlTable[];
  ms?: number;
  timedOut?: boolean;
}

export interface CodeRunner {
  language: LabLanguage;
  engineLabel: string;
  run(code: string, datasets: LabDataset[], onStatus: (s: string) => void): Promise<RunResult>;
  dispose(): void;
}

type WorkerMsg =
  | { id: number; type: "ready" }
  | { id: number; type: "status"; status: string }
  | { id: number; type: "error"; error: string }
  | ({ id: number; type: "result" } & RunResult);

class WorkerRunner implements CodeRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private seq = 0;

  constructor(
    public language: LabLanguage,
    public engineLabel: string,
    private url: string,
    private loadTimeoutMs: number,
    private runTimeoutMs: number,
    private workerType: WorkerType = "classic",
  ) {}

  private ensure(onStatus: (s: string) => void) {
    if (this.worker && this.ready) return this.ready;
    this.worker = new Worker(this.url, { type: this.workerType });
    const worker = this.worker;
    const id = ++this.seq;
    onStatus(`Loading ${this.engineLabel} (first run downloads the runtime)…`);
    this.ready = new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.reset();
        reject(new Error(`${this.engineLabel} took too long to load. Check your connection and try again.`));
      }, this.loadTimeoutMs);
      const onMsg = (e: MessageEvent<WorkerMsg>) => {
        if (e.data.id !== id) return;
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMsg);
        if (e.data.type === "ready") resolve();
        else if (e.data.type === "error") {
          this.reset();
          reject(new Error(e.data.error));
        }
      };
      worker.addEventListener("message", onMsg);
      worker.addEventListener("error", (ev) => {
        window.clearTimeout(timer);
        this.reset();
        reject(new Error(ev.message || `${this.engineLabel} failed to start.`));
      }, { once: true });
      worker.postMessage({ id, type: "init" });
    });
    return this.ready;
  }

  private reset() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }

  async run(code: string, datasets: LabDataset[], onStatus: (s: string) => void): Promise<RunResult> {
    try {
      await this.ensure(onStatus);
    } catch (err) {
      return { ok: false, stdout: "", stderr: "", error: `${(err as Error).message} Your code was not executed.` };
    }
    const worker = this.worker!;
    const id = ++this.seq;
    onStatus("Running…");
    return new Promise<RunResult>((resolve) => {
      // Package downloads (e.g. pandas on first use) get the longer load allowance;
      // the execution limit starts when the worker reports that code is running.
      const stop = (message: string) => {
        this.reset(); // terminate the worker: hard stop
        resolve({ ok: false, stdout: "", stderr: "", timedOut: true, error: message });
      };
      let timer = window.setTimeout(() => stop("Loading packages took too long. Check your connection and try again."), this.loadTimeoutMs);
      const onMsg = (e: MessageEvent<WorkerMsg>) => {
        if (e.data.id !== id) return;
        if (e.data.type === "status") {
          if (e.data.status.startsWith("Running")) {
            window.clearTimeout(timer);
            timer = window.setTimeout(
              () => stop(`Stopped after ${this.runTimeoutMs / 1000}s. Check for infinite loops or very large computations.`),
              this.runTimeoutMs,
            );
          }
          return onStatus(e.data.status);
        }
        if (e.data.type === "result") {
          window.clearTimeout(timer);
          worker.removeEventListener("message", onMsg);
          const { ok, stdout = "", stderr = "", error, tables, ms } = e.data;
          resolve({ ok, stdout, stderr, error, tables, ms });
        }
      };
      worker.addEventListener("message", onMsg);
      worker.postMessage({
        id,
        type: "run",
        code,
        files: datasets.map((d) => ({ name: d.fileName, content: d.csv })),
        tables: datasets.map((d) => ({ name: d.tableName, csv: d.csv })),
      });
    });
  }

  dispose() {
    this.reset();
  }
}

// ── R via webR ──
const WEBR_URL = "https://webr.r-wasm.org/v0.6.0/webr.mjs";
type WebRModule = {
  WebR: new (opts: Record<string, unknown>) => {
    init(): Promise<void>;
    close(): void;
    FS: { writeFile(path: string, data: Uint8Array): Promise<void> };
    Shelter: new () => Promise<{
      captureR(code: string, opts?: Record<string, unknown>): Promise<{ output: { type: string; data: unknown }[] }>;
      purge(): void;
    }>;
  };
  ChannelType: Record<string, number>;
};

class RRunner implements CodeRunner {
  language: LabLanguage = "r";
  engineLabel = "R (webR)";
  private webR: InstanceType<WebRModule["WebR"]> | null = null;
  private ready: Promise<void> | null = null;

  private ensure(onStatus: (s: string) => void) {
    if (this.ready) return this.ready;
    onStatus("Loading R (first run downloads about 30 MB)…");
    this.ready = (async () => {
      // Loaded from the official webR CDN at runtime, outside the app bundle.
      const load = new Function("u", "return import(u)") as (u: string) => Promise<WebRModule>;
      const mod = await load(WEBR_URL);
      this.webR = new mod.WebR({ channelType: mod.ChannelType.PostMessage });
      await this.webR.init();
    })().catch((err) => {
      this.ready = null;
      this.webR = null;
      throw err;
    });
    return this.ready;
  }

  async run(code: string, datasets: LabDataset[], onStatus: (s: string) => void): Promise<RunResult> {
    try {
      await Promise.race([
        this.ensure(onStatus),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("R took too long to load.")), 120_000)),
      ]);
    } catch (err) {
      return { ok: false, stdout: "", stderr: "", error: `R runtime could not be loaded (${(err as Error).message}). Your code was not executed.` };
    }
    const webR = this.webR!;
    onStatus("Running…");
    const started = performance.now();
    const enc = new TextEncoder();
    for (const d of datasets) await webR.FS.writeFile(`/home/web_user/${d.fileName}`, enc.encode(d.csv));
    const shelter = await new webR.Shelter();
    try {
      const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 30_000));
      const result = await Promise.race([
        shelter.captureR(`setwd("/home/web_user")\n${code}`, { withAutoprint: true, captureStreams: true, captureConditions: false }),
        timeout,
      ]);
      const stdout = result.output.filter((o) => o.type === "stdout").map((o) => String(o.data)).join("\n");
      const stderr = result.output.filter((o) => o.type === "stderr").map((o) => String(o.data)).join("\n");
      return { ok: true, stdout, stderr, ms: Math.round(performance.now() - started) };
    } catch (err) {
      if ((err as Error).message === "timeout") {
        webR.close();
        this.webR = null;
        this.ready = null;
        return { ok: false, stdout: "", stderr: "", timedOut: true, error: "Stopped after 30s. The R session was restarted." };
      }
      return { ok: false, stdout: "", stderr: "", error: (err as Error).message };
    } finally {
      shelter.purge();
    }
  }

  dispose() {
    this.webR?.close();
    this.webR = null;
    this.ready = null;
  }
}

const runners = new Map<LabLanguage, CodeRunner>();

export function getRunner(language: LabLanguage): CodeRunner {
  let r = runners.get(language);
  if (!r) {
    r =
      language === "python"
        ? new WorkerRunner("python", "Python (Pyodide, Python 3.14)", "/workers/python-worker.js", 180_000, 60_000, "module")
        : language === "sql"
          ? new WorkerRunner("sql", "SQLite (sql.js)", "/workers/sql-worker.js", 60_000, 10_000)
          : new RRunner();
    runners.set(language, r);
  }
  return r;
}

/** Text form of a run, used for honest output checks. */
export function outputText(result: RunResult) {
  if (result.tables) return result.tables.map((t) => [t.columns.join(" "), ...t.values.map((v) => v.join(" "))].join("\n")).join("\n");
  return result.stdout;
}
