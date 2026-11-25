import type { StoredVehicleBooking, VehicleChange } from "../../interfaces/vehicle-booking.interface";
import type { NotificationType } from "../../interfaces/notification.interface";
import { notificationRepository } from "../../repositories/user/notification.repository";
import { vehicleBookingRepository } from "../../repositories/vehicle-booking.repository";
import { emailService } from "../notification/email.service";

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

export const vehicleNotifier = {
  /** change: HR changed the time or route; the message then says what and why. */
  toRequester(trip: StoredVehicleBooking, type: Extract<NotificationType, "vehicle-arranged" | "vehicle-updated" | "vehicle-completed" | "vehicle-cancelled" | "vehicle-reminder">, change: VehicleChange | null = null) {
    return safely(type, async () => {
      const titles = {
        "vehicle-arranged": `Đã sắp xếp xe: ${trip.vehicleType ? TYPE_LABEL[trip.vehicleType] : ""}${change?.items.length ? " (có thay đổi giờ/lộ trình)" : change ? " (có lời nhắn của HR)" : ""}`,
        "vehicle-updated": change?.items.length ? "HR đã đổi giờ/lộ trình chuyến xe của bạn" : change ? "HR gửi lời nhắn về chuyến xe của bạn" : "HR đã cập nhật chuyến xe của bạn",
        "vehicle-completed": "Chuyến xe đã hoàn thành",
        "vehicle-cancelled": "Chuyến xe đã bị hủy",
        "vehicle-reminder": "Chuyến xe khởi hành sau 15 phút",
      } as const;
      const message = change ? shorten(`${changeText(change)} · ${summary(trip)}`, 480)
        : type === "vehicle-cancelled" && trip.cancel?.reason ? shorten(`Lý do: ${trip.cancel.reason} · ${summary(trip)}`, 480) : summary(trip);
      const data = { type, refId: String(trip._id), link: REQUESTER_LINK, title: titles[type], message };
      // Updates replace the previous one so the latest change shows as unread.
      if (type === "vehicle-updated") await notificationRepository.replaceForAccounts([trip.requester.accountId], data);
      else await notificationRepository.insertForAccounts([trip.requester.accountId], data);
    });
  },

  toHr(trip: StoredVehicleBooking, type: Extract<NotificationType, "vehicle-new" | "vehicle-arrived" | "vehicle-overdue">) {
    return safely(type, async () => {
      const titles = {
        "vehicle-new": `Yêu cầu đặt xe mới từ ${trip.requester.name}`,
        "vehicle-arrived": `${trip.requester.name} báo đã đi xong, cần chốt chuyến`,
        "vehicle-overdue": "Chuyến xe quá giờ hoàn thành, chưa chốt",
      } as const;
      const accounts = await vehicleBookingRepository.managerAccounts();
      await notificationRepository.insertForAccounts(accounts.map((account) => account.id), {
        type, refId: String(trip._id), link: hrLink(trip), title: titles[type], message: summary(trip),
      });
    });
  },

  /** Email to the requester when HR changed the time or route, with the reason. */
  emailRequesterChange(trip: StoredVehicleBooking, change: VehicleChange) {
    return safely("email báo thay đổi", async () => {
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
      const accounts = await vehicleBookingRepository.managerAccounts();
      for (const account of accounts) {
        await emailService.sendNotice(account.email, {
          subject: `Chuyến xe chưa được chốt - ${trip.customerName}`,
          heading: "Chuyến xe cần chốt",
          greeting: `Xin chào ${account.name},`,
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
      }
    });
  },
};
