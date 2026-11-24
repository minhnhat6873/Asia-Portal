import assert from "node:assert/strict";
import test from "node:test";
import { loadValidation } from "./load-validation.mjs";

// The toast helpers import "sonner"; the note text itself is pure, so test it in isolation.
const source = new URL("../src/features/admin/dashboard/linked-account-toast.ts", import.meta.url);
const { readFile, writeFile, mkdtemp } = await import("node:fs/promises");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { pathToFileURL } = await import("node:url");
const dir = await mkdtemp(join(tmpdir(), "linked-account-"));
const stubbed = join(dir, "linked-account-toast.ts");
await writeFile(stubbed, (await readFile(source, "utf8")).replace('import { toast } from "sonner";', "const toast = {};"));
const { linkedAccountNote } = await loadValidation(pathToFileURL(stubbed));

test("each outcome gets the agreed line", () => {
  assert.equal(linkedAccountNote("locked", "deleted"), "Tài khoản đăng nhập của nhân viên đã bị khóa.");
  assert.equal(linkedAccountNote("locked", "left"), "Tài khoản đăng nhập đã bị khóa vì nhân viên nghỉ việc.");
  assert.equal(linkedAccountNote("trashed", "purged"), "Tài khoản đăng nhập đã được chuyển vào thùng rác tài khoản.");
  for (const exit of ["left", "deleted", "purged"]) {
    assert.match(linkedAccountNote("admin-skipped", exit), /Admin gốc.*không bị khóa tự động.*Phân quyền quản lý/);
    assert.equal(linkedAccountNote("none", exit), undefined);
    assert.equal(linkedAccountNote(undefined, exit), undefined);
  }
});
