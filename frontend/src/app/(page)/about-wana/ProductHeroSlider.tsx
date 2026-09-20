"use client";

import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Leaf } from "lucide-react";

const slides = [
  {
    label: "Trà matcha thượng hạng",
    title: "GOOD TEA",
    subtitle: "GOOD DAY",
    desc: "Trà sữa Matcha từ bột Matcha Nhật Bản cao cấp, kết hợp sữa tươi thanh trùng, mang đến hương vị thanh mát, ngọt dịu và tràn đầy năng lượng mỗi ngày.",
  },
  {
    label: "Nước dừa tự nhiên",
    title: "GOOD DRINK",
    subtitle: "GOOD LIFE",
    desc: "Nước dừa tươi Calamansi nguyên chất kết hợp vị chanh thanh mát, bổ sung khoáng chất tự nhiên cho cơ thể khỏe mạnh mỗi ngày.",
  },
  {
    label: "Sáng tạo không ngừng",
    title: "FRESH &",
    subtitle: "NATURAL",
    desc: "Wana cam kết mang đến những sản phẩm đồ uống tự nhiên, không chất bảo quản, tốt cho sức khỏe và phù hợp với mọi lứa tuổi.",
  },
];

export default function ProductHeroSlider() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);
  const slide = slides[current];
  const following = (current + 1) % slides.length;

  const cupLayerStyle = (index: number) => {
    const isActive = index === current;
    const isNext = index === following;
    const offset = isActive ? 0 : isNext ? 145 : -145;

    return {
      bottom: isActive ? "-5px" : "22px",
      filter: isActive
        ? "drop-shadow(0 15px 35px rgba(0,0,0,0.3))"
        : "blur(1px) saturate(0.8) drop-shadow(0 10px 20px rgba(0,0,0,0.2))",
      height: isActive ? "clamp(220px, 28vw, 340px)" : "clamp(170px, 21vw, 255px)",
      opacity: isActive ? 1 : 0.5,
      transform: `translateX(calc(-50% + ${offset}px)) scale(${isActive ? 1 : 0.82})`,
      zIndex: isActive ? 30 : 20,
    };
  };

  return (
    <section
      className="relative h-[380px] overflow-hidden sm:h-[400px] xl:h-[380px]"
      style={{
        background: "linear-gradient(135deg, #1a8e8e 0%, #2aaeae 30%, #1a9696 60%, #0d7a7a 100%)",
      }}
    >
      {/* -- Watermark -- */}
      <div
        className="absolute inset-0 flex items-center pointer-events-none select-none overflow-hidden"
        aria-hidden
      >
        <span
          className="font-black text-white/[0.06] leading-none tracking-tight whitespace-nowrap"
          style={{ fontSize: "clamp(100px, 18vw, 180px)", marginLeft: "24px" }}
        >
          GOOD TEA
        </span>
      </div>

      {/* -- Decorative leaves -- */}
      <svg className="absolute top-0 left-0 w-24 h-32 opacity-70 pointer-events-none" style={{ transform: "translate(-10px,-15px) rotate(-25deg)" }} viewBox="0 0 60 80" fill="none">
        <path d="M30 5C10 25 5 55 30 75C55 55 50 25 30 5Z" fill="#22c55e" opacity="0.8" />
        <line x1="30" y1="10" x2="30" y2="70" stroke="#16a34a" strokeWidth="1" opacity="0.6" />
      </svg>
      <svg className="absolute top-3 left-16 w-16 h-20 opacity-50 pointer-events-none" style={{ transform: "rotate(-50deg)" }} viewBox="0 0 60 80" fill="none">
        <path d="M30 5C10 25 5 55 30 75C55 55 50 25 30 5Z" fill="#4ade80" opacity="0.7" />
      </svg>
      <svg className="absolute bottom-6 left-24 w-14 h-[72px] opacity-40 pointer-events-none" style={{ transform: "rotate(15deg)" }} viewBox="0 0 60 80" fill="none">
        <path d="M30 5C10 25 5 55 30 75C55 55 50 25 30 5Z" fill="#22c55e" opacity="0.8" />
      </svg>
      <svg className="absolute top-10 right-72 w-14 h-[72px] opacity-45 pointer-events-none" style={{ transform: "rotate(-65deg)" }} viewBox="0 0 60 80" fill="none">
        <path d="M30 5C10 25 5 55 30 75C55 55 50 25 30 5Z" fill="#86efac" opacity="0.7" />
      </svg>
      <svg className="absolute bottom-0 right-6 w-20 h-28 opacity-55 pointer-events-none" style={{ transform: "rotate(35deg) translateY(10px)" }} viewBox="0 0 60 80" fill="none">
        <path d="M30 5C10 25 5 55 30 75C55 55 50 25 30 5Z" fill="#22c55e" opacity="0.8" />
        <line x1="30" y1="12" x2="30" y2="68" stroke="#15803d" strokeWidth="1" opacity="0.5" />
      </svg>
      <svg className="absolute bottom-2 right-32 w-12 h-16 opacity-35 pointer-events-none" style={{ transform: "rotate(60deg)" }} viewBox="0 0 60 80" fill="none">
        <path d="M30 5C10 25 5 55 30 75C55 55 50 25 30 5Z" fill="#4ade80" opacity="0.6" />
      </svg>

      {/* -- Main content -- */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-8 xl:px-12">
        {/* LEFT: text + button + nav */}
        <div className="relative z-20 flex w-[60%] max-w-[380px] flex-col justify-center shrink-0 sm:w-[56%] xl:w-auto" >
          <p className="text-white/70 text-[11px] font-bold tracking-[0.2em] uppercase mb-3">
            {slide.label}
          </p>
          <h2
            className="text-white font-black leading-[1.05] mb-0.5"
            style={{ fontSize: "clamp(1.75rem, 5vw, 3.2rem)" }}
          >
            {slide.title}
          </h2>
          <h2
            className="text-white/80 font-black leading-[1.05] mb-5 italic"
            style={{ fontSize: "clamp(1.75rem, 5vw, 3.2rem)" }}
          >
            {slide.subtitle}
          </h2>
          <p className="mb-5 max-w-[210px] text-[11px] leading-relaxed text-white/70 sm:mb-6 sm:max-w-[320px] sm:text-[13px]">
            {slide.desc}
          </p>

          <div className="mb-5 sm:mb-7">
            <button className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/35 px-4 py-2 text-xs font-semibold text-white sm:px-6 sm:py-2.5 sm:text-sm rounded-full transition-all backdrop-blur-sm">
              Khám phá ngay <ArrowRight size={14} />
            </button>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={prev}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/30 hover:border-white text-white/70 hover:text-white flex items-center justify-center transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/30 hover:border-white text-white/70 hover:text-white flex items-center justify-center transition-all"
            >
              <ChevronRight size={16} />
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? "24px" : "8px",
                    height: "8px",
                    backgroundColor:
                      i === current ? "#f5c800" : "rgba(255,255,255,0.35)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: coconut-water-cup.png — transparent product shot */}
        <div className="absolute inset-y-0 right-[-24px] w-[58%] min-w-0 self-stretch sm:right-0 sm:w-[52%] xl:relative xl:inset-auto xl:w-auto xl:flex-1">
          {slides.map((product, index) => {
            const isActive = index === current;

            return (
              <img
                key={product.title}
                src="/assets/images/coconut-water-cup.png"
                alt={isActive ? product.title : ""}
                aria-hidden={!isActive}
                className={`absolute left-1/2 object-contain transition-[transform,height,bottom,opacity,filter] duration-700 ease-in-out ${
                  isActive ? "block" : "hidden md:block"
                }`}
                style={cupLayerStyle(index)}
              />
            );
          })}
        </div>

        {/* RIGHT: Tagline + badge */}
        <div className="hidden xl:flex flex-col items-end gap-8 shrink-0 max-w-[170px]">
          <div className="text-right">
            <p
              className="text-white/90 text-xl leading-snug"
              style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
            >
              Good
              <br />
              Ingredients
              <br />
              Brighter Days
            </p>
            <div className="w-10 h-[2px] bg-[#f5c800] rounded-full mt-2 ml-auto" />
          </div>

          {/* Natural Ingredients circle badge */}
          <div
            className="w-[78px] h-[78px] rounded-full border-[2px] border-white/40 flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div className="text-center">
              <Leaf size={16} className="mx-auto mb-1 text-white/90" />
              <p className="text-white text-[6.5px] font-bold leading-tight uppercase tracking-wider">
                Natural
                <br />
                Ingredients
                <br />
                Better
                <br />
                Tomorrow
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
