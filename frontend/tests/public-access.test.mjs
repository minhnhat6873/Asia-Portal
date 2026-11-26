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

test("only /user and pages below it count as signed-in pages", () => {
  for (const path of ["/user", "/user/news/1", "/user?x=1", "/user#resources"]) assert.equal(redirect.isUserPath(path), true, path);
  for (const path of ["/", "/users", "/username", "/login", "/admin/user", "/news"]) assert.equal(redirect.isUserPath(path), false, path);
});

test("after sign-in, only /user pages on this site are followed", () => {
  assert.equal(redirect.afterLoginPath("/user/meeting"), "/user/meeting");
  assert.equal(redirect.afterLoginPath("/user/news/abc?x=1"), "/user/news/abc?x=1");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "", null, undefined, "/login", "/login?next=/x", "/admin/dashboard", "/"]) {
    assert.equal(redirect.afterLoginPath(bad), "/user", String(bad));
  }
});

test("sign-in links carry the current /user page back", () => {
  assert.equal(redirect.loginHref("/user/employees"), "/login?next=%2Fuser%2Femployees");
  assert.equal(redirect.loginHref("/user"), "/login");
  assert.equal(redirect.loginHref("/"), "/login");
  assert.equal(redirect.loginHref("/login"), "/login");
  assert.equal(redirect.loginHref("//evil.com"), "/login");
});

test("notification links never leave the site", () => {
  assert.equal(redirect.safeSitePath("/user/account/meetings", "/user/account/notifications"), "/user/account/meetings");
  assert.equal(redirect.safeSitePath("https://evil.com", "/user/account/notifications"), "/user/account/notifications");
  assert.equal(redirect.safeSitePath("//evil.com", "/user/account/notifications"), "/user/account/notifications");
});
