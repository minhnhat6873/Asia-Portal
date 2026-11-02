import Joi from "joi";

// Never trim/replace password characters during validation.
export const newPasswordSchema = Joi.string().min(8).max(32).custom((value: string, helpers) => {
  if (/\s/u.test(value)) return helpers.error("password.whitespace");
  // bcrypt only uses the first 72 UTF-8 bytes. Character limits alone do not
  // prevent truncation for non-ASCII passwords.
  if (Buffer.byteLength(value, "utf8") > 72) return helpers.error("password.byteLimit");
  const missing: string[] = [];
  if (!/[a-z]/.test(value)) missing.push("chữ thường");
  if (!/[A-Z]/.test(value)) missing.push("chữ hoa");
  if (!/\d/.test(value)) missing.push("chữ số");
  if (!/[^A-Za-z0-9\s]/.test(value)) missing.push("ký tự đặc biệt");
  if (!missing.length) return value;
  const list = missing.length < 2 ? missing[0] : `${missing.slice(0, -1).join(", ")} và ${missing[missing.length - 1]}`;
  return helpers.error("password.missingRequirements", { missing: list });
}).messages({
  "any.required": "Vui lòng nhập mật khẩu.",
  "string.empty": "Vui lòng nhập mật khẩu.",
  "string.min": "Mật khẩu phải có ít nhất 8 ký tự.",
  "string.max": "Mật khẩu không được vượt quá 32 ký tự.",
  "password.whitespace": "Mật khẩu không được chứa khoảng trắng.",
  "password.byteLimit": "Mật khẩu chứa ký tự Unicode vượt giới hạn an toàn. Vui lòng rút ngắn hoặc dùng ít ký tự có dấu/biểu tượng hơn.",
  "password.missingRequirements": "Mật khẩu còn thiếu: {{#missing}}.",
});
