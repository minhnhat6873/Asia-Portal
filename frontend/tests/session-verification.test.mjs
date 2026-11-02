import assert from "node:assert/strict";
import test from "node:test";
import { createSessionVerifier, SessionVerificationTimeoutError } from "../src/features/admin/auth/session-verification.ts";

const account = { id: "admin-test", name: "Admin", email: "test@example.com", role: "admin", permissions: [] };
const unauthorized = Object.assign(new Error("expired access token"), { status: 401 });
const isUnauthorized = (error) => error?.status === 401;

test("valid access token verifies directly without refreshing", async () => {
  let refreshes = 0;
  const verify = createSessionVerifier({ getCurrentAdmin: async () => account, refreshAdminSession: async () => { refreshes++; return account; }, isUnauthorized });
  assert.equal(await verify(), account);
  assert.equal(refreshes, 0);
});

test("missing or expired access token restores the session using refresh token", async () => {
  let signal;
  const verify = createSessionVerifier({ getCurrentAdmin: async () => { throw unauthorized; }, refreshAdminSession: async (value) => { signal = value; return account; }, isUnauthorized });
  assert.equal(await verify(), account);
  assert.ok(signal instanceof AbortSignal);
});

test("simultaneous verifications share one refresh request", async () => {
  let refreshes = 0, release;
  const verify = createSessionVerifier({ getCurrentAdmin: async () => { throw unauthorized; }, refreshAdminSession: () => { refreshes++; return new Promise((resolve) => { release = resolve; }); }, isUnauthorized });
  const first = verify(), second = verify();
  assert.equal(first, second);
  await Promise.resolve();
  release(account);
  assert.deepEqual(await Promise.all([first, second]), [account, account]);
  assert.equal(refreshes, 1);
});

test("expired refresh token rejects instead of leaving a permanently pending promise", async () => {
  let attempts = 0;
  const verify = createSessionVerifier({ getCurrentAdmin: async () => { attempts++; throw unauthorized; }, refreshAdminSession: async () => { throw unauthorized; }, isUnauthorized });
  await assert.rejects(verify(), (error) => error === unauthorized);
  await assert.rejects(verify(), (error) => error === unauthorized);
  assert.equal(attempts, 2);
});

test("hung initial verification times out, aborts transport and allows a fresh retry", async () => {
  let attempts = 0, signal;
  const verify = createSessionVerifier({ timeoutMs: 20, getCurrentAdmin: (value) => { signal = value; attempts++; return attempts === 1 ? new Promise(() => {}) : Promise.resolve(account); }, refreshAdminSession: async () => account, isUnauthorized });
  await assert.rejects(verify(), SessionVerificationTimeoutError);
  assert.equal(signal.aborted, true);
  assert.equal(await verify(), account);
});

test("hung refresh request also times out and can be retried", async () => {
  let refreshes = 0, signal;
  const verify = createSessionVerifier({ timeoutMs: 20, getCurrentAdmin: async () => { throw unauthorized; }, refreshAdminSession: (value) => { signal = value; refreshes++; return refreshes === 1 ? new Promise(() => {}) : Promise.resolve(account); }, isUnauthorized });
  await assert.rejects(verify(), SessionVerificationTimeoutError);
  assert.equal(signal.aborted, true);
  assert.equal(await verify(), account);
});

test("late response from a timed-out request cannot replace a newer verified session", async () => {
  let attempts = 0, releaseOld;
  const fresh = { ...account, name: "Current account" };
  const verify = createSessionVerifier({ timeoutMs: 20, getCurrentAdmin: () => ++attempts === 1 ? new Promise((resolve) => { releaseOld = resolve; }) : Promise.resolve(fresh), refreshAdminSession: async () => account, isUnauthorized });
  await assert.rejects(verify(), SessionVerificationTimeoutError);
  assert.equal(await verify(), fresh);
  releaseOld(account);
  await Promise.resolve();
  assert.equal(await verify(), fresh);
});

test("rate limits and network errors do not trigger refresh or invalidate the session", async () => {
  for (const error of [Object.assign(new Error("Too many requests"), { status: 429 }), new TypeError("Network unavailable")]) {
    let refreshes = 0;
    const verify = createSessionVerifier({ getCurrentAdmin: async () => { throw error; }, refreshAdminSession: async () => { refreshes++; return account; }, isUnauthorized });
    await assert.rejects(verify(), (reason) => reason === error);
    assert.equal(refreshes, 0);
  }
});
