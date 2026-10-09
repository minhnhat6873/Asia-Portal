import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database.config";
import AccountModel from "../src/models/account.model";
import EmployeeModel from "../src/models/employee.model";

const DEFAULT_AVATAR = "/assets/images/avatar-Nu.png";
const DEFAULT_LOCATION = "Văn Phòng Á Châu Dĩ An";
const CREATOR_EMAIL = "kunnhat24@gmail.com";
const CREATOR_NAME = "Nguyen Hoang Minh Nhat";

function parseVietnameseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const employeeRows = [
  ["00001", "Ngô Bùi Tuấn Kiệt", "IT Helpdesk", "IT", "Staff", "01/10/2026", "07/06/2005", "it02@asiafnb.com", "0866433812", "Hỗ trợ người dùng, xử lý lỗi máy tính và phần mềm."],
  ["00002", "Nguyễn Minh Anh", "HR Executive", "HR_AD", "Staff", "15/03/2025", "12/09/1998", "hr01@asiafnb.com", "0903147286", "Tuyển dụng, quản lý hồ sơ và hỗ trợ nhân sự."],
  ["00003", "Trần Hoàng Nam", "Accountant", "F_AND_A", "Staff", "08/07/2024", "21/01/1997", "fa01@asiafnb.com", "0938215064", "Hạch toán, kiểm tra chứng từ và theo dõi công nợ."],
  ["00004", "Lê Thảo Vy", "Marketing Executive", "MKT", "Staff", "20/02/2025", "14/11/2000", "mkt01@asiafnb.com", "0875129436", "Triển khai nội dung và hoạt động marketing."],
  ["00005", "Phạm Gia Huy", "Graphic Designer", "DESIGN", "Staff", "12/05/2025", "03/04/1999", "design01@asiafnb.com", "0917362845", "Thiết kế hình ảnh truyền thông và bao bì."],
  ["00006", "Võ Khánh Linh", "Legal Executive", "LEGAL", "Staff", "09/09/2024", "25/08/1996", "legal01@asiafnb.com", "0894251736", "Rà soát hợp đồng và hỗ trợ pháp lý."],
  ["00007", "Đặng Quốc Bảo", "System Administrator", "IT", "Staff", "18/11/2023", "17/02/1995", "it01@asiafnb.com", "0983157246", "Quản trị hệ thống, mạng và tài khoản nội bộ."],
  ["00008", "Bùi Thanh Tùng", "Logistics Coordinator", "LOGISTICS", "Staff", "03/04/2025", "30/07/1998", "logistics01@asiafnb.com", "0962741835", "Điều phối vận chuyển và theo dõi giao nhận."],
  ["00009", "Nguyễn Ngọc Hân", "R&D Executive", "R_AND_D", "Staff", "27/01/2025", "11/12/1999", "rnd01@asiafnb.com", "0886173524", "Nghiên cứu và thử nghiệm sản phẩm mới."],
  ["00010", "Trần Đức Long", "Purchasing Executive", "PURCHASING", "Staff", "06/06/2024", "19/05/1997", "purchasing01@asiafnb.com", "0975318462", "Tìm nhà cung cấp và thực hiện mua hàng."],
  ["00011", "Lê Quốc Khánh", "Sales Executive", "SALES", "Staff", "10/08/2025", "02/10/2000", "sales01@asiafnb.com", "0908264713", "Tìm khách hàng và theo dõi đơn hàng."],
  ["00012", "Phan Mai Phương", "Admin Executive", "HR_AD", "Staff", "22/10/2024", "28/03/1998", "admin01@asiafnb.com", "0853197624", "Quản lý hành chính và văn phòng phẩm."],
  ["00013", "Nguyễn Thành Đạt", "Finance Analyst", "F_AND_A", "Staff", "16/01/2023", "09/06/1994", "fa02@asiafnb.com", "0946271835", "Phân tích chi phí, ngân sách và tài chính."],
  ["00014", "Hồ Mỹ Duyên", "Content Marketing", "MKT", "Staff", "05/05/2026", "23/02/2001", "mkt02@asiafnb.com", "0837159426", "Viết nội dung social và chiến dịch truyền thông."],
  ["00015", "Trương Minh Khoa", "Trưởng phòng Design", "DESIGN", "Middle Management", "14/09/2022", "15/07/1993", "design02@asiafnb.com", "0926483157", "Quản lý thiết kế và kiểm soát hình ảnh thương hiệu."],
  ["00016", "Nguyễn Nhật Quang", "Trưởng phòng R&D", "R_AND_D", "Middle Management", "19/04/2022", "04/12/1991", "rnd02@asiafnb.com", "0972146853", "Quản lý nghiên cứu và phát triển sản phẩm."],
  ["00017", "Võ Anh Tuấn", "Trưởng phòng Purchasing", "PURCHASING", "Middle Management", "07/03/2023", "26/10/1992", "purchasing02@asiafnb.com", "0915284637", "Quản lý mua hàng và nhà cung cấp."],
  ["00018", "Đỗ Ngọc Trâm", "Trưởng phòng Sales", "SALES", "Middle Management", "11/01/2021", "18/01/1989", "sales02@asiafnb.com", "0907362518", "Quản lý đội sales và mục tiêu doanh số."],
  ["00019", "Nguyễn Hoàng Sơn", "Trưởng phòng Logistics", "LOGISTICS", "Middle Management", "02/08/2020", "06/04/1988", "logistics02@asiafnb.com", "0935178246", "Quản lý vận chuyển, kho và giao nhận."],
  ["00020", "Trần Hải Yến", "Executive Manager", "BOD", "Senior Management", "15/06/2022", "29/09/1993", "bod01@asiafnb.com", "0884267315", "Hỗ trợ BOD và điều phối công việc quản trị."],
] as const;

const employees = employeeRows.map(([
  employeeCode,
  name,
  position,
  department,
  rank,
  joinDate,
  birthDate,
  email,
  phone,
  description,
]) => ({
  employeeCode,
  name,
  position,
  department,
  rank,
  email,
  phone,
  location: DEFAULT_LOCATION,
  avatar: DEFAULT_AVATAR,
  avatarPublicId: "",
  joinDate: parseVietnameseDate(joinDate),
  birthDate: parseVietnameseDate(birthDate),
  status: "active" as const,
  description,
  isDeleted: false,
  deletedAt: null,
}));

async function seedEmployees(): Promise<void> {
  await connectDatabase();

  const creatorAccount = await AccountModel.findOne({
    email: CREATOR_EMAIL,
    status: "active",
  }).lean();

  if (!creatorAccount) {
    throw new Error(`Không tìm thấy tài khoản người tạo đang hoạt động: ${CREATOR_EMAIL}`);
  }

  const createdBy = {
    accountId: creatorAccount._id.toString(),
    name: CREATOR_NAME,
    email: CREATOR_EMAIL,
  };

  const result = await EmployeeModel.bulkWrite(
    employees.map((employee) => ({
      updateOne: {
        filter: { employeeCode: employee.employeeCode },
        update: { $set: { ...employee, createdBy } },
        upsert: true,
      },
    })),
  );

  console.log(
    `Đã đồng bộ ${employees.length} nhân viên (${result.upsertedCount} tạo mới, ${result.modifiedCount} cập nhật).`,
  );
}

seedEmployees()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Không thể tạo dữ liệu nhân viên",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
