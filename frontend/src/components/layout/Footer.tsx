import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Nhân viên", href: "/employees" },
  { label: "Truyền thông", href: "/news" },

  { label: "Về Á Châu", href: "/about-wana" },
];

const supportLinks = [
  { label: "Trợ giúp", href: "#" },
  { label: "Liên hệ IT", href: "#" },
  { label: "Hỗ trợ", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-[#0d5c0d] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-2 gap-7 md:grid-cols-3 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="bg-white rounded-xl p-2 inline-block mb-4">
              <Image src="/assets/images/asia-logo.png" alt="Asia Food & Beverage JSC" width={64} height={64} className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
            </div>
            <p className="text-[#f5c800] font-bold text-sm mb-1">ASIA FOOD &amp; BEVERAGE JSC</p>
            <p className="text-white/60 text-xs leading-relaxed">
              Kết nối • Phát triển<br />
              Cổng thông tin nội bộ dành cho toàn thể<br />
              cán bộ nhân viên Á Châu Food & Beverage.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Điều hướng</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 text-sm hover:text-[#f5c800] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Hỗ trợ</h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/60 text-sm hover:text-[#f5c800] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs">Giờ làm việc: T2–T6, 8:00–17:30</p>
              <p className="text-white/40 text-xs">IT Helpdesk: ext. 100</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-5 text-center sm:mt-8 sm:pt-6 md:flex-row md:text-left items-center justify-between gap-3">
          <p className="text-white/40 text-xs">
            © 2026 Asia Food & Beverage. All rights reserved.
          </p>
          <p className="text-white/40 text-xs">
            Phiên bản Demo v1.0 — Dữ liệu hiển thị chỉ mang tính minh họa
          </p>
        </div>
      </div>
    </footer>
  );
}
