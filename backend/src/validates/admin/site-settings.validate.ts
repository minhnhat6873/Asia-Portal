import Joi from "joi";

export const siteSettingsSchema = Joi.object({ internalSystemsEnabled: Joi.boolean().strict().required() }).unknown(false);
