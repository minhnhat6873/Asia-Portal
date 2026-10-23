import { createEmployeeSchema } from "../src/validates/admin/employee.validate";
import { getCloudinaryPublicIdFromUrl } from "../src/helpers/multerCloudinary.helper";
import { validateBody } from "../src/middlewares/validate.middleware";
import type { Request, Response, NextFunction } from "express";

const validEmployee = {
  employeeCode: "NV-001",
  name: "Nguyễn Văn A",
  position: "Nhân viên IT",
  department: "Phòng IT",
  rank: "Staff",
  email: "vana@asiafnb.com",
  phone: "0936123456",
  location: "Hồ Chí Minh",
  avatar: "",
  joinDate: "2026-10-06",
  gender: "male",
  status: "active",
  description: "",
};

describe("employee validation", () => {
  it("returns an actionable field error for an unrecognized legacy rank", () => {
    const request = { body: { ...validEmployee, rank: "Manager" } } as Request;
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnThis(), json } as unknown as Response;
    const next = jest.fn() as NextFunction;
    validateBody(createEmployeeSchema)(request, response, next);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      fieldErrors: { rank: "Cấp bậc không hợp lệ. Vui lòng chọn lại cấp bậc trong danh sách." },
    }));
    expect(next).not.toHaveBeenCalled();
  });
  it("chấp nhận hồ sơ nhân viên hợp lệ", () => {
    const result = createEmployeeSchema.validate(validEmployee, { abortEarly: false });
    expect(result.error).toBeUndefined();
  });

  it.each(["CEO", "Senior Management", "Middle Management", "Intermediate Personnel", "Staff"])(
    "chấp nhận cấp bậc tổ chức: %s",
    (rank) => {
      expect(createEmployeeSchema.validate({ ...validEmployee, rank }).error).toBeUndefined();
    },
  );

  it("từ chối email không thuộc asiafnb.com", () => {
    const result = createEmployeeSchema.validate(
      { ...validEmployee, email: "vana@gmail.com" },
      { abortEarly: false },
    );
    expect(result.error?.details.some((detail) => detail.message.includes("@asiafnb.com"))).toBe(true);
  });

  it("yêu cầu giới tính hợp lệ khi tạo nhân viên", () => {
    const result = createEmployeeSchema.validate(
      { ...validEmployee, gender: "invalid" },
      { abortEarly: false },
    );
    expect(result.error?.details.some((detail) => detail.path[0] === "gender")).toBe(true);
  });

  it.each(["12345678", "0212345678", "0936 123 456", "09361234567"])(
    "từ chối số điện thoại Việt Nam không hợp lệ: %s",
    (phone) => {
      const result = createEmployeeSchema.validate(
        { ...validEmployee, phone },
        { abortEarly: false },
      );
      expect(result.error?.details.some((detail) => detail.path[0] === "phone")).toBe(true);
    },
  );
});

describe("Cloudinary avatar", () => {
  it("lấy public_id từ secure URL để dọn cả ảnh cũ chưa lưu public_id", () => {
    expect(
      getCloudinaryPublicIdFromUrl(
        "https://res.cloudinary.com/demo/image/upload/v123456/asia-portal/avatars/avatar-01.webp",
      ),
    ).toBe("asia-portal/avatars/avatar-01");
  });
});
