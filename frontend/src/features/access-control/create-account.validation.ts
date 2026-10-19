export interface CreateAccountFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

export type CreateAccountFormErrors = Partial<Record<keyof CreateAccountFormValues, string>>;

const NAME_PATTERN = /^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)*$/u;
const COMPANY_EMAIL_PATTERN = /^[A-Z0-9_%+-]+(?:\.[A-Z0-9_%+-]+)*@asiafnb\.com$/i;
const VIETNAM_PHONE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;

export function normalizeAccountPhone(value: string): string {
  return value.trim().replace(/[\s.-]/g, "").replace(/^\+84/, "0");
}

export function validateCreateAccount(values: CreateAccountFormValues): CreateAccountFormErrors {
  const errors: CreateAccountFormErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = normalizeAccountPhone(values.phone);

  if (!name) errors.name = "Vui lòng nhập họ và tên.";
  else if (name.length < 2 || name.length > 100) errors.name = "Họ và tên phải từ 2 đến 100 ký tự.";
  else if (!NAME_PATTERN.test(name)) errors.name = "Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy, dấu chấm hoặc gạch nối.";

  if (!email) errors.email = "Vui lòng nhập email công ty.";
  else if (email.length > 150 || email.split("@")[0].length > 64 || !COMPANY_EMAIL_PATTERN.test(email)) errors.email = "Email phải đúng định dạng và có đuôi @asiafnb.com.";

  if (!values.password) errors.password = "Vui lòng nhập mật khẩu.";
  else if (values.password.length < 8 || values.password.length > 100) errors.password = "Mật khẩu phải từ 8 đến 100 ký tự.";
  else if (!values.password.trim()) errors.password = "Mật khẩu không được chỉ gồm khoảng trắng.";

  if (!values.confirmPassword) errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  else if (values.confirmPassword !== values.password) errors.confirmPassword = "Xác nhận mật khẩu không khớp.";

  if (!phone) errors.phone = "Vui lòng nhập số điện thoại.";
  else if (!VIETNAM_PHONE_PATTERN.test(phone)) errors.phone = "Số điện thoại Việt Nam phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.";

  return errors;
}
