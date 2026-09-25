import Image from "next/image";
import { ArrowLeft, UsersRound } from "lucide-react";

type DepartmentOrganizationChartProps = {
  onBack: () => void;
};

const department = {
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

function PersonCard({ person, manager = false }: { person: { name: string; role: string; avatar: string }; manager?: boolean }) {
  return (
    <article className={`rounded-xl border-[1.5px] border-emerald-100 bg-white px-5 py-5 text-center shadow-[0_10px_28px_rgba(15,118,65,0.06)] ${manager ? "w-[248px]" : "w-full min-h-[178px]"}`}>
      <Image src={person.avatar} alt={person.name} width={manager ? 92 : 82} height={manager ? 92 : 82} className="mx-auto aspect-square rounded-full border-[3px] border-white object-cover shadow-sm" />
      <h2 className="mt-3 text-[17px] font-extrabold leading-tight text-slate-900">{person.name}</h2>
      <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">{person.role}</p>
    </article>
  );
}

export default function DepartmentOrganizationChart({ onBack }: DepartmentOrganizationChartProps) {
  return (
    <>
      <div className="overflow-x-auto pb-5">
        <div className="min-w-[940px] bg-white px-10 pb-10 pt-5">
          <header className="mx-auto flex w-fit items-center gap-5 rounded-2xl border-[1.5px] border-emerald-100 bg-white px-7 py-5 shadow-[0_10px_28px_rgba(15,118,65,0.08)]">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#16883b]"><UsersRound size={29} /></div>
            <div>
              <h1 className="text-[22px] font-extrabold leading-tight text-slate-900">{department.name}</h1>
              <p className="mt-1 max-w-md text-[14px] leading-5 text-slate-500">{department.description}</p>
            </div>
            <span className="ml-4 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-[14px] font-bold text-[#16883b]"><UsersRound size={16} /> {department.staffCount} nhân sự</span>
          </header>


          <div className="mx-auto w-fit"><PersonCard person={department.manager} manager /></div>


          <div className="relative pt-8">
            <div className="absolute top-0 h-[1.5px] bg-[#24934d]" style={{ left: "calc(12.5% - 10.5px)", right: "calc(12.5% - 10.5px)" }} />
            <div className="grid grid-cols-4 gap-7">
              {department.members.map((person) => (
                <div key={person.name} className="relative">
                  <div className="absolute -top-8 left-1/2 h-8 w-[1.5px] -translate-x-1/2 bg-[#24934d]" />
                  <PersonCard person={person} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button type="button" onClick={onBack} className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-[#16883b] transition-colors hover:bg-emerald-50">
        <ArrowLeft size={16} /> Quay lại sơ đồ tổ chức
      </button>
    </>
  );
}
