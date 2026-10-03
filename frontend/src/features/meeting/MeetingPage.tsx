"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock3, Grid2X2, List, Mail, MapPin, Plus, Search, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getPublicEmployees } from "@/services/employee.service";

type RoomId = "room-01" | "room-02";
type Booking = {
  id: string;
  title: string;
  roomId: RoomId;
  date: string;
  start: string;
  end: string;
  attendees: number;
  organizer: string;
  department: string;
  otpVerified: true;
};

const STORAGE_KEY = "asia-portal-meeting-bookings";
const MEETING_TIME_OPTIONS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];
const ASIA_FNB_EMAIL_PATTERN = /^[A-Z0-9._%+-]+@asiafnb\.com$/i;
const NAME_PATTERN = /^[\p{L}\s]+$/u;
const rooms = [
  { id: "room-01" as const, name: "Phòng Họp 01", floor: "Tầng 1", capacity: 12, image: "/assets/images/Phonghop1.jpg" },
  { id: "room-02" as const, name: "Phòng Họp 02", floor: "Tầng 1", capacity: 6, image: "/assets/images/phonghop2.jpg" },
];

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isBooking(value: unknown): value is Booking {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Booking>;
  return typeof item.id === "string" && typeof item.title === "string" &&
    rooms.some((room) => room.id === item.roomId) && typeof item.date === "string" &&
    typeof item.start === "string" && typeof item.end === "string" &&
    typeof item.attendees === "number" && typeof item.organizer === "string" &&
    typeof item.department === "string" && item.otpVerified === true;
}

