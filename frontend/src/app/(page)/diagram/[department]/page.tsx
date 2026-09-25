import Image from "next/image";
import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import DiagramBreadcrumb from "@/app/components/ui/DiagramBreadcrumb";

const department = {
  slug: "truyen-thong",
  name: "Phòng Truyền thông",
  description: "Nơi xây dựng thương hiệu, nội dung và kết nối nội bộ tại Á Châu.",
  staffCount: 12,
  manager: {
    name: "Nguyễn Thị Duyên",
    role: "Trưởng phòng Truyền thông",
    avatar: "/assets/images/MKT_NV DUYÊN.jpg",
  },
  members: [
    { name: "Trần Minh B", role: "Brand Executive", avatar: "/assets/images/DESIGN_NV QUÂN.jpeg" },
    { name: "Lê Thị C", role: "Content Creator", avatar: "/assets/images/HR_NV THƯ.jpg" },
    { name: "Phạm Quốc D", role: "Social Media Executive", avatar: "/assets/images/SALES XK_NV HUY.jpg" },
    { name: "Ngô Yến E", role: "Event Executive", avatar: "/assets/images/F&A_NV HỒNG.jpg" },
  ],
};

export function generateStaticParams() {
  return [{ department: department.slug }];
}

function PersonCard({ person, manager = false }: { person: { name: string; role: string; avatar: string }; manager?: boolean }) {
  return (
    <article className={`rounded-xl border border-emerald-100 bg-white px-4 py-3 text-center shadow-[0_8px_24px_rgba(15,118,65,0.08)] ${manager ? "w-[200px]" : "w-full"}`}>
      <Image src={person.avatar} alt={person.name} width={manager ? 66 : 58} height={manager ? 66 : 58} className="mx-auto h-auto rounded-full border-2 border-emerald-50 object-cover" />
      <h2 className="mt-2 text-sm font-extrabold text-slate-800">{person.name}</h2>
      <p className="mt-0.5 text-[11px] text-slate-500">{person.role}</p>
    </article>
  );
}

export default async function DepartmentDiagramPage({ params }: { params: Promise<{ department: string }> }) {
  const { department: slug } = await params;

  if (slug !== department.slug) notFound();

  return (
    <main className="min-h-screen bg-[#fbfefc] text-slate-800">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <DiagramBreadcrumb current={department.name} />

        <div className="mt-7 overflow-x-auto pb-5">
          <div className="min-w-[940px] rounded-2xl bg-gradient-to-b from-emerald-50/65 to-white px-10 pb-10 pt-8">
            <header className="mx-auto flex w-fit items-center gap-4 rounded-xl border border-emerald-100 bg-white/90 px-5 py-4 shadow-[0_8px_24px_rgba(15,118,65,0.08)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-[#16883b]"><UsersRound size={23} /></div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-800">{department.name}</h1>
                <p className="mt-0.5 max-w-sm text-xs leading-5 text-slate-500">{department.description}</p>
              </div>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#16883b]"><UsersRound size={13} /> {department.staffCount} nhân sự</span>
            </header>

            <div className="mx-auto h-7 w-px bg-[#24934d]" />
            <div className="mx-auto w-fit"><PersonCard person={department.manager} manager /></div>
            <div className="mx-auto h-8 w-px bg-[#24934d]" />

            <div className="relative pt-8">
              <div className="absolute left-[12.5%] right-[12.5%] top-0 h-px bg-[#24934d]" />
              <div className="grid grid-cols-4 gap-6">
                {department.members.map((person) => (
                  <div key={person.name} className="relative">
                    <div className="absolute -top-8 left-1/2 h-8 w-px -translate-x-1/2 bg-[#24934d]" />
                    <PersonCard person={person} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Link href="/diagram" className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-[#16883b] transition-colors hover:bg-emerald-50">
          <ChevronRight size={16} className="rotate-180" /> Quay lại sơ đồ tổ chức
        </Link>
      </section>

      <Footer />
    </main>
  );
}
