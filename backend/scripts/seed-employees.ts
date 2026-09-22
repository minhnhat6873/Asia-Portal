import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database.config";
import EmployeeModel from "../src/models/employee.model";

const demoEmployees = [
  {
    employeeCode: "ASIA0001",
    name: "Huỳnh Thị Thúy Kiều",
    position: "Operations Manager",
    department: "Sales",
    email: "om@asiafnb.com",
    phone: "0901 000 001",
    location: "Hồ Chí Minh",
    avatar: "/assets/images/BOD_NV KIỀU.png",
    joinDate: new Date("2021-03-15"),
    status: "active" as const,
    description: "Quản lý và điều phối hoạt động kinh doanh.",
  },
  {
    employeeCode: "ASIA0002",
    name: "Nguyễn Thị Xuân Nghi",
    position: "Export Sales Admin",
    department: "Sales",
    email: "sa.01@asiafnb.com",
    phone: "0901 000 002",
    location: "Hồ Chí Minh",
    avatar: "/assets/images/SALES XK_NV NGHI.jpg",
    joinDate: new Date("2022-06-01"),
    status: "active" as const,
    description: "Hỗ trợ vận hành và hồ sơ kinh doanh xuất khẩu.",
  },
  {
    employeeCode: "ASIA0003",
    name: "Ngô Tạ Gia Huy",
    position: "Export Sales",
    department: "Sales",
    email: "wenyi@asiafnb.com",
    phone: "0901 000 003",
    location: "Hồ Chí Minh",
    avatar: "/assets/images/SALES XK_NV HUY.jpg",
    joinDate: new Date("2023-01-09"),
    status: "active" as const,
    description: "Phụ trách phát triển khách hàng và thị trường xuất khẩu.",
  },
  {
    employeeCode: "ASIA0004",
    name: "Nguyễn Ngô Hương Giang",
    position: "Export Sales",
    department: "Sales",
    email: "jeannie@asiafnb.com",
    phone: "0901 000 004",
    location: "Hồ Chí Minh",
    avatar: "/assets/images/employee-5.png",
    joinDate: new Date("2023-08-14"),
    status: "active" as const,
    description: "Phụ trách chăm sóc khách hàng và đơn hàng xuất khẩu.",
  },
  {
    employeeCode: "ASIA0005",
    name: "Hoàng Tài",
    position: "Export Sales",
    department: "Sales",
    email: "peace@asiafnb.com",
    phone: "0901 000 005",
    location: "Hồ Chí Minh",
    avatar: "/assets/images/employee-6.png",
    joinDate: new Date("2024-02-19"),
    status: "active" as const,
    description: "Phụ trách tư vấn sản phẩm và kinh doanh xuất khẩu.",
  },
  {
    employeeCode: "ASIA0006",
    name: "Cao Thị Thùy Linh",
    position: "Export Sales",
    department: "Sales",
    email: "phoebe@asiafnb.com",
    phone: "0901 000 006",
    location: "Hồ Chí Minh",
    avatar: "/assets/images/employee-7.png",
    joinDate: new Date("2024-07-08"),
    status: "active" as const,
    description: "Phụ trách tìm kiếm và hỗ trợ khách hàng quốc tế.",
  },
];

async function seedEmployees(): Promise<void> {
  await connectDatabase();

  const result = await EmployeeModel.bulkWrite(
    demoEmployees.map((employee) => ({
      updateOne: {
        filter: { email: employee.email },
        update: { $set: employee },
        upsert: true,
      },
    })),
  );

  console.log(
    `Đã đồng bộ ${demoEmployees.length} nhân viên demo (${result.upsertedCount} tạo mới, ${result.modifiedCount} cập nhật).`,
  );
}

seedEmployees()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Không thể tạo dữ liệu nhân viên demo",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });