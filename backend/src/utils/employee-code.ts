/** Mã nhân viên chuẩn: "AC-" + đúng 5 chữ số, ví dụ AC-00024. */
export const EMPLOYEE_CODE_PATTERN = /^AC-\d{5}$/;
export const EMPLOYEE_CODE_MESSAGE = "Mã nhân viên phải có dạng AC- và 5 chữ số (VD: AC-00024).";

/**
 * Chuyển mã kiểu cũ sang mã chuẩn, chỉ dùng khi nhập Excel và khi chuyển dữ liệu cũ.
 * "00024", "24", "000024", "ac00024", "AC-24" → "AC-00024". Trả null nếu không chuyển được.
 * API thêm/sửa nhân viên KHÔNG dùng hàm này mà bắt buộc gửi đúng định dạng.
 */
export function normalizeEmployeeCode(raw: string): string | null {
  const match = /^(?:AC-?)?(\d+)$/.exec(raw.trim().toUpperCase());
  if (!match) return null;
  const digits = match[1].replace(/^0+(?=\d{5})/, "");
  return digits.length <= 5 ? `AC-${digits.padStart(5, "0")}` : null;
}
