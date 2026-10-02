import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(150).required(),
  password: Joi.string().min(8).max(100).required(),
  rememberMe: Joi.boolean().default(false),
});

const VIETNAM_PHONE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;
const VIETNAMESE_NAME_PATTERN = /^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)*$/u;

const nameSchema = Joi.string()
  .trim()
  .min(2)
  .max(100)
  .pattern(VIETNAMESE_NAME_PATTERN)
  .required()
  .messages({
    "string.empty": "Họ và tên là bắt buộc.",
    "string.min": "Họ và tên phải có ít nhất 2 ký tự.",
    "string.max": "Họ và tên không được vượt quá 100 ký tự.",
    "string.pattern.base": "Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy, dấu chấm hoặc gạch nối.",
    "any.required": "Họ và tên là bắt buộc.",
  });

const phoneSchema = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const normalized = value.replace(/[\s.-]/g, "");
    return VIETNAM_PHONE_PATTERN.test(normalized)
      ? normalized
      : helpers.error("string.pattern.base");
  }, "Vietnamese phone number validation")
  .required()
  .messages({
    "string.empty": "Số điện thoại là bắt buộc.",
    "string.pattern.base": "Số điện thoại không hợp lệ.",
    "any.required": "Số điện thoại là bắt buộc.",
  });

function formatVietnameseList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} và ${items[1]}`;

  return `${items.slice(0, -1).join(", ")} và ${items[items.length - 1]}`;
}

const passwordSchema = Joi.string()
  .custom((value, helpers) => {
    if (value.length < 4) return helpers.error("password.tooShort");
    if (value.length > 50) return helpers.error("password.tooLong");

    const missingRequirements: string[] = [];
    if (!/[a-z]/.test(value)) missingRequirements.push("chữ thường");
    if (!/[A-Z]/.test(value)) missingRequirements.push("chữ hoa");
    if (!/\d/.test(value)) missingRequirements.push("chữ số");
    if (!/[^A-Za-z0-9\s]/.test(value)) missingRequirements.push("ký tự đặc biệt");

    return missingRequirements.length > 0
      ? helpers.error("password.missingRequirements", {
          missing: formatVietnameseList(missingRequirements),
        })
      : value;
  }, "password validation")
  .required()
  .messages({
    "string.empty": "Mật khẩu là bắt buộc.",
    "password.tooShort": "Mật khẩu phải có ít nhất 4 ký tự.",
    "password.tooLong": "Mật khẩu không được vượt quá 50 ký tự.",
    "password.missingRequirements": "Mật khẩu còn thiếu: {{#missing}}.",
    "any.required": "Mật khẩu là bắt buộc.",
  });
const registrationEmailSchema = Joi.string().trim().lowercase().pattern(/^[a-z0-9._%+-]+@asiafnb\\.com$/).max(150).required().messages({
  "string.empty": "Email là bắt buộc.",
  "string.min": "Email là bắt buộc.",
  "string.max": "Email không được vượt quá 150 ký tự.",
  "any.required": "Email là bắt buộc.",
});

export const registerAccountSchema = Joi.object({
  // The registration screen currently sends fullName and agreeTerms.
  name: nameSchema,
  email: registrationEmailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .strip()
    .messages({
      "any.only": "Xác nhận mật khẩu không khớp.",
      "string.empty": "Bạn cần xác nhận lại mật khẩu.",
      "any.required": "Bạn cần xác nhận lại mật khẩu.",
    }),
  termsAccepted: Joi.boolean()
    .valid(true)
    .required()
    .strip()
    .messages({
      "any.only": "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.",
      "any.required": "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.",
    }),
})
  .rename("fullName", "name", { alias: false, override: false })
  .rename("agreeTerms", "termsAccepted", { alias: false, override: false });
export const verifyRegistrationOtpSchema = Joi.object({
  email: registrationEmailSchema,
  code: Joi.string().pattern(/^\d{6}$/).required().messages({
    "string.empty": "Vui lòng nhập mã OTP.",
    "string.pattern.base": "Mã OTP phải gồm đúng 6 chữ số.",
    "any.required": "Vui lòng nhập mã OTP.",
  }),
});

export const resendRegistrationOtpSchema = Joi.object({
  email: registrationEmailSchema,
});
const passwordResetEmailSchema = Joi.string()
  .trim()
  .lowercase()
  .email()
  .max(150)
  .required()
  .messages({
    "string.empty": "Vui lòng nhập email đã đăng ký.",
    "string.email": "Email không hợp lệ.",
    "string.max": "Email không được vượt quá 150 ký tự.",
    "any.required": "Vui lòng nhập email đã đăng ký.",
  });

const otpCodeSchema = Joi.string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    "string.empty": "Vui lòng nhập mã OTP.",
    "string.pattern.base": "Mã OTP phải gồm đúng 6 chữ số.",
    "any.required": "Vui lòng nhập mã OTP.",
  });

export const requestPasswordResetOtpSchema = Joi.object({
  email: passwordResetEmailSchema,
});

export const verifyPasswordResetOtpSchema = Joi.object({
  email: passwordResetEmailSchema,
  code: otpCodeSchema,
});

export const resetPasswordWithOtpSchema = Joi.object({
  email: passwordResetEmailSchema,
  code: otpCodeSchema,
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .strip()
    .messages({
      "any.only": "Xác nhận mật khẩu không khớp.",
      "string.empty": "Vui lòng xác nhận lại mật khẩu.",
      "any.required": "Vui lòng xác nhận lại mật khẩu.",
    }),
});