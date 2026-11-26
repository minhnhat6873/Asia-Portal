import type { StoredVehicleBooking, VehicleChange } from "../../interfaces/vehicle-booking.interface";
import type { NotificationType } from "../../interfaces/notification.interface";
import { notificationRepository } from "../../repositories/user/notification.repository";
import { vehicleBookingRepository } from "../../repositories/vehicle-booking.repository";
import { emailService } from "../notification/email.service";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { notificationPresence } from "../../utils/notification/notificationEvents";

const PURPOSE_LABEL = { guest: "Đón/đưa khách", delivery: "Giao/nhận hàng" } as const;
const TYPE_LABEL = { company: "Xe công ty", external: "Xe ngoài (Grab)" } as const;

export function formatVietnamTime(value: Date | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const forOtherText = (trip: StoredVehicleBooking) => (trip.forOther && trip.forOtherName ? `đặt giúp ${trip.forOtherName} · ` : "");
const summary = (trip: StoredVehicleBooking) =>
  shorten(`${PURPOSE_LABEL[trip.purpose]} · ${forOtherText(trip)}${trip.customerName} · ${formatVietnamTime(trip.departAt)} · ${trip.pickup} → ${trip.destination}`, 480);

/** Notifications never block the action that caused them; failures are only logged. */
async function safely(label: string, work: () => Promise<void>): Promise<void> {
  try { await work(); } catch (error) { console.error(`Không thể gửi thông báo đặt xe (${label}).`, error); }
}

const REQUESTER_LINK = "/user/account/trips";
// A change with no items is only a note from HR (nothing in the request was changed).
const changeText = (change: VehicleChange) => (change.items.length
  ? `${change.items.map((item) => `${item.label}: ${item.from} → ${item.to}`).join("; ")} · Lý do: ${change.reason}`
  : `Lời nhắn của HR: ${change.reason}`);
const hrLink = (trip: StoredVehicleBooking) => `/admin/vehicles?id=${String(trip._id)}`;

/** The request as HR needs it in an email. */
const hrRequestRows = (trip: StoredVehicleBooking): [string, string][] => [
  ["Người đặt", `${trip.requester.name} (${trip.requester.department || "—"})`],
  ...(trip.forOther ? [["Đặt giúp cho", `${trip.forOtherName} · ${trip.forOtherPhone}`]] as [string, string][] : []),
  ["Mục đích", PURPOSE_LABEL[trip.purpose]],
  ...(trip.purpose === "delivery"
    ? [["Người gửi", `${trip.senderName} · ${trip.senderPhone}`], ["Người nhận", `${trip.receiverName} · ${trip.receiverPhone}`], ["Hàng hóa", trip.goodsDescription ?? ""], ["Số lượng / khối lượng", trip.goodsQuantity ?? ""]] as [string, string][]
    : [["Khách hàng", trip.customerName], ["Số người", String(trip.passengerCount ?? "")]] as [string, string][]),
  ["Giờ đi", formatVietnamTime(trip.departAt)],
  ["Điểm đón", trip.pickup],
  ["Điểm đến", trip.destination],
];

/** One email per manager; a failed address does not stop the others. */
async function emailManagers(accounts: { email: string; name: string }[], notice: { subject: string; heading: string; rows: [string, string][]; footer: string }) {
  for (const account of accounts) {
    try {
      await emailService.sendNotice(account.email, { ...notice, greeting: `Xin chào ${account.name},` });
    } catch (error) {
      console.error(`Không gửi được email đặt xe tới ${account.email}.`, error);
    }
  }
}

/** A deleted or locked requester gets nothing more (no web notice, no email). */
async function requesterReachable(trip: StoredVehicleBooking): Promise<boolean> {
  return Boolean(await adminAccountRepository.findActiveById(trip.requester.accountId));
}

export const vehicleNotifier = {
  /** change: HR changed the time or route; the message then says what and why. */
  toRequester(trip: StoredVehicleBooking, type: Extract<NotificationType, "vehicle-arranged" | "vehicle-updated" | "vehicle-completed" | "vehicle-cancelled" | "vehicle-reminder" | "vehicle-pending-overdue">, change: VehicleChange | null = null) {
    return safely(type, async () => {
      if (!(await requesterReachable(trip))) return;
      const titles = {
        "vehicle-arranged": `Đã sắp xếp xe: ${trip.vehicleType ? TYPE_LABEL[trip.vehicleType] : ""}${change?.items.length ? " (có thay đổi giờ/lộ trình)" : change ? " (có lời nhắn của HR)" : ""}`,
        "vehicle-updated": change?.items.length ? "HR đã đổi giờ/lộ trình chuyến xe của bạn" : change ? "HR gửi lời nhắn về chuyến xe của bạn" : "HR đã cập nhật chuyến xe của bạn",
        "vehicle-completed": "Chuyến xe đã hoàn thành",
        "vehicle-cancelled": "Chuyến xe đã bị hủy",
        "vehicle-reminder": "Chuyến xe khởi hành sau 15 phút",
        "vehicle-pending-overdue": "Yêu cầu đặt xe của bạn chưa được HR xử lý",
      } as const;
      const message = type === "vehicle-pending-overdue" ? shorten(`Đã quá giờ đi mà HR chưa xử lý, vui lòng liên hệ HR. · ${summary(trip)}`, 480)
        : change ? shorten(`${changeText(change)} · ${summary(trip)}`, 480)
        : type === "vehicle-cancelled" && trip.cancel?.reason ? shorten(`Lý do: ${trip.cancel.reason} · ${summary(trip)}`, 480) : summary(trip);
      const data = { type, refId: String(trip._id), link: REQUESTER_LINK, title: titles[type], message };
      // Updates replace the previous one so the latest change shows as unread.
      if (type === "vehicle-updated") await notificationRepository.replaceForAccounts([trip.requester.accountId], data);
      else await notificationRepository.insertForAccounts([trip.requester.accountId], data);
    });
  },

  toHr(trip: StoredVehicleBooking, type: Extract<NotificationType, "vehicle-new" | "vehicle-arrived" | "vehicle-overdue" | "vehicle-pending-overdue" | "vehicle-request-updated" | "vehicle-request-cancelled" | "vehicle-requester-removed">) {
    return safely(type, async () => {
      const titles = {
        "vehicle-new": `Yêu cầu đặt xe mới từ ${trip.requester.name}`,
        "vehicle-arrived": `${trip.requester.name} báo đã đi xong, cần chốt chuyến`,
        "vehicle-overdue": "Chuyến xe quá giờ hoàn thành, chưa chốt",
        "vehicle-pending-overdue": "Yêu cầu đặt xe đã quá giờ đi mà chưa được xử lý",
        "vehicle-request-updated": `${trip.requester.name} đã sửa yêu cầu đặt xe`,
        "vehicle-request-cancelled": `${trip.requester.name} đã hủy yêu cầu đặt xe`,
        "vehicle-requester-removed": `Đã tự hủy chuyến của ${trip.requester.name}: tài khoản người đặt không còn hoạt động`,
      } as const;
      const refId = String(trip._id);
      const accounts = (await vehicleBookingRepository.managerAccounts()).map((account) => account.id);
      const cancelled = type === "vehicle-request-cancelled" || type === "vehicle-requester-removed";
      if (cancelled) {
        // Nothing is left to arrange: earlier "new"/"edited" notices would open a cancelled trip.
        await Promise.all([notificationRepository.removeByRef("vehicle-new", refId), notificationRepository.removeByRef("vehicle-request-updated", refId)]);
      }
      const message = cancelled && trip.cancel?.reason ? shorten(`Lý do: ${trip.cancel.reason} · ${summary(trip)}`, 480) : summary(trip);
      const data = { type, refId, link: hrLink(trip), title: titles[type], message };
      // Repeated edits replace the previous notice so it shows once, as new and unread.
      if (type === "vehicle-request-updated") await notificationRepository.replaceForAccounts(accounts, data);
      else await notificationRepository.insertForAccounts(accounts, data);
    });
  },

  /**
   * Email for a new request, only when no vehicle manager has the admin site open
   * (whoever has it open already got the bell and the chime).
   */
  emailHrNew(trip: StoredVehicleBooking) {
    return safely("email yêu cầu mới", async () => {
      const accounts = await vehicleBookingRepository.managerAccounts();
      if (accounts.some((account) => notificationPresence.isOnline(account.id, "admin"))) return;
      await emailManagers(accounts, {
        subject: `Yêu cầu đặt xe mới - ${trip.requester.name} (${formatVietnamTime(trip.departAt)})`,
        heading: "Có yêu cầu đặt xe mới",
        rows: hrRequestRows(trip),
        footer: "Vui lòng vào trang quản trị > Quản lý đặt xe để sắp xếp xe.",
      });
    });
  },

  /** Email to every vehicle manager (online or not) when a request is still waiting after its departure time. */
  emailHrPendingOverdue(trip: StoredVehicleBooking) {
    return safely("email yêu cầu quá giờ chưa xử lý", async () => {
      await emailManagers(await vehicleBookingRepository.managerAccounts(), {
        subject: `[Quá giờ] Yêu cầu đặt xe chưa được xử lý - ${trip.requester.name}`,
        heading: "Yêu cầu đặt xe đã quá giờ đi 5 phút mà chưa được xử lý",
        rows: hrRequestRows(trip),
        footer: "Vui lòng xử lý ngay (sắp xếp xe hoặc hủy kèm lý do) và liên hệ người đặt.",
      });
    });
  },

  /** Email to the requester when HR changed the time or route, with the reason. */
  emailRequesterChange(trip: StoredVehicleBooking, change: VehicleChange) {
    return safely("email báo thay đổi", async () => {
      if (!(await requesterReachable(trip))) return;
      await emailService.sendNotice(trip.requester.email, {
        subject: change.items.length ? `Chuyến xe của bạn có thay đổi (${formatVietnamTime(trip.departAt)})` : `HR gửi lời nhắn về chuyến xe (${formatVietnamTime(trip.departAt)})`,
        heading: change.items.length ? "HR đã thay đổi chuyến xe của bạn" : "Lời nhắn của HR về chuyến xe",
        greeting: `Xin chào ${trip.requester.name},`,
        rows: [
          ...change.items.map((item) => [item.label, `${item.from} → ${item.to}`] as [string, string]),
          [change.items.length ? "Lý do" : "Lời nhắn", change.reason],
          ["Giờ đi", formatVietnamTime(trip.departAt)],
          ["Người gửi", change.by.name],
          ["Mục đích", PURPOSE_LABEL[trip.purpose]],
          ["Xe", trip.vehicleType ? TYPE_LABEL[trip.vehicleType] : "HR chưa sắp xếp xe"],
          ...(trip.driverName || trip.driverPhone ? [["Tài xế", [trip.driverName, trip.driverPlate, trip.driverPhone].filter(Boolean).join(" · ")] as [string, string]] : []),
        ],
        footer: change.items.length ? "Nếu thời gian hoặc địa điểm mới không phù hợp, vui lòng liên hệ HR sớm." : "Có thắc mắc, vui lòng liên hệ HR.",
      });
    });
  },

  /** Email to the requester 15 minutes before departure. */
  emailRequesterReminder(trip: StoredVehicleBooking) {
    return safely("email nhắc người đặt", async () => {
      if (!(await requesterReachable(trip))) return;
      await emailService.sendNotice(trip.requester.email, {
        subject: `Nhắc chuyến xe lúc ${formatVietnamTime(trip.departAt)}`,
        heading: "Chuyến xe sắp khởi hành",
        greeting: `Xin chào ${trip.requester.name},`,
        rows: [
          ...(trip.forOther ? [["Đặt giúp cho", `${trip.forOtherName} · ${trip.forOtherPhone}`]] as [string, string][] : []),
          ["Mục đích", PURPOSE_LABEL[trip.purpose]],
          ...(trip.purpose === "delivery"
            ? [["Người gửi", `${trip.senderName} · ${trip.senderPhone}`], ["Người nhận", `${trip.receiverName} · ${trip.receiverPhone}`], ["Hàng hóa", trip.goodsDescription ?? ""], ["Số lượng / khối lượng", trip.goodsQuantity ?? ""]] as [string, string][]
            : [["Khách hàng", trip.customerName]] as [string, string][]),
          ["Giờ đi", formatVietnamTime(trip.departAt)],
          ["Điểm đón", trip.pickup],
          ...(trip.pickupLocation?.lat != null ? [["Bản đồ điểm đón", `https://www.google.com/maps?q=${trip.pickupLocation.lat},${trip.pickupLocation.lng}`]] as [string, string][] : []),
          ["Điểm đến", trip.destination],
          ...(trip.extraDestinations ?? []).map((destination, index): [string, string] => [`Điểm đến ${index + 2}`, destination]),
          ["Xe", trip.vehicleType ? TYPE_LABEL[trip.vehicleType] : "HR chưa sắp xếp xe"],
          ...(trip.driverName || trip.driverPhone ? [["Tài xế", [trip.driverName, trip.driverPlate, trip.driverPhone].filter(Boolean).join(" · ")] as [string, string]] : []),
        ],
        footer: "Đi xong, hãy bấm \"Đã đi xong\" trong mục Chuyến xe của tôi để HR chốt chuyến.",
      });
    });
  },

  /** Email to every vehicle manager when a trip stays unclosed 30 minutes after the first reminder. */
  emailHrOverdue(trip: StoredVehicleBooking) {
    return safely("email nhắc HR", async () => {
      await emailManagers(await vehicleBookingRepository.managerAccounts(), {
        subject: `Chuyến xe chưa được chốt - ${trip.customerName}`,
        heading: "Chuyến xe cần chốt",
        rows: [
          ["Người đặt", `${trip.requester.name} (${trip.requester.department || "—"})`],
          ["Mục đích", PURPOSE_LABEL[trip.purpose]],
          ["Khách hàng", trip.customerName],
          ["Giờ đi", formatVietnamTime(trip.departAt)],
          ["Hoàn thành dự kiến", formatVietnamTime(trip.expectedEndAt)],
          ["Xe", trip.vehicleType ? TYPE_LABEL[trip.vehicleType] : "—"],
        ],
        footer: "Vui lòng vào trang quản trị > Quản lý đặt xe để chốt chuyến (xe ngoài cần nhập giá thật).",
      });
    });
  },
};
