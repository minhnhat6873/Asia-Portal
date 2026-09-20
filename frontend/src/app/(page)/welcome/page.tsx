import Link from "next/link";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import {
  ArrowRight,
  Bot,
  Download,
  PartyPopper,
  Send,
  Sparkles,
  Toolbox,
} from "lucide-react";
import CarouselPair from "./CarouselPair";
import OnboardingRoadmap from "./OnboardingRoadmap";
import { RESOURCE_ITEMS, type ResourceItem } from "./welcomeData";

/* ------------------------------------------------------------------------- *
 * White shortcut card used by the "Công cụ & Tài nguyên" grid
 * ------------------------------------------------------------------------- */

function ResourceCard({ item }: { item: ResourceItem }) {
  const Icon = item.icon;

  return (
    <Link
      id={item.anchor}
      href={item.href}
      className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100 transition-all hover:border-[#bbf7d0] hover:shadow-xl"
    >
      <div>
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${item.chipTone}`}
        >
          <Icon size={22} />
        </div>
        <h3 className="mb-1 text-base font-bold text-slate-900 group-hover:text-[#15803d]">
          {item.title}
        </h3>
        <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 text-xs font-semibold ${item.linkTone}`}
      >
        <span>{item.linkText}</span>
        {item.showDownloadIcon ? (
          <Download size={13} />
        ) : (
          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-1"
          />
        )}
      </div>
    </Link>
  );
}

/** Highlighted dark-green card that closes the resource grid. */
function AssistantCard() {
  return (
    <Link
      href="/demo/ai-assistant"
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#166534] to-[#14522d] p-6 text-left text-white shadow-xl transition-all hover:shadow-2xl"
    >
      <div className="absolute -bottom-4 -right-4 opacity-10">
        <Bot size={96} />
      </div>

      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-amber-300 transition-transform group-hover:scale-110">
          <Sparkles size={22} />
        </div>
        <h3 className="mb-1 text-base font-bold text-white">
          Trợ lý AI Onboarding
        </h3>
        <p className="text-xs leading-relaxed text-slate-200">
          Hỏi đáp tức thì về quy trình, quy định công ty với Trợ lý AI thông
          minh.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-300">
        <span>Trò chuyện ngay</span>
        <Send size={13} />
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------------- *
 * Page
 * ------------------------------------------------------------------------- */

export default function ChaoMungPage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      {/* Hero — banner gốc giữ nguyên */}
      <div className="wana-gradient py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#f5c800] rounded-full flex items-center justify-center">
              <PartyPopper size={32} className="text-[#0d5c0d]" />
            </div>
          </div>
          <p className="text-[#f5c800] text-xs font-bold tracking-widest uppercase mb-3">
            Welcome to Asia F&B
          </p>
          <h1 className="text-white text-4xl md:text-5xl font-black mb-4">
            Chào mừng thành viên mới! 🎉
          </h1>
          <p className="text-white/80 text-base max-w-xl mx-auto">
            Bạn vừa gia nhập một gia đình tuyệt vời. Chúng tôi rất vui khi có
            bạn đồng hành trên hành trình{" "}
            <strong className="text-[#f5c800]">Growing Together</strong> của
            Asia F&B.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-grow space-y-16 px-4 py-12 sm:px-6">
        {/* SECTION A + B: Đội ngũ & Tân binh — 2 cột, chuyển động đồng bộ */}
        <CarouselPair />

        {/* SECTION C: Lộ trình hội nhập */}
        <OnboardingRoadmap />

        {/* SECTION D: Công cụ & tài nguyên */}
        <section id="resources" className="scroll-mt-24">
          <div className="mb-8 flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#15803d]">
                <Toolbox size={14} /> Tài Nguyên Bổ Sung
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Công cụ & Tài nguyên Cần thiết
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lối tắt truy cập nhanh giúp tân binh làm quen hệ thống dễ dàng
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {RESOURCE_ITEMS.map((item) => (
              <ResourceCard key={item.title} item={item} />
            ))}

            {/* Trợ lý AI — hiện cũng dẫn tới trang demo bản thử nghiệm */}
            <AssistantCard />
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
