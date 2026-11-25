"use client";

import { Building2 } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";
import { matchSavedPlaces, placeText, SAVED_PLACES, type SavedPlace } from "./savedPlaces";

/**
 * Text input with company-place suggestions (type "Wana", "Á Châu"…). Free text and
 * coordinates are still accepted; a suggestion only fills the box.
 */
export default function PlaceInput({ value, onChange, onPick, onBlur, className, showAllOnEmpty = false, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  onPick?: (place: SavedPlace) => void;
  showAllOnEmpty?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = open ? (showAllOnEmpty && !value.trim() ? SAVED_PLACES : matchSavedPlaces(value)) : [];
  const shown = matches.length > 0;

  const pick = (place: SavedPlace) => {
    onChange(placeText(place));
    onPick?.(place);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        {...rest}
        value={value}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown ? `${listId}-${active}` : undefined}
        autoComplete="off"
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => { window.setTimeout(() => setOpen(false), 120); onBlur?.(event); }}
        onKeyDown={(event) => {
          if (!shown) return;
          if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => (index + 1) % matches.length); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => (index - 1 + matches.length) % matches.length); }
          else if (event.key === "Enter") { event.preventDefault(); pick(matches[Math.min(active, matches.length - 1)]); }
          else if (event.key === "Escape") setOpen(false);
        }}
        className={className}
      />
      {shown && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {matches.map((place, index) => (
            <li
              key={place.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => { event.preventDefault(); pick(place); }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 ${index === active ? "bg-emerald-50" : ""}`}
            >
              <Building2 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-emerald-700" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{place.name}</span>
                <span className="block text-xs leading-5 text-slate-500">{place.address}</span>
                {place.location && <span className="block text-[11px] text-slate-400">{place.location.lat}, {place.location.lng}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
