import type { NextFunction, Request, Response } from "express";
import ExcelJS from "exceljs";
import multer from "multer";
import yauzl from "yauzl";

import { createEmployeeSchema } from "../validates/admin/employee.validate";
import { AppError } from "../utils/errors/AppError";

export const uploadEmployeeImport = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } }).single("file");

const headers = ["Mã nhân viên *", "Họ và tên *", "Chức vụ *", "Phòng ban *", "Cấp bậc *", "Giới tính *", "Ngày gia nhập *", "Ngày sinh", "Văn phòng / Địa điểm làm việc *", "Trạng thái làm việc *", "Email công việc *", "Số điện thoại *", "Ảnh đại diện (tên file hoặc URL)", "Mô tả / Tiểu sử công việc"];
const departments: Record<string, string> = {
  "Phòng BOD": "BOD", "Phòng Kinh doanh quốc tế": "INTERNATIONAL_SALES", "Phòng Kinh doanh nội địa": "DOMESTIC_SALES", "Phòng Sales Admin": "SALES_ADMIN", "Phòng Marketing & Truyền thông": "MARKETING_COMMUNICATIONS", "Phòng Thiết kế": "DESIGN", "Phòng Operations Admin": "OPERATIONS_ADMIN", "Phòng Mua hàng / Sourcing": "SOURCING_PURCHASING", "Phòng Logistics / XNK": "LOGISTICS_IMPORT_EXPORT", "Phòng Kho / Inventory": "INVENTORY", "Phòng R&D / Product Development": "PRODUCT_DEVELOPMENT", "Phòng RA / Compliance": "RA_COMPLIANCE", "Phòng Tài chính – Kế toán": "FINANCE_ACCOUNTING", "Phòng Nhân sự & Hành chính": "HR_ADMIN", "Phòng Pháp chế": "LEGAL", "Phòng IT + ERP": "IT_ERP",
};
const ranks: Record<string, string> = { "CEO": "CEO", "Quản lý cấp cao": "Senior Management", "Quản lý cấp trung": "Middle Management", "Nhân sự cấp trung": "Intermediate Personnel", "Chuyên viên/Nhân viên": "Staff" };
const genders: Record<string, string> = { "Nam": "male", "Nữ": "female", "Khác": "other" };
const statuses: Record<string, string> = { "Đang làm việc": "active", "Thử việc": "probation", "Đã nghỉ việc": "inactive" };
const fieldLabels: Record<string, string> = { employeeCode: "Mã nhân viên", name: "Họ và tên", position: "Chức vụ", department: "Phòng ban", rank: "Cấp bậc", gender: "Giới tính", joinDate: "Ngày gia nhập", birthDate: "Ngày sinh", location: "Địa điểm", status: "Trạng thái", email: "Email công việc", phone: "Số điện thoại", description: "Mô tả" };

function checkWorkbookArchive(buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, archive) => {
      if (error || !archive) { reject(new AppError(400, "File Excel không hợp lệ.")); return; }
      let size = 0;
      let count = 0;
      archive.on("error", () => reject(new AppError(400, "File Excel không hợp lệ.")));
      archive.on("end", () => resolve());
      archive.on("entry", (entry) => {
        size += entry.uncompressedSize;
        count += 1;
        if (size > 30 * 1024 * 1024 || count > 200 || (entry.generalPurposeBitFlag & 1)) {
          archive.close();
          reject(new AppError(400, "File Excel quá lớn hoặc được mã hóa; vui lòng dùng file mẫu hợp lệ."));
          return;
        }
        archive.readEntry();
      });
      archive.readEntry();
    });
  });
}

function text(value: ExcelJS.CellValue): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "text" in value && typeof value.text === "string") return value.text.trim();
  if (value && typeof value === "object" && "richText" in value) return value.richText.map((part) => part.text).join("").trim();
  return "";
}

function identifier(cell: ExcelJS.Cell): string | null {
  if (typeof cell.value === "number") {
    if (!Number.isSafeInteger(cell.value) || cell.value < 0) return null;
    const number = String(cell.value);
    const format = cell.numFmt?.trim();
    return format && /^0+$/.test(format) ? number.padStart(format.length, "0") : number;
  }
  if (typeof cell.value === "string" || (cell.value && typeof cell.value === "object" && ("richText" in cell.value || "text" in cell.value))) return text(cell.value);
  return null;
}

