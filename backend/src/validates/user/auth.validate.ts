import Joi from "joi";
import { newPasswordSchema } from "../admin/password.validate";
import { normalizeAccountPhone } from "../../utils/account/normalizeContact";

// Never include the company domain/pattern or submitted value in validation errors.
const userEmailFormatSchema = Joi.string().trim().lowercase().max(150).email({ tlds: { allow: false } })
  .required().messages({ "string.base": "Email không đúng định dạng.", "string.empty": "Vui lòng nhập email.", "string.max": "Email không đúng định dạng.", "string.email": "Email không đúng định dạng.", "any.required": "Vui lòng nhập email." });
// Only company addresses may register or recover a user account.
export const userEmailSchema = userEmailFormatSchema
  .custom((value: string, helpers) => /^[a-z0-9._%+-]+@asiafnb\.com$/.test(value) ? value : helpers.error("email.notAllowed"))
  .messages({ "email.notAllowed": "Email không hợp lệ." });
// The shared policy already rejects accents and other non-ASCII characters.
const password = newPasswordSchema.required();
const confirmPassword = Joi.string().valid(Joi.ref("password")).required().strip().messages({ "any.only": "Xác nhận mật khẩu không khớp.", "any.required": "Vui lòng xác nhận mật khẩu.", "string.empty": "Vui lòng xác nhận mật khẩu." });
// Login checks only that credentials are present: the domain and password policy are not
// revealed here, and any wrong combination gets the same "incorrect" response from the service.
const loginPassword = Joi.string().max(128).required().messages({ "string.base": "Vui lòng nhập mật khẩu.", "string.empty": "Vui lòng nhập mật khẩu.", "any.required": "Vui lòng nhập mật khẩu.", "string.max": "Email hoặc mật khẩu không chính xác." });
export const userLoginSchema = Joi.object({ email: userEmailFormatSchema, password: loginPassword, rememberMe: Joi.boolean().default(false) });
export const userRegisterSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).pattern(/^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)*$/u).required()
    .messages({ "string.pattern.base": "Họ và tên không hợp lệ.", "string.min": "Họ và tên cần từ 2 đến 100 ký tự.", "string.max": "Họ và tên cần từ 2 đến 100 ký tự.", "string.empty": "Vui lòng nhập họ và tên.", "any.required": "Vui lòng nhập họ và tên." }),
  email: userEmailSchema,
  phone: Joi.string().max(30).custom((value: string, helpers) => {
    const normalized = normalizeAccountPhone(value);
    return /^0[35789]\d{8}$/.test(normalized) ? normalized : helpers.error("phone.invalid");
  }).required().messages({ "phone.invalid": "Số điện thoại Việt Nam không hợp lệ.", "string.max": "Số điện thoại Việt Nam không hợp lệ.", "string.empty": "Vui lòng nhập số điện thoại.", "any.required": "Vui lòng nhập số điện thoại." }),
  password, confirmPassword,
});
export const userEmailOnlySchema = Joi.object({ email: userEmailSchema });
export const userVerifySchema = Joi.object({
  email: userEmailSchema,
  code: Joi.string().pattern(/^\d{6}$/).required().messages({ "string.pattern.base": "Mã xác thực phải gồm 6 chữ số.", "string.empty": "Vui lòng nhập mã xác thực.", "any.required": "Vui lòng nhập mã xác thực." }),
});
export const userResetSchema = userVerifySchema.keys({ password, confirmPassword });
export const userChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().max(128).required().messages({ "string.base": "Vui lòng nhập mật khẩu hiện tại.", "string.empty": "Vui lòng nhập mật khẩu hiện tại.", "any.required": "Vui lòng nhập mật khẩu hiện tại.", "string.max": "Mật khẩu hiện tại không chính xác." }),
  password, confirmPassword,
});
