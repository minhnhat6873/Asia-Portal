"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  ariaLabel?: string;
}

interface MenuPosition { left: number; top: number; width: number; height: number; }

function measureMenu(trigger: HTMLButtonElement | null, count: number): MenuPosition | null {
  const rect = trigger?.getBoundingClientRect();
  if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return null;
  const below = window.innerHeight - rect.bottom - 12;
  const above = rect.top - 12;
  const desiredHeight = Math.min(360, count * 40 + 18);
  const upward = below < desiredHeight + 8 && above > below;
  const height = Math.min(desiredHeight, Math.max(58, (upward ? above : below) - 8));
  const width = Math.min(Math.max(168, rect.width), window.innerWidth - 24);
  return { width, height, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: upward ? rect.top - height - 8 : rect.bottom + 8 };
}

export function PageSelect({ page, pageCount, onChange, ariaLabel = "Chọn trang" }: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(page);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const count = Math.max(1, pageCount);
  const activePage = Math.max(1, Math.min(highlighted, count));

  const openMenu = () => {
    const nextPosition = measureMenu(triggerRef.current, count);
    if (!nextPosition) return;
    setPosition(nextPosition);
    setHighlighted(page);
    setOpen(true);
  };

  const choose = (next: number) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      if (event.key === "Escape" && open) event.preventDefault();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) openMenu();
      else setHighlighted(event.key === "Home" ? 1 : event.key === "End" ? count : Math.max(1, Math.min(count, activePage + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      choose(activePage);
    }
  };

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const outside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const reposition = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextPosition = measureMenu(triggerRef.current, count);
        if (nextPosition) setPosition(nextPosition);
        else setOpen(false);
      });
    };
    const closeOnFocus = (event: FocusEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", closeOnFocus);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", closeOnFocus);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.cancelAnimationFrame(frame);
    };
  }, [open, count]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector(`[data-page="${activePage}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, activePage]);

  return <>
    <button ref={triggerRef} type="button" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? id : undefined} aria-activedescendant={open ? `${id}-${activePage}` : undefined} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={handleKeyDown}
      className={`group inline-flex min-h-12 w-44 max-w-full items-center justify-between gap-4 rounded-xl border px-4 py-2 text-left text-sm font-semibold shadow-sm outline-none transition-all hover:bg-emerald-50/70 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/10 ${open ? "border-emerald-500 bg-emerald-50/70 text-emerald-900" : "border-[#dce3eb] bg-white text-[#0f172a]"}`}>
      <span>Trang {page}</span><span className="flex h-7 w-7 items-center justify-center rounded-full group-focus-visible:bg-emerald-50"><ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180 text-emerald-800" : ""}`} /></span>
    </button>
    {open && position && createPortal(
      <div ref={menuRef} className="fixed z-[100] rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-[0_12px_35px_rgba(15,23,42,0.15)]" style={{ left: position.left, top: position.top, width: position.width }}>
        <div id={id} role="listbox" aria-label={ariaLabel} className="overflow-y-auto overscroll-contain [scrollbar-color:#cbd5e1_#f8fafc] [scrollbar-width:thin]" style={{ maxHeight: position.height - 18 }}>
          {Array.from({ length: count }, (_, index) => index + 1).map((number) => <button key={number} id={`${id}-${number}`} data-page={number} type="button" role="option" tabIndex={-1} aria-selected={number === page} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(number)} onMouseEnter={() => setHighlighted(number)} className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left transition-colors ${number === page ? "bg-emerald-50 font-semibold text-emerald-700" : number === activePage ? "bg-emerald-50/70 text-slate-800" : "text-slate-800 hover:bg-emerald-50/70"}`}><span>Trang {number}</span>{number === page && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}</button>)}
        </div>
      </div>, document.body,
    )}
  </>;
}
