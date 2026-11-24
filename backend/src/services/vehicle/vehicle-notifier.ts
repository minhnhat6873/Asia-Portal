import type { StoredVehicleBooking } from "../../interfaces/vehicle-booking.interface";
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
const summary = (trip: StoredVehicleBooking) =>
  shorten(`${PURPOSE_LABEL[trip.purpose]} · ${trip.customerName} · ${formatVietnamTime(trip.departAt)} · ${trip.pickup} → ${trip.destination}`, 480);

/** Notifications never block the action that caused them; failures are only logged. */
async function safely(label: string, work: () => Promise<void>): Promise<void> {
  try { await work(); } catch (error) { console.error(`Không thể gửi thông báo đặt xe (${label}).`, error); }
}

const REQUESTER_LINK = "/account/trips";
const hrLink = (trip: StoredVehicleBooking) => `/admin/vehicles?id=${String(trip._id)}`;

export const vehicleNotifier = {
  toRequester(trip: StoredVehicleBooking, type: Extract<NotificationType, "vehicle-arranged" | "vehicle-updated" | "vehicle-completed" | "vehicle-cancelled" | "vehicle-reminder">) {
    return safely(type, async () => {
      const titles = {
        "vehicle-arranged": `Đã sắp xếp xe: ${trip.vehicleType ? TYPE_LABEL[trip.vehicleType] : ""}`,
        "vehicle-updated": "HR đã cập nhật chuyến xe của bạn",
        "vehicle-completed": "Chuyến xe đã hoàn thành",
        "vehicle-cancelled": "Chuyến xe đã bị hủy",
        "vehicle-reminder": "Chuyến xe khởi hành sau 15 phút",
      } as const;
      const message = type === "vehicle-cancelled" && trip.cancel?.reason ? shorten(`Lý do: ${trip.cancel.reason} · ${summary(trip)}`, 480) : summary(trip);
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

  /** Email to the requester 15 minutes before departure. */
  emailRequesterReminder(trip: StoredVehicleBooking) {
    return safely("email nhắc người đặt", async () => {
      await emailService.sendNotice(trip.requester.email, {
        subject: `Nhắc chuyến xe lúc ${formatVietnamTime(trip.departAt)}`,
        heading: "Chuyến xe sắp khởi hành",
        greeting: `Xin chào ${trip.requester.name},`,
        rows: [
          ["Mục đích", PURPOSE_LABEL[trip.purpose]],
          ...(trip.purpose === "delivery"
            ? [["Người gửi", `${trip.senderName} · ${trip.senderPhone}`], ["Người nhận", `${trip.receiverName} · ${trip.receiverPhone}`], ["Hàng hóa", trip.goodsDescription ?? ""]] as [string, string][]
            : [["Khách hàng", trip.customerName]] as [string, string][]),
          ["Giờ đi", formatVietnamTime(trip.departAt)],
          ["Điểm đón", trip.pickup],
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
