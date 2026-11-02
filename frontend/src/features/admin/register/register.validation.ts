import { getPasswordValidationError } from "@/lib/password-validation";
export { getPasswordValidationError } from "@/lib/password-validation";

export interface RegisterFormValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

const VIETNAM_PHONE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;
const VIETNAMESE_NAME_PATTERN = /^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)*$/u;
const COMPANY_EMAIL_PATTERN = /^[A-Z0-9._%+-]+@asiafnb\.com$/i;

export function normalizeVietnamPhone(value: string): string {
  return value.trim().replace(/[\s.-]/g, "");
}

export function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  const fullName = values.fullName.trim();

  if (!fullName) {
    errors.fullName = "Vui lòng nhập họ và tên.";
  } else if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = "Họ và tên phải từ 2 đến 100 ký tự.";
  } else if (!VIETNAMESE_NAME_PATTERN.test(fullName)) {
    errors.fullName = "Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy, dấu chấm hoặc gạch nối.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Vui lòng nhập email công ty.";
  } else if (!COMPANY_EMAIL_PATTERN.test(email)) {
    errors.email = "Vui lòng sử dụng email công ty có đuôi @asiafnb.com.";
  }

  const phone = normalizeVietnamPhone(values.phone);
  if (!phone) {
    errors.phone = "Vui lòng nhập số điện thoại.";
  } else if (!VIETNAM_PHONE_PATTERN.test(phone)) {
    errors.phone = "Số điện thoại không hợp lệ.";
  }

  const passwordError = getPasswordValidationError(values.password);
  if (passwordError) errors.password = passwordError;

  if (!values.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Xác nhận mật khẩu không khớp.";
  }

  if (!values.agreeTerms) {
    errors.agreeTerms = "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.";
  }

  return errors;
}