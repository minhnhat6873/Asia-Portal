"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Globe, LockKeyhole, Tags } from "lucide-react";
import type { MediaCategory } from "../types";

export const MEDIA_FILTER_CATEGORIES: MediaCategory[] = ["Thông báo", "Sự kiện", "Tin tức", "Nhân sự", "Đào Tạo"];
export type MediaVisibility = "public" | "internal";
export const MEDIA_FILTER_VISIBILITIES: MediaVisibility[] = ["public", "internal"];

/** Only a partial selection filters; every option (or none) means "show all". */
export function selectionFilter<T extends string>(selected: T[], options: readonly T[]): string | undefined {
  return selected.length > 0 && selected.length < options.length ? selected.join(",") : undefined;
}

const sameSelection = <T extends string>(a: T[], b: T[]) => a.length === b.length && a.every((item) => b.includes(item));

/**
 * Ticking boxes only changes a draft, so the list does not reload while choosing.
 * "Áp dụng", clicking outside or Esc applies the draft; "Hủy" throws it away.
 */
export function MediaScopeFilter({ categories, visibilities, onCategoriesChange, onVisibilitiesChange }: {
  categories: MediaCategory[];
  visibilities: MediaVisibility[];
  onCategoriesChange: (values: MediaCategory[]) => void;
  onVisibilitiesChange: (values: MediaVisibility[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftCategories, setDraftCategories] = useState(categories);
  const [draftVisibilities, setDraftVisibilities] = useState(visibilities);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  const openMenu = () => {
    setDraftCategories(categories);
    setDraftVisibilities(visibilities);
    setOpen(true);
  };
  const closeMenu = (apply: boolean) => {
    // Only a real change triggers a new search.
    if (apply && !sameSelection(draftCategories, categories)) onCategoriesChange(draftCategories);
    if (apply && !sameSelection(draftVisibilities, visibilities)) onVisibilitiesChange(draftVisibilities);
    setOpen(false);
  };
  const closeRef = useRef(closeMenu);
  useEffect(() => { closeRef.current = closeMenu; });

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) closeRef.current(true);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  // Each box is independent; "Tất cả" checks or clears every box of its group.
  function toggle<T extends string>(selected: T[], value: T, change: (values: T[]) => void) {
    change(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }
  function toggleAll<T extends string>(selected: T[], options: T[], change: (values: T[]) => void) {
    change(selected.length === options.length ? [] : [...options]);
  }
  const row = "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 hover:bg-emerald-50 has-[:checked]:bg-emerald-50 has-[:checked]:font-semibold has-[:checked]:text-emerald-900";
  const checkbox = "h-4 w-4 shrink-0 cursor-pointer accent-green-700";
  const isFiltering = Boolean(selectionFilter(categories, MEDIA_FILTER_CATEGORIES) || selectionFilter(visibilities, MEDIA_FILTER_VISIBILITIES));

  return <div ref={root} className="relative w-full shrink-0 sm:w-[250px]" onKeyDown={(event) => {
    if (event.key === "Escape" && open) { event.preventDefault(); closeMenu(true); trigger.current?.focus(); }
  }} onBlur={(event) => { if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu(true); }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => (open ? closeMenu(true) : openMenu())} className={`flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 text-[14px] font-bold text-[#172B24] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/20 ${open || isFiltering ? "border-emerald-600 bg-emerald-50/40" : "border-slate-200 hover:border-emerald-400"}`}>
      <Tags className="h-4 w-4 shrink-0 text-green-700" />
      <span className="whitespace-nowrap">Chuyên mục & Phạm vi</span>
      <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id={id} tabIndex={-1} className="absolute left-0 top-[calc(100%+6px)] z-40 flex max-h-[min(34rem,70vh)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl outline-none">
      <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <fieldset>
          <legend className="px-3 pb-1 pt-1 text-xs font-medium text-slate-500">Chuyên mục</legend>
          <label className={row}><input type="checkbox" className={checkbox} checked={draftCategories.length === MEDIA_FILTER_CATEGORIES.length} onChange={() => toggleAll(draftCategories, MEDIA_FILTER_CATEGORIES, setDraftCategories)} />Tất cả chuyên mục</label>
          {MEDIA_FILTER_CATEGORIES.map((category) => <label key={category} className={row}><input type="checkbox" className={checkbox} checked={draftCategories.includes(category)} onChange={() => toggle(draftCategories, category, setDraftCategories)} />{category}</label>)}
        </fieldset>
        <fieldset className="mt-2 border-t border-slate-100 pt-2">
          <legend className="float-left w-full px-3 pb-1 pt-2 text-xs font-medium text-slate-500">Phạm vi hiển thị</legend>
          <label className={`${row} clear-both`}><input type="checkbox" className={checkbox} checked={draftVisibilities.length === MEDIA_FILTER_VISIBILITIES.length} onChange={() => toggleAll(draftVisibilities, MEDIA_FILTER_VISIBILITIES, setDraftVisibilities)} />Tất cả phạm vi</label>
          <label className={row}><input type="checkbox" className={checkbox} checked={draftVisibilities.includes("public")} onChange={() => toggle(draftVisibilities, "public", setDraftVisibilities)} /><Globe className="h-3.5 w-3.5 text-sky-600" />Công khai</label>
          <label className={row}><input type="checkbox" className={checkbox} checked={draftVisibilities.includes("internal")} onChange={() => toggle(draftVisibilities, "internal", setDraftVisibilities)} /><LockKeyhole className="h-3.5 w-3.5" />Nội bộ</label>
        </fieldset>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white p-2">
        <button type="button" onClick={() => { closeMenu(false); trigger.current?.focus(); }} className="h-9 flex-1 cursor-pointer rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Hủy</button>
        <button type="button" onClick={() => { closeMenu(true); trigger.current?.focus(); }} className="h-9 flex-1 cursor-pointer rounded-lg bg-green-700 text-[13px] font-semibold text-white hover:bg-green-800">Áp dụng</button>
      </div>
    </div>}
  </div>;
}
