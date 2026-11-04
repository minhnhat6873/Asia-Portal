import Joi from "joi";
import { sanitizeFeedback } from "../../utils/html/sanitizeFeedback";
import { richTextToPlainText } from "../../utils/html/sanitizeRichText";
const emailPattern = /^(?!.*\.\.)[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?@asiafnb\.com$/;
export const createFeedbackSchema = Joi.object({
 title: Joi.string().trim().min(1).max(150).required().messages({ "string.empty": "Vui lòng nhập tiêu đề.", "string.max": "Tiêu đề tối đa 150 ký tự.", "any.required": "Vui lòng nhập tiêu đề." }),
 content: Joi.string().required().custom((value: string, helpers) => { const clean = sanitizeFeedback(value); const text = richTextToPlainText(clean); if (clean.length > 20000 || text.length < 10 || text.length > 2000) return helpers.error("any.invalid"); return clean; }).messages({ "any.invalid": "Nội dung cần từ 10 đến 2000 ký tự và HTML tối đa 20000 ký tự.", "string.empty": "Vui lòng nhập nội dung.", "any.required": "Vui lòng nhập nội dung." }),
 isAnonymous: Joi.boolean().strict().required().messages({ "any.required": "Vui lòng chọn hình thức gửi.", "boolean.base": "Hình thức gửi không hợp lệ." }),
 senderName: Joi.when("isAnonymous", { is: true, then: Joi.any().strip(), otherwise: Joi.string().trim().min(2).max(100).pattern(/^[\p{L} .'-]+$/u).required().messages({ "string.empty": "Vui lòng nhập họ và tên.", "any.required": "Vui lòng nhập họ và tên.", "string.min": "Họ và tên cần ít nhất 2 ký tự.", "string.max": "Họ và tên tối đa 100 ký tự.", "string.pattern.base": "Họ và tên chỉ được chứa chữ cái, khoảng trắng và dấu . - '." }) }),
 senderEmail: Joi.when("isAnonymous", { is: true, then: Joi.any().strip(), otherwise: Joi.string().trim().lowercase().max(150).pattern(emailPattern).required().messages({ "string.empty": "Vui lòng nhập email.", "any.required": "Vui lòng nhập email.", "string.max": "Email tối đa 150 ký tự.", "string.pattern.base": "Email phải có dạng ten@asiafnb.com." }) }),
});
