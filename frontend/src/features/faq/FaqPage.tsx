"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, CircleHelp, ClipboardCheck, Coffee, Laptop, Leaf, Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { normalizeSearchText } from "@/utils/normalizeSearchText";

import faqData from "./faq-data.json";

const sectionDetails = [
  { description: "Những điều cần biết khi bắt đầu làm việc tại Á Châu.", icon: BriefcaseBusiness },
  { description: "Thông tin đi lại và sinh hoạt tại công ty.", icon: Coffee },
  { description: "Thời gian làm việc, chấm công và nghỉ phép.", icon: ClipboardCheck },
  { description: "Thông tin về thử việc, lương và phúc lợi.", icon: BriefcaseBusiness },
  { description: "Thiết bị, tài khoản và hỗ trợ công nghệ thông tin.", icon: Laptop },
  { description: "Các đầu mối hỗ trợ khi cần giải đáp.", icon: CircleHelp },
];

const sections = faqData.map((section, index) => ({ ...section, ...sectionDetails[index] }));

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
        const questions = section.questions.filter(({ question }) => !normalizedQuery || normalizeSearchText(question).includes(normalizedQuery));
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
              <form onSubmit={(event) => { event.preventDefault(); setCategory("all"); setQuery(search); }} className="mt-5 flex max-w-2xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
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
          <aside aria-label="Danh mục câu hỏi" className="h-fit bg-white px-3 py-4">
            <h2 className="mb-4 px-4 text-sm font-bold text-emerald-800">Danh mục câu hỏi</h2>
            <div className="grid gap-1">
              {[{ title: "all", label: "Tất cả câu hỏi", count }, ...sections.map((section) => ({ title: section.title, label: section.title, count: section.questions.length }))].map(({ title, label, count: categoryCount }) => (
                <button key={title} type="button" aria-pressed={category === title} onClick={() => setCategory(title)} className={`flex min-h-11 items-center gap-3 border-l-[3px] px-4 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-emerald-700 ${category === title ? "border-emerald-700 bg-[#eef7f1] font-semibold text-emerald-800" : "border-transparent text-slate-600 hover:bg-emerald-50"}`}>
                  <span className="flex-1">{label}</span><span className="text-xs">{categoryCount}</span>
                </button>
              ))}
            </div>
          </aside>
          <div className="min-w-0 bg-white p-3 sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div><h2 className="text-lg font-bold text-slate-900">{category === "all" ? "Tất cả câu hỏi" : category}</h2><p aria-live="polite" className="mt-0.5 text-xs text-slate-500">{resultCount} câu hỏi</p></div>
              <label className="flex items-center gap-2 text-xs text-slate-500"><span className="sr-only">Sắp xếp theo</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-500"><option value="default">Thứ tự mặc định</option><option value="alphabetical">Tên câu hỏi A–Z</option></select></label>
            </div>
            <div className="space-y-3">
              {visibleSections.map(({ title, description, icon: Icon, questions }) => (
                <section key={title} className="px-1 py-2">
                  <div className="flex items-center gap-3 p-1">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon aria-hidden="true" size={21} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-lg font-extrabold text-slate-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span>
                    <span className="hidden shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:block">{questions.length} câu hỏi</span>
                  </div>
                  <div className="mt-3">
                  {questions.map(({ question, answer }) => (
                    <details key={question} className="group border-b border-[#d9e1de]">
                      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 py-4 text-sm font-semibold text-slate-900 marker:content-none hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600">
                        <span className="flex-1">{question}</span>
                        <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500 text-base font-semibold leading-none text-emerald-800 group-open:bg-emerald-50"><span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></span>
                      </summary>
                      <p className="pb-6 text-sm leading-6 text-slate-600">{answer}</p>
                    </details>
                  ))}
                  </div>
                </section>
              ))}
              {resultCount === 0 && <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Không tìm thấy câu hỏi phù hợp. Hãy thử từ khóa hoặc danh mục khác.</div>}
            </div>
            <p className="px-1 pt-4 text-xs leading-5 text-slate-500">Thông tin cụ thể có thể khác theo địa điểm và vị trí làm việc. Hãy xác nhận với Phòng Nhân sự hoặc quản lý trực tiếp khi cần.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-[#edf4ef] px-5 py-5 sm:flex-nowrap">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300 text-lg text-emerald-700">?</span>
              <div className="min-w-0 flex-1"><h2 className="text-base font-bold text-slate-900">Bạn vẫn còn câu hỏi?</h2><p className="mt-1 text-xs text-slate-600">Phòng Nhân sự và IT luôn sẵn sàng hướng dẫn.</p></div>
              <button type="button" onClick={() => { setSearch(""); setQuery(""); setCategory(sections[5].title); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="ml-12 inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-300 px-4 text-xs font-semibold text-emerald-800 hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-700 sm:ml-0">Liên hệ hỗ trợ <span aria-hidden="true">↗</span></button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
