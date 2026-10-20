import Link from "next/link";
import { ArrowRight, CalendarDays, Download, Toolbox } from "lucide-react";
import { RESOURCE_ITEMS, type ResourceItem } from "./resourceData";
import { NetworkFolderCard } from "./NetworkFolderCard";

function ResourceCard({ item }: { item: ResourceItem }) {
  if (item.networkFolder) return <NetworkFolderCard item={{ title: item.title, desc: item.desc, chipTone: item.chipTone, linkTone: item.linkTone, linkText: item.linkText }} />;
  const Icon = item.icon;
  const content = (
    <>
      <div>
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${item.chipTone}`}><Icon size={22} /></div>
        <h3 className="mb-1 text-base font-bold text-slate-900 group-hover:text-[#15803d]">{item.title}</h3>
        <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
      </div>
      <div className={`mt-4 flex items-center gap-2 text-xs font-semibold ${item.linkTone}`}>
        <span>{item.linkText}</span>
        {item.showDownloadIcon ? <Download size={13} /> : <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />}
      </div>
    </>
  );
  const className = "group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100 transition-all hover:border-[#bbf7d0] hover:shadow-xl";
  return item.href
    ? <Link id={item.anchor} href={item.href} className={className}>{content}</Link>
    : <div id={item.anchor} className={className}>{content}</div>;
}

function MeetingCard() {
  return (
    <Link href="/meeting" className="group flex flex-col justify-between rounded-2xl border border-[#bbf7d0] bg-white p-6 text-left shadow-lg shadow-slate-100 transition-all hover:shadow-xl">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d] transition-transform group-hover:scale-110"><CalendarDays size={22} /></div>
        <h3 className="mb-1 text-base font-bold text-[#15803d]">Đặt Phòng Họp</h3>
        <p className="text-xs leading-relaxed text-slate-500">Đặt phòng họp và theo dõi lịch đã đặt của các phòng.</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#15803d]"><span>Đặt phòng ngay</span><ArrowRight size={13} className="transition-transform group-hover:translate-x-1" /></div>
    </Link>
  );
}

export default function ResourcesSection() {
  return (
    <section id="resources" className="scroll-mt-24 bg-slate-50 py-8 sm:py-12 xl:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#15803d]"><Toolbox size={14} /> Tài nguyên bổ sung</div>
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Công cụ &amp; Tài nguyên Cần thiết</h2>
          <p className="mt-1 text-sm text-slate-500">Lối tắt truy cập nhanh giúp nhân viên làm quen hệ thống dễ dàng</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCE_ITEMS.map((item) => <ResourceCard key={item.title} item={item} />)}
          <MeetingCard />
        </div>
      </div>
    </section>
  );
}
