import Image from "next/image";
import Link from "next/link";
import FeedbackDialog from "@/features/feedback/FeedbackDialog";

const footerLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Nhân viên", href: "/employees" },
  { label: "Truyền thông", href: "/news" },

  { label: "Về Á Châu", href: "/about-asia" },
];

const supportLinks = [
  { label: "Trợ giúp", href: "#" },
  { label: "Liên hệ IT", href: "#" },
  { label: "Đóng góp ý kiến", href: "#" },
  {
    label: "Vị trí",
    href: "https://www.google.com/maps/place//@10.8943109,106.7667012,17z/data=!3m1!4b1!4m3!3m2!1s0x3174d950dde268b1:0x95c49cc55d68d91d!12e1?entry=ttu&g_ep=EgoyMDI2MTAxNC4wIKXMDSoASAFQAw%3D%3D",
    external: true,
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#0d5c0d] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-2 gap-7 md:grid-cols-3 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="bg-white rounded-xl p-2 inline-block mb-4">
              <Image src="/assets/images/asia-logo.png" alt="Asia Food & Beverage co.ltd" width={64} height={64} className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
            </div>
            <p className="text-[#f5c800] font-bold text-sm mb-1">ASIA FOOD &amp; BEVERAGE co.ltd</p>
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
                  {link.label === "Đóng góp ý kiến" ? <FeedbackDialog /> : link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 text-sm hover:text-[#f5c800] transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-white/60 text-sm hover:text-[#f5c800] transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </footer>
  );
}
