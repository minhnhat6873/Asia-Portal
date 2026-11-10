/**
 * Chuyển mã nhân viên cũ sang dạng chuẩn AC-xxxxx (ví dụ 00024 → AC-00024).
 *
 *   yarn migrate:employee-codes           → chỉ XEM TRƯỚC, không ghi gì vào database
 *   yarn migrate:employee-codes --apply   → ghi thật
 *
 * Gồm cả nhân viên trong thùng rác. Script dừng, không ghi gì, nếu có mã không chuyển được
 * hoặc hai nhân viên bị chuyển ra cùng một mã. Chạy lại nhiều lần vẫn an toàn.
 * Nên sao lưu database (mongodump) trước khi chạy --apply.
 */
import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database.config";
import EmployeeModel from "../src/models/employee.model";
import { EMPLOYEE_CODE_PATTERN, normalizeEmployeeCode } from "../src/utils/employee-code";

async function migrateEmployeeCodes(): Promise<void> {
  const apply = process.argv.includes("--apply");
  await connectDatabase();

  const employees = await EmployeeModel.find({}, { employeeCode: 1, name: 1 }).lean<{ _id: mongoose.Types.ObjectId; employeeCode: string; name: string }[]>();
  const finalCodes = new Map<string, string>(); // mã sau khi chuyển → tên nhân viên
  const changes: { id: mongoose.Types.ObjectId; from: string; to: string; name: string }[] = [];
  const problems: string[] = [];

  for (const employee of employees) {
    const target = EMPLOYEE_CODE_PATTERN.test(employee.employeeCode) ? employee.employeeCode : normalizeEmployeeCode(employee.employeeCode);
    if (!target) { problems.push(`Không chuyển được "${employee.employeeCode}" (${employee.name}). Hãy sửa tay.`); continue; }
    const owner = finalCodes.get(target);
    if (owner) problems.push(`Trùng mã ${target}: "${owner}" và "${employee.name}" (mã cũ ${employee.employeeCode}).`);
    finalCodes.set(target, employee.name);
    if (target !== employee.employeeCode) changes.push({ id: employee._id, from: employee.employeeCode, to: target, name: employee.name });
  }

  console.log(`Tổng ${employees.length} nhân viên, ${changes.length} mã cần đổi, ${employees.length - changes.length - problems.length} mã đã đúng.`);
  for (const change of changes) console.log(`  ${change.from.padEnd(12)} → ${change.to}  ${change.name}`);

  if (problems.length > 0) {
    console.error(`\nDừng lại, KHÔNG ghi gì vì có ${problems.length} lỗi:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  if (changes.length === 0) { console.log("\nKhông có gì để đổi."); return; }
  if (!apply) { console.log("\nĐây là bản XEM TRƯỚC. Chạy lại với --apply để ghi vào database."); return; }

  const result = await EmployeeModel.bulkWrite(
    changes.map((change) => ({ updateOne: { filter: { _id: change.id, employeeCode: change.from }, update: { $set: { employeeCode: change.to } } } })),
  );
  console.log(`\nĐã đổi ${result.modifiedCount}/${changes.length} mã nhân viên.`);
}

migrateEmployeeCodes()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Không thể chuyển mã nhân viên");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
