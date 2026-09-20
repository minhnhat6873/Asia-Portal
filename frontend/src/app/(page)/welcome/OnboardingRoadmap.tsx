import { Check, Loader, Route } from "lucide-react";
import {
  ONBOARDING_STEPS,
  getCompletionPercent,
  type OnboardingStep,
} from "./welcomeData";

const COMPLETION_PERCENT = getCompletionPercent(ONBOARDING_STEPS);

/* ------------------------------------------------------------------------- *
 * Timeline node — the circular marker sitting on the rail
 * ------------------------------------------------------------------------- */

const NODE_BASE =
  "flex items-center justify-center rounded-full ring-4 ring-white shadow-sm";

const NODE_TONE: Record<OnboardingStep["state"], string> = {
  done: "h-10 w-10 bg-[#22c55e] text-white",
  current: "h-10 w-10 bg-[#f59e0b] text-white",
  upcoming:
    "h-9 w-9 border border-slate-200 bg-white text-xs font-bold text-slate-400",
};

function RoadmapNode({ step }: { step: OnboardingStep }) {
  return (
    <div className={`${NODE_BASE} ${NODE_TONE[step.state]}`}>
      {step.state === "done" ? (
        <Check size={19} strokeWidth={3} />
      ) : step.state === "current" ? (
        <Loader size={18} className="animate-spin" />
      ) : (
        step.order
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- *
 * Milestone card — shown beside the rail
 * ------------------------------------------------------------------------- */

const CARD_TONE: Record<OnboardingStep["state"], string> = {
  done: "border-[#86efac] bg-white shadow-sm",
  current: "border-amber-300 bg-white shadow-lg shadow-amber-100",
  upcoming: "border-slate-200 bg-white shadow-sm",
};

const BADGE_TONE: Record<OnboardingStep["state"], string> = {
  done: "bg-[#dcfce7] text-[#15803d]",
  current: "bg-[#fef3c7] text-[#b45309]",
  upcoming: "bg-slate-100 text-slate-500",
};

const BADGE_LABEL: Record<OnboardingStep["state"], string> = {
  done: "Đã hoàn thành",
  current: "Đang thực hiện",
  upcoming: "Sắp tới",
};

const TITLE_TONE: Record<OnboardingStep["state"], string> = {
  done: "text-slate-900",
  current: "text-slate-900",
  upcoming: "text-slate-600",
};

function RoadmapStepCard({ step }: { step: OnboardingStep }) {
  const isPending = step.state === "upcoming";

  return (
    <article
      className={`w-full rounded-2xl border px-5 py-4 transition-shadow ${CARD_TONE[step.state]}`}
    >
      <header className="mb-2 flex items-center justify-end gap-3">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${BADGE_TONE[step.state]}`}
        >
          {BADGE_LABEL[step.state]}
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          {step.timing}
        </span>
      </header>

      <h3
        className={`text-[15px] font-bold leading-snug ${TITLE_TONE[step.state]}`}
      >
        {step.order}. {step.title}
      </h3>

      <p
        className={`mt-1.5 text-xs leading-relaxed ${
          isPending ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {step.desc}
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------------- *
 * Roadmap section — header, progress bar and the alternating timeline
 * ------------------------------------------------------------------------- */

function RoadmapHeader() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#16a34a]">
        <Route size={14} strokeWidth={2.5} />
        <span>Your Journey</span>
      </div>
      <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-[32px]">
        Lộ trình Hội nhập của bạn
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Theo dõi tiến độ hoàn thành các bước để sẵn sàng 100% cho công việc
      </p>
    </div>
  );
}

function ProgressPanel() {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-slate-800">
          Tiến độ Onboarding:
        </span>
        <span className="text-sm font-bold text-[#16a34a]">
          {COMPLETION_PERCENT}% Hoàn thành
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={COMPLETION_PERCENT}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-[#4ade80] transition-all duration-500"
          style={{ width: `${COMPLETION_PERCENT}%` }}
        />
      </div>
    </div>
  );
}

function TimelineRow({ step }: { step: OnboardingStep }) {
  const cardOnLeft = step.side === "left";

  return (
    <li className="relative pl-14 sm:flex sm:items-center sm:pl-0">
      {/* Rail node — pinned to the centre line on desktop, left on mobile */}
      <div className="absolute left-5 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 sm:left-1/2">
        <RoadmapNode step={step} />
      </div>

      {/* Desktop-only left column */}
      <div className="hidden w-1/2 justify-end pr-10 sm:flex">
        {cardOnLeft ? <RoadmapStepCard step={step} /> : null}
      </div>

      {/* Mobile card slot, also the right column on desktop */}
      <div className="w-full sm:w-1/2 sm:pl-10">
        {cardOnLeft ? null : <RoadmapStepCard step={step} />}
      </div>
    </li>
  );
}

export default function OnboardingRoadmap() {
  return (
    <section id="roadmap" className="scroll-mt-24">
      <RoadmapHeader />
      <ProgressPanel />

      <div className="relative mx-auto mt-10 max-w-3xl">
        {/* Continuous vertical rail */}
        <div className="absolute bottom-3 left-5 top-3 w-[3px] -translate-x-1/2 rounded-full bg-slate-200 sm:left-1/2" />

        <ol className="relative space-y-6 sm:space-y-8">
          {ONBOARDING_STEPS.map((step) => (
            <TimelineRow key={step.order} step={step} />
          ))}
        </ol>
      </div>
    </section>
  );
}
