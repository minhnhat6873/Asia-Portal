import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(150).required(),
  password: Joi.string().min(8).max(100).required(),
});