function isUnsupportedCell(value: ExcelJS.CellValue): boolean {
  if (!value || typeof value !== "object" || value instanceof Date) return false;
  if ("formula" in value || "sharedFormula" in value) return true;
  return !("text" in value || "richText" in value);
}

function dateValue(value: ExcelJS.CellValue): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = text(value);
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) return raw;
  const result = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${result}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === result ? result : "invalid";
}

export async function validateEmployeeImport(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.file || !request.file.originalname.toLowerCase().endsWith(".xlsx")) throw new AppError(400, "Vui lòng chọn file Excel .xlsx theo mẫu, tối đa 2 MB.");
    await checkWorkbookArchive(request.file.buffer);
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(request.file.buffer as unknown as ExcelJS.Buffer); } catch { throw new AppError(400, "Không thể đọc file Excel. Vui lòng dùng file .xlsx hợp lệ."); }
    const sheet = workbook.getWorksheet("Nhập nhân viên");
    if (!sheet || headers.some((header, index) => text(sheet.getRow(1).getCell(index + 1).value) !== header)) throw new AppError(400, "File không đúng mẫu hoặc tên cột đã bị thay đổi.");
    if (sheet.rowCount > 501 || sheet.columnCount > 14) throw new AppError(400, "File chỉ được có tối đa 500 dòng nhân viên và 14 cột theo mẫu.");
    const rows: unknown[] = [];
    const errors: string[] = [];
    const seen = { employeeCode: new Map<string, number>(), email: new Map<string, number>(), phone: new Map<string, number>() };
    for (let number = 2; number <= sheet.rowCount; number++) {
      const row = sheet.getRow(number);
      if (!row.hasValues) continue;
      const values = Array.from({ length: 14 }, (_, index) => row.getCell(index + 1).value);
      if (values.some(isUnsupportedCell)) { errors.push(`Dòng ${number}: không hỗ trợ công thức, ảnh hoặc dữ liệu đặc biệt trong ô.`); continue; }
      const employeeCode = identifier(row.getCell(1));
      const phone = identifier(row.getCell(12));
      if (employeeCode === null || phone === null) { errors.push(`Dòng ${number}: mã nhân viên hoặc số điện thoại không hợp lệ.`); continue; }
      if (text(values[12])) { errors.push(`Dòng ${number}: chưa hỗ trợ nhập ảnh; vui lòng để trống cột ảnh và cập nhật sau.`); continue; }
      const location = ({ "Văn Phòng Á Châu Dĩ An": "Văn Phòng Á Châu Dĩ An", "Bình Dương (Nhà máy số 1)": "Bình Dương", "Long An (Nhà máy số 2)": "Long An" } as Record<string, string>)[text(values[8])] ?? "";
      const input = { employeeCode, name: text(values[1]), position: text(values[2]), department: departments[text(values[3])] ?? "", rank: ranks[text(values[4])] ?? "", gender: genders[text(values[5])] ?? "", joinDate: dateValue(values[6]), ...(text(values[7]) || values[7] instanceof Date ? { birthDate: dateValue(values[7]) } : {}), location, status: statuses[text(values[9])] ?? "", email: text(values[10]), phone, description: text(values[13]) };
      const { error, value } = createEmployeeSchema.validate(input, { abortEarly: false });
      if (error) { errors.push(`Dòng ${number}: ${error.details.map((detail) => `${fieldLabels[String(detail.path[0])] ?? String(detail.path[0])} không hợp lệ`).join(", ")}. Kiểm tra các trường bắt buộc, email @asiafnb.com và số điện thoại 10 chữ số.`); continue; }
      if (value.rank === "CEO" && value.department !== "BOD") errors.push(`Dòng ${number}: CEO phải thuộc phòng BOD.`);
      for (const field of ["employeeCode", "email", "phone"] as const) {
        const prior = seen[field].get(value[field]);
        if (prior) errors.push(`Dòng ${number}: ${field === "employeeCode" ? "mã nhân viên" : field === "email" ? "email" : "số điện thoại"} trùng với dòng ${prior}.`);
        else seen[field].set(value[field], number);
      }
      rows.push({ ...value, importRow: number });
    }
    if (!rows.length && !errors.length) errors.push("File không có nhân viên để nhập.");
    if (errors.length) throw new AppError(400, errors.slice(0, 30).join("\n"));
    request.body = { rows };
    next();
  } catch (error) { next(error); }
}
