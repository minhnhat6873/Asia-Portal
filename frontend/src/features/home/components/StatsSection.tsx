const stats = [
  { value: "500+", label: "Nhân viên" },
  { value: "10+", label: "Thương hiệu sản phẩm" },
  { value: "20+", label: "Quốc gia" },
  { value: "1", label: "Một đội ngũ vững mạnh" },
];

export default function StatsSection() {
  return (
    <section className="relative py-16 overflow-hidden">
      {/* Green gradient background */}
      <div className="wana-gradient absolute inset-0" />

      {/* Decorative leaf shapes */}
      <div className="absolute -left-16 -bottom-8 w-64 h-64 rounded-full bg-white/5" />
      <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute right-32 bottom-0 w-32 h-32 rounded-full bg-[#f5c800]/10" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left text */}
          <div>
            <p className="text-[#f5c800] text-xs font-bold tracking-widest uppercase mb-3">
              Những con số biết nói
            </p>
            <h2 className="text-white text-3xl md:text-4xl font-black leading-tight mb-3">
              Á Châu luôn tiến về phía trước
            </h2>
            <p className="text-white/70 text-sm">
              Cùng nhau tạo ra những giá trị tốt đẹp hơn mỗi ngày.
            </p>
          </div>

          {/* Right stats */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <p className="text-[#f5c800] text-4xl font-black mb-1">{stat.value}</p>
                <p className="text-white/80 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
