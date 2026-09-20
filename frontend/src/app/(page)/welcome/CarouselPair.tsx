"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Mail,
  MapPin,
  Phone,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { JOINERS_DATA, TEAM_DATA, type Person } from "./welcomeData";

/** Any lucide glyph, reused for the small section eyebrows. */
type SectionIcon = typeof UsersRound;

const AUTOPLAY_MS = 5000;

const NAV_BUTTON =
  "flex h-10 w-10 items-center justify-center rounded-full border-slate-200 text-slate-600 transition-all hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#15803d] active:scale-95";

/* ------------------------------------------------------------------------- *
 * Profile card — the person detail shared by both carousels
 * ------------------------------------------------------------------------- */

function ProfileCard({ person }: { person: Person }) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      {/* Avatar */}
      <div className="group relative">
        <div className="h-52 w-52 overflow-hidden rounded-2xl border-4 border-slate-50 shadow-lg ring-1 ring-slate-100 sm:h-70 sm:w-70">
          <img
            src={person.avatar}
            alt={person.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#166534] px-3 py-1 text-[11px] font-bold text-white shadow">
          {person.deptLabel || person.dept}
        </div>
      </div>

      {/* Identity */}
      <div className="mt-2 text-center">
        <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          {person.name}
        </h3>
        <p className="mt-0.5 text-sm font-bold text-[#15803d]">{person.title}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Ngày gia nhập: {person.joined}
        </p>
      </div>

      {/* Quote */}
      <div className="relative w-full rounded-2xl border-slate-100 bg-slate-50 p-3.5">
        <span className="absolute -top-2.5 left-3 font-serif text-3xl leading-none text-[#bbf7d0]">
          &ldquo;
        </span>
        <p className="relative z-10 pl-4 text-xs italic leading-relaxed text-slate-600">
          {person.quote}
        </p>
      </div>

      {/* Contact */}
      <div className="flex w-full flex-col gap-1.5 text-xs font-semibold text-slate-500">
        <a
          href={`mailto:${person.email}`}
          className="flex items-center gap-2 transition-colors hover:text-[#15803d]"
        >
          <Mail size={14} className="shrink-0 text-[#16a34a]" />
          <span className="truncate">{person.email}</span>
        </a>
        <a
          href={`tel:${person.phone.replace(/\s/g, "")}`}
          className="flex items-center gap-2 transition-colors hover:text-[#15803d]"
        >
          <Phone size={14} className="shrink-0 text-[#16a34a]" />
          <span>{person.phone}</span>
        </a>
        <span className="flex items-center gap-2">
          <MapPin size={14} className="shrink-0 text-[#16a34a]" />
          <span>{person.location}</span>
        </span>
      </div>

      {/* Footer badges */}
      <div className="mt-1 flex w-full items-center justify-center gap-3 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <Building2 size={13} className="text-[#16a34a]" /> Asia F&B
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck size={13} className="text-[#16a34a]" /> Verified
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- *
 * Shared carousel shell — header, pager controls and the animated slot
 * ------------------------------------------------------------------------- */

type CarouselSectionProps = {
  /** Anchor id used by the navbar shortcuts. */
  id: string;
  icon: SectionIcon;
  eyebrow: string;
  title: string;
  subtitle: string;
  counterText: string;
  person?: Person;
  index: number;
  direction: "next" | "prev";
  onPrev: () => void;
  onNext: () => void;
};

function CarouselSection({
  id,
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  counterText,
  person,
  index,
  direction,
  onPrev,
  onNext,
}: CarouselSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#15803d]">
          <Icon size={14} /> {eyebrow}
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="rounded-3xl border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60">
        {/* Controls header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {counterText}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Trước"
              onClick={onPrev}
              className={NAV_BUTTON}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Sau"
              onClick={onNext}
              className={NAV_BUTTON}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Single card — slides in on each change */}
        <div
          key={index}
          className={
            direction === "next" ? "profile-in-right" : "profile-in-left"
          }
        >
          {person ? (
            <ProfileCard person={person} />
          ) : (
            <p className="py-8 text-center text-slate-400">
              Không tìm thấy nhân sự phù hợp.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- *
 * The paired carousels — one shared index keeps them advancing together
 * ------------------------------------------------------------------------- */

/** Number of slides is the shorter list, so both carousels stay in step. */
const SLIDE_COUNT = Math.min(TEAM_DATA.length, JOINERS_DATA.length);

export default function CarouselPair() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [paused, setPaused] = useState(false);

  const go = (delta: 1 | -1) => {
    if (SLIDE_COUNT <= 1) return;
    setDirection(delta === 1 ? "next" : "prev");
    setIndex((prev) => (prev + delta + SLIDE_COUNT) % SLIDE_COUNT);
  };

  // Single shared timer drives BOTH carousels, so they advance together.
  useEffect(() => {
    if (paused || SLIDE_COUNT <= 1) return;
    const timer = window.setTimeout(() => {
      setDirection("next");
      setIndex((prev) => (prev + 1) % SLIDE_COUNT);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused]);

  const teamMember =
    TEAM_DATA.length > 0 ? TEAM_DATA[index % TEAM_DATA.length] : undefined;
  const joiner =
    JOINERS_DATA.length > 0 ? JOINERS_DATA[index % JOINERS_DATA.length] : undefined;

  return (
    <div
      className="grid grid-cols-1 gap-8 lg:grid-cols-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <CarouselSection
        id="our-team"
        icon={UsersRound}
        eyebrow="Ban Lãnh Đạo & Quản Lý"
        title="Đội ngũ Công ty"
        subtitle="Gặp gỡ những người dẫn dắt và truyền cảm hứng tại Asia F&B"
        counterText={`Card ${
          TEAM_DATA.length === 0 ? 0 : index + 1
        } of ${TEAM_DATA.length}`}
        person={teamMember}
        index={index}
        direction={direction}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      />

      <CarouselSection
        id="new-joiners"
        icon={UserPlus}
        eyebrow="Tân Binh Asia F&B"
        title="Thành viên Gia nhập Gần nhất"
        subtitle="Chào mừng các đồng nghiệp mới vừa gia nhập gia đình Wana & Asia F&B"
        counterText={`Card ${index + 1} of ${JOINERS_DATA.length}`}
        person={joiner}
        index={index}
        direction={direction}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      />
    </div>
  );
}
