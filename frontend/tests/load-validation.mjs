import { readFile } from "node:fs/promises";
import ts from "typescript";

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const policyUrl = moduleUrl(compile(await readFile(new URL("../src/lib/password-validation.ts", import.meta.url), "utf8")));

// Execute the production validators, resolving the Next.js alias in Node tests.
export async function loadValidation(url) {
  const code = compile(await readFile(url, "utf8")).replaceAll('"@/lib/password-validation"', JSON.stringify(policyUrl));
  return import(moduleUrl(code));
}
