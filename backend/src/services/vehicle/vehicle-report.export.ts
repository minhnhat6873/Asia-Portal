import ExcelJS from "exceljs";

import type { hrVehicleService } from "./vehicle-booking.service";
import { formatVietnamTime } from "./vehicle-notifier";

type Report = Awaited<ReturnType<typeof hrVehicleService.report>>;

const PURPOSE = { guest: "Đón/đưa khách", delivery: "Giao/nhận hàng" } as Record<string, string>;
const TYPE = { company: "Xe công ty", external: "Xe ngoài (Grab)" } as Record<string, string>;
const STATUS = { pending: "Chờ xử lý", arranged: "Đã sắp xếp xe", arrived: "Đã đi xong, chờ chốt", completed: "Hoàn thành", cancelled: "Đã hủy" } as Record<string, string>;
const MONEY = "#,##0";

/** Monthly vehicle cost report: a summary sheet and the list of trips. */
export async function buildVehicleReportWorkbook(report: Report): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Asia Portal";

  const summary = workbook.addWorksheet("Tổng kết");
  summary.columns = [{ width: 36 }, { width: 14 }, { width: 18 }];
  summary.addRow([`Chi phí xe tháng ${report.month.split("-").reverse().join("/")}`]).font = { bold: true, size: 14 };
  summary.addRow([]);
  const totals: [string, number][] = [
    ["Tổng số chuyến", report.totals.trips],
    ["Đã hoàn thành", report.totals.completed],
    ["Xe công ty (hoàn thành)", report.totals.companyTrips],
    ["Xe ngoài (hoàn thành)", report.totals.externalTrips],
    ["Đã hủy", report.totals.cancelled],
    ["Chưa chốt (chưa tính tiền)", report.totals.notClosed],
  ];
  totals.forEach((row) => summary.addRow(row));
  const costRow = summary.addRow(["Tổng tiền xe ngoài (VND)", report.totals.externalCost]);
  costRow.font = { bold: true };
  costRow.getCell(2).numFmt = MONEY;

  for (const [title, rows, label] of [
    ["Theo phòng ban", report.byDepartment, (name: string) => name],
    ["Theo mục đích", report.byPurpose, (name: string) => PURPOSE[name] ?? name],
  ] as const) {
    summary.addRow([]);
    summary.addRow([title, "Số chuyến", "Tiền (VND)"]).font = { bold: true };
    for (const row of rows) summary.addRow([label(row.name), row.trips, row.cost]).getCell(3).numFmt = MONEY;
  }

  const sheet = workbook.addWorksheet("Danh sách chuyến");
  sheet.columns = [
    { header: "Giờ đi", width: 18 }, { header: "Người đặt", width: 24 }, { header: "Phòng ban", width: 22 }, { header: "Đặt giúp cho", width: 26 },
    { header: "Mục đích", width: 16 }, { header: "Khách hàng / Gửi → Nhận", width: 30 }, { header: "Liên hệ", width: 26 }, { header: "Hàng hóa / khối lượng", width: 28 }, { header: "Điểm đón", width: 30 },
    { header: "Điểm đến", width: 30 }, { header: "Khứ hồi", width: 9 }, { header: "Loại xe", width: 16 },
    { header: "Giá dự kiến", width: 14 }, { header: "Giá thật", width: 14 }, { header: "Hoàn thành thật", width: 18 }, { header: "Trạng thái", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const trip of report.trips) {
    const row = sheet.addRow([
      formatVietnamTime(new Date(trip.departAt)), trip.requester.name, trip.requester.department,
      trip.forOther ? `${trip.forOtherName} · ${trip.forOtherPhone}` : "", PURPOSE[trip.purpose],
      trip.customerName, trip.purpose === "delivery" ? `${trip.senderPhone} → ${trip.receiverPhone}` : trip.customerPhone,
      trip.purpose === "delivery" ? [trip.goodsDescription, trip.goodsQuantity].filter(Boolean).join(" · ") : "", trip.pickup, [trip.destination, ...(trip.extraDestinations ?? [])].join(" → "), trip.roundTrip ? "Có" : "", trip.vehicleType ? TYPE[trip.vehicleType] : "",
      trip.estimatedCost ?? "", trip.actualCost ?? "", trip.actualEndAt ? formatVietnamTime(new Date(trip.actualEndAt)) : "", STATUS[trip.status],
    ]);
    row.getCell(13).numFmt = MONEY;
    row.getCell(14).numFmt = MONEY;
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
