import Joi from "joi";

export const registerAccountSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().max(150).required(),
  password: Joi.string().min(8).max(100).required(),
});