export default function MeetingPage({ scheduleOnly = false }: { scheduleOnly?: boolean }) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
  const [roomFilter, setRoomFilter] = useState<RoomId | "all">("all");
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [formStep, setFormStep] = useState<"details" | "otp">("details");
  const [formError, setFormError] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [title, setTitle] = useState("");
  const [roomId, setRoomId] = useState<RoomId>("room-01");
  const [date, setDate] = useState(todayLocal);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [attendees, setAttendees] = useState(1);
  const [organizer, setOrganizer] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeDepartments, setEmployeeDepartments] = useState<string[]>([]);
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(true);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
        if (Array.isArray(saved)) setBookings(saved.filter(isBooking));
      } catch {
        setBookings([]);
      } finally {
        setLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getPublicEmployees({ limit: 100, sort: "latest" }, controller.signal)
      .then((result) => setEmployeeDepartments(Array.from(new Set(result.items.map((employee) => employee.department).filter(Boolean))).sort()))
      .catch(() => setEmployeeDepartments([]))
      .finally(() => { if (!controller.signal.aborted) setIsDepartmentsLoading(false); });
    return () => controller.abort();
  }, []);

  const saveBookings = (next: Booking[]) => {
    setBookings(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const currentDate = todayLocal();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayCount = bookings.filter((booking) => booking.date === currentDate).length;
  const selectedRoom = rooms.find((room) => room.id === roomId)!;
  const selectedTimeAvailable = start < end && !bookings.some((booking) => booking.roomId === roomId && booking.date === date && start < booking.end && end > booking.start);
  const visibleBookings = bookings
    .filter((booking) => filter === "all" || (filter === "today" ? booking.date === currentDate : booking.date > currentDate || (booking.date === currentDate && booking.end > currentTime)))
    .filter((booking) => roomFilter === "all" || booking.roomId === roomFilter)
    .filter((booking) => `${booking.title} ${booking.organizer} ${booking.department}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")))
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));

  const openSchedule = () => {
    setFormOpen(false);
    setFilter("all");
    if (scheduleOnly) {
      window.requestAnimationFrame(() => scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    router.push("/meeting/schedule");
  };

  useEffect(() => {
    if (formStep === "otp") window.setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
  }, [formStep]);

  const closeBookingForm = () => {
    setFormOpen(false);
    setFormStep("details");
    setFormError("");
    setOtp(Array(6).fill(""));
  };

  const createBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !organizer.trim() || !department.trim() || !email.trim()) {
      setFormError("Vui lòng điền đầy đủ thông tin cuộc họp.");
      return;
    }
    if (!NAME_PATTERN.test(organizer.trim())) {
      setFormError("Tên người chủ trì chỉ được chứa chữ cái và khoảng trắng.");
      return;
    }
    if (!ASIA_FNB_EMAIL_PATTERN.test(email.trim())) {
      setFormError("Email liên hệ phải có dạng ten@asiafnb.com.");
      return;
    }
    if (start >= end || date < todayLocal() || (date === todayLocal() && start <= currentTime)) {
      setFormError("Hãy chọn ngày và khoảng thời gian hợp lệ trong tương lai.");
      return;
    }
    if (!Number.isInteger(attendees) || attendees < 1 || attendees > selectedRoom.capacity) {
      setFormError(`Phòng này nhận từ 1 đến ${selectedRoom.capacity} người.`);
      return;
    }
    if (bookings.some((booking) => booking.roomId === roomId && booking.date === date && start < booking.end && end > booking.start)) {
      setFormError("Phòng đã có lịch trong khoảng thời gian này. Vui lòng chọn giờ khác.");
      return;
    }

    setFormError("");
    setOtp(Array(6).fill(""));
    setFormStep("otp");
  };

  const confirmOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.join("").length !== 6) {
      setFormError("Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.");
      return;
    }
    saveBookings([...bookings, {
      id: crypto.randomUUID(), title: title.trim(), roomId, date, start, end,
      attendees, organizer: organizer.trim(), department: department.trim(), otpVerified: true,
    }]);
    closeBookingForm();
    setTitle("");
    setEmail("");
    setAttendees(1);
    openSchedule();
  };

  const cancelBooking = (booking: Booking) => {
    if (window.confirm(`Hủy lịch "${booking.title}"?`)) saveBookings(bookings.filter((item) => item.id !== booking.id));
  };

  const openRoomBooking = (nextRoomId: RoomId) => {
    setRoomId(nextRoomId);
    setFormStep("details");
    setFormError("");
    setOtp(Array(6).fill(""));
    setFormOpen(true);
  };

  const updateOtp = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setOtp((current) => current.map((digit, position) => position === index ? "" : digit));
      return;
    }
    setOtp((current) => {
      const next = [...current];
      digits.slice(0, 6 - index).split("").forEach((digit, offset) => { next[index + offset] = digit; });
      return next;
    });
    otpInputRefs.current[Math.min(index + digits.length, 5)]?.focus();
  };

  const resendOtp = () => {
    setOtp(Array(6).fill(""));
    setFormError("");
    otpInputRefs.current[0]?.focus();
  };

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-800">
      <Navbar />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {!scheduleOnly ? (
          <>
            <nav aria-label="Breadcrumb" className="mb-7 flex items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-[#1a7a1a]">Trang chủ</Link><ChevronRight size={15} />
              <Link href="/about-wana#resources" className="hover:text-[#1a7a1a]">Công cụ & Tài nguyên</Link><ChevronRight size={15} />
              <span className="font-semibold text-slate-800">Đặt phòng họp</span>
            </nav>

            <div className="mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0d5c0d] sm:text-3xl">Đặt phòng họp</h1>
                <p className="mt-1 text-sm text-slate-500">Quản lý lịch họp và chọn phòng phù hợp cho cuộc họp của bạn.</p>
              </div>
            </div>
          </>
        ) : null}

        {!scheduleOnly ? <RoomBookingCards bookings={bookings} onBook={openRoomBooking} onOpenSchedule={openSchedule} /> : null}

        <div className={scheduleOnly ? "" : "hidden"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng lịch đã đặt" value={bookings.length} unit="cuộc họp" />
          <StatCard label="Lịch họp hôm nay" value={todayCount} unit="cuộc họp" green />
          {rooms.map((room) => <StatCard key={room.id} label={`${room.name} · ${room.capacity} chỗ`} value={bookings.filter((booking) => booking.roomId === room.id).length} unit="lượt đặt" />)}
        </div>

        <div ref={scheduleRef} className="scroll-mt-24">
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-fit rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {([ ["all", `Tất cả (${bookings.length})`], ["today", `Hôm nay (${todayCount})`], ["upcoming", "Sắp tới"] ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 transition-colors ${filter === value ? "bg-white text-[#0d5c0d] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Lọc theo phòng" value={roomFilter} onChange={(event) => setRoomFilter(event.target.value as RoomId | "all")} className="h-9 min-w-36 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 sm:flex-none">
                <option value="all">Tất cả 2 phòng</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
              <label className="flex h-9 min-w-40 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 sm:flex-none">
                <Search size={14} /><input aria-label="Tìm cuộc họp" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cuộc họp, người đặt..." className="w-full bg-transparent text-xs text-slate-700 outline-none" />
              </label>
              <div className="flex h-9 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button type="button" aria-label="Xem dạng danh sách" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className={`rounded-md px-2 ${layout === "list" ? "bg-white text-[#1a7a1a] shadow-sm" : "text-slate-400"}`}><List size={15} /></button>
                <button type="button" aria-label="Xem dạng lưới" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={`rounded-md px-2 ${layout === "grid" ? "bg-white text-[#1a7a1a] shadow-sm" : "text-slate-400"}`}><Grid2X2 size={15} /></button>
              </div>
              <button type="button" onClick={() => { setFormStep("details"); setFormError(""); setOtp(Array(6).fill("")); setFormOpen(true); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#159447] px-3 text-xs font-bold text-white transition-colors hover:bg-[#0d5c0d]"><Plus size={15} /> Đặt Phòng Mới</button>
            </div>
          </div>

          {!loaded ? <div className="mt-4 rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Đang tải lịch họp...</div>
            : visibleBookings.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-green-200 bg-white px-5 py-14 text-center text-sm text-slate-500">{bookings.length ? "Không có lịch họp phù hợp với bộ lọc." : "Chưa có lịch họp nào. Bấm “Đặt Phòng Mới” để tạo lịch."}</div>
              : <div className={`mt-4 gap-3 ${layout === "grid" ? "grid sm:grid-cols-2" : "flex flex-col"}`}>
                {visibleBookings.map((booking) => {
                  const room = rooms.find((item) => item.id === booking.roomId)!;
                  const past = booking.date < currentDate || (booking.date === currentDate && booking.end <= currentTime);
                  return <article key={booking.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[#08723d]">{booking.start} – {booking.end}</span>
                        <span className="inline-flex items-center gap-1 text-slate-500"><CalendarDays size={12} />{formatDate(booking.date)}</span>
                        <span className="rounded bg-slate-100 px-2 py-1 uppercase tracking-wide text-slate-500">{booking.department}</span>
                        <span className={`rounded px-2 py-1 ${past ? "bg-slate-100 text-slate-500" : "bg-sky-50 text-sky-600"}`}>{past ? "Đã qua" : "Sắp tới"}</span>
                      </div>
                      <h2 className="mt-2 text-sm font-bold text-slate-900">{booking.title}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 text-[#08723d]"><MapPin size={13} />{room.name} · {room.floor}</span>
                        <span className="inline-flex items-center gap-1"><UsersRound size={13} />{booking.attendees} người</span>
                        <span>Người đặt: <strong className="text-slate-700">{booking.organizer}</strong></span>
                      </div>
                    </div>
                    <button type="button" onClick={() => cancelBooking(booking)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /> Hủy lịch</button>
                  </article>;
                })}
              </div>}
        </div>
        </div>
      </section>
      <Footer />

      {formOpen ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBookingForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="meeting-form-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.3)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-7">
            <div><div className="flex flex-wrap items-center gap-2.5"><h2 id="meeting-form-title" className="text-xl font-extrabold text-[#0d5c0d] sm:text-2xl">{formStep === "details" ? "Đặt phòng họp mới" : "Xác nhận mã OTP"}</h2>{formStep === "details" ? <span className="rounded-full bg-[#f5c800] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0d5c0d]">{selectedRoom.name}</span> : null}</div><p className="mt-1.5 text-sm text-slate-500">{formStep === "details" ? "Điền thông tin và chọn khung giờ còn trống." : "Nhập mã gồm 6 chữ số đã được gửi đến email của bạn."}</p></div>
            <button type="button" onClick={closeBookingForm} aria-label="Đóng" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800"><X size={21} /></button>
          </div>
          {formStep === "details" ? <form onSubmit={createBooking} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <Field label="Tiêu đề cuộc họp *"><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="VD: Họp giao ban tuần, Báo cáo tiến độ dự án..." className="form-input" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Người chủ trì / Người đặt *"><input required value={organizer} onChange={(event) => { const nextValue = event.target.value; if (!nextValue || NAME_PATTERN.test(nextValue)) setOrganizer(nextValue); }} placeholder="Họ và tên" className="form-input" /></Field>
              <Field label="Email liên hệ *"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@asiafnb.com" className="form-input" /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
              <Field label="Phòng ban"><DepartmentSelect value={department} options={employeeDepartments} isLoading={isDepartmentsLoading} onChange={setDepartment} /></Field>
              <Field label="Số người tham dự"><div className="flex items-center gap-2"><input required type="number" min={1} max={selectedRoom.capacity} value={attendees} onChange={(event) => setAttendees(Math.min(selectedRoom.capacity, Math.max(1, Number(event.target.value) || 1)))} className="form-input min-w-0 flex-1 appearance-textfield [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /><span className="shrink-0 text-[11px] font-normal text-slate-400">/ max {selectedRoom.capacity} người</span></div></Field>
            </div>

            <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-slate-50 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#159447] shadow-sm"><Clock3 size={15} /></span> Khung giờ họp</p><span className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#08723d] shadow-sm">{start} → {end} ({Math.max((Number(end.slice(0, 2)) * 60 + Number(end.slice(3))) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3))), 0) / 60} giờ)</span></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_1fr_1fr]">
                <Field label="Ngày họp"><input required type="date" min={todayLocal()} value={date} onChange={(event) => setDate(event.target.value)} className="form-input" /></Field>
                <Field label="Giờ bắt đầu"><select value={start} onChange={(event) => setStart(event.target.value)} className="form-input">{MEETING_TIME_OPTIONS.slice(0, -1).map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                <Field label="Giờ kết thúc"><select value={end} onChange={(event) => setEnd(event.target.value)} className="form-input">{MEETING_TIME_OPTIONS.slice(1).map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{[[30, "30 phút"], [60, "1 giờ"], [90, "1.5 giờ"], [120, "2 giờ"], [180, "3 giờ"]].map(([minutes, label]) => <button key={minutes} type="button" onClick={() => setEnd(addMinutes(start, minutes as number))} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${end === addMinutes(start, minutes as number) ? "border-[#159447] bg-[#159447] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-green-300"}`}>{label}</button>)}</div>
              <p className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${selectedTimeAvailable ? "border-emerald-200 bg-emerald-50 text-[#08723d]" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{selectedTimeAvailable ? <>Khung giờ <strong>{start} - {end}</strong> ({formatDate(date)}) đang trống và sẵn sàng đặt.</> : "Khung giờ này đã trùng lịch hoặc chưa hợp lệ. Vui lòng chọn lại."}</p>
            </section>

            {formError ? <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{formError}</p> : null}
          </div>
            <div className="flex shrink-0 justify-end border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="submit" className="rounded-xl bg-[#159447] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0d5c0d]">Xác nhận đặt phòng</button></div>
          </form>
          : <form onSubmit={confirmOtp} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-amber-50/70 px-5 py-6 [scrollbar-width:none] sm:px-7 sm:py-7 [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-5 text-center sm:px-6 sm:py-6">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#159447] text-white shadow-[0_10px_22px_rgba(21,148,71,0.3)]"><Mail size={32} strokeWidth={2.2} /></span>
                <p className="mt-4 text-sm leading-6 text-slate-600">Mã xác nhận đã được gửi đến</p>
                <p className="mt-1 break-all text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{email}</p>
                <div className="mt-6 grid w-full gap-4 text-left sm:grid-cols-2 sm:gap-0">
                  <div className="flex items-start gap-3 sm:pr-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm"><MapPin size={21} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">Phòng họp</p><p className="mt-1 text-lg font-extrabold text-[#08723d]">{selectedRoom.name}</p></div></div>
                  <div className="flex items-start gap-3 sm:pl-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm"><CalendarDays size={21} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">Ngày &amp; giờ đặt phòng</p><p className="mt-1 text-lg font-extrabold leading-snug text-slate-800">{formatDate(date)} {start} – {end}</p></div></div>
                </div>
              </div>
              <div className="mx-auto flex max-w-lg justify-center gap-2 sm:gap-3" aria-label="Mã OTP gồm 6 chữ số">
                {otp.map((digit, index) => <input key={index} ref={(element) => { otpInputRefs.current[index] = element; }} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !otp[index] && index > 0) otpInputRefs.current[index - 1]?.focus(); }} onPaste={(event) => { event.preventDefault(); updateOtp(index, event.clipboardData.getData("text")); }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`Chữ số OTP ${index + 1}`} className="h-12 w-10 rounded-xl border border-slate-200 bg-white text-center text-lg font-bold text-slate-800 shadow-sm outline-none transition focus:-translate-y-0.5 focus:border-[#159447] focus:ring-4 focus:ring-emerald-100 sm:h-14 sm:w-12 sm:text-xl" />)}
              </div>
              {formError ? <p role="alert" className="mx-auto max-w-md rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-center text-sm text-rose-700">{formError}</p> : null}
              <p className="text-center text-lg text-slate-600">Không nhận được mã? <button type="button" onClick={resendOtp} className="font-extrabold text-[#159447] underline decoration-emerald-300 decoration-2 underline-offset-4 hover:text-[#0d5c0d]">Gửi lại mã</button></p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-6 py-5 sm:px-9"><button type="button" onClick={() => { setFormStep("details"); setFormError(""); }} className="rounded-xl bg-slate-50 px-6 py-3.5 text-base font-bold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-[#08723d]">Quay lại</button><button type="submit" disabled={otp.join("").length !== 6} className="inline-flex items-center gap-2 rounded-xl bg-[#159447] px-7 py-3.5 text-base font-bold text-white shadow-[0_8px_18px_rgba(21,148,71,0.24)] transition-colors hover:bg-[#0d5c0d] disabled:cursor-not-allowed disabled:bg-emerald-200"><CheckCircle2 size={20} />Xác nhận mã OTP</button></div>
          </form>}
        </section>
      </div> : null}
    </main>
  );
}

