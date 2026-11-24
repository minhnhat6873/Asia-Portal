"use client";
import { useEffect, useRef, useState } from "react";
import { Howl, Howler } from "howler";
import { getNotifications } from "@/services/notification.service";
import { useUserSession } from "@/lib/userSession";

export default function NotificationSound() {
  const session = useUserSession();
  const accountId = session.status === "user" ? session.account.id : null;

  const [error, setError] = useState("");
  const sound = useRef<Howl | null>(null);
  useEffect(() => {
    if (!accountId) return;
    let active = true, polling = false;
    let known: Set<string> | null = null;
    let lastSound = 0;
    sound.current = new Howl({src:["/sounds/notifications/alert-quick-chime.wav"], onplayerror: () => setError("Trình duyệt chưa cho phép phát âm thanh."), onloaderror: () => setError("Không tải được âm thanh thông báo.")});
    const requestPermission = () => {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission().catch(() => setError("Không thể yêu cầu quyền thông báo."));
      }
      if (Howler.ctx?.state === "suspended") void Howler.ctx.resume();
    };
    window.addEventListener("click", requestPermission, { once: true });
    const poll = async () => {
      if (polling || document.hidden) return;
      polling = true;
      try {
        const page = await getNotifications();
        if (!active) return;
        const previous = known;
        known = new Set(page.items.map(item => item.id));
        const fresh = previous && page.items.find(item => !item.read && !previous.has(item.id));
        if (!fresh || !("Notification" in window) || Notification.permission !== "granted" || !navigator.locks) return;
        await navigator.locks.request(`asia-notification-sound:${accountId}`, async () => {
          const key = `asia-notification-played:${accountId}`;
          const seen = JSON.parse(localStorage.getItem(key) || "[]") as string[];
          if (!active || seen.includes(fresh.id)) return;
          localStorage.setItem(key, JSON.stringify([...seen, fresh.id].slice(-200)));
          if (Date.now() - lastSound < 2000) return;
          lastSound = Date.now();
          sound.current?.stop(); sound.current?.play();
        });
      } catch { /* Retry on the next poll. */ } finally { polling = false; }
    };
    void poll();
    const timer = window.setInterval(poll, 15000);
    return () => { active = false; window.removeEventListener("click", requestPermission); clearInterval(timer); sound.current?.unload(); sound.current = null; };
  }, [accountId]);
  return error ? <p role="status" className="sr-only">{error}</p> : null;
}
