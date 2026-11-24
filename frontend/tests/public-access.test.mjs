import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

const redirect = await load("../src/lib/safeRedirect.ts");

test("after sign-in, only paths on this site are followed", () => {
  assert.equal(redirect.afterLoginPath("/meeting"), "/meeting");
  assert.equal(redirect.afterLoginPath("/news/abc?x=1"), "/news/abc?x=1");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "", null, undefined, "/login", "/login?next=/x"]) {
    assert.equal(redirect.afterLoginPath(bad), "/", String(bad));
  }
});

test("sign-in links carry the current page back", () => {
  assert.equal(redirect.loginHref("/employees"), "/login?next=%2Femployees");
  assert.equal(redirect.loginHref("/"), "/login");
  assert.equal(redirect.loginHref("/login"), "/login");
  assert.equal(redirect.loginHref("//evil.com"), "/login");
});

test("notification links never leave the site", () => {
  assert.equal(redirect.safeSitePath("/account/meetings", "/account/notifications"), "/account/meetings");
  assert.equal(redirect.safeSitePath("https://evil.com", "/account/notifications"), "/account/notifications");
  assert.equal(redirect.safeSitePath("//evil.com", "/account/notifications"), "/account/notifications");
});
