import Joi from "joi";

import {
  ACCOUNT_ROLES,
  ACCOUNT_STATUSES,
} from "../../interfaces/account.interface";

const accountFields = {
  name: Joi.string().trim().min(2).max(100)
    .pattern(/^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)*$/u)
    .messages({
      "any.required": "Vui lòng nhập họ và tên.",
      "string.empty": "Vui lòng nhập họ và tên.",
      "string.min": "Họ và tên phải từ 2 đến 100 ký tự.",
      "string.max": "Họ và tên phải từ 2 đến 100 ký tự.",
      "string.pattern.base": "Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy, dấu chấm hoặc gạch nối.",
    }),
  email: Joi.string().trim().lowercase().email().max(150)
    .pattern(/^[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@asiafnb\.com$/)
    .messages({
      "any.required": "Vui lòng nhập email công ty.",
      "string.empty": "Vui lòng nhập email công ty.",
      "string.email": "Email phải đúng định dạng và có đuôi @asiafnb.com.",
      "string.max": "Email không được vượt quá 150 ký tự.",
      "string.pattern.base": "Email phải đúng định dạng và có đuôi @asiafnb.com.",
    }),
  phone: Joi.string().trim().replace(/[\s.-]/g, "").replace(/^\+84/, "0")
    .pattern(/^0(?:3|5|7|8|9)\d{8}$/)
    .messages({
      "any.required": "Vui lòng nhập số điện thoại.",
      "string.empty": "Vui lòng nhập số điện thoại.",
      "string.pattern.base": "Số điện thoại Việt Nam phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.",
    }),
  password: Joi.string().min(8).max(100).pattern(/\S/).messages({
    "any.required": "Vui lòng nhập mật khẩu.",
    "string.empty": "Vui lòng nhập mật khẩu.",
    "string.min": "Mật khẩu phải từ 8 đến 100 ký tự.",
    "string.max": "Mật khẩu phải từ 8 đến 100 ký tự.",
    "string.pattern.base": "Mật khẩu không được chỉ gồm khoảng trắng.",
  }),
  role: Joi.string().valid(...ACCOUNT_ROLES),
  status: Joi.string().valid(...ACCOUNT_STATUSES),
  permissionGroupIds: Joi.array()
    .items(Joi.string().hex().length(24))
    .unique(),
};

export const createAccountSchema = Joi.object({
  name: accountFields.name.required(),
  email: accountFields.email.required(),
  phone: accountFields.phone.required(),
  password: accountFields.password.required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().strip().messages({
    "any.only": "Xác nhận mật khẩu không khớp.",
    "string.empty": "Vui lòng xác nhận mật khẩu.",
    "any.required": "Vui lòng xác nhận mật khẩu.",
  }),
  role: Joi.string().valid("admin", "manager").default("manager"),
  permissionGroupIds: accountFields.permissionGroupIds,
});

export const checkAccountContactsSchema = Joi.object({
  email: accountFields.email,
  phone: accountFields.phone,
}).min(1);

export const updateAccountSchema = Joi.object({
  name: accountFields.name,
  role: accountFields.role,
  status: accountFields.status,
  permissionGroupIds: accountFields.permissionGroupIds,
}).min(1);

export const resetPasswordSchema = Joi.object({
  password: accountFields.password.required(),
});

export const accountEmailSchema = accountFields.email;
