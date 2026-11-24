"use client";

import { Button, ListBox, ListBoxItem, Popover, Select } from "react-aria-components";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { useState } from "react";

interface Option {
  value: string;
  label: string;
  icon: LucideIcon;
  tone?: string;
}

export function AccountFilterSelect({ value, options, onChange, label, className, popoverClassName = "", disabled = false, id, inlineMenu = false }: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
  popoverClassName?: string;
  disabled?: boolean;
  id?: string;
  inlineMenu?: boolean;
}) {
  const [menuContainer, setMenuContainer] = useState<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const Icon = selected.icon;
  const select = <Select aria-label={label} isDisabled={disabled} selectedKey={value} onSelectionChange={(key) => { if (key !== null) onChange(String(key)); }} className={inlineMenu ? "w-full" : className}>
    {({ isOpen }) => <>
      <Button id={id} className={`flex h-14 w-full cursor-pointer items-center gap-2.5 rounded-2xl border bg-white px-4 text-left text-base font-semibold text-[#164c40] shadow-sm outline-none transition-colors hover:border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 ${isOpen ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200"}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected.tone ?? "text-emerald-700"}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1 truncate">{selected.label}</span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>
      <Popover placement="bottom start" shouldFlip={false} offset={8}
        // Inline mode: render the menu into the container below the Select, so it pushes the form
        // down instead of floating. Wait for that container before opening the menu there.
        UNSTABLE_portalContainer={inlineMenu ? menuContainer ?? undefined : undefined}
        className={`z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_18px_42px_rgba(15,54,39,0.18)] ${inlineMenu ? "relative! inset-auto! mt-2 max-h-none! w-full" : "w-[min(25rem,calc(100vw-2rem))] min-w-[--trigger-width]"} ${popoverClassName}`}>
        <ListBox items={options} style={{ outline: "none", maxHeight: inlineMenu ? undefined : "min(18rem, calc(var(--available-height) - 1.25rem))" }} className="space-y-1 overflow-y-auto outline-none">
          {(option) => <ListBoxItem id={option.value} textValue={option.label} style={{ outline: "none" }} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-slate-700 outline-none transition-colors data-[focused]:bg-emerald-50/70 data-[selected]:bg-emerald-50 data-[selected]:font-bold data-[selected]:text-emerald-900 text-base font-medium`}>
            {({ isSelected }) => <>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${option.tone ?? "bg-emerald-50 text-emerald-700"}`}><option.icon aria-hidden="true" className="h-5 w-5" /></span>
              <span className="flex-1">{option.label}</span>
              {isSelected && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><Check aria-hidden="true" size={16} strokeWidth={3} /></span>}
            </>}
          </ListBoxItem>}
        </ListBox>
      </Popover>
    </>}
  </Select>;
  if (!inlineMenu) return select;
  // The menu container must sit outside <Select>: React Aria renders Select's children a second
  // time in a hidden collection tree, so a ref inside it can point at a node that is never shown.
  return <div className={className}>
    {select}
    <div ref={(node) => setMenuContainer(node instanceof HTMLDivElement ? node : null)} />
  </div>;
}
