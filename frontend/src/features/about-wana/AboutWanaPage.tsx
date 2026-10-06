"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductHeroSlider from "./components/ProductHeroSlider";
import { ArrowRight, CalendarDays, Download, Gem, Globe, Leaf, Play, Target, Toolbox, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RESOURCE_ITEMS, type ResourceItem } from "@/features/resources/resourceData";


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

function MeetingCard() {
  return (
    <Link href="/meeting" className="group flex flex-col justify-between rounded-2xl border border-[#bbf7d0] bg-white p-6 text-left shadow-lg shadow-slate-100 transition-all hover:shadow-xl">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d] transition-transform group-hover:scale-110"><CalendarDays size={22} /></div>
        <h3 className="mb-1 text-base font-bold text-[#15803d]">Tạo phòng họp</h3>
        <p className="text-xs leading-relaxed text-slate-500">Đặt phòng họp và theo dõi lịch đã đặt của các phòng.</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#15803d]"><span>Đặt phòng ngay</span><ArrowRight size={13} className="transition-transform group-hover:translate-x-1" /></div>
    </Link>
  );
}

function AboutJourneyHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#fffdf7] lg:aspect-[3/2]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/images/bannersumenhtamnhin.png"
        alt="Trụ sở Asia Food & Beverage và phong cảnh Việt Nam"
        className="absolute inset-x-0 top-0 -z-20 h-full w-full object-cover object-top lg:h-auto"
      />
      <div className="relative mx-auto flex min-h-[440px] max-w-[1318px] items-start justify-between gap-10 px-6 pt-12 sm:px-10 lg:absolute lg:inset-x-0 lg:top-0 lg:min-h-0 lg:px-8 lg:pt-[4.1%] xl:px-0">
        <div className="max-w-[470px] text-white lg:w-[36%]">
          <p className="mb-5 text-[12px] font-black uppercase tracking-[0.17em] text-[#ffd400]">About Asia</p>
          <h1 className="font-sans text-[42px] font-black uppercase leading-[1.02] tracking-[-0.035em] sm:text-[54px] lg:text-[clamp(40px,3.9vw,64px)]">
            Hành trình<br />
            <span className="text-[#ffd400]">phát triển</span>
          </h1>
          <p className="mt-6 max-w-[455px] font-sans text-[15px] font-medium leading-[1.55] text-white sm:text-[18px]">
            Cùng nhau tạo ra những sản phẩm tốt hơn vì một cuộc sống khỏe mạnh và bền vững hơn.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-3 rounded-full border border-white/80 bg-black/20 px-6 py-3 font-sans text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,0.24)] backdrop-blur-sm transition hover:bg-black/35 sm:text-[17px]"
          >
            <Play size={19} className="fill-white" />
            Xem video giới thiệu
          </button>
        </div>

        <div className="hidden w-[210px] rounded-[20px] border border-[#f2e7c6]/70 bg-[#26391f]/45 px-5 py-4 text-center text-white shadow-[0_10px_28px_rgba(0,0,0,0.2)] backdrop-blur-[5px] md:block lg:mr-[1.2%]">
          <span className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/images/asia-logo.png" alt="Asia Food & Beverage" className="h-[66px] w-[66px] object-contain" />
          </span>
          <p className="mt-2.5 font-sans text-[15px] font-extrabold leading-[1.35]">Asia Food &amp; Beverage<br />JSC</p>
          <div className="mx-auto mt-3 h-px w-full bg-white/35" />
          <p className="mt-3 font-sans text-[13px] font-medium leading-[1.35] text-white/85">Sức khỏe của bạn<br />là mục tiêu tốt đẹp hơn</p>
        </div>
      </div>

      <div className="relative mx-auto px-6 pb-12 pt-12 sm:px-10 lg:absolute lg:inset-x-0 lg:top-[41.1%] lg:max-w-[1370px] lg:px-7 lg:pb-0 lg:pt-0 xl:px-0">
        <header className="text-center">
          <div className="flex items-center justify-center gap-4 font-sans text-[10px] font-black uppercase tracking-[0.3em] text-[#125d4d] sm:text-[12px]">
            <span className="h-px w-12 bg-[#c58a32]" />
            Giá trị chúng tôi theo đuổi
            <span className="h-px w-12 bg-[#c58a32]" />
          </div>
          <h2 className="mt-2 font-[Georgia] text-[46px] italic leading-none tracking-[-0.045em] text-[#064e3b] sm:text-[64px] lg:text-[clamp(52px,5vw,76px)]">
            Growing <span className="text-[#ca8414]">Together</span>
          </h2>
          <p className="mt-2 font-[Georgia] text-[15px] text-[#25324a] sm:text-[19px]">Cùng nhau phát triển – Lan tỏa giá trị Việt</p>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-[1.12fr_1fr_1.04fr] lg:mt-[3.1%]">
          <article className="px-1 py-2 lg:pr-8">
            <h3 className="font-[Cambria] text-[31px] font-bold leading-tight text-[#0b3026] lg:text-[clamp(28px,2.55vw,42px)]">Sứ mệnh &amp; Tầm nhìn</h3>
            <div className="mt-3 h-0.5 w-12 bg-[#bc7a1d]" />
            <p className="mt-4 font-sans text-[15px] leading-[1.55] text-[#27364d] lg:text-[clamp(13px,1.2vw,18px)]">
              Chúng tôi kiên định với sứ mệnh kiến tạo giá trị từ những nguyên liệu tự nhiên của Việt Nam và hướng đến tầm nhìn đưa thương hiệu Việt vươn xa trên bản đồ nước giải khát toàn cầu.
            </p>
            <Link href="#" className="mt-4 inline-flex items-center gap-4 rounded-full border-2 border-[#bd7217] bg-white/35 px-6 py-2.5 font-sans text-[15px] font-semibold text-[#a95e10] transition hover:bg-white/70 lg:text-[16px]">
              Tìm hiểu thêm về chúng tôi
              <ArrowRight size={18} />
            </Link>
          </article>

          <article className="relative overflow-hidden rounded-[18px] border border-[#eadfc8] bg-[#fffdf7]/90 px-7 py-5 shadow-[0_8px_24px_rgba(101,83,47,0.08)] backdrop-blur-[2px] lg:min-h-[270px]">
            <div className="flex items-center gap-5">
              <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dfad43] to-[#ae6c08] text-white shadow-md"><Gem size={29} /></span>
              <h3 className="font-[Cambria] text-[26px] font-bold uppercase text-[#13392f] lg:text-[clamp(22px,1.9vw,30px)]">Sứ mệnh</h3>
            </div>
            <p className="mt-3 font-sans text-[15px] leading-[1.48] text-[#344155] lg:text-[clamp(13px,1.13vw,17px)]">
              Kiến tạo những sản phẩm nước giải khát chất lượng từ nguồn nguyên liệu đặc trưng của Việt Nam, kết hợp công nghệ, đổi mới sáng tạo và năng lực sản xuất để đáp ứng đa dạng nhu cầu của thị trường trong nước và quốc tế.
            </p>
            <Leaf className="absolute -bottom-6 -right-5 h-32 w-32 rotate-[-18deg] text-[#cdb16b]/45" strokeWidth={1.1} />
          </article>

          <article className="relative overflow-hidden rounded-[18px] border border-[#b9dfd0] bg-[#e9f9f1]/90 px-7 py-5 shadow-[0_8px_24px_rgba(25,99,72,0.08)] backdrop-blur-[2px] lg:min-h-[270px]">
            <div className="flex items-center gap-5">
              <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#279768] to-[#075944] text-white shadow-md"><Target size={30} /></span>
              <h3 className="font-[Cambria] text-[26px] font-bold uppercase text-[#13392f] lg:text-[clamp(22px,1.9vw,30px)]">Tầm nhìn</h3>
            </div>
            <p className="mt-3 font-sans text-[15px] leading-[1.48] text-[#344155] lg:text-[clamp(13px,1.13vw,17px)]">
              Trở thành doanh nghiệp nước giải khát Việt Nam được tin chọn trên thị trường toàn cầu, sở hữu những thương hiệu có bản sắc riêng và đưa sản phẩm, nguyên liệu cùng hương vị Việt Nam đến với người tiêu dùng trên thế giới.
            </p>
          </article>
        </div>

        <div className="mt-5 ml-auto grid max-w-[740px] grid-cols-1 gap-4 border-t border-[#b79a68]/70 pt-4 font-sans text-[13px] font-medium leading-tight text-[#243f38] sm:grid-cols-3 lg:mt-[1.6%] lg:text-[14px]">
          <div className="flex items-center justify-center gap-3 sm:border-r sm:border-[#bda26f]">
            <Leaf size={46} className="rounded-full bg-[#096044] p-2.5 text-white" />
            <span>Từ Việt Nam<br />đến thế giới</span>
          </div>
          <div className="flex items-center justify-center gap-3 sm:border-r sm:border-[#bda26f]">
            <Globe size={46} className="rounded-full border-2 border-[#075c43] p-2 text-[#075c43]" />
            <span>Hơn 20+<br />quốc gia và vùng lãnh thổ</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Leaf size={46} className="rounded-full border-2 border-[#075c43] p-2 text-[#075c43]" />
            <span>Nguồn nguyên liệu<br />thuần Việt</span>
          </div>
        </div>
      </div>
    </section>
  );
}
/* ── PAGE ── */
export default function VeWanaPage() {
  const [activeMilestone, setActiveMilestone] = useState(1);
  const selectedMilestone = milestones[activeMilestone];

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <AboutJourneyHero />

      <div className="flex flex-col">
      {/* ══════════════════════════════════
          2. ABOUT — White, 2 columns
         ══════════════════════════════════ */}
      <section className="order-3 bg-white py-8 sm:py-10 xl:py-14">
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
      <div className="order-2"><ProductHeroSlider /></div>

      </div>

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
            <MeetingCard />
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
