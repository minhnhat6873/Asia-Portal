import { EventEmitter } from "node:events";
import type { Request, Response } from "express";

import { notificationEvents, notificationPresence, openNotificationStream } from "../src/utils/notification/notificationEvents";

function fakeStream() {
  const request = new EventEmitter() as unknown as Request;
  const written: string[] = [];
  const headers: Record<string, string> = {};
  const response = {
    status: jest.fn().mockReturnThis(),
    setHeader: (name: string, value: string) => { headers[name] = value; },
    flushHeaders: jest.fn(),
    write: (chunk: string) => { written.push(chunk); return true; },
    end: jest.fn(),
  } as unknown as Response;
  return { request, response, written, headers };
}

describe("live notification signal", () => {
  afterEach(() => jest.useRealTimers());

  it("only the accounts that got a notification are signalled, once each", () => {
    const a = jest.fn();
    const b = jest.fn();
    const stopA = notificationEvents.subscribe("a", a);
    const stopB = notificationEvents.subscribe("b", b);
    notificationEvents.publish(["a", "a"]);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    stopA(); stopB();
    notificationEvents.publish(["a"]);
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("streams an unbuffered signal, keeps the connection alive and cleans up on close", () => {
    jest.useFakeTimers();
    const { request, response, written, headers } = fakeStream();
    openNotificationStream(request, response, "acc-1");
    expect(headers["Content-Type"]).toContain("text/event-stream");
    expect(headers["X-Accel-Buffering"]).toBe("no");

    notificationEvents.publish(["acc-1"]);
    expect(written).toContain("event: notification\ndata: {}\n\n");
    // No data about the notification itself goes through the stream.
    expect(written.join("")).not.toMatch(/title|message/);

    jest.advanceTimersByTime(25_000);
    expect(written).toContain(": ping\n\n");

    (request as unknown as EventEmitter).emit("close");
    const count = written.length;
    notificationEvents.publish(["acc-1"]);
    jest.advanceTimersByTime(60_000);
    expect(written.length).toBe(count);
  });

  it("closes the stream after 10 minutes so the session is checked again on reconnect", () => {
    jest.useFakeTimers();
    const { request, response } = fakeStream();
    openNotificationStream(request, response, "acc-2");
    jest.advanceTimersByTime(10 * 60_000);
    expect(response.end).toHaveBeenCalled();
    (request as unknown as EventEmitter).emit("close");
  });

  it("knows who has the admin site open, per portal, and allows a short gap for reconnecting", () => {
    jest.useFakeTimers();
    expect(notificationPresence.isOnline("hr-1", "admin")).toBe(false);
    const first = fakeStream();
    const second = fakeStream();
    openNotificationStream(first.request, first.response, "hr-1", "admin");
    openNotificationStream(second.request, second.response, "hr-1", "admin");
    expect(notificationPresence.isOnline("hr-1", "admin")).toBe(true);
    // The user portal is a different place.
    expect(notificationPresence.isOnline("hr-1", "user")).toBe(false);

    (first.request as unknown as EventEmitter).emit("close");
    expect(notificationPresence.isOnline("hr-1", "admin")).toBe(true);
    (second.request as unknown as EventEmitter).emit("close");
    // Just closed: may be the 10-minute reconnect.
    expect(notificationPresence.isOnline("hr-1", "admin")).toBe(true);
    jest.advanceTimersByTime(60_000);
    expect(notificationPresence.isOnline("hr-1", "admin")).toBe(false);
  });
});
