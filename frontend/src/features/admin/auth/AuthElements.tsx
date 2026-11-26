"use client";
import Image from "next/image";
import { useState } from "react";
export const CARD =
  "relative rounded-2xl bg-[#0d100e]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 p-7 sm:p-10 transition-all duration-300";

/** Gradient highlight pinned to the card's top edge; `via` sets the hue. */
export function cardAccent(via = "via-[#f5c800]/70") {
  return `absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent ${via} to-transparent`;
}

export const INPUT =
  "w-full pl-10 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/12 text-white placeholder:text-zinc-500 outline-none transition-all duration-200 focus:border-[#f5c800] focus:ring-4 focus:ring-[#f5c800]/15";

export const INPUT_ERROR =
  "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15";
export const LABEL = "block text-xs font-semibold text-zinc-300 mb-1.5";
export const ERROR_TEXT = "text-xs text-rose-400 mt-1 pl-1 font-medium";

/** Gold primary action — the logo's ring colour, on the black canvas. */
export const PRIMARY_BTN =
  "w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4aa00] via-[#f5c800] to-[#e0b400] text-[#1a1a1a] font-bold text-sm shadow-lg shadow-[#f5c800]/20 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

export const ACCENT_BTN =
  "w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4aa00] via-[#f5c800] to-[#e0b400] text-[#1a1a1a] font-bold text-sm shadow-lg shadow-[#f5c800]/20 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

export const EYEBROW =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-[#f5c800]/25 text-[#f5c800] text-xs font-semibold mb-3";

export const TITLE = "text-2xl sm:text-3xl font-bold tracking-tight text-white";
export const SUBTITLE = "text-sm text-zinc-400 mt-1.5";
export const FOOTER_TEXT = "mt-6 text-center text-xs text-zinc-400";
export const LINK =
  "font-semibold text-[#f5c800] hover:text-[#ffd633] transition-colors";

/** Rounded icon badge heading the Forgot/OTP screens. */
export function iconBadge(tone: "amber" | "green") {
  return `w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
    tone === "amber"
      ? "bg-[#f5c800]/10 border-[#f5c800]/25 text-[#f5c800]"
      : "bg-white/[0.06] border-white/15 text-[#f5c800]"
  }`;
}

/** Spinner shown inside a button while a simulated request is in flight. */
export function ButtonSpinner() {
  return (
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
  );
}

/* -------------------------------------------------------------------------- *
 * Floating field — the faded placeholder overlay
 * -------------------------------------------------------------------------- */

/**
 * An input whose placeholder is a faded overlay label rather than a real
 * `placeholder` attribute. The label sits over the field at reduced opacity and
 * fades out the moment the field is focused or holds text, so the field is clean
 * while typing and the hint returns when it is emptied and blurred.
 *
 * `icon` renders inside the left gutter; `trailing` renders inside the right
 * gutter (e.g. the show/hide password button).
 */
export function FloatingField({
  id,
  type = "text",
  value,
  onChange,
  label,
  placeholder,
  icon,
  trailing,
  invalid,
  autoComplete,
  inputMode,
  maxLength,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  /** The field name, shown as the small caption above the input. */
  label: string;
  /** The faded hint shown inside the field until the user engages it. */
  placeholder: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  invalid?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  // The hint hides as soon as the field is active OR already filled.
  const hintHidden = focused || value.length > 0;

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 transition-colors ${invalid ? "text-rose-400" : focused ? "text-[#f5c800]" : "text-zinc-500"}`}
      >
        {icon}
      </span>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={label}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        className={`${INPUT} ${trailing ? "pr-11" : "pr-4"} ${invalid ? INPUT_ERROR : ""}`}
      />

      {/* Faded hint overlay — fades out on focus / once there is text. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-10 right-4 flex items-center truncate text-sm transition-opacity duration-200 ${
          hintHidden ? "opacity-0" : "opacity-45"
        } ${invalid ? "text-rose-300" : "text-zinc-400"}`}
      >
        {placeholder}
      </span>

      {trailing}
    </div>
  );
}

/**
 * The Asia F&B round badge, shown at the head of the login card. The PNG has a
 * white background, so it sits on a white disc to blend into the black canvas.
 */
export function BrandBadge({ size = 84 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative mx-auto mb-4 overflow-hidden rounded-full bg-white ring-2 ring-[#f5c800]/40 shadow-lg shadow-black/40"
    >
      <Image
        src="/assets/images/asia-logo.png"
        alt="Asia Food & Beverage co.ltd"
        fill
        priority
        sizes={`${size}px`}
        className="object-contain"
      />
    </div>
  );
}

/* ========================================================================== *
 * Ambient background + toasts
 * ========================================================================== */

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#060806]">
      {/* Black base with a soft green glow from the top and a gold sheen below. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1410] via-[#060806] to-[#0b0a04]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#f5c800_1px,transparent_1px)] [background-size:26px_26px]" />
      <div
        style={{ animation: "asia-orb-drift 18s ease-in-out infinite" }}
        className="absolute -left-32 -top-36 h-96 w-96 rounded-full bg-gradient-to-tr from-[#1a7a1a]/25 via-[#f5c800]/10 to-transparent blur-3xl sm:h-[500px] sm:w-[500px]"
      />
      <div
        style={{
          animation: "asia-orb-drift 22s ease-in-out 2s infinite reverse",
        }}
        className="absolute -bottom-40 -right-36 h-96 w-96 rounded-full bg-gradient-to-br from-[#f5c800]/12 via-[#1a7a1a]/15 to-transparent blur-3xl sm:h-[540px] sm:w-[540px]"
      />
      {/* Gold hairline along the very top edge. */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5c800]/50 to-transparent" />
    </div>
  );
}

/* ========================================================================== *
 * Screen 1 — Đăng nhập
 * ========================================================================== */
