"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Inbox, List, Mail, MapPin, Plus, Printer, RotateCcw, Search, SlidersHorizontal, Sparkles, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DatePicker from "@/components/ui/DatePicker";
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
  email?: string;
  /** Legacy field from saved browser data; the room ID is now the sole source of the room name. */
  displayRoom?: string;
  department: string;
  otpVerified: true;
};

const STORAGE_KEY = "asia-portal-meeting-bookings";
const MEETING_TIME_OPTIONS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];
const ASIA_FNB_EMAIL_PATTERN = /^[A-Z0-9._%+-]+@asiafnb\.com$/i;
const NAME_PATTERN = /^[\p{L}\s]+$/u;
const rooms = [
  { id: "room-01" as const, name: "Phòng 1", floor: "Tầng 1", capacity: 12, image: "/assets/images/Phonghop1.jpg" },
  { id: "room-02" as const, name: "Phòng 2", floor: "Tầng 1", capacity: 6, image: "/assets/images/phonghop2.jpg" },
];

const DEMO_BOOKINGS: Booking[] = [
  { id: "demo-q4", title: "Họp chiến lược Q4", roomId: "room-01", date: "2026-10-05", start: "08:30", end: "09:30", attendees: 8, organizer: "Nguyễn Văn A", email: "nguyenvana@vietcorp.com", department: "Kinh doanh", otpVerified: true },
  { id: "demo-product", title: "Demo sản phẩm", roomId: "room-02", date: "2026-10-05", start: "10:00", end: "11:00", attendees: 6, organizer: "Trần Thị B", email: "tranthib@vietcorp.com", department: "Sản phẩm", otpVerified: true },
  { id: "demo-candidate", title: "Phỏng vấn ứng viên", roomId: "room-01", date: "2026-10-05", start: "14:00", end: "15:30", attendees: 4, organizer: "Lê Minh C", email: "leminhc@vietcorp.com", department: "Nhân sự", otpVerified: true },
  { id: "demo-operations", title: "Họp vận hành", roomId: "room-02", date: "2026-10-06", start: "09:00", end: "10:00", attendees: 10, organizer: "Phạm Thị D", email: "phamthid@vietcorp.com", department: "Vận hành", otpVerified: true },
  { id: "demo-project", title: "Đánh giá dự án Q3", roomId: "room-01", date: "2026-10-07", start: "13:30", end: "15:00", attendees: 7, organizer: "Hoàng Văn E", email: "hoangvane@vietcorp.com", department: "Dự án", otpVerified: true },
];

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

type PrintScope = "today" | "all";
type PrintOrientation = "portrait" | "landscape";

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sortBookingsByStart(list: Booking[]) {
  return [...list].sort((first, second) => `${first.date} ${first.start}`.localeCompare(`${second.date} ${second.start}`));
}

function bookingRoomLabel(booking: Booking) {
  const room = rooms.find((item) => item.id === booking.roomId);
  const roomName = room?.name ?? "—";
  return `${roomName} - ${room?.floor ?? "—"}`;
}

