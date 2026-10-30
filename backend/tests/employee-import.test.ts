import ExcelJS from "exceljs";
import type { Request, Response } from "express";
import { validateEmployeeImport } from "../src/middlewares/employee-import.middleware";
import { AppError } from "../src/utils/errors/AppError";
import { readFile } from "fs/promises";
import path from "path";

async function validateBuffer(buffer: Buffer) {
  const request = { file: { originalname: "employees.xlsx", buffer }, body: {} } as unknown as Request;
  const next = jest.fn();
  await validateEmployeeImport(request, {} as Response, next);
  return { request, error: next.mock.calls[0][0] as AppError | undefined };
}

async function validate(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Nhập nhân viên");
  sheet.addRow(["Mã nhân viên *", "Họ và tên *", "Chức vụ *", "Phòng ban *", "Cấp bậc *", "Giới tính *", "Ngày gia nhập *", "Ngày sinh", "Văn phòng / Địa điểm làm việc *", "Trạng thái làm việc *", "Email công việc *", "Số điện thoại *", "Ảnh đại diện (tên file hoặc URL)", "Mô tả / Tiểu sử công việc"]);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return validateBuffer(buffer);
}

const row = ["000123", "Nguyễn Văn An", "Chuyên viên", "Phòng Nhân sự & Hành chính", "Chuyên viên/Nhân viên", "Nam", "01/10/2026", "", "Văn Phòng Á Châu Dĩ An", "Đang làm việc", "AN@asiafnb.com", "0901234567", "", ""];

describe("employee Excel import validation", () => {
  it("uses text cells and custom date validation in the downloadable template", async () => {
    const workbook = new ExcelJS.Workbook();
    const template = await readFile(path.resolve(__dirname, "../../frontend/public/Mau_nhap_nhan_vien_AsiaPortal.xlsx"));
    await workbook.xlsx.load(template as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Nhập nhân viên")!;
    for (const address of ["G2", "H2"]) {
      expect(sheet.getCell(address).numFmt).toBe("@");
      expect(sheet.getCell(address).dataValidation.type).toBe("custom");
    }
  });

  it("imports day/month/year without swapping ambiguous dates", async () => {
    const input = [...row]; input[6] = "01/02/2026"; input[7] = "25/10/2005";
    const { request, error } = await validate([input]);
    expect(error).toBeUndefined();
    expect(request.body.rows[0].joinDate.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(request.body.rows[0].birthDate.toISOString()).toBe("2005-10-25T00:00:00.000Z");
  });

  it("accepts a completed copy of the actual downloadable template", async () => {
    const workbook = new ExcelJS.Workbook();
    const template = await readFile(path.resolve(__dirname, "../../frontend/public/Mau_nhap_nhan_vien_AsiaPortal.xlsx"));
    await workbook.xlsx.load(template as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Nhập nhân viên")!;
    row.forEach((value, index) => { sheet.getRow(2).getCell(index + 1).value = value; });
    const { request, error } = await validateBuffer(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(error).toBeUndefined();
    expect(request.body.rows).toHaveLength(1);
  });
  it("preserves leading zeroes, normalizes email and maps labels", async () => {
    const { request, error } = await validate([row]);
    expect(error).toBeUndefined();
    expect(request.body.rows[0]).toMatchObject({ employeeCode: "000123", email: "an@asiafnb.com", phone: "0901234567", department: "HR_ADMIN", importRow: 2 });
  });

  it("rejects duplicates within the file after normalization", async () => {
    const { error } = await validate([row, [...row.slice(0, 10), "an@asiafnb.com", "0901234567", "", ""]]);
    expect(error?.message).toContain("Dòng 3");
    expect(error?.message).toContain("trùng với dòng 2");
  });

  it("accepts numeric employee codes and Excel email hyperlinks", async () => {
    const input: unknown[] = [...row];
    input[0] = 123;
    input[10] = { text: "AN@asiafnb.com", hyperlink: "mailto:AN@asiafnb.com" };
    const { request, error } = await validate([input]);
    expect(error).toBeUndefined();
    expect(request.body.rows[0]).toMatchObject({ employeeCode: "123", email: "an@asiafnb.com" });
  });

  it("preserves leading zeroes in numeric cells with an explicit zero format", async () => {
    const workbook = new ExcelJS.Workbook();
    const template = await readFile(path.resolve(__dirname, "../../frontend/public/Mau_nhap_nhan_vien_AsiaPortal.xlsx"));
    await workbook.xlsx.load(template as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Nhập nhân viên")!;
    row.forEach((value, index) => { sheet.getRow(2).getCell(index + 1).value = value; });
    sheet.getCell("A2").value = 123;
    sheet.getCell("A2").style = { ...sheet.getCell("A2").style };
    sheet.getCell("A2").numFmt = "000000";
    sheet.getCell("L2").value = 901234567;
    sheet.getCell("L2").style = { ...sheet.getCell("L2").style };
    sheet.getCell("L2").numFmt = "0000000000";
    const { request, error } = await validateBuffer(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(error).toBeUndefined();
    expect(request.body.rows[0]).toMatchObject({ employeeCode: "000123", phone: "0901234567" });
  });

  it("rejects phone numbers whose leading zero was lost without a display format", async () => {
    const input: unknown[] = [...row]; input[11] = 901234567;
    expect((await validate([input])).error?.message).toContain("Số điện thoại không hợp lệ");
  });

  it("rejects invalid dates and formulas", async () => {
    const badDate = [...row]; badDate[6] = "31/02/2026";
    expect((await validate([badDate])).error).toBeDefined();
    const formula: unknown[] = [...row]; formula[1] = { formula: '"Test"', result: "Test" };
    expect((await validate([formula])).error?.message).toContain("công thức");
  });
});
