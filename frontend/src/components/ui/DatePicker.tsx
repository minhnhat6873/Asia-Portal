"use client";

import {isSameMonth, parseDate, type CalendarDate} from "@internationalized/date";
import {CalendarDays, ChevronLeft, ChevronRight} from "lucide-react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  CalendarMonthPicker,
  CalendarYearPicker,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  I18nProvider,
  Popover,
} from "react-aria-components";

type DatePickerProps = {
  value: string;
  minValue?: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  applyMonthAndYear?: boolean;
};

export default function DatePicker({value, minValue, onChange, ariaLabel = "Date", disabled = false, applyMonthAndYear = false}: DatePickerProps) {
  const selectedDate = value ? parseDate(value) : null;
  const minimumDate = minValue ? parseDate(minValue) : undefined;

  return <I18nProvider locale="en-GB"><AriaDatePicker isDisabled={disabled} aria-label={ariaLabel} value={selectedDate} minValue={minimumDate} onChange={(nextValue: CalendarDate | null) => onChange(nextValue?.toString() ?? "")}>
    <Group className="flex h-[42px] w-full items-center rounded-lg border border-slate-200 bg-white pl-3 text-sm text-slate-800 outline-none transition focus-within:border-[#159447] focus-within:ring-2 focus-within:ring-emerald-100">
      <DateInput className="flex min-w-0 flex-1 items-center text-sm outline-none">
        {(segment) => <DateSegment segment={segment} className="rounded px-0.5 tabular-nums outline-none data-[placeholder]:text-slate-400 focus:bg-emerald-100" />}
      </DateInput>
      <Button className="mr-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-600 outline-none transition hover:bg-emerald-50 hover:text-[#159447] focus-visible:ring-2 focus-visible:ring-emerald-300"><CalendarDays size={18} /></Button>
    </Group>
    <Popover offset={8} className="z-[90] rounded-2xl bg-white p-3 shadow-[0_18px_44px_rgba(15,23,42,0.2)] ring-1 ring-slate-200">
      <Dialog className="outline-none">
        <Calendar className="w-[280px]">
          {({state}) => {
            const applyPeriod = (period: {month?: number; year?: number}) => {
              const candidate = state.focusedDate.set({day: selectedDate?.day ?? state.focusedDate.day, ...period});
              const nextDate = minimumDate && candidate.compare(minimumDate) < 0 ? minimumDate : candidate;
              state.setFocusedDate(nextDate);
              onChange(nextDate.toString());
            };

            return <>
              <header className="mb-3 flex items-center justify-between px-1">
                <Button slot="previous" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 outline-none transition hover:bg-emerald-50 hover:text-[#159447]"><ChevronLeft size={19} /></Button>
                <CalendarHeading className="sr-only" />
                <div className="flex items-center justify-center gap-1">
                  <CalendarMonthPicker format="short">
                    {({items, value, onChange, ...ariaProps}) => (
                      <select
                        {...ariaProps}
                        value={String(value)}
                        onChange={(event) => {
                          const month = Number(event.target.value);
                          if (applyMonthAndYear) applyPeriod({month});
                          else onChange(month);
                        }}
                        className="cursor-pointer rounded-lg border-0 bg-transparent px-1.5 py-1 text-sm font-bold text-slate-800 outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-emerald-200"
                      >
                        {items.map((month) => (
                          <option key={month.id} value={month.id}>{month.formatted}</option>
                        ))}
                      </select>
                    )}
                  </CalendarMonthPicker>
                  <CalendarYearPicker visibleYears={120}>
                    {({items, value, onChange, ...ariaProps}) => (
                      <select
                        {...ariaProps}
                        value={String(value)}
                        onChange={(event) => {
                          const yearIndex = Number(event.target.value);
                          if (applyMonthAndYear) applyPeriod({year: items[yearIndex].date.year});
                          else onChange(yearIndex);
                        }}
                        className="cursor-pointer rounded-lg border-0 bg-transparent px-1.5 py-1 text-sm font-bold text-slate-800 outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-emerald-200"
                      >
                        {items.map((year) => (
                          <option key={year.id} value={year.id}>{year.formatted}</option>
                        ))}
                      </select>
                    )}
                  </CalendarYearPicker>
                </div>
                <Button slot="next" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 outline-none transition hover:bg-emerald-50 hover:text-[#159447]"><ChevronRight size={19} /></Button>
              </header>
              <CalendarGrid className="w-full border-collapse text-center">
                <CalendarGridHeader>
                  {(day) => <CalendarHeaderCell className="h-8 text-xs font-semibold text-slate-400">{day}</CalendarHeaderCell>}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => {
                    // Days of the previous/next month (greyed) can be picked too: the
                    // calendar then moves to that month. Days before minValue stay locked.
                    const otherMonth = !isSameMonth(date, state.visibleRange.start);
                    const otherMonthAllowed = otherMonth && !(minimumDate && date.compare(minimumDate) < 0);
                    return <CalendarCell
                      date={date}
                      onClick={otherMonthAllowed ? () => { state.setFocusedDate(date); onChange(date.toString()); } : undefined}
                      className={({isSelected, isOutsideMonth, isDisabled}) => `h-9 w-9 rounded-lg text-sm font-medium outline-none transition ${isSelected ? "cursor-pointer bg-[#159447] text-white" : isOutsideMonth ? (otherMonthAllowed ? "cursor-pointer text-slate-400 hover:bg-emerald-50 hover:text-[#08723d]" : "cursor-not-allowed text-slate-300") : isDisabled ? "cursor-not-allowed text-slate-300" : "cursor-pointer text-slate-700 hover:bg-emerald-50 hover:text-[#08723d] focus:bg-emerald-100"}`}
                    />;
                  }}
                </CalendarGridBody>
              </CalendarGrid>
            </>;
          }}
        </Calendar>
      </Dialog>
    </Popover>
  </AriaDatePicker></I18nProvider>;
}
