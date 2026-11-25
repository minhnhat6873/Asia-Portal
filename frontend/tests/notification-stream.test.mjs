import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/notificationStream.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { subscribeNotificationStream } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

// Fake EventSource: records open streams so the test can count them and fire signals.
const open = new Set();
class FakeEventSource {
  static CLOSED = 2;
  constructor(url) { this.url = url; this.readyState = 1; this.listeners = []; open.add(this); }
  addEventListener(type, listener) { if (type === "notification") this.listeners.push(listener); }
  fire() { this.listeners.forEach((listener) => listener()); }
  close() { this.readyState = 2; open.delete(this); }
}
globalThis.EventSource = FakeEventSource;
globalThis.window = new EventTarget();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tab = (scope, signals) => subscribeNotificationStream(scope, "/stream", { onSignal: () => signals.push(1), onStreamDown: () => undefined });

test("HTTPS (Web Locks): one stream per browser, shared by the tabs; another tab takes over", async () => {
  open.clear();
  const a = []; const b = [];
  const stopA = tab("locks", a);
  const stopB = tab("locks", b);
  await wait(50);
  assert.equal(open.size, 1, "only the leader tab opens a stream");
  [...open][0].fire();
  await wait(50);
  assert.equal(a.length, 1);
  assert.equal(b.length, 1, "the other tab gets the signal through the BroadcastChannel");
  stopA();
  await wait(50);
  assert.equal(open.size, 1, "the waiting tab opened its own stream after the leader closed");
  stopB();
  await wait(20);
  assert.equal(open.size, 0);
});

test("plain http (no Web Locks): localStorage heartbeat picks one leader; closing hands over", async () => {
  open.clear();
  const realNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => {
      store.delete(key);
      // Other tabs see the removal as a storage event.
      const event = new Event("storage"); event.key = key; event.newValue = null;
      window.dispatchEvent(event);
    },
  };
  try {
    const a = []; const b = [];
    const stopA = tab("http", a);
    await wait(500);
    const stopB = tab("http", b);
    await wait(500);
    assert.equal(open.size, 1, "the second tab follows the first instead of opening a stream");
    [...open][0].fire();
    await wait(50);
    assert.deepEqual([a.length, b.length], [1, 1]);
    stopA();
    await wait(600);
    assert.equal(open.size, 1, "the follower took over right after the leader closed");
    stopB();
    assert.equal(open.size, 0);
  } finally {
    if (realNavigator) Object.defineProperty(globalThis, "navigator", realNavigator);
    delete globalThis.localStorage;
  }
});
