import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");
let counter = 0;
async function loadApi() {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js + `\n// ${counter++}`).toString("base64")}`);
}
const response = (status, data = {}) => new Response(JSON.stringify({ success: status === 200, data }), { status });

test("session GET deadline settles a hung transport and a fresh retry succeeds", async () => {
  const previous = globalThis.fetch;
  try {
    let requestSignal;
    globalThis.fetch = async (_url, init) => {
      requestSignal = init.signal;
      return new Promise(() => {});
    };
    const api = await loadApi();
    await assert.rejects(api.apiGetWithTimeout("/admin/auth/sessions", undefined, 20), api.ApiTimeoutError);
    assert.equal(requestSignal.aborted, true);
    globalThis.fetch = async (_url, init) => {
      assert.equal(init.credentials, "include");
      assert.equal(init.cache, "no-store");
      return response(200, { items: [] });
    };
    assert.deepEqual(await api.apiGetWithTimeout("/admin/auth/sessions", undefined, 20), { items: [] });
  } finally { globalThis.fetch = previous; }
});

test("deadline also covers a hung response body", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) });
    const api = await loadApi();
    await assert.rejects(api.apiGetWithTimeout("/admin/accounts", undefined, 20), api.ApiTimeoutError);
  } finally { globalThis.fetch = previous; }
});

test("caller cancellation stays distinct from a timeout and pre-cancelled requests never fetch", async () => {
  const previous = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Promise(() => {}); };
    const api = await loadApi();
    const controller = new AbortController();
    const reason = new DOMException("Account changed", "AbortError");
    const pending = api.apiGetWithTimeout("/admin/auth/sessions", controller.signal, 1000);
    controller.abort(reason);
    await assert.rejects(pending, (error) => error === reason);
    await assert.rejects(api.apiGetWithTimeout("/admin/auth/sessions", controller.signal, 20), (error) => error === reason);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = previous; }
});

test("transient retries share the same deadline and stop after cancellation", async () => {
  const previous = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return response(502); };
    const api = await loadApi();
    await assert.rejects(api.apiGetWithTimeout("/admin/auth/sessions", undefined, 20), api.ApiTimeoutError);
    await new Promise((resolve) => setTimeout(resolve, 450));
    assert.equal(calls, 1);
  } finally { globalThis.fetch = previous; }
});

test("every JSON, multipart and delete mutation supplies the anti-CSRF header", async () => {
  const previous = globalThis.fetch, calls = [];
  try {
    globalThis.fetch = async (url, init) => { calls.push({ url, init }); return response(200); };
    const api = await loadApi();
    await api.apiPost("/admin/auth/login", {});
    await api.apiPatch("/admin/accounts/1", {});
    await api.apiPostFormData("/admin/employees", new FormData());
    await api.apiPatchFormData("/admin/employees/1", new FormData());
    await api.apiDelete("/admin/employees/1");
    assert.equal(calls.length, 5);
    for (const { init } of calls) assert.equal(init.headers["X-Requested-With"], "AsiaPortal");
    assert.equal(calls[2].init.headers["Content-Type"], undefined, "browser must set multipart boundary");
  } finally { globalThis.fetch = previous; }
});
test("simultaneous expired API requests share one rotation, then retry their original requests once", async () => {
  const previous = globalThis.fetch;
  let refreshed = false, rotations = 0, mutations = 0;
  try {
    globalThis.fetch = async (url, init) => {
      if (url.endsWith("/auth/me")) return response(401);
      if (url.endsWith("/auth/refresh")) {
        rotations++; await new Promise((resolve) => setTimeout(resolve, 10)); refreshed = true;
        assert.equal(init.headers["X-Requested-With"], "AsiaPortal"); return response(200, { id: "account" });
      }
      if (init.method === "PATCH") mutations++;
      return response(refreshed ? 200 : 401, { saved: true });
    };
    const api = await loadApi();
    const values = await Promise.all([api.apiGet("/admin/employees"), api.apiPatch("/admin/accounts/1", { name: "New" })]);
    assert.equal(rotations, 1); assert.equal(mutations, 2); assert.equal(values[1].saved, true);
  } finally { globalThis.fetch = previous; }
});
test("rechecks the current cookie before rotating when another tab already restored it", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => { assert.ok(url.endsWith("/auth/me")); return response(200, { id: "restored" }); };
    const api = await loadApi();
    assert.equal((await api.refreshApiSession()).id, "restored");
  } finally { globalThis.fetch = previous; }
});
test("rejected refresh does not resend a mutation or loop, and the next attempt is independent", async () => {
  const previous = globalThis.fetch;
  let mutations = 0, rotations = 0;
  try {
    globalThis.fetch = async (url) => {
      if (url.endsWith("/auth/refresh")) rotations++;
      else if (!url.endsWith("/auth/me")) mutations++;
      return response(401);
    };
    const api = await loadApi();
    await assert.rejects(api.apiDelete("/admin/employees/1"), { status: 401 });
    await assert.rejects(api.apiDelete("/admin/employees/1"), { status: 401 });
    assert.equal(mutations, 2); assert.equal(rotations, 2);
  } finally { globalThis.fetch = previous; }
});