function printBookingTable(list: Booking[], scope: PrintScope, orientation: PrintOrientation) {
  const sortedBookings = sortBookingsByStart(list);
  const printMoment = new Date();
  const printedAt = printMoment.toLocaleString("vi-VN");
  const printedDate = printMoment.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const printedTime = printMoment.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const reportStart = formatDate(todayLocal());
  const reportEnd = formatDate(sortedBookings.at(-1)?.date ?? todayLocal());
  const reportDate = scope === "today" ? reportStart : `${reportStart} - ${reportEnd}`;
  const title = `Lịch đặt phòng họp${scope === "today" ? " hôm nay" : ""}`;
  const logoUrl = new URL("/assets/images/asia-logo.png", window.location.origin).href;
  const pageUrl = window.location.href;
  const rows = sortedBookings.map((booking, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(booking.title)}</td>
      <td>${escapeHtml(booking.organizer)}</td>
      <td>${escapeHtml(booking.department)}</td>
      <td>${escapeHtml(formatDate(booking.date))},<br>${escapeHtml(booking.start)} - ${escapeHtml(booking.end)}</td>
      <td>${escapeHtml(booking.email || "—")}</td>
      <td>${escapeHtml(bookingRoomLabel(booking))}</td>
      <td>${escapeHtml(booking.attendees)}</td>
    </tr>`).join("");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Bản in lịch đặt phòng họp");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  document.body.appendChild(iframe);

  const printDocument = iframe.contentDocument;
  const printWindow = iframe.contentWindow;
  if (!printDocument || !printWindow) {
    iframe.remove();
    return;
  }

  printDocument.open();
  printDocument.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { min-height: 100%; }
    body { margin: 0; padding: 10mm 6mm 18mm; color: #18344a; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
    .report-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 25mm; height: 25mm; object-fit: contain; }
    .brand-name { color: #075d46; font-size: 22px; font-weight: 800; line-height: 1.1; }
    .brand-tagline { margin-top: 4px; color: #53627a; font-size: 11px; font-weight: 700; letter-spacing: 3px; }
    .print-info { display: grid; grid-template-columns: 28px auto; align-items: center; gap: 2px 10px; color: #53627a; font-size: 11px; line-height: 1.5; }
    .print-info svg { grid-row: 1 / 3; width: 25px; height: 25px; color: #087354; }
    .report-title { margin: 8mm 0 7mm; text-align: center; }
    h1 { margin: 0; color: #075d46; font-size: 29px; font-weight: 900; letter-spacing: .5px; text-transform: uppercase; }
    .subtitle { margin: 2px 0 0; color: #59667a; font-size: 15px; font-weight: 700; }
    .title-rules { display: flex; align-items: center; justify-content: center; gap: 5px; margin: 7px auto 0; }
    .title-rules span { display: block; height: 2px; }
    .title-rules span:nth-child(1), .title-rules span:nth-child(3) { width: 33mm; background: #14745d; }
    .title-rules span:nth-child(2) { width: 18mm; background: #efbd32; }
    .description { margin: 6px 0 0; color: #667085; font-size: 9px; }
    .summary { display: grid; grid-template-columns: 1.05fr 1fr 1fr; margin-bottom: 6mm; padding: 6mm 8mm; border-radius: 10px; background: linear-gradient(90deg, #f2f8f4, #edf7f0); }
    .summary-item { display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 10px; min-height: 38px; padding: 0 7mm; border-right: 1px solid #cbded3; }
    .summary-item:first-child { padding-left: 0; }
    .summary-item:last-child { padding-right: 0; border-right: 0; }
    .summary-icon { width: 29px; height: 29px; color: #087354; }
    .summary-label { margin-bottom: 4px; color: #64748b; font-size: 10px; }
    .summary-value { color: #123e35; font-size: 13px; font-weight: 800; line-height: 1.25; }
    .summary-item.report-period .summary-copy { text-align: ${scope === "all" ? "center" : "left"}; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1px solid #b8cbd2; border-radius: 7px; overflow: hidden; font-size: 10px; }
    thead { display: table-header-group; }
    th, td { text-align: center; vertical-align: middle; overflow-wrap: anywhere; }
    th { height: 36px; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,.42); background: linear-gradient(180deg, #14775e 0%, #075b47 100%); color: #fff; font-size: 9.5px; font-weight: 800; line-height: 1.25; text-align: center; }
    th:last-child { border-right: 0; }
    td { height: 46px; padding: 8px 6px; border-top: 1px solid #c6d3d9; border-right: 1px solid #c6d3d9; background: #fff; color: #263a4f; line-height: 1.45; }
    tbody tr:nth-child(even) td { background: #f5f8f7; }
    td:last-child { border-right: 0; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th:nth-child(1), td:nth-child(1) { width: 4%; text-align: center; }
    th:nth-child(2), td:nth-child(2) { width: 16%; }
    th:nth-child(3), td:nth-child(3) { width: 15%; }
    th:nth-child(4), td:nth-child(4) { width: 12%; }
    th:nth-child(5), td:nth-child(5) { width: 13%; }
    th:nth-child(6), td:nth-child(6) { width: 16%; }
    th:nth-child(7), td:nth-child(7) { width: 17%; }
    th:nth-child(8), td:nth-child(8) { width: 7%; }
    th:nth-child(8) { text-align: center; }
    .report-footer { position: fixed; right: 6mm; bottom: 6mm; left: 6mm; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: end; padding-top: 4px; border-top: 2px solid #087354; color: #53627a; font-size: 9px; }
    .report-footer::before { position: absolute; top: -2px; left: 0; width: 36mm; height: 2px; background: #efbd32; content: ""; }
    .report-footer span:nth-child(2) { text-align: center; }
    .report-footer span:nth-child(3) { text-align: right; }
  </style>
</head>
<body>
  <header class="report-header">
    <div class="brand">
      <img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="Asia Food &amp; Beverage">
      <div><div class="brand-name">Asia Food &amp; Beverage</div><div class="brand-tagline">GROWING TOGETHER</div></div>
    </div>
    <div class="print-info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/><path d="M18 11h.01"/></svg>
      <span>Ngày in: <strong>${escapeHtml(printedDate)}</strong></span>
      <span>Giờ in: <strong>${escapeHtml(printedTime)}</strong></span>
    </div>
  </header>
  <section class="report-title">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">Meeting Schedule Report</p>
    <div class="title-rules"><span></span><span></span><span></span></div>
    <p class="description">Asia Food &amp; Beverage · In lúc ${escapeHtml(printedAt)} · ${sortedBookings.length} cuộc họp</p>
  </section>
  <section class="summary">
    <div class="summary-item">
      <svg class="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21h18"/><path d="M6 21V5l6-3v19"/><path d="M12 8h6v13"/><path d="M8 7v.01M8 11v.01M8 15v.01M15 11v.01M18 11v.01M15 15v.01M18 15v.01"/></svg>
      <div class="summary-copy"><div class="summary-label">Công ty / Chi nhánh</div><div class="summary-value">Asia Food &amp; Beverage</div></div>
    </div>
    <div class="summary-item report-period">
      <svg class="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01"/></svg>
      <div class="summary-copy"><div class="summary-label">Ngày báo cáo</div><div class="summary-value">${escapeHtml(reportDate)}</div></div>
    </div>
    <div class="summary-item">
      <svg class="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <div class="summary-copy"><div class="summary-label">Tổng số cuộc họp</div><div class="summary-value">${sortedBookings.length} cuộc họp</div></div>
    </div>
  </section>
  <table>
    <thead><tr><th>#</th><th>Tiêu đề</th><th>Người đặt</th><th>Phòng ban</th><th>Ngày &amp; giờ</th><th>Email</th><th>Phòng họp</th><th>Số người</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer class="report-footer"><span>Asia Food &amp; Beverage&nbsp; | &nbsp;Meeting Schedule</span><span>${escapeHtml(pageUrl)}</span><span>Trang 1/1</span></footer>
</body>
</html>`);
  printDocument.close();

  const cleanup = () => iframe.remove();
  printWindow.onafterprint = cleanup;
  let printStarted = false;
  const startPrint = () => {
    if (printStarted) return;
    printStarted = true;
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 100);
  };
  const logo = printDocument.querySelector<HTMLImageElement>(".brand-logo");
  if (logo && !logo.complete) {
    logo.onload = startPrint;
    logo.onerror = startPrint;
    window.setTimeout(startPrint, 1500);
  } else {
    startPrint();
  }
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
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<RoomId | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [formStep, setFormStep] = useState<"details" | "otp">("details");
  const [otpAction, setOtpAction] = useState<"create" | "cancel">("create");
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
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
        if (Array.isArray(saved)) {
          const savedBookings = saved.filter(isBooking);
          const normalizedBookings = savedBookings.map(({ displayRoom: _legacyDisplayRoom, ...booking }) => booking);
          setBookings(normalizedBookings.length ? normalizedBookings : DEMO_BOOKINGS);
        } else {
          setBookings(DEMO_BOOKINGS);
        }
      } catch {
        setBookings(DEMO_BOOKINGS);
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
  const otpBooking = otpAction === "cancel" ? bookingToCancel : null;
  const otpRoom = otpBooking ? rooms.find((room) => room.id === otpBooking.roomId)! : selectedRoom;
  const otpEmail = otpBooking?.email ?? email;
  const otpDate = otpBooking?.date ?? date;
  const otpStart = otpBooking?.start ?? start;
  const otpEnd = otpBooking?.end ?? end;
  const selectedTimeAvailable = start < end && !bookings.some((booking) => booking.roomId === roomId && booking.date === date && start < booking.end && end > booking.start);
  const bookedDepartments = Array.from(new Set(bookings.map((booking) => booking.department).filter(Boolean))).sort();
  const visibleBookings = bookings
    .filter((booking) => roomFilter === "all" || booking.roomId === roomFilter)
    .filter((booking) => departmentFilter === "all" || booking.department === departmentFilter)
    .filter((booking) => `${booking.title} ${booking.organizer} ${booking.department}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")))
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));

  const openSchedule = () => {
    setFormOpen(false);
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
    setOtpAction("create");
    setBookingToCancel(null);
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
    setOtpAction("create");
    setFormStep("otp");
  };

  const confirmOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.join("").length !== 6) {
      setFormError("Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.");
      return;
    }
    if (otpAction === "cancel" && bookingToCancel) {
      saveBookings(bookings.filter((item) => item.id !== bookingToCancel.id));
      closeBookingForm();
      return;
    }
    saveBookings([...bookings, {
      id: crypto.randomUUID(), title: title.trim(), roomId, date, start, end,
      attendees, organizer: organizer.trim(), email: email.trim(), department: department.trim(), otpVerified: true,
    }]);
    closeBookingForm();
    setTitle("");
    setEmail("");
    setAttendees(1);
    openSchedule();
  };

  const cancelBooking = (booking: Booking) => {
    setBookingToCancel(booking);
    setOtpAction("cancel");
    setOtp(Array(6).fill(""));
    setFormError("");
    setFormStep("otp");
    setFormOpen(true);
  };

  const openRoomBooking = (nextRoomId: RoomId) => {
    setRoomId(nextRoomId);
    setFormStep("details");
    setOtpAction("create");
    setBookingToCancel(null);
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
      {scheduleOnly ? <><Navbar /><BookedScheduleDashboard
        bookings={visibleBookings}
        allBookings={bookings}
        roomFilter={roomFilter}
        departmentFilter={departmentFilter}
        search={search}
        departments={bookedDepartments}
        onRoomFilterChange={setRoomFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        onSearchChange={setSearch}
        onCancel={cancelBooking}
      /><Footer /></> : <>
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
          <Link href="/meeting" className="group relative flex min-h-[116px] flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#08723d] to-[#159447] px-4 py-3 text-center text-white shadow-[0_8px_18px_rgba(8,114,61,0.2)] transition-transform hover:-translate-y-0.5"><span aria-hidden="true" className="absolute -right-5 -top-7 h-20 w-20 rounded-full bg-lime-300/20" /><span className="relative text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">Đặt phòng mới</span><span className="relative mt-1 inline-flex items-center gap-2 text-sm font-extrabold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:-translate-x-0.5"><ArrowLeft size={16} /></span>Quay về đặt phòng</span><span className="relative mt-1 text-[11px] text-emerald-100">Chọn phòng và khung giờ phù hợp</span></Link>
          <StatCard label="Tổng lịch đã đặt" value={bookings.length} unit="cuộc họp" description="Tất cả lịch đã xác nhận" />
          <StatCard label="Lịch họp hôm nay" value={todayCount} unit="cuộc họp" description="Lịch diễn ra trong ngày" green />
          <button type="button" onClick={openSchedule} className="group relative flex min-h-[116px] flex-col items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#159447] hover:shadow-[0_8px_18px_rgba(8,114,61,0.12)]"><span aria-hidden="true" className="absolute -right-5 -bottom-8 h-20 w-20 rounded-full bg-[#f5c800]/20" /><span className="relative text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Lịch họp hôm nay</span><span className="relative mt-1 inline-flex items-center gap-2 text-sm font-extrabold text-[#08723d]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#159447] text-white shadow-sm transition-transform group-hover:scale-105"><Printer size={15} /></span>In lịch đặt phòng</span><span className="relative mt-1 text-[11px] text-slate-500">Mở trang lịch để xem trước bản in</span></button>
        </div>

        <div ref={scheduleRef} className="scroll-mt-24">
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-600">Quản lý lịch họp</p><h1 className="mt-1 text-xl font-extrabold text-[#0d5c0d] sm:text-2xl">Lịch đặt phòng</h1><p className="mt-1.5 text-base text-slate-500">Tìm kiếm nhanh hoặc lọc lịch theo phòng họp và phòng ban.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-[#08723d]">{visibleBookings.length} lịch hiển thị</span></div><div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(190px,0.7fr)_minmax(190px,0.7fr)]"><label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-400 transition focus-within:border-[#159447] focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100"><Search size={19} /><input aria-label="Tìm lịch đặt phòng" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cuộc họp, người đặt hoặc phòng ban..." className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400" /></label><label className="inline-flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-500 transition hover:border-emerald-300"><SlidersHorizontal size={18} className="shrink-0 text-[#159447]" /><select aria-label="Lọc theo phòng họp" value={roomFilter} onChange={(event) => setRoomFilter(event.target.value as RoomId | "all")} className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-700 outline-none"><option value="all">Tất cả phòng họp</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label className="inline-flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-500 transition hover:border-emerald-300"><UsersRound size={18} className="shrink-0 text-[#159447]" /><select aria-label="Lọc theo phòng ban" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-700 outline-none"><option value="all">Tất cả phòng ban</option>{bookedDepartments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
          </div>

          {!loaded ? <div className="mt-4 rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Đang tải lịch họp...</div>
            : visibleBookings.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-green-200 bg-white px-5 py-14 text-center text-sm text-slate-500">{bookings.length ? "Không có lịch họp phù hợp với bộ lọc hiện tại." : "Chưa có lịch họp nào. Hãy quay về trang đặt phòng để tạo lịch mới."}</div>
              : <div className="mt-4 flex flex-col gap-4">
                {visibleBookings.map((booking) => {
                  const room = rooms.find((item) => item.id === booking.roomId)!;
                  const past = booking.date < currentDate || (booking.date === currentDate && booking.end <= currentTime);
                  return <article key={booking.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                    <span aria-hidden="true" className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-emerald-50/70" />
                    <span aria-hidden="true" className="absolute -bottom-24 -right-8 h-40 w-40 rounded-full bg-rose-50/60" />
                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center">
                      <section className="min-w-0 xl:w-[37%] xl:border-r xl:border-slate-200 xl:pr-8">
                        <div className="flex flex-wrap gap-2 text-sm font-bold"><span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[#08723d]"><Clock3 size={17} />{booking.start} – {booking.end}</span><span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-600"><CalendarDays size={17} />{formatDate(booking.date)}</span><span className="rounded-xl bg-slate-100 px-3 py-2 uppercase text-slate-600">{booking.department}</span><span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${past ? "bg-slate-100 text-slate-500" : "bg-sky-50 text-sky-600"}`}><span className={`h-2 w-2 rounded-full ${past ? "bg-slate-400" : "bg-sky-500"}`} />{past ? "Đã qua" : "Sắp tới"}</span></div>
                        <h2 className="mt-5 truncate text-2xl font-extrabold tracking-tight text-slate-950" title={booking.title}>{booking.title}</h2>
                      </section>
                      <section className="grid min-w-0 flex-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
                        <div className="min-w-0 xl:px-7"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#08723d]"><MapPin size={23} /></span><p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Phòng họp</p><p className="mt-1 truncate text-base font-extrabold text-[#08723d]" title={`${room.name} · ${room.floor}`}>{room.name} · {room.floor}</p></div>
                        <div className="min-w-0 xl:border-l xl:border-slate-200 xl:px-7"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"><UsersRound size={23} /></span><p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Thành phần tham dự</p><p className="mt-1 text-base font-extrabold text-slate-950">{booking.attendees} người</p></div>
                        <div className="min-w-0 xl:border-l xl:border-slate-200 xl:px-7"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"><UserRound size={23} /></span><p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Người đặt</p><p className="mt-1 truncate text-base font-extrabold text-slate-950" title={booking.organizer}>{booking.organizer}</p></div>
                        <div className="min-w-0 xl:border-l xl:border-slate-200 xl:px-7"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600"><Mail size={23} /></span><p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Email đã đặt</p><p className="mt-1 truncate text-base font-extrabold text-slate-950" title={booking.email || "Email chưa được lưu"}>{booking.email || "Email chưa được lưu"}</p></div>
                      </section>
                      <div className="xl:border-l xl:border-slate-200 xl:pl-8"><button type="button" onClick={() => cancelBooking(booking)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-5 py-3 text-base font-extrabold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"><Trash2 size={20} />Hủy lịch</button></div>
                    </div>
                  </article>;
                })}
              </div>}
        </div>
        </div>
      </section>
      <Footer />
      </>}

      {formOpen && scheduleOnly && formStep === "otp" && otpAction === "cancel" ? <CancelOtpModal
        otp={otp}
        otpInputRefs={otpInputRefs}
        onClose={closeBookingForm}
        onSubmit={confirmOtp}
        onUpdateOtp={updateOtp}
        onResend={resendOtp}
      /> : null}

      {formOpen && !(scheduleOnly && formStep === "otp" && otpAction === "cancel") ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBookingForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="meeting-form-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.3)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-7">
            <div><div className="flex flex-wrap items-center gap-2.5"><h2 id="meeting-form-title" className="text-xl font-extrabold text-[#0d5c0d] sm:text-2xl">{formStep === "details" ? "Đặt phòng họp mới" : otpAction === "cancel" ? "Xác nhận hủy phòng" : "Xác nhận mã OTP"}</h2>{formStep === "details" ? <span className="rounded-full bg-[#f5c800] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0d5c0d]">{selectedRoom.name}</span> : null}</div><p className="mt-1.5 text-sm text-slate-500">{formStep === "details" ? "Điền thông tin và chọn khung giờ còn trống." : otpAction === "cancel" ? "Nhập mã OTP được gửi đến email đã dùng để đặt phòng." : "Nhập mã gồm 6 chữ số đã được gửi đến email của bạn."}</p></div>
            <button type="button" onClick={closeBookingForm} aria-label="Đóng" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800"><X size={21} /></button>
          </div>
          {formStep === "details" ? <form onSubmit={createBooking} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 [scrollbar-width:none] sm:px-7 sm:py-6 [&::-webkit-scrollbar]:hidden">
            <Field label="Tiêu đề cuộc họp *"><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="VD: Họp giao ban tuần, Báo cáo tiến độ dự án..." className="form-input" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Người chủ trì / Người đặt *"><input required value={organizer} onChange={(event) => { const nextValue = event.target.value; if (!nextValue || NAME_PATTERN.test(nextValue)) setOrganizer(nextValue); }} placeholder="Họ và tên" className="form-input" /></Field>
              <Field label="Email liên hệ *"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@asiafnb.com" className="form-input" /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
              <Field label="Phòng ban"><DepartmentSelect value={department} options={employeeDepartments} isLoading={isDepartmentsLoading} onChange={setDepartment} /></Field>
              <Field label="Số người tham dự"><div className="flex items-center gap-2"><input required type="number" min={1} max={selectedRoom.capacity} value={attendees} onChange={(event) => setAttendees(Math.min(selectedRoom.capacity, Math.max(1, Number(event.target.value) || 1)))} className="form-input min-w-0 flex-1 appearance-textfield [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /><span className="shrink-0 text-[11px] font-normal text-slate-400">/ max {selectedRoom.capacity} người</span></div></Field>
            </div>

            <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-slate-50 p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#159447] shadow-sm"><Clock3 size={14} /></span> Khung giờ họp</p><span className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#08723d] shadow-sm">{start} → {end} ({Math.max((Number(end.slice(0, 2)) * 60 + Number(end.slice(3))) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3))), 0) / 60} giờ)</span></div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-[1.1fr_1fr_1fr]">
                <Field label="Ngày họp"><DatePicker value={date} minValue={todayLocal()} onChange={setDate} /></Field>
                <Field label="Giờ bắt đầu"><select value={start} onChange={(event) => setStart(event.target.value)} className="form-input">{MEETING_TIME_OPTIONS.slice(0, -1).map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                <Field label="Giờ kết thúc"><select value={end} onChange={(event) => setEnd(event.target.value)} className="form-input">{MEETING_TIME_OPTIONS.slice(1).map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{[[30, "30 phút"], [60, "1 giờ"], [90, "1.5 giờ"], [120, "2 giờ"], [180, "3 giờ"]].map(([minutes, label]) => <button key={minutes} type="button" onClick={() => setEnd(addMinutes(start, minutes as number))} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${end === addMinutes(start, minutes as number) ? "border-[#159447] bg-[#159447] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-green-300"}`}>{label}</button>)}</div>
              <p className={`mt-3 rounded-xl border px-3 py-2 text-xs ${selectedTimeAvailable ? "border-emerald-200 bg-emerald-50 text-[#08723d]" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{selectedTimeAvailable ? <>Khung giờ <strong>{start} - {end}</strong> ({formatDate(date)}) đang trống và sẵn sàng đặt.</> : "Khung giờ này đã trùng lịch hoặc chưa hợp lệ. Vui lòng chọn lại."}</p>
            </section>

            {formError ? <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{formError}</p> : null}
          </div>
            <div className="flex shrink-0 justify-end border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="submit" className="rounded-xl bg-[#159447] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0d5c0d]">Xác nhận đặt phòng</button></div>
          </form>
          : <form onSubmit={confirmOtp} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-amber-50/70 px-5 py-5 [scrollbar-width:none] sm:px-7 sm:py-6 [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-4 text-center sm:px-5 sm:py-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#159447] text-white shadow-[0_10px_22px_rgba(21,148,71,0.3)]"><Mail size={29} strokeWidth={2.2} /></span>
                <p className="mt-3 text-sm leading-6 text-slate-600">{otpAction === "cancel" ? "Mã xác nhận hủy phòng đã được gửi đến" : "Mã xác nhận đã được gửi đến"}</p>
                <p className="mt-1 break-all text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{otpEmail || "Email chưa được lưu"}</p>
                <div className="mt-5 grid w-full gap-4 text-left sm:grid-cols-2 sm:gap-5">
                  <div className="flex items-start gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"><MapPin size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Phòng họp</p><p className="mt-0.5 text-base font-extrabold text-[#08723d]">{otpRoom.name}</p></div></div>
                  <div className="flex items-start gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm"><CalendarDays size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Ngày &amp; giờ đặt phòng</p><p className="mt-0.5 text-base font-extrabold leading-snug text-slate-800">{formatDate(otpDate)} {otpStart} – {otpEnd}</p></div></div>
                </div>
              </div>
              <div className="mx-auto flex max-w-md justify-center gap-2 sm:gap-2.5" aria-label="Mã OTP gồm 6 chữ số">
                {otp.map((digit, index) => <input key={index} ref={(element) => { otpInputRefs.current[index] = element; }} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !otp[index] && index > 0) otpInputRefs.current[index - 1]?.focus(); }} onPaste={(event) => { event.preventDefault(); updateOtp(index, event.clipboardData.getData("text")); }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`Chữ số OTP ${index + 1}`} className="h-12 w-10 rounded-xl border border-slate-200 bg-white text-center text-lg font-bold text-slate-800 shadow-sm outline-none transition focus:-translate-y-0.5 focus:border-[#159447] focus:ring-4 focus:ring-emerald-100 sm:h-14 sm:w-12 sm:text-xl" />)}
              </div>
              {formError ? <p role="alert" className="mx-auto max-w-md rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-center text-sm text-rose-700">{formError}</p> : null}
              <p className="text-center text-base text-slate-600">Không nhận được mã? <button type="button" onClick={resendOtp} className="font-extrabold text-[#159447] underline decoration-emerald-300 decoration-2 underline-offset-4 hover:text-[#0d5c0d]">Gửi lại mã</button></p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="button" onClick={() => { if (otpAction === "cancel") closeBookingForm(); else { setFormStep("details"); setFormError(""); } }} className="rounded-xl bg-slate-50 px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-[#08723d]">Quay lại</button><button type="submit" disabled={otp.join("").length !== 6} className="inline-flex items-center gap-2 rounded-xl bg-[#159447] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(21,148,71,0.24)] transition-colors hover:bg-[#0d5c0d] disabled:cursor-not-allowed disabled:bg-emerald-200"><CheckCircle2 size={18} />{otpAction === "cancel" ? "Xác nhận hủy phòng" : "Xác nhận mã OTP"}</button></div>
          </form>}
        </section>
      </div> : null}
    </main>
  );
}

function BookedScheduleDashboard({
  bookings,
  allBookings,
  roomFilter,
  departmentFilter,
  search,
  departments,
  onRoomFilterChange,
  onDepartmentFilterChange,
  onSearchChange,
  onCancel,
}: {
  bookings: Booking[];
  allBookings: Booking[];
  roomFilter: RoomId | "all";
  departmentFilter: string;
  search: string;
  departments: string[];
  onRoomFilterChange: (value: RoomId | "all") => void;
  onDepartmentFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onCancel: (booking: Booking) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [tableScope, setTableScope] = useState<"active" | "history">("active");
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printScope, setPrintScope] = useState<PrintScope>("today");
  const [printOrientation, setPrintOrientation] = useState<PrintOrientation>("portrait");
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState(today);
  const [detailView, setDetailView] = useState<"list" | "detail" | "closed">("list");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [year, month] = today.split("-").map(Number);
  const startOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const isEnded = (booking: Booking) => booking.date < today || (booking.date === today && booking.end <= currentTime);
  const activeBookings = bookings.filter((booking) => !isEnded(booking));
  const historyBookings = bookings.filter(isEnded);
  const selectedDateBookings = activeBookings.filter((booking) => booking.date === selectedDate).sort((first, second) => first.start.localeCompare(second.start));
  const selectedBooking = selectedDateBookings.find((booking) => booking.id === selectedBookingId) ?? selectedDateBookings[0];
  const monthName = `Tháng ${month}, ${year}`;
  const weekdays = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];
  const calendarDays = Array.from({ length: 42 }, (_, index) => index - startOffset + 1);
  const statusFor = (booking: Booking) => isEnded(booking) ? "Đã kết thúc" : booking.date === today && booking.start <= currentTime ? "Đang họp" : "Sắp tới";
  const statusStyle = (status: string) => status === "Đang họp" ? "bg-emerald-100 text-emerald-600" : status === "Đã kết thúc" ? "bg-slate-100 text-slate-500" : "bg-sky-100 text-sky-600";
  const tableBookings = tableScope === "history" ? historyBookings : activeBookings;
  const printDate = todayLocal();
  const printBookings = sortBookingsByStart(printScope === "today" ? allBookings.filter((booking) => booking.date === printDate) : allBookings.filter((booking) => booking.date >= printDate));

  return <div className="meeting-booked-schedule min-h-screen bg-[#f7faf8] text-slate-800">
    <div className="mx-auto max-w-[1220px] px-5 py-4 pb-7">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="transition hover:text-[#1a7a1a]">Trang chủ</Link><ChevronRight size={16} />
        <Link href="/about-wana#resources" className="transition hover:text-[#1a7a1a]">Công cụ &amp; Tài nguyên</Link><ChevronRight size={16} />
        <Link href="/meeting" className="font-semibold text-slate-700 transition hover:text-[#1a7a1a]">Đặt phòng họp</Link><ChevronRight size={16} />
        <span className="font-bold text-[#0d5c0d]">Xem lịch phòng họp</span>
      </nav>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#159447]"><CalendarDays size={21} /></span><div><h1 className="text-[22px] font-extrabold leading-6 tracking-tight text-[#0d5c0d]">Xem lịch đã đặt</h1><p className="mt-0.5 text-[11px] text-slate-500">Theo dõi, tìm kiếm và quản lý lịch đặt phòng họp</p></div></div>
        <button type="button" onClick={() => { setPrintScope("today"); setPrintOrientation("portrait"); setPrintPreviewOpen(true); }} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#159447] bg-white px-3 text-[11px] font-semibold text-[#08723d] shadow-sm hover:bg-emerald-50"><Printer size={14} />In lịch hôm nay</button>
      </section>

      {viewMode === "table" ? <section className="mt-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-[0_8px_22px_rgba(15,118,65,0.07)]">
        <div className="grid gap-3 md:grid-cols-[1.25fr_1fr_1fr_auto] md:items-end">
          <DashboardFilter label="Tìm kiếm"><span className="flex h-8 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 px-2.5 text-emerald-700"><Search size={14} /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm kiếm tên người đặt" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-400" /></span></DashboardFilter>
          <DashboardFilter label="Phòng họp"><select value={roomFilter} onChange={(event) => onRoomFilterChange(event.target.value as RoomId | "all")} className="h-8 w-full rounded-lg border border-emerald-100 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none"><option value="all">Tất cả phòng họp</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></DashboardFilter>
          <DashboardFilter label="Phòng ban"><select value={departmentFilter} onChange={(event) => onDepartmentFilterChange(event.target.value)} className="h-8 w-full rounded-lg border border-emerald-100 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none"><option value="all">Tất cả phòng ban</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></DashboardFilter>
          <button type="button" onClick={() => { onSearchChange(""); onRoomFilterChange("all"); onDepartmentFilterChange("all"); }} className="mb-0.5 inline-flex h-8 items-center justify-center gap-2 rounded-lg px-2 text-[11px] font-semibold text-[#08723d] hover:bg-emerald-50"><RotateCcw size={14} />Đặt lại</button>
        </div>
      </section> : null}

      <section className="mt-3 flex flex-wrap items-center gap-3">
        <Metric icon={<CalendarDays size={20} />} label="Lịch đang hoạt động" value={activeBookings.length} active={tableScope === "active"} onClick={() => { setTableScope("active"); setViewMode("table"); }} />
        <Metric icon={<List size={20} />} label="Lịch sử đã đặt phòng" value={historyBookings.length} active={tableScope === "history"} onClick={() => { setTableScope("history"); setViewMode("table"); }} />
        <div className="ml-auto inline-flex overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm"><button type="button" onClick={() => setViewMode("calendar")} className={`inline-flex h-8 items-center gap-2 px-3 text-[11px] font-semibold ${viewMode === "calendar" ? "bg-[#159447] text-white" : "text-slate-600 hover:bg-emerald-50"}`}><CalendarDays size={13} />Xem theo lịch</button><button type="button" onClick={() => { setTableScope("active"); setViewMode("table"); }} className={`inline-flex h-8 items-center gap-2 px-3 text-[11px] font-semibold ${viewMode === "table" && tableScope === "active" ? "bg-[#159447] text-white" : "text-slate-600 hover:bg-emerald-50"}`}><List size={13} />Xem theo bảng</button></div>
      </section>

      {viewMode === "calendar" ? <section className="mt-3 grid min-h-[calc(100vh-286px)] items-stretch gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(330px,0.75fr)]">
        <article className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_8px_22px_rgba(15,118,65,0.07)]">
          <div className="flex items-center gap-4"><button type="button" aria-label="Tháng trước" className="rounded-lg p-1 text-[#08723d] hover:bg-emerald-50"><ChevronLeft size={17} /></button><h2 className="text-base font-extrabold text-[#0d5c0d]">{monthName}</h2><button type="button" aria-label="Tháng sau" className="rounded-lg p-1 text-[#08723d] hover:bg-emerald-50"><ChevronRight size={17} /></button></div>
          <div className="mt-3 grid flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] text-center">{weekdays.map((day) => <p key={day} className="pb-2 text-[10px] font-bold text-[#7182a1]">{day}</p>)}{calendarDays.map((day, index) => {
            const isCurrentMonth = day > 0 && day <= daysInMonth;
            const dateValue = isCurrentMonth ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
            const dayBookings = dateValue ? activeBookings.filter((booking) => booking.date === dateValue) : [];
            const selected = dateValue === selectedDate;
            return <button key={index} type="button" disabled={!isCurrentMonth} onClick={() => { setSelectedDate(dateValue); setSelectedBookingId(null); setDetailView("list"); }} className={`relative flex min-h-9 flex-col items-center justify-center border-t border-r border-emerald-50 text-[11px] transition-colors ${isCurrentMonth ? "text-slate-700 hover:bg-emerald-50" : "cursor-default text-slate-300"} ${selected ? "bg-emerald-50" : dayBookings.length ? "bg-lime-50/60" : ""}`}><span className={selected ? "flex h-7 w-7 items-center justify-center rounded-lg bg-[#159447] font-bold text-white shadow-sm" : "font-semibold"}>{isCurrentMonth ? day : ""}</span>{dayBookings.length ? <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${selected ? "bg-[#f5c800]" : "bg-[#159447]"}`} /> : null}</button>;
          })}</div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#159447]" />Có lịch đặt</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#f5c800]" />Đã chọn</span></div>
        </article>

        <article className="meeting-schedule-detail min-h-full rounded-2xl border border-emerald-100 bg-white px-4 py-4 shadow-[0_8px_22px_rgba(15,118,65,0.07)]">
          {detailView === "closed" ? (
            <button type="button" onClick={() => setDetailView("list")} className="flex h-full min-h-52 w-full flex-col items-center justify-center rounded text-center text-[#6f83a3] transition hover:bg-[#f6f9fe] hover:text-[#0869e8]"><CalendarDays size={28} /><span className="mt-3 text-sm font-bold">Xem lịch ngày {formatDate(selectedDate)}</span><span className="mt-1 text-xs">Bấm để mở danh sách cuộc họp</span></button>
          ) : detailView === "list" ? (
            <><div className="flex items-center justify-between border-b border-[#edf1f6] pb-3"><div><h2 className="text-lg font-extrabold text-[#1d315a]">Lịch trong ngày</h2><p className="mt-0.5 text-xs text-[#7487a6]">{formatDate(selectedDate)} · {selectedDateBookings.length} cuộc họp</p></div><button type="button" onClick={() => setDetailView("closed")} aria-label="Đóng danh sách lịch" className="text-[#48668f] hover:text-[#1d315a]"><X size={18} /></button></div>{selectedDateBookings.length ? <div className="mt-3 max-h-[calc(100vh-410px)] space-y-2 overflow-y-auto pr-1">{selectedDateBookings.map((booking) => <button key={booking.id} type="button" onClick={() => { setSelectedBookingId(booking.id); setDetailView("detail"); }} className="w-full rounded-lg border border-[#e2eaf5] bg-white px-3 py-3 text-left transition hover:border-[#76aaf5] hover:bg-blue-50"><div className="flex items-center justify-between gap-2"><span className="text-sm font-extrabold text-[#1d315a]">{booking.start} - {booking.end}</span><span className={`rounded px-2 py-1 text-[10px] font-bold ${statusStyle(statusFor(booking))}`}>{statusFor(booking)}</span></div><p className="mt-2 truncate text-sm font-bold text-[#34527e]">{booking.title}</p><p className="mt-1 text-xs text-[#7587a4]">{booking.displayRoom ?? rooms.find((room) => room.id === booking.roomId)?.name} · {booking.attendees} người</p></button>)}</div> : <div className="flex h-48 items-center justify-center text-sm text-[#7a8ba6]">Không có lịch họp trong ngày này.</div>}</>
          ) : (
            <><div className="flex items-center justify-between border-b border-[#edf1f6] pb-3"><div className="flex items-center gap-2"><button type="button" onClick={() => setDetailView("list")} aria-label="Quay lại danh sách lịch" className="inline-flex h-7 w-7 items-center justify-center rounded text-[#48668f] hover:bg-slate-100"><ArrowLeft size={18} /></button><h2 className="text-lg font-extrabold text-[#1d315a]">Chi tiết lịch đặt</h2></div><button type="button" onClick={() => setDetailView("closed")} aria-label="Đóng chi tiết lịch" className="text-[#48668f] hover:text-[#1d315a]"><X size={18} /></button></div>{selectedBooking ? <><dl className="mt-1 divide-y divide-[#edf1f6] text-sm">{[["Tên tiêu đề", selectedBooking.title], ["Tên người đặt", selectedBooking.organizer], ["Phòng ban", selectedBooking.department], ["Ngày và giờ", <span key="date" className="leading-5">{formatDate(selectedBooking.date)}<br />{selectedBooking.start} - {selectedBooking.end}</span>], ["Email", selectedBooking.email ?? "—"], ["Phòng họp", selectedBooking.displayRoom ?? rooms.find((room) => room.id === selectedBooking.roomId)?.name ?? "—"], ["Bao nhiêu người", `${selectedBooking.attendees} người`], ["Trạng thái", <span key="status" className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-600">{statusFor(selectedBooking)}</span>]].map(([label, value]) => <div key={String(label)} className="grid grid-cols-[124px_1fr] gap-3 py-3"><dt className="text-[#7a8ba6]">{label}</dt><dd className="font-semibold text-[#38517b]">{value}</dd></div>)}</dl><div className="flex justify-center border-t border-emerald-100 pt-4"><button type="button" onClick={() => onCancel(selectedBooking)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"><Trash2 size={17} />Hủy lịch</button></div></> : <div className="flex h-48 items-center justify-center text-sm text-[#7a8ba6]">Không có lịch phù hợp.</div>}</>
          )}</article>
      </section> : null}

      {viewMode === "table" ? <section className="meeting-schedule-table mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-[0_8px_22px_rgba(15,118,65,0.07)]"><div className="flex items-center justify-between pb-2"><h2 className="text-sm font-extrabold text-[#1d315a]">{tableScope === "history" ? "Lịch sử đặt phòng" : "Danh sách lịch đặt"}</h2>{tableScope === "history" ? <button type="button" onClick={() => setTableScope("active")} className="text-[10px] font-bold text-[#0869e8] hover:underline">Xem lịch đang hoạt động</button> : null}</div><div className="overflow-x-auto"><table className="w-full min-w-[920px] border-collapse text-center text-[10px]"><thead className="bg-[#f3f7fc] text-[#3d527a]"><tr>{["Tiêu đề", "Người đặt", "Phòng ban", "Ngày & giờ", "Email", "Phòng họp", "Số người", "Trạng thái", "Thao tác"].map((heading) => <th key={heading} className="border border-[#e0e9f4] px-3 py-1.5 font-bold">{heading}</th>)}</tr></thead><tbody>{tableBookings.length ? tableBookings.map((booking) => { const status = statusFor(booking); return <tr key={booking.id} className="text-[#36517c]"><td className="border border-[#e8eef6] px-3 py-1.5 font-bold text-[#253d67]">{booking.title}</td><td className="border border-[#e8eef6] px-3 py-1.5">{booking.organizer}</td><td className="border border-[#e8eef6] px-3 py-1.5">{booking.department}</td><td className="border border-[#e8eef6] px-3 py-1.5 leading-3.5">{formatDate(booking.date)}<br />{booking.start} - {booking.end}</td><td className="border border-[#e8eef6] px-3 py-1.5">{booking.email}</td><td className="border border-[#e8eef6] px-3 py-1.5">{booking.displayRoom ?? rooms.find((room) => room.id === booking.roomId)?.name}</td><td className="border border-[#e8eef6] px-3 py-1.5">{booking.attendees}</td><td className="border border-[#e8eef6] px-3 py-1.5"><span className={`inline-flex rounded px-2 py-1 font-bold ${statusStyle(status)}`}>{status}</span></td><td className="border border-[#e8eef6] px-3 py-1.5">{tableScope === "active" ? <button type="button" onClick={() => onCancel(booking)} className="rounded border border-[#ff8490] px-3 py-1 text-[9px] font-bold text-[#f04754] hover:bg-rose-50">Hủy lịch</button> : <span className="text-[#91a0b6]">—</span>}</td></tr>; }) : <tr><td colSpan={9} className="border border-[#e8eef6] px-3 py-10 text-center text-sm text-[#7a8ba6]">{tableScope === "history" ? "Chưa có lịch sử cuộc họp." : "Không có lịch họp đang hoạt động."}</td></tr>}</tbody></table></div></section> : null}
    </div>
    {printPreviewOpen ? <PrintPreviewModal bookings={printBookings} scope={printScope} orientation={printOrientation} onScopeChange={setPrintScope} onOrientationChange={setPrintOrientation} onClose={() => setPrintPreviewOpen(false)} onPrint={() => printBookingTable(printBookings, printScope, printOrientation)} /> : null}
  </div>;
}

function PrintPreviewModal({ bookings, scope, orientation, onScopeChange, onOrientationChange, onClose, onPrint }: { bookings: Booking[]; scope: PrintScope; orientation: PrintOrientation; onScopeChange: (scope: PrintScope) => void; onOrientationChange: (orientation: PrintOrientation) => void; onClose: () => void; onPrint: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="print-preview-title" className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.3)]">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-7">
        <div><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#159447] text-white shadow-sm"><Printer size={19} /></span><h2 id="print-preview-title" className="text-xl font-extrabold text-[#0d5c0d] sm:text-2xl">Xem trước bản in</h2></div><p className="mt-1.5 text-sm text-slate-500">Kiểm tra danh sách cuộc họp trước khi in.</p></div>
        <button type="button" onClick={onClose} aria-label="Đóng xem trước bản in" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800"><X size={21} /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-emerald-200 bg-white p-1 shadow-sm" aria-label="Phạm vi in">
              <button type="button" aria-pressed={scope === "today"} onClick={() => onScopeChange("today")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${scope === "today" ? "bg-[#159447] text-white" : "text-slate-600 hover:bg-emerald-50 hover:text-[#08723d]"}`}>Lịch hôm nay</button>
              <button type="button" aria-pressed={scope === "all"} onClick={() => onScopeChange("all")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${scope === "all" ? "bg-[#159447] text-white" : "text-slate-600 hover:bg-emerald-50 hover:text-[#08723d]"}`}>Toàn bộ lịch</button>
            </div>
            <div className="inline-flex rounded-xl border border-emerald-200 bg-white p-1 shadow-sm" aria-label="Hướng giấy">
              <button type="button" aria-pressed={orientation === "portrait"} onClick={() => onOrientationChange("portrait")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${orientation === "portrait" ? "bg-[#159447] text-white" : "text-slate-600 hover:bg-emerald-50 hover:text-[#08723d]"}`}>Dọc</button>
              <button type="button" aria-pressed={orientation === "landscape"} onClick={() => onOrientationChange("landscape")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${orientation === "landscape" ? "bg-[#159447] text-white" : "text-slate-600 hover:bg-emerald-50 hover:text-[#08723d]"}`}>Ngang</button>
            </div>
          </div>
          <p className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#08723d] shadow-sm">{bookings.length} cuộc họp</p>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-[#b8cbd2]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-center text-[10px] text-[#263a4f]">
              <thead><tr className="bg-gradient-to-b from-[#14775e] to-[#075b47] text-white">{["#", "Tiêu đề", "Người đặt", "Phòng ban", "Ngày & giờ", "Email", "Phòng họp", "Số người"].map((heading, index) => <th key={heading} className={`h-9 border-b border-r border-white/30 px-2 py-2 text-center font-extrabold last:border-r-0 ${index === 0 ? "w-[4%]" : index === 1 ? "w-[16%]" : index === 2 ? "w-[15%]" : index === 3 ? "w-[12%]" : index === 4 ? "w-[13%]" : index === 5 ? "w-[16%]" : index === 6 ? "w-[17%]" : "w-[7%]"}`}>{heading}</th>)}</tr></thead>
              <tbody>{bookings.length ? bookings.map((booking, index) => <tr key={booking.id} className="even:bg-[#f5f8f7]"><td className="h-11 border-b border-r border-[#c6d3d9] px-2 py-2 text-center">{index + 1}</td><td className="border-b border-r border-[#c6d3d9] px-2 py-2 font-medium">{booking.title}</td><td className="border-b border-r border-[#c6d3d9] px-2 py-2">{booking.organizer}</td><td className="border-b border-r border-[#c6d3d9] px-2 py-2">{booking.department}</td><td className="border-b border-r border-[#c6d3d9] px-2 py-2 leading-4">{formatDate(booking.date)},<br />{booking.start} - {booking.end}</td><td className="border-b border-r border-[#c6d3d9] px-2 py-2">{booking.email || "—"}</td><td className="border-b border-r border-[#c6d3d9] px-2 py-2">{bookingRoomLabel(booking)}</td><td className="border-b border-[#c6d3d9] px-2 py-2 text-center">{booking.attendees}</td></tr>) : <tr><td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500">Không có lịch họp nào trong phạm vi đã chọn.</td></tr>}</tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100">Hủy</button><button type="button" onClick={onPrint} disabled={!bookings.length} className="inline-flex items-center gap-2 rounded-xl bg-[#159447] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(21,148,71,0.24)] transition hover:bg-[#0d5c0d] disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:shadow-none"><Printer size={17} />In</button></footer>
    </section>
  </div>;
}

function DashboardFilter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-bold text-[#40577e]">{label}</span>{children}</label>;
}

function Metric({ icon, label, value, active = false, onClick }: { icon: React.ReactNode; label: string; value: number; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={`flex h-[64px] min-w-[230px] items-center gap-3 rounded-2xl border bg-white px-4 text-left shadow-[0_8px_22px_rgba(15,118,65,0.07)] transition hover:-translate-y-0.5 hover:border-emerald-300 ${active ? "border-[#159447]" : "border-emerald-100"}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-emerald-100 text-[#159447]" : "bg-lime-50 text-[#08723d]"}`}>{icon}</span><span><span className="block text-[11px] font-semibold text-[#08723d]">{label}</span><span className="block text-[24px] font-extrabold leading-5 text-[#0d5c0d]">{value}</span></span></button>;
}

function CancelOtpModal({ otp, otpInputRefs, onClose, onSubmit, onUpdateOtp, onResend }: { otp: string[]; otpInputRefs: { current: Array<HTMLInputElement | null> }; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onUpdateOtp: (index: number, value: string) => void; onResend: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_60px_rgba(13,92,13,0.2)]">
      <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
        <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50"><Trash2 size={18} className="text-rose-500" /></span><h2 id="cancel-title" className="text-lg font-extrabold text-[#0d5c0d]">Xác nhận hủy lịch</h2></div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-emerald-50 hover:text-[#0d5c0d]"><X size={18} /></button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/40 px-5 pb-5 pt-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-[#159447] shadow-sm"><Inbox size={30} /></span>
          <p className="mx-auto mt-4 max-w-[255px] text-sm font-medium leading-5 text-slate-600">Mã OTP đã được gửi đến email người đặt để xác nhận hủy lịch.</p>
          <p className="mt-5 text-left text-xs font-bold text-slate-700">Nhập mã OTP</p>
          <div className="mt-2 flex justify-center gap-2">{otp.map((digit, index) => <input key={index} ref={(element) => { otpInputRefs.current[index] = element; }} value={digit} onChange={(event) => onUpdateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !otp[index] && index > 0) otpInputRefs.current[index - 1]?.focus(); }} onPaste={(event) => { event.preventDefault(); onUpdateOtp(index, event.clipboardData.getData("text")); }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`Chữ số OTP ${index + 1}`} className="h-11 w-10 rounded-lg border border-emerald-200 bg-white text-center text-base font-bold text-[#173f24] outline-none transition focus:border-[#159447] focus:ring-4 focus:ring-emerald-100" />)}</div>
          <p className="mt-4 text-xs text-slate-400">Không nhận được mã? <button type="button" onClick={onResend} className="font-bold text-[#159447] hover:text-[#0d5c0d]">Gửi lại sau 58 giây</button></p>
        </div>
        <div className="flex gap-3 border-t border-emerald-100 bg-white px-5 py-4"><button type="button" onClick={onClose} className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-[#08723d]">Đóng</button><button type="submit" disabled={otp.join("").length !== 6} className="h-10 flex-1 rounded-xl bg-[#159447] text-sm font-bold text-white shadow-[0_8px_18px_rgba(21,148,71,0.22)] transition hover:bg-[#0d5c0d] disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:shadow-none">Xác nhận hủy</button></div>
      </form>
    </section>
  </div>;
}

function StatCard({ label, value, unit, description, green = false }: { label: string; value: number; unit: string; description: string; green?: boolean }) {
  const tone = green ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-sky-100 bg-gradient-to-br from-sky-50/80 to-white";
  const iconTone = green ? "bg-[#159447] text-white" : "bg-sky-100 text-sky-700";
  return <div className={`relative flex min-h-[116px] flex-col items-center justify-center overflow-hidden rounded-xl border px-4 py-3 text-center shadow-sm ${tone}`}><span aria-hidden="true" className={`absolute -right-5 -top-8 h-20 w-20 rounded-full ${green ? "bg-emerald-200/50" : "bg-sky-100/70"}`} /><span className={`relative flex h-7 w-7 items-center justify-center rounded-full ${iconTone}`}><CalendarDays size={15} /></span><p className="relative mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`relative mt-1 text-2xl font-extrabold ${green ? "text-[#159447]" : "text-slate-900"}`}>{value} <span className="text-xs font-semibold text-slate-500">{unit}</span></p><p className="relative mt-0.5 text-[11px] text-slate-500">{description}</p></div>;
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
