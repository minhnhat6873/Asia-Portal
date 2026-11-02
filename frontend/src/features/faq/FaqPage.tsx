"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, ChevronDown, CircleHelp, ClipboardCheck, Coffee, Laptop, Leaf, Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { normalizeSearchText } from "@/utils/normalizeSearchText";

const sections = [
  {
    title: "Ngày đầu làm việc",
    description: "Những điều cần chuẩn bị khi bắt đầu hành trình tại Á Châu.",
    icon: BriefcaseBusiness,
    questions: [
      { question: "Ngày đầu đi làm, tôi cần chuẩn bị những gì?", answer: "Hãy kiểm tra thông tin nhận việc và danh sách giấy tờ được Phòng Nhân sự gửi trước đó. Nếu chưa rõ thời gian, địa điểm hoặc người liên hệ, bạn có thể xác nhận lại với Phòng Nhân sự trước ngày làm việc." },
      { question: "Tôi cần liên hệ ai khi đến công ty?", answer: "Bạn có thể liên hệ người phụ trách tuyển dụng hoặc Phòng Nhân sự theo thông tin trong thư nhận việc để được hướng dẫn. Khi cần, hãy hỏi bộ phận lễ tân hoặc bảo vệ tại địa điểm làm việc." },
      { question: "Tôi có thể tìm thông tin đồng nghiệp ở đâu?", answer: "Bạn có thể sử dụng mục Nhân viên trên cổng thông tin để tìm theo tên hoặc phòng ban và xem thông tin liên hệ được công khai." },
    ],
  },
  {
    title: "Làm việc & tài khoản",
    description: "Thiết bị, tài khoản và các công cụ hỗ trợ công việc.",
    icon: Laptop,
    questions: [
      { question: "Tôi nhận thiết bị và tài khoản làm việc bằng cách nào?", answer: "Hãy trao đổi với quản lý hoặc Phòng Nhân sự về việc nhận bàn giao, sau đó liên hệ bộ phận IT nếu cần hỗ trợ thiết bị, email hoặc quyền truy cập. Không chia sẻ mật khẩu của bạn với người khác." },
      { question: "Tôi cần hỗ trợ khi không đăng nhập được thì làm gì?", answer: "Kiểm tra lại thông tin đăng nhập và thông báo lỗi, sau đó liên hệ bộ phận IT. Bạn nên mô tả tên hệ thống và lỗi gặp phải; không gửi mật khẩu hoặc mã xác thực." },
      { question: "Tôi tìm tài liệu và sổ tay nhân viên ở đâu?", answer: "Tại trang chủ, mục Công cụ & Tài nguyên Cần thiết có lối tắt Sổ tay & Tài liệu nội bộ. Nếu không mở được thư mục hoặc chưa có quyền truy cập, hãy xem hướng dẫn trong mục đó và liên hệ IT khi cần." },
      { question: "Tôi có thể đặt phòng họp ở đâu?", answer: "Bạn có thể mở mục Đặt Phòng Họp trên cổng thông tin để xem lịch và thực hiện đặt phòng theo hướng dẫn trên trang." },
    ],
  },
  {
    title: "Tiện ích hằng ngày",
    description: "Gửi xe, bữa trưa và những hỗ trợ tại nơi làm việc.",
    icon: Coffee,
    questions: [
      { question: "Tôi gửi xe ở đâu?", answer: "Vị trí và cách đăng ký gửi xe có thể khác nhau theo địa điểm làm việc. Bạn hãy hỏi bảo vệ hoặc Phòng Nhân sự tại nơi làm việc để được hướng dẫn phù hợp." },
      { question: "Tôi tìm thông tin về bữa trưa ở đâu?", answer: "Bạn có thể hỏi Phòng Nhân sự hoặc đồng nghiệp trong bộ phận về địa điểm, thời gian và cách đăng ký bữa trưa tại nơi làm việc." },
      { question: "Tôi cần hỏi về giờ làm việc hoặc nghỉ phép thì liên hệ ai?", answer: "Hãy trao đổi với quản lý trực tiếp hoặc Phòng Nhân sự để được hướng dẫn theo lịch làm việc và quy định áp dụng cho vị trí của bạn." },
    ],
  },
];

