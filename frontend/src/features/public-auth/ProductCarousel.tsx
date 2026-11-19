"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import products from "./products.json";
import { cover, FACTORS } from "./carousel-motion";

function inlineStyle(value = ""): CSSProperties {
  return Object.fromEntries(value.split(";").filter(Boolean).map((part) => {
    const [key, val] = part.split(":");
    return [key.startsWith("--") ? key : key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), val];
  })) as CSSProperties;
}
export default function ProductCarousel() {
  const stage = useRef<HTMLDivElement>(null);
  const active = useRef(0), moving = useRef(false), frame = useRef(0);
  const pointer = useRef<{id:number; x:number; y:number} | null>(null);
  const pausedRef = useRef(false), reduced = useRef(false), timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paused, setPaused] = useState(false);
  const stepRef = useRef<(direction:number) => void>(() => {});
  const scheduleRef = useRef<() => void>(() => {});
  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const slides = Array.from(container.querySelectorAll<HTMLElement>(".wslide"));
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const schedule = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      if (!pausedRef.current && !document.hidden) timer.current = setInterval(() => stepRef.current(1), 3000);
    };
    scheduleRef.current = schedule;
    stepRef.current = (direction) => {
      if (moving.current) return;
      const previous = active.current;
      active.current = (previous + direction + slides.length) % slides.length;
      const old = slides[previous], next = slides[active.current];
      old.setAttribute("aria-hidden", "true"); next.setAttribute("aria-hidden", "false");
      if (reduced.current) { old.classList.remove("is-active"); next.classList.add("is-active"); return; }
      moving.current = true; next.classList.add("is-under");
      const start = performance.now();
      const tick = (now:number) => {
        const t = (now - start) / 970, c = cover(t), width = container.clientWidth;
        old.style.clipPath = direction === 1 ? `inset(0 ${c * 100}% 0 0)` : `inset(0 0 0 ${c * 100}%)`;
        old.querySelectorAll<HTMLElement>(".wl").forEach(layer => { layer.style.transform = `translate3d(${-direction * c * .14 * width}px,0,0)`; });
        const raw = Math.max(0, Math.min(1, (t - .5) / .42)), k = 1 - (1 - raw) ** 2;
        next.querySelectorAll<HTMLElement>(".wl").forEach(layer => { layer.style.transform = `translate3d(${direction * (1-k) * FACTORS[layer.dataset.layer ?? "word"] * width}px,0,0)`; });
        if (t < 1 || raw < 1) { frame.current = requestAnimationFrame(tick); return; }
        old.style.clipPath = ""; old.classList.remove("is-active", "is-under"); next.classList.remove("is-under"); next.classList.add("is-active");
        [...old.querySelectorAll<HTMLElement>(".wl"), ...next.querySelectorAll<HTMLElement>(".wl")].forEach(layer => { layer.style.transform = ""; });
        moving.current = false;
      };
      frame.current = requestAnimationFrame(tick);
    };
    const onMotion = () => { reduced.current = media.matches; pausedRef.current = media.matches; setPaused(media.matches); schedule(); };
    media.addEventListener("change", onMotion); document.addEventListener("visibilitychange", schedule); onMotion();
    return () => { if (timer.current) clearInterval(timer.current); cancelAnimationFrame(frame.current); moving.current = false; media.removeEventListener("change", onMotion); document.removeEventListener("visibilitychange", schedule); };
  }, []);
  const step = (dir:number) => { stepRef.current(dir); scheduleRef.current(); };
  const down = (e:PointerEvent<HTMLDivElement>) => { if (!e.isPrimary || e.button !== 0 || (e.target as HTMLElement).closest("button")) return; e.currentTarget.setPointerCapture(e.pointerId); pointer.current = { id:e.pointerId, x:e.clientX, y:e.clientY }; };
  const up = (e:PointerEvent<HTMLDivElement>) => { const start=pointer.current; pointer.current=null; if (!start || start.id !== e.pointerId) return; const dx=e.clientX-start.x, dy=e.clientY-start.y; if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)) step(dx<0?1:-1); };
  return <aside className="visual" aria-label="Nhận diện thương hiệu Á Châu"><div id="stage" ref={stage} className={paused ? "paused" : ""} tabIndex={0} role="region" aria-label="Bộ sưu tập Wana, dùng phím trái hoặc phải để chuyển sản phẩm" onPointerDown={down} onPointerUp={up} onPointerCancel={() => {pointer.current=null;}} onKeyDown={e => {if (e.key === "ArrowLeft" || e.key === "ArrowRight") {e.preventDefault(); step(e.key === "ArrowLeft" ? -1 : 1);}}}>
    {products.map((product,index) => <section key={product.title} className={`wslide ${index === 0 ? "is-active" : ""}`} style={{"--tint":product.tint} as CSSProperties} aria-hidden={index !== 0}>
      <div className="wl" data-layer="word"><b className="ww" aria-hidden="true">{product.word}</b></div><div className="wl" data-layer="shadow"><i /></div>
      <div className="wl" data-layer="bottle"><img draggable={false} className="wcan" src={product.layers.bottle[0].src} alt={product.layers.bottle[0].alt} /></div>
      {(["fruit","corner"] as const).map(layer => <div key={layer} className="wl" data-layer={layer}>{product.layers[layer].map((fruit,i) => <img key={i} draggable={false} src={fruit.src} alt="" style={inlineStyle(fruit.style)} />)}</div>)}
      <div className="wcaption"><strong>{product.title}</strong><small>{product.description}</small></div>
    </section>)}
    <div className="wcontrols"><button type="button" id="wpause" aria-label={paused ? "Tiếp tục chuyển cảnh" : "Tạm dừng chuyển cảnh"} onClick={() => {pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); scheduleRef.current();}}>{paused ? "▶" : "❚❚"}</button></div>
  </div></aside>;
}
