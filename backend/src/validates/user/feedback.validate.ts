import Joi from "joi";
import { sanitizeFeedback } from "../../utils/html/sanitizeFeedback";
import { richTextToPlainText } from "../../utils/html/sanitizeRichText";
export const createFeedbackSchema = Joi.object({
 title: Joi.string().trim().min(1).max(150).required().messages({ "string.empty": "Vui lòng nhập tiêu đề.", "string.max": "Tiêu đề tối đa 150 ký tự.", "any.required": "Vui lòng nhập tiêu đề." }),
 content: Joi.string().required().custom((value: string, helpers) => { const clean = sanitizeFeedback(value); const text = richTextToPlainText(clean); if (clean.length > 20000 || text.length < 10 || text.length > 2000) return helpers.error("any.invalid"); return clean; }).messages({ "any.invalid": "Nội dung cần từ 10 đến 2000 ký tự và HTML tối đa 20000 ký tự.", "string.empty": "Vui lòng nhập nội dung.", "any.required": "Vui lòng nhập nội dung." }),
 isAnonymous: Joi.boolean().strict().required().messages({ "any.required": "Vui lòng chọn hình thức gửi.", "boolean.base": "Hình thức gửi không hợp lệ." }),
 // The sender is the signed-in account (set by the controller), never typed into the form.
 senderName: Joi.any().strip(),
 senderEmail: Joi.any().strip(),
});
