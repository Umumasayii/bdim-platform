/* global importScripts, initSqlJs */
// SQL runtime for the BDIM Coding Lab: SQLite compiled to WebAssembly (sql.js),
// running in a Web Worker in the learner's browser. A fresh in-memory database
// is built for every run, so queries can't affect anything else.
const SQLJS_VERSION = "1.15.0";
const BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;

let sqlReady = null;
function init() {
  if (!sqlReady) {
    sqlReady = (async () => {
      importScripts(`${BASE}sql-wasm.js`);
      return initSqlJs({ locateFile: (f) => `${BASE}${f}` });
    })();
  }
  return sqlReady;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function loadTable(db, table) {
  const [header, ...data] = parseCsv(table.csv.trim());
  const types = header.map((_, j) => {
    const vals = data.map((r) => r[j]).filter((v) => v !== "" && v !== undefined);
    if (vals.length && vals.every((v) => /^-?\d+$/.test(v))) return "INTEGER";
    if (vals.length && vals.every((v) => /^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(v))) return "REAL";
    return "TEXT";
  });
  const cols = header.map((h, j) => `"${h.replace(/"/g, "")}" ${types[j]}`).join(", ");
  db.run(`CREATE TABLE "${table.name}" (${cols});`);
  const stmt = db.prepare(`INSERT INTO "${table.name}" VALUES (${header.map(() => "?").join(",")});`);
  for (const r of data) {
    stmt.run(r.map((v, j) => (v === "" || v === undefined ? null : types[j] === "TEXT" ? v : Number(v))));
  }
  stmt.free();
}

self.onmessage = async (event) => {
  const { id, type, code, tables } = event.data;
  if (type === "init") {
    try {
      await init();
      self.postMessage({ id, type: "ready" });
    } catch (err) {
      self.postMessage({ id, type: "error", error: `SQL engine failed to load: ${err && err.message ? err.message : err}` });
    }
    return;
  }
  if (type !== "run") return;
  let SQL;
  try {
    SQL = await init();
  } catch (err) {
    self.postMessage({ id, type: "result", ok: false, error: `SQL engine failed to load: ${err && err.message ? err.message : err}` });
    return;
  }
  self.postMessage({ id, type: "status", status: "Running…" });
  const db = new SQL.Database();
  try {
    for (const t of tables || []) loadTable(db, t);
    const started = performance.now();
    const results = db.exec(code).map((r) => ({ columns: r.columns, values: r.values.slice(0, 500), truncated: r.values.length > 500, rowCount: r.values.length }));
    self.postMessage({ id, type: "result", ok: true, tables: results, changes: db.getRowsModified(), ms: Math.round(performance.now() - started) });
  } catch (err) {
    self.postMessage({ id, type: "result", ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    db.close();
  }
};
