"use client";

import { ConfigProvider, TimePicker } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs, { type Dayjs } from "dayjs";
import { Check, Clock, X } from "lucide-react";
import { useState } from "react";
import DatePicker from "./DatePicker";

const PATTERN = /^(\d{4}-\d{2}-\d{2})?T?(\d{2}:\d{2})?$/;

/** Splits "YYYY-MM-DDTHH:mm" (either part may be missing while typing). */
export function splitDateTime(value: string | null | undefined): { date: string; time: string } {
  const match = PATTERN.exec(value ?? "");
  return { date: match?.[1] ?? "", time: match?.[2] ?? "" };
}

/** Only a full value counts; a lone date or time is still "not chosen". */
export const isCompleteDateTime = (value: string | null | undefined) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value ?? "");

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, index) => from + index);
const toDayjs = (time: string) => dayjs().hour(Number(time.slice(0, 2))).minute(Number(time.slice(3, 5))).second(0).millisecond(0);

/**
 * Ant Design time picker in the portal's own popup: title "Chọn giờ", "Giờ" / "Phút"
 * columns, and "Bây giờ", "Hủy", "Xác nhận". Picking cells only changes a draft;
 * "Xác nhận" saves it, "Hủy", ✕ or clicking outside drops it.
 */
function TimeSelect({ time, minTime, label, minuteStep, height, radius, disabledTime, onChange }: {
  time: string;
  /** Earliest allowed time on the chosen day ("HH:mm"), if any. */
  minTime?: string;
  label: string;
  minuteStep: number;
  height: number;
  radius: number;
  disabledTime: () => { disabledHours?: () => number[]; disabledMinutes?: (hour: number) => number[] };
  onChange: (time: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Dayjs | null>(null);
  const restrictions = disabledTime();
  const draftAllowed = draft !== null
    && !restrictions.disabledHours?.().includes(draft.hour())
    && !restrictions.disabledMinutes?.(draft.hour()).includes(draft.minute());
  const close = () => setOpen(false);
  const confirm = (value: Dayjs | null) => {
    if (!value || restrictions.disabledHours?.().includes(value.hour())
      || restrictions.disabledMinutes?.(value.hour()).includes(value.minute())) return;
    if (value) onChange(value.format("HH:mm"));
    setOpen(false);
  };
  // Keep focus in the picker so a button click does not count as "clicked outside".
  const keepFocus = (event: React.MouseEvent) => event.preventDefault();

  return (
    <ConfigProvider locale={viVN} theme={{ token: { colorPrimary: "#15803d", controlHeight: height, borderRadius: radius, fontSize: 14, colorBorder: "#e2e8f0" } }}>
      <TimePicker
        aria-label={label}
        format={["HH:mm", "HHmm"]}
        placement="topLeft"
        minuteStep={minuteStep as 1}
        needConfirm
        showNow={false}
        placeholder="--:--"
        open={open}
        onOpenChange={(next) => { if (next) setDraft(time ? toDayjs(time) : null); setOpen(next); }}
        value={time ? toDayjs(time) : null}
        onCalendarChange={(next) => setDraft(Array.isArray(next) ? next[0] ?? null : next)}
        onChange={(next: Dayjs | null) => onChange(next ? next.format("HH:mm") : "")}
        disabledTime={disabledTime}
        prefix={<Clock aria-hidden="true" size={17} className="text-emerald-700" />}
        suffix={null}
        className="w-full"
        classNames={{ popup: { root: "asia-time-popup" } }}
        panelRender={() => (
          <div className="w-[360px] max-w-[calc(100vw-32px)]">
            <div className="flex items-center justify-between px-5 pb-4 pt-4">
              <span className="inline-flex items-center gap-2 text-[15px] font-bold text-slate-900"><Clock aria-hidden="true" size={18} className="text-emerald-700" />Chọn giờ</span>
              <button type="button" aria-label="Đóng" onMouseDown={keepFocus} onClick={close} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X aria-hidden="true" size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 text-sm font-semibold text-green-800">
              <span className="rounded-t-xl border border-b-0 border-slate-200 bg-green-50 px-4 py-2">Giờ</span>
              <span className="rounded-t-xl border border-b-0 border-slate-200 bg-green-50 px-4 py-2">Phút</span>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 pb-3">
              {(["hour", "minute"] as const).map((unit) => (
                <div key={unit} role="group" aria-label={unit === "hour" ? "Giờ" : "Phút"}
                  className="asia-time-options h-56 min-w-0 overflow-y-auto rounded-b-xl border border-t-0 border-slate-200 p-2">
                  {range(0, unit === "hour" ? 24 : 60).filter((number) => unit === "hour" || number % minuteStep === 0 || draft?.minute() === number).map((number) => {
                    const selected = draft !== null && draft[unit]() === number;
                    const disabled = unit === "hour"
                      ? restrictions.disabledHours?.().includes(number)
                      : restrictions.disabledMinutes?.(draft?.hour() ?? 0).includes(number);
                    return (
                      <button key={number} type="button" aria-pressed={selected} disabled={disabled}
                        onMouseDown={keepFocus}
                        onClick={() => setDraft((current) => (current ?? toDayjs("00:00"))[unit](number))}
                        className={`block h-9 w-full cursor-pointer rounded-lg text-center text-[15px] transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${selected ? "bg-green-100 font-bold text-green-800" : "text-slate-800 hover:bg-green-50"}`}>
                        {String(number).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2.5">
              <button type="button" onMouseDown={keepFocus} onClick={() => {
                // "Bây giờ" never picks a time that is not allowed (e.g. under the 15-minute lead).
                const now = dayjs().second(0).millisecond(0);
                confirm(minTime && now.format("HH:mm") < minTime ? toDayjs(minTime) : now);
              }} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Clock aria-hidden="true" size={14} />Bây giờ</button>
              <span className="flex gap-2">
                <button type="button" onMouseDown={keepFocus} onClick={close} className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
                <button type="button" onMouseDown={keepFocus} onClick={() => confirm(draft)} disabled={!draftAllowed} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><Check aria-hidden="true" size={14} />Xác nhận</button>
              </span>
            </div>
          </div>
        )}
      />
    </ConfigProvider>
  );
}

/**
 * Date and time chosen separately: the shared calendar for the day, Ant Design's
 * 24-hour time picker for the time. The value stays "YYYY-MM-DDTHH:mm" (Vietnam time).
 * min (same format) greys out earlier days, hours and minutes.
 */
export default function DateTimeInput({ id, value, onChange, min, invalid = false, minuteStep = 1, dateLabel, timeLabel, showLabels = false }: {
  id?: string;
  value: string | null;
  onChange: (value: string) => void;
  min?: string;
  invalid?: boolean;
  minuteStep?: number;
  dateLabel: string;
  timeLabel: string;
  showLabels?: boolean;
}) {
  const { date, time } = splitDateTime(value);
  const minimum = splitDateTime(min);
  const join = (nextDate: string, nextTime: string) => onChange(nextDate || nextTime ? `${nextDate}T${nextTime}` : "");

  const disabledTime = () => {
    if (!minimum.date || !minimum.time || date !== minimum.date) return {};
    const [minHour, minMinute] = minimum.time.split(":").map(Number);
    return {
      disabledHours: () => range(0, minHour),
      disabledMinutes: (hour: number) => (hour === minHour ? range(0, minMinute) : []),
    };
  };

  return (
    <div id={id} tabIndex={-1} className={`grid ${showLabels ? "grid-cols-1 gap-4 sm:grid-cols-2" : "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2"} rounded-lg outline-none ${invalid ? "[&_.ant-picker]:!border-rose-300 [&_[role=group]]:!border-rose-300" : ""}`}>
      <div className={`min-w-0 ${showLabels ? "[&_[role=group]]:h-12 [&_[role=group]]:rounded-xl" : ""}`}>
        {showLabels && <span className="mb-1.5 block text-sm font-semibold text-slate-700">{dateLabel}<span className="text-rose-500"> *</span></span>}
        <DatePicker applyMonthAndYear ariaLabel={dateLabel} value={date} minValue={minimum.date || undefined} onChange={(nextDate) => join(nextDate, time)} />
      </div>
      <div className="min-w-0">
        {showLabels && <span className="mb-1.5 block text-sm font-semibold text-slate-700">{timeLabel}<span className="text-rose-500"> *</span></span>}
        <TimeSelect time={time} minTime={minimum.date && minimum.date === date ? minimum.time : undefined} label={timeLabel} minuteStep={minuteStep} height={showLabels ? 48 : 42} radius={showLabels ? 12 : 8} disabledTime={disabledTime} onChange={(nextTime) => join(date, nextTime)} />
      </div>
    </div>
  );
}
