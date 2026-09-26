"use client";

import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import ProductHeroSlider from "./ProductHeroSlider";
import { ArrowRight, Bot, Download, Play, Send, Sparkles, Toolbox, Trophy, Globe, Users, Leaf } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RESOURCE_ITEMS, type ResourceItem } from "../welcome/welcomeData";


/* ── DATA ── */
const stats = [
  { icon: Users, value: "500+", label: "Nhân viên" },
  { icon: Trophy, value: "10+", label: "Thương hiệu sản phẩm" },
  { icon: Globe, value: "20+", label: "Quốc gia" },
  { icon: Leaf, value: "1", label: "Đội ngũ vững mạnh" },
];

const milestones = [
  {
    year: "2010",
    event: "Thành lập Công ty Á Châu",
    desc: "Đặt nền móng cho hành trình phát triển với định hướng mang đến những sản phẩm chất lượng cho người tiêu dùng.",
    image: "/assets/images/company-overview.png",
  },
  {
    year: "2015",
    event: "Ra mắt thương hiệu Wana",
    desc: "Đánh dấu bước ngoặt quan trọng khi thương hiệu Wana chính thức hiện diện trên thị trường, mang đến các dòng đồ uống giải khát chất lượng.",
    image: "/assets/images/coconut-calamansi.png",
  },
  {
    year: "2020",
    event: "Mở rộng thị trường quốc tế",
    desc: "Wana đưa sản phẩm đến nhiều thị trường mới, xây dựng nền tảng vững chắc cho hành trình vươn xa.",
    image: "/assets/images/employees-banner.png",
  },
  {
    year: "2024",
    event: "Nâng cao năng lực sản xuất",
    desc: "Đầu tư vào công nghệ, quy trình và nguồn lực để đáp ứng những tiêu chuẩn chất lượng ngày càng cao.",
    image: "/assets/images/workplace.png",
  },
  {
    year: "Tương lai",
    event: "Wana và hành trình cùng cộng đồng",
    desc: "Tiếp tục đổi mới mỗi ngày, lan tỏa những giá trị tích cực và đồng hành cùng cộng đồng.",
    image: "/assets/images/company-overview.png",
  },
];




