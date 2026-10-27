"use client";

import { Check, ChevronDown } from "lucide-react";
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import { MEETING_DEPARTMENTS } from "@/config/meetingDepartments";

export default function MeetingDepartmentSelect({ value, onChange, triggerClassName = "" }: {
  value: string;
  onChange: (value: string) => void;
  triggerClassName?: string;
}) {
  const isLegacy = value && !MEETING_DEPARTMENTS.some((department) => department === value);
  const options = isLegacy ? [value, ...MEETING_DEPARTMENTS] : [...MEETING_DEPARTMENTS];

  return <Select aria-label="Phòng ban" placeholder="Chọn phòng ban" selectedKey={value || null} onSelectionChange={(key) => onChange(String(key ?? ""))} className="w-full">
    <Button className={`flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-normal text-slate-800 outline-none transition-colors hover:border-emerald-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100 ${triggerClassName}`}>
      <SelectValue className="truncate" /><ChevronDown size={17} className="shrink-0" />
    </Button>
    <Popover placement="bottom start" shouldFlip={false} offset={6} className="z-[150] max-h-52 w-[var(--trigger-width)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
      <ListBox className="outline-none">{options.map((department) => <ListBoxItem key={department} id={department} textValue={department} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-normal text-slate-700 outline-none data-[focused]:bg-slate-50 data-[selected]:bg-emerald-50 data-[selected]:font-semibold data-[selected]:text-emerald-800">
        {({ isSelected }) => <><span>{department}{isLegacy && department === value ? " (dữ liệu cũ)" : ""}</span>{isSelected && <Check size={16} className="shrink-0 text-emerald-600" />}</>}
      </ListBoxItem>)}</ListBox>
    </Popover>
  </Select>;
}
