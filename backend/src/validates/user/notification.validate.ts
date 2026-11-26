import Joi from "joi";

export const notificationListQuerySchema = Joi.object({
  before: Joi.date().iso().messages({ "date.base": "Thời điểm không hợp lệ.", "date.format": "Thời điểm không hợp lệ." }),
});
