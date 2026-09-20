"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CircleAlert,
  Clock,
  FlaskConical,
  House,
  MousePointerClick,
  Rocket,
} from "lucide-react";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import { DEMO_FEATURES, type DemoFeature } from "@/config/demoFeatures";

/* ------------------------------------------------------------------------- *
 * Hero — green banner announcing the placeholder build
 * ------------------------------------------------------------------------- */

function DemoHero() {
  return (
    <section className="wana-gradient py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5c800]">
            <FlaskConical size={32} className="text-[#0d5c0d]" />
          </div>
        </div>

        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#f5c800]">
          Asia F&B · Bản thử nghiệm
        </p>

        <h1 className="mb-4 text-3xl font-black text-white md:text-4xl">
          Trang đang trong bản thử nghiệm
        </h1>

        <p className="mx-auto max-w-xl text-base text-white/80">
          Tính năng bạn vừa chọn chưa sẵn sàng để sử dụng.{" "}
          <strong className="text-[#f5c800]">Vui lòng quay trở lại sau.</strong>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- *
 * Headline notice — explains this build is not production ready yet
 * ------------------------------------------------------------------------- */

function TrialNotice({ featureLabel }: { featureLabel?: string }) {
  return (
    <section
      role="status"
      className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <CircleAlert size={24} />
        </div>

        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
            <Clock size={12} /> Đang phát triển
          </span>

          <h2 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">
            Thông báo: trang đang ở bản thử nghiệm
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Nội dung này mới chỉ là bản thử nghiệm (demo) và chưa được phát
            hành chính thức.{" "}
            <strong className="text-slate-800">
              Vui lòng quay trở lại sau.
            </strong>
          </p>

          {featureLabel ? (
            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm text-slate-600 ring-1 ring-amber-200">
              <MousePointerClick size={15} className="shrink-0 text-amber-600" />
              <span className="truncate">
                Bạn vừa truy cập:{" "}
                <strong className="font-bold text-slate-900">
                  {featureLabel}
                </strong>
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- *
 * Roadmap of the six shortcuts, all still waiting on a real implementation
 * ------------------------------------------------------------------------- */

function FeatureStatusList({ activeSlug }: { activeSlug?: string }) {
  return (
    <section>
      <header className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#15803d]">
          <Rocket size={14} /> Lộ trình phát hành
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">
          Các tính năng đang hoàn thiện
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Toàn bộ lối tắt dưới đây sẽ được bật khi bản chính thức ra mắt.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_FEATURES.map((feature) => {
          const isActive = feature.slug === activeSlug;

          return (
            <li
              key={feature.slug}
              aria-current={isActive ? "true" : undefined}
              className={`rounded-2xl border bg-white p-5 transition-shadow ${
                isActive
                  ? "border-[#86efac] shadow-lg shadow-emerald-100"
                  : "border-slate-100 shadow-sm"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  <Clock size={11} /> Đang phát triển
                </span>
                {isActive ? (
                  <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#15803d]">
                    Bạn đang xem
                  </span>
                ) : null}
              </div>

              <h3 className="text-sm font-bold text-slate-900">
                {feature.label}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {feature.summary}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------- *
 * Lets the visitor step back to wherever the shortcut was clicked from
 * ------------------------------------------------------------------------- */

function BackActions() {
  const router = useRouter();

  const goBack = () => {
    // A direct visit has no history to return to, so fall back to /welcome.
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/welcome");
  };

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-center">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#15803d] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#166534] active:scale-[0.98]"
      >
        <ArrowLeft size={16} />
        Quay lại trang trước
      </button>

      <Link
        href="/welcome"
        className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#15803d] px-6 py-3 text-sm font-bold text-[#15803d] transition-colors hover:bg-[#f0fdf4] active:scale-[0.98]"
      >
        <House size={16} />
        Về trang chào mừng
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------------- *
 * Shared page shell for every /demo route
 * ------------------------------------------------------------------------- */

type Props = {
  /** The shortcut the visitor came from, when the URL names a known feature. */
  feature?: DemoFeature;
};

export default function DemoScreen({ feature }: Props) {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <DemoHero />

      <div className="mx-auto w-full max-w-5xl flex-grow space-y-10 px-4 py-12 sm:px-6">
        <TrialNotice featureLabel={feature?.label} />
        <FeatureStatusList activeSlug={feature?.slug} />
        <BackActions />
      </div>

      <Footer />
    </main>
  );
}