export default function FaqPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const count = sections.reduce((total, section) => total + section.questions.length, 0);
  const visibleSections = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    return sections
      .filter((section) => category === "all" || section.title === category)
      .map((section) => {
        const questions = section.questions.filter(({ question, answer }) => !normalizedQuery || normalizeSearchText(`${question} ${answer}`).includes(normalizedQuery));
        return { ...section, questions: sort === "alphabetical" ? [...questions].sort((a, b) => a.question.localeCompare(b.question, "vi")) : questions };
      })
      .filter((section) => section.questions.length > 0);
  }, [category, query, sort]);
  const resultCount = visibleSections.reduce((total, section) => total + section.questions.length, 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-emerald-100 bg-[#effaf6]">
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-[-110px] h-64 w-64 rounded-full bg-emerald-100/70" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-[-120px] h-72 w-72 rounded-full bg-emerald-100/60" />
          <div className="relative mx-auto flex max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-12">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Chào mừng bạn đến với Á Châu</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"><span className="text-emerald-700">FAQ</span> dành cho Tân Binh</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">Những câu hỏi thường gặp giúp bạn làm quen với công việc và cuộc sống tại nơi làm việc.</p>
              <form onSubmit={(event) => { event.preventDefault(); setQuery(search); }} className="mt-5 flex max-w-2xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <Search aria-hidden="true" className="ml-3 h-5 w-5 shrink-0 text-emerald-700" />
                <input aria-label="Tìm câu hỏi thường gặp" value={search} onChange={(event) => { setSearch(event.target.value); if (!event.target.value) setQuery(""); }} placeholder="Nhập từ khóa để tìm câu hỏi..." className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
                <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 sm:px-7">Tìm kiếm</button>
              </form>
              <p className="mt-2 text-xs text-slate-500">Ví dụ: chấm công, cơm trưa, gửi xe, tài khoản, nghỉ phép...</p>
            </div>
            <div aria-hidden="true" className="relative hidden h-40 w-48 shrink-0 items-center justify-center md:flex">
              <div className="absolute bottom-0 h-28 w-28 rotate-6 rounded-2xl bg-white shadow-lg shadow-emerald-100"><ClipboardCheck className="m-auto mt-5 h-16 w-16 text-emerald-200" /></div>
              <div className="absolute left-2 top-0 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-100 text-emerald-700"><CircleHelp size={46} strokeWidth={2.3} /></div>
              <Leaf className="absolute bottom-0 right-0 h-14 w-14 -rotate-45 text-emerald-300" />
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside aria-label="Danh mục câu hỏi" className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {[{ title: "all", label: "Tất cả câu hỏi", icon: BriefcaseBusiness, count }, ...sections.map((section) => ({ title: section.title, label: section.title, icon: section.icon, count: section.questions.length }))].map(({ title, label, icon: Icon, count: categoryCount }) => (
                <button key={title} type="button" aria-pressed={category === title} onClick={() => setCategory(title)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left text-sm font-semibold transition ${category === title ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-100 bg-white text-slate-700 hover:bg-emerald-50"}`}>
                  <Icon aria-hidden="true" size={19} className={category === title ? "text-emerald-100" : "text-emerald-600"} />
                  <span className="flex-1">{label}</span><span className={`rounded-full px-2 py-0.5 text-xs ${category === title ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{categoryCount}</span>
                </button>
              ))}
            </div>
          </aside>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/60 p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div><h2 className="text-lg font-bold text-slate-900">{category === "all" ? "Tất cả câu hỏi" : category}</h2><p aria-live="polite" className="mt-0.5 text-xs text-slate-500">Tìm thấy {resultCount} câu hỏi</p></div>
              <label className="flex items-center gap-2 text-xs text-slate-500">Sắp xếp theo: <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-500"><option value="default">Mặc định</option><option value="alphabetical">Tên câu hỏi A–Z</option></select></label>
            </div>
            <div className="space-y-3">
              {visibleSections.map(({ title, description, icon: Icon, questions }) => (
                <details key={title} open className="group/section rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-1 marker:content-none focus-visible:outline-2 focus-visible:outline-emerald-600">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon aria-hidden="true" size={21} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-base font-bold text-slate-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span>
                    <span className="hidden shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:block">{questions.length} câu hỏi</span>
                    <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-slate-500 transition-transform group-open/section:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    {questions.map(({ question, answer }, index) => (
                      <details key={question} className="group/question rounded-xl border border-slate-200 bg-white open:border-emerald-200 open:bg-emerald-50/70">
                        <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-3 text-sm font-semibold leading-5 text-slate-800 marker:content-none hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 group-open/question:bg-emerald-200 group-open/question:text-emerald-800">{index + 1}</span><span className="flex-1 pt-0.5">{question}</span><ChevronDown aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-500 transition-transform group-open/question:rotate-180 group-open/question:text-emerald-700" />
                        </summary>
                        <p className="pb-4 pl-12 pr-4 text-sm leading-6 text-slate-600">{answer}</p>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
              {resultCount === 0 && <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Không tìm thấy câu hỏi phù hợp. Hãy thử từ khóa hoặc danh mục khác.</div>}
            </div>
            <p className="px-1 pt-4 text-xs leading-5 text-slate-500">Thông tin cụ thể có thể khác theo địa điểm và vị trí làm việc. Hãy xác nhận với Phòng Nhân sự hoặc quản lý trực tiếp khi cần.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