function ResourceCard({ item }: { item: ResourceItem }) {
  const Icon = item.icon;

  return (
    <Link
      id={item.anchor}
      href={item.href}
      className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100 transition-all hover:border-[#bbf7d0] hover:shadow-xl"
    >
      <div>
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${item.chipTone}`}>
          <Icon size={22} />
        </div>
        <h3 className="mb-1 text-base font-bold text-slate-900 group-hover:text-[#15803d]">{item.title}</h3>
        <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
      </div>
      <div className={`mt-4 flex items-center gap-2 text-xs font-semibold ${item.linkTone}`}>
        <span>{item.linkText}</span>
        {item.showDownloadIcon ? <Download size={13} /> : <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />}
      </div>
    </Link>
  );
}

function AssistantCard() {
  return (
    <Link href="/demo/ai-assistant" className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#166534] to-[#14522d] p-6 text-left text-white shadow-xl transition-all hover:shadow-2xl">
      <div className="absolute -bottom-4 -right-4 opacity-10"><Bot size={96} /></div>
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-amber-300 transition-transform group-hover:scale-110"><Sparkles size={22} /></div>
        <h3 className="mb-1 text-base font-bold text-white">Trợ lý AI Onboarding</h3>
        <p className="text-xs leading-relaxed text-slate-200">Hỏi đáp tức thì về quy trình, quy định công ty với Trợ lý AI thông minh.</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-300"><span>Trò chuyện ngay</span><Send size={13} /></div>
    </Link>
  );
}
/* ── PAGE ── */
export default function VeWanaPage() {
  const [activeMilestone, setActiveMilestone] = useState(1);
  const selectedMilestone = milestones[activeMilestone];

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* ══════════════════════════════════
          1. HERO — about-wana.png, single gradient
         ══════════════════════════════════ */}
      <section className="relative h-[300px] overflow-hidden sm:h-[340px]">

        {/* Full-width about-wana photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/images/company-overview.png"
          alt="Wana Building"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "60% center" }}
        />

        {/* Single smooth gradient: dark left → transparent right */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.1) 65%, transparent 80%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6">
          <div className="w-full flex items-center justify-between">

            {/* LEFT: text */}
            <div className="max-w-lg">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#f5c800] sm:mb-4 sm:text-xs">
                About Wana
              </p>
              <h1 className="mb-3 text-3xl font-black leading-tight text-white sm:mb-4 sm:text-4xl xl:text-5xl">
                HÀNH TRÌNH<br />
                <span className="text-[#f5c800]">PHÁT TRIỂN</span>
              </h1>
              <p className="mb-5 max-w-[260px] text-xs leading-relaxed text-white/75 sm:mb-6 sm:max-w-sm sm:text-sm">
                Cùng nhau tạo ra những sản phẩm tốt hơn vì một cuộc sống khỏe mạnh và bền vững hơn.
              </p>
              <button className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold text-white px-4 py-2 sm:px-5 sm:py-2.5 sm:text-sm rounded-full transition-all backdrop-blur-sm">
                <Play size={14} className="fill-white" />
                Xem video giới thiệu
              </button>
            </div>

            {/* RIGHT: Company card */}
            <div className="hidden xl:block">
              <div
                className="rounded-2xl p-5 text-center max-w-[200px]"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div className="bg-white rounded-xl px-4 py-2 mb-3 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/images/asia-logo.png" alt="Asia Food & Beverage JSC" className="h-10 w-10 object-contain" />
                </div>
                <p className="font-bold text-sm text-white">Asia Food &amp; Beverage JSC</p>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/65 leading-relaxed">
                  Sức khỏe của bạn<br />là mục tiêu tốt đẹp hơn
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          2. ABOUT — White, 2 columns
         ══════════════════════════════════ */}
      <section className="bg-white py-8 sm:py-10 xl:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative isolate overflow-hidden rounded-[26px] bg-white px-0 py-3 sm:px-8 sm:py-8 md:px-10 lg:px-10 lg:py-10">

            <div className="relative z-10 grid grid-cols-1 items-center gap-7 xl:grid-cols-[0.95fr_1.05fr] xl:gap-10">
              <div className="max-w-[540px]">
                <p className="section-label mb-2">Về chúng tôi</p>
                <h2 className="text-2xl font-black leading-[1.18] text-slate-900 sm:text-[2rem] xl:text-[2.15rem]">
                  Wana – Không chỉ là đồ uống,<br />
                  <span className="text-[#16812a]">mà là cuộc sống tốt đẹp hơn</span>
                </h2>
                <p className="mt-5 text-sm leading-relaxed text-slate-500 xl:text-[0.95rem]">
                  Công ty Cổ phần nước giải khát Wana được thành lập với sứ mệnh mang đến những sản phẩm đồ uống chất lượng, an toàn và tốt cho sức khỏe, đáp ứng nhu cầu ngày càng cao của người tiêu dùng trong và ngoài nước.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-500 xl:text-[0.95rem]">
                  Chúng tôi không ngừng đổi mới, sáng tạo và mở rộng, hướng đến trở thành thương hiệu đồ uống được yêu thích và tin tưởng hàng đầu tại Việt Nam.
                </p>
                <Link
                  href="#"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#056a57] px-6 py-3 text-sm font-semibold text-[#d7ee46] shadow-[0_8px_18px_rgba(5,106,87,0.18)] transition-colors hover:bg-[#045847]"
                >
                  Tìm hiểu thêm <ArrowRight size={15} />
                </Link>
              </div>

              <div className="relative min-h-[245px] overflow-hidden rounded-[20px] shadow-[0_14px_30px_rgba(26,55,32,0.12)] sm:min-h-[300px] xl:min-h-[340px]">
                <img
                  src="/assets/images/workplace.png"
                  alt="Không gian làm việc Wana"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0c2519]/15 via-transparent to-white/10" />
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 sm:mt-10 sm:gap-6 sm:pt-8 md:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-[#1a7a1a]" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-[#1a7a1a] sm:text-2xl">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          2.5 PRODUCT HERO SLIDER — Teal bg, WANA watermark, product image
         ══════════════════════════════════ */}
      <ProductHeroSlider />

      {/* ══════════════════════════════════
          3. SẢN PHẨM TIÊU BIỂU — Nước Dừa Tươi Calamansi (aboutWana2.png)
         ══════════════════════════════════ */}
      <FeaturedProductBanner />

      {/* ══════════════════════════════════
          4. TIMELINE — White
         ══════════════════════════════════ */}
      <section className="bg-white py-8 sm:py-12 xl:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[320px_1fr] xl:gap-14">
            <div className="pt-2">
              <p className="section-label mb-3">Hành trình phát triển</p>
              <h2 className="text-2xl font-black leading-tight text-gray-900 sm:text-3xl xl:text-4xl">
                Từ hôm nay đến<br />
                <span className="text-[#1a7a1a]">tương lai</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-500 sm:mt-6">
                Mỗi cột mốc là một bước tiến, đánh dấu sự nỗ lực không ngừng của Wana trong hành trình mang những sản phẩm tốt hơn đến với cộng đồng.
              </p>
              <Link
                href="#"
                className="mt-5 inline-flex sm:mt-7 items-center gap-2 rounded-full bg-[#056a57] px-6 py-3 text-sm font-semibold text-[#d7ee46] transition-colors hover:bg-[#045847]"
              >
                Xem lịch sử <ArrowRight size={15} />
              </Link>
            </div>

            <div className="min-w-0">
              <div className="relative overflow-x-auto pt-1 pb-2">
                <div className="absolute left-5 right-5 top-6 h-0.5 bg-[#d9e5dc]" />
                <div className="relative grid min-w-[560px] grid-cols-5 gap-2">
                  {milestones.map((milestone, index) => {
                    const isActive = index === activeMilestone;

                    return (
                      <button
                        key={milestone.year}
                        type="button"
                        onClick={() => setActiveMilestone(index)}
                        aria-pressed={isActive}
                        className="group flex min-w-0 flex-col items-center text-center"
                      >
                        <span
                          className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-[3px] text-sm font-black transition-all ${
                            isActive
                              ? "border-[#f5c800] bg-[#f5c800] text-[#155f22] shadow-[0_0_0_5px_rgba(245,200,0,0.18)]"
                              : "border-[#218332] bg-white text-[#218332] group-hover:border-[#f5c800]"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="mt-3 text-sm font-black text-[#16812a]">{milestone.year}</span>
                        <span className="mt-1 max-w-[125px] text-xs leading-snug text-gray-500">{milestone.event}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid overflow-hidden sm:mt-8 rounded-2xl bg-[linear-gradient(100deg,#ffffff_0%,#f0f9f0_100%)] shadow-[0_10px_28px_rgba(22,91,35,0.1)] md:grid-cols-[320px_1fr]">
                <div className="relative min-h-[190px]">
                  <img
                    src={selectedMilestone.image}
                    alt={selectedMilestone.event}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-6 md:p-7">
                  <p className="text-xl font-black text-[#16812a]">{selectedMilestone.year}</p>
                  <h3 className="mt-1 text-xl font-black text-gray-900">{selectedMilestone.event}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-gray-500">{selectedMilestone.desc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="resources" className="scroll-mt-24 bg-slate-50 py-8 sm:py-12 xl:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#15803d]">
              <Toolbox size={14} /> Tài nguyên bổ sung
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Công cụ &amp; Tài nguyên Cần thiết</h2>
            <p className="mt-1 text-sm text-slate-500">Lối tắt truy cập nhanh giúp nhân viên làm quen hệ thống dễ dàng</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {RESOURCE_ITEMS.map((item) => <ResourceCard key={item.title} item={item} />)}
            <AssistantCard />
          </div>
        </div>
      </section>
      <GrowingTogetherBanner />
      <Footer />
    </main>
  );
}

function GrowingTogetherBanner() {
  return (
    <section className="w-full">
      <div className="relative isolate min-h-[280px] overflow-hidden sm:min-h-[320px]">
        <img
          src="/assets/images/company-growth.png"
          alt="Growing Together"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.86)_37%,rgba(255,255,255,0.24)_62%,rgba(255,255,255,0.02)_100%)]" />
        <div className="relative z-10 flex min-h-[280px] items-center px-4 py-8 sm:min-h-[320px] sm:px-10 sm:py-10 lg:px-16">
          <div className="max-w-[440px]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16812a]">
              Wana – Growing Together
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-slate-900 sm:text-3xl md:text-4xl">
              Cùng nhau kiến tạo<br />
              những giá trị tốt đẹp hơn
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
              Vì một cộng đồng khỏe mạnh, một thế hệ năng động và một tương lai bền vững.
            </p>
            <Link
              href="#"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#056a57] px-6 py-3 text-sm font-semibold text-[#d7ee46] transition-colors hover:bg-[#045847]"
            >
              Liên hệ hợp tác <ArrowRight size={15} />
            </Link>
          </div>

          <p
            className="absolute right-[9%] top-1/2 hidden -translate-y-1/2 text-right text-5xl leading-[0.85] text-[#075b54] lg:block"
            style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
          >
            Growing<br />Together
          </p>
        </div>
      </div>
    </section>
  );
}
/* ── FEATURED PRODUCT BANNER ── */
function FeaturedProductBanner() {
  const features = [
    { title: "100% nguyên liệu tự nhiên", desc: "Tươi ngon, an toàn" },
    { title: "Giàu vitamin và khoáng chất", desc: "Tốt cho sức khỏe" },
    { title: "Hương vị thanh mát", desc: "Phù hợp mọi lứa tuổi" },
    { title: "Vì một lối sống lành mạnh", desc: "Cùng Wana mỗi ngày" },
  ];

  return (
    <section className="relative mx-4 my-5 h-[360px] overflow-hidden rounded-2xl sm:my-6 sm:h-auto lg:mx-8">
      {/* Image displayed at full natural size — NOT cropped */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/images/coconut-calamansi.png"
        alt="Wana Coconut Calamansi"
        className="h-full w-full object-cover sm:h-auto sm:object-contain"
      />

      {/* Overlay: white fade left for text */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.55) 22%, transparent 42%)",
        }}
      />

      {/* Overlay: white fade right for feature list */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to left, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.45) 20%, transparent 38%)",
        }}
      />

      {/* Content sits on top */}
      <div className="absolute inset-0 flex items-center px-5 sm:px-8 lg:px-12">
        <div className="w-full flex items-center justify-between gap-4">

          {/* LEFT: text */}
          <div className="max-w-[190px] shrink-0 sm:max-w-[240px]">
            <p className="text-[#1a7a1a] text-[10px] font-bold tracking-widest uppercase mb-2">
              Sản phẩm tiêu biểu
            </p>
            <h2 className="mb-3 text-xl font-black leading-tight text-gray-900 sm:text-2xl md:text-3xl">
              Nước Dừa Tươi<br />Calamansi
            </h2>
            <p className="mb-4 max-w-[180px] text-[11px] leading-relaxed text-gray-600 sm:mb-5 sm:max-w-[200px] sm:text-xs">
              Sự kết hợp hoàn hảo giữa vị dừa tươi mát lành và hương calamansi thanh dịu, mang đến trải nghiệm tươi mới mỗi ngày.
            </p>
            <Link
              href="#"
              className="inline-flex items-center gap-2 bg-[#f5c800] hover:bg-[#d4aa00] text-gray-900 text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-sm"
            >
              Khám phá sản phẩm <ArrowRight size={13} />
            </Link>
          </div>

          {/* CENTER: spacer — the product image is part of aboutWana2.png */}
          <div className="flex-1" />

          {/* RIGHT: feature list */}
          <div className="hidden xl:flex flex-col gap-3 max-w-[210px] shrink-0">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#1a7a1a] rounded-full flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-xs leading-tight">{f.title}</p>
                  <p className="text-gray-500 text-[10px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
