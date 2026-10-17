// Python runtime for the BDIM Coding Lab. Runs inside a dedicated *module*
// Web Worker in the learner's browser (WebAssembly sandbox) — never on BDIM's
// servers. Pyodide 314+ only supports module workers.
const PYODIDE_VERSION = "314.0.7";
const BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideReady = null;

function init() {
  if (!pyodideReady) {
    pyodideReady = (async () => {
      const { loadPyodide } = await import(`${BASE}pyodide.mjs`);
      return loadPyodide({ indexURL: BASE });
    })();
    // Allow a retry after a failed load (e.g. offline).
    pyodideReady.catch(() => {
      pyodideReady = null;
    });
  }
  return pyodideReady;
}

self.onmessage = async (event) => {
  const { id, type, code, files } = event.data;
  if (type === "init") {
    try {
      await init();
      self.postMessage({ id, type: "ready" });
    } catch (err) {
      self.postMessage({ id, type: "error", error: `Python runtime failed to load: ${err && err.message ? err.message : err}` });
    }
    return;
  }
  if (type !== "run") return;

  let py;
  try {
    py = await init();
  } catch (err) {
    self.postMessage({ id, type: "result", ok: false, stdout: "", stderr: "", error: `Python runtime failed to load: ${err && err.message ? err.message : err}` });
    return;
  }

  const out = [];
  const errOut = [];
  py.setStdout({ batched: (s) => out.push(s) });
  py.setStderr({ batched: (s) => errOut.push(s) });

  try {
    for (const f of files || []) py.FS.writeFile(f.name, f.content);
    self.postMessage({ id, type: "status", status: "Loading packages…" });
    await py.loadPackagesFromImports(code, { messageCallback: () => {}, errorCallback: (m) => errOut.push(m) });
    self.postMessage({ id, type: "status", status: "Running…" });
    const started = performance.now();
    // Fresh namespace for each run so earlier runs can't leak state.
    const globals = py.toPy({});
    try {
      const result = await py.runPythonAsync(code, { globals });
      if (result !== undefined && result !== null && out.length === 0) out.push(String(result));
    } finally {
      globals.destroy();
    }
    self.postMessage({ id, type: "result", ok: true, stdout: out.join("\n"), stderr: errOut.join("\n"), ms: Math.round(performance.now() - started) });
  } catch (err) {
    self.postMessage({ id, type: "result", ok: false, stdout: out.join("\n"), stderr: errOut.join("\n"), error: String(err && err.message ? err.message : err) });
  }
};