function StatCard({ label, value, unit, green = false }: { label: string; value: number; unit: string; green?: boolean }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 text-xl font-extrabold ${green ? "text-[#159447]" : "text-slate-900"}`}>{value} <span className="text-xs font-medium text-slate-500">{unit}</span></p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="block text-xs font-semibold text-slate-700"><p>{label}</p><div className="mt-1.5 [&_.form-input]:w-full [&_.form-input]:rounded-lg [&_.form-input]:border [&_.form-input]:border-slate-200 [&_.form-input]:bg-white [&_.form-input]:px-3 [&_.form-input]:py-2.5 [&_.form-input]:text-sm [&_.form-input]:font-normal [&_.form-input]:text-slate-800 [&_.form-input]:outline-none focus-within:[&_.form-input]:border-green-500">{children}</div></div>;
}

function DepartmentSelect({ value, options, isLoading, onChange }: { value: string; options: string[]; isLoading: boolean; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const isDisabled = isLoading || options.length === 0;

  useEffect(() => {
    const closeSelect = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener("mousedown", closeSelect);
    return () => window.removeEventListener("mousedown", closeSelect);
  }, []);

  const label = isLoading ? "Đang tải phòng ban..." : options.length === 0 ? "Chưa có phòng ban" : value || "Chọn phòng ban";

  return <div ref={selectRef} className="relative">
    <button type="button" disabled={isDisabled} aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)} className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-normal outline-none transition-colors ${isOpen ? "border-[#159447] ring-1 ring-[#159447]" : "border-slate-200 hover:border-green-300"} ${isDisabled ? "cursor-not-allowed bg-slate-100 text-slate-400" : "text-slate-800"}`}>
      <span className="truncate">{label}</span><ChevronDown size={17} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {isOpen ? <div role="listbox" className="absolute z-20 mt-2 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
      <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(""); setIsOpen(false); }} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!value ? "bg-emerald-50 font-semibold text-[#08723d]" : "text-slate-600 hover:bg-slate-50"}`}>Chọn phòng ban</button>
      {options.map((item) => <button key={item} type="button" role="option" aria-selected={value === item} onClick={() => { onChange(item); setIsOpen(false); }} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${value === item ? "bg-emerald-50 font-semibold text-[#08723d]" : "text-slate-700 hover:bg-slate-50"}`}>{item}</button>)}
    </div> : null}
  </div>;
}

