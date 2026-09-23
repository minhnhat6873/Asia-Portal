import Joi from "joi";

import {
  ACCOUNT_ROLES,
  ACCOUNT_STATUSES,
} from "../../interfaces/account.interface";

const accountFields = {
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().trim().lowercase().email().max(150),
  password: Joi.string().min(8).max(100),
  role: Joi.string().valid(...ACCOUNT_ROLES),
  status: Joi.string().valid(...ACCOUNT_STATUSES),
  permissionGroupIds: Joi.array()
    .items(Joi.string().hex().length(24))
    .unique(),
};

export const createAccountSchema = Joi.object({
  name: accountFields.name.required(),
  email: accountFields.email.required(),
  password: accountFields.password.required(),
  role: accountFields.role.valid("manager", "user").default("manager"),
  permissionGroupIds: accountFields.permissionGroupIds,
});

export const updateAccountSchema = Joi.object({
  name: accountFields.name,
  role: accountFields.role,
  status: accountFields.status,
  permissionGroupIds: accountFields.permissionGroupIds,
}).min(1);

export const resetPasswordSchema = Joi.object({
  password: accountFields.password.required(),
});
