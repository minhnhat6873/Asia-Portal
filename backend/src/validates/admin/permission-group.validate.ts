import Joi from "joi";

import {
  PERMISSION_ACTIONS,
  PERMISSION_GROUP_STATUSES,
} from "../../interfaces/permission-group.interface";

const groupFields = {
  name: Joi.string().trim().min(2).max(100),
  actions: Joi.array()
    .items(Joi.string().valid(...PERMISSION_ACTIONS))
    .unique(),
  status: Joi.string().valid(...PERMISSION_GROUP_STATUSES),
};

export const createPermissionGroupSchema = Joi.object({
  name: groupFields.name.required(),
  actions: groupFields.actions.min(1).required(),
});

export const updatePermissionGroupSchema = Joi.object({
  name: groupFields.name,
  actions: groupFields.actions.min(1),
  status: groupFields.status,
}).min(1);