function RoomBookingCards({ bookings, onBook, onOpenSchedule }: { bookings: Booking[]; onBook: (roomId: RoomId) => void; onOpenSchedule: () => void }) {
  const timeSlots = ["08:30", "10:00", "11:30", "13:30", "15:00", "16:30"];
  const currentDate = todayLocal();

  return (
    <div className="space-y-5">
      <section className="relative isolate min-h-[330px] overflow-hidden rounded-[28px] bg-[#063d23] px-5 py-8 text-white shadow-[0_20px_46px_rgba(5,95,42,0.23)] sm:min-h-[360px] sm:px-8 sm:py-10 lg:min-h-[390px] lg:px-10 lg:py-12">
        <Image src="/assets/images/bannerphonghop.png" alt="Không gian phòng họp WANA hiện đại" fill priority sizes="(max-width: 768px) 100vw, 1200px" className="object-cover object-[68%_center]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.27)_35%,rgba(0,0,0,0.1)_58%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.12),transparent_56%)]" />
        <div className="absolute bottom-0 left-0 h-1 w-48 bg-gradient-to-r from-lime-300 via-emerald-300 to-transparent sm:w-72" />

        <div className="relative flex min-h-[266px] items-end">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="w-fit rounded-full border border-white/20 bg-white/[0.11] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-50 backdrop-blur-sm">Asia Food &amp; Beverage JSC</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" />Không gian họp chuyên nghiệp</span>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl">Hệ thống phòng họp WANA hiện đại</h1>
            <div className="mt-5 flex max-w-3xl gap-3 rounded-r-xl border-l-2 border-lime-300/90 bg-slate-950/35 py-3 pl-4 pr-4 shadow-sm backdrop-blur-sm sm:pl-5 sm:pr-5">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />
              <p className="text-sm font-semibold leading-6 text-white sm:text-[15px]">“Nơi tầm nhìn được chia sẻ, trí tuệ được kết nối, khác biệt được tôn trọng và những quyết định lớn được chuyển hóa thành hành động.”</p>
            </div>
            <button type="button" onClick={onOpenSchedule} aria-label="Xem lịch đã đặt" className="group mt-6 flex w-full max-w-[272px] items-center justify-between rounded-[20px] border border-white/25 bg-slate-950/60 p-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.32)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-lime-300/70 hover:bg-slate-950/70 sm:px-5 sm:py-[13px]">
              <span><span className="block text-base font-extrabold text-white sm:text-lg">Xem lịch đã đặt</span><span className="mt-1 block text-[11px] font-medium text-emerald-100">Theo dõi và xem Lịch đặt phòng</span></span>
              <span className="ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-300 text-[#16451d] shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-[50px] sm:w-[50px]" aria-hidden="true"><ArrowUpRight size={25} strokeWidth={2.25} /></span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid auto-rows-fr gap-5 lg:grid-cols-2">
        {rooms.map((room, index) => {
          const roomBookings = bookings.filter((booking) => booking.roomId === room.id && booking.date === currentDate);
          const isOccupied = (slot: string) => roomBookings.some((booking) => booking.start <= slot && booking.end > slot);
          const nextMeeting = roomBookings.sort((a, b) => a.start.localeCompare(b.start))[0];

          return (
            <article key={room.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_10px_26px_rgba(15,118,65,0.08)]">
              <div className="relative h-56 overflow-hidden bg-slate-900 sm:h-60">
                <Image src={room.image} alt={room.name} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#159447] px-2.5 py-1 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 rounded-full bg-white" /> Đang sẵn sàng</span>
                <span className="absolute right-4 top-4 rounded-full bg-[#f5c800] px-2.5 py-1 text-[10px] font-extrabold text-[#0d5c0d]">AChau-{index + 1 === 1 ? "01" : "02"}</span>
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <div className="flex items-center gap-3 text-xs font-semibold text-emerald-100"><span className="inline-flex items-center gap-1"><MapPin size={13} /> {room.floor}</span><span className="inline-flex items-center gap-1"><UsersRound size={13} /> Sức chứa: {room.capacity} người</span></div>
                  <h2 className="mt-2 text-xl font-extrabold">{room.name}</h2>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <p className="min-h-12 text-sm leading-6 text-slate-500">{index === 0 ? "Không gian họp chuyên nghiệp, phù hợp cho các buổi trao đổi nội bộ và làm việc cùng đối tác." : "Không gian họp gọn gàng, phù hợp cho các buổi trao đổi và thảo luận nhóm."}</p>
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#08723d]"><Clock3 size={14} /> Khung giờ trống hôm nay</p><span className="text-[11px] text-slate-500">{roomBookings.length} lịch đã đặt</span></div>
                  <div className="mt-3 flex flex-wrap gap-2">{timeSlots.map((slot) => <span key={slot} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${isOccupied(slot) ? "border-slate-200 bg-slate-100 text-slate-400 line-through" : "border-emerald-300 bg-white text-[#08723d]"}`}>{slot}</span>)}</div>
                  <p className="mt-3 truncate text-[11px] text-slate-500">{nextMeeting ? <>Cuộc họp kế tiếp: <strong className="text-slate-700">{nextMeeting.start} · {nextMeeting.title}</strong></> : "Chưa có lịch họp hôm nay."}</p>
                </div>
                <button type="button" onClick={() => onBook(room.id)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d6d27] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#08571f]"><Plus size={16} /> Đặt {room.name} <ChevronRight size={16} /></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
