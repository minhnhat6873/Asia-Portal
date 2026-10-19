import Joi from "joi";

import {
  PERMISSION_ACTIONS,
  PERMISSION_GROUP_STATUSES,
  PERMISSION_GROUP_COLORS,
  PERMISSION_GROUP_ICONS,
} from "../../interfaces/permission-group.interface";

const groupFields = {
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().allow("").max(500),
  color: Joi.string().valid(...PERMISSION_GROUP_COLORS),
  icon: Joi.string().valid(...PERMISSION_GROUP_ICONS),
  actions: Joi.array()
    .items(Joi.string().valid(...PERMISSION_ACTIONS))
    .unique(),
  status: Joi.string().valid(...PERMISSION_GROUP_STATUSES),
};

export const createPermissionGroupSchema = Joi.object({
  name: groupFields.name.required(),
  description: groupFields.description.default(""),
  color: groupFields.color.default("emerald"),
  icon: groupFields.icon.default("shield"),
  actions: groupFields.actions.min(1).required(),
});

export const updatePermissionGroupSchema = Joi.object({
  name: groupFields.name,
  description: groupFields.description,
  color: groupFields.color,
  icon: groupFields.icon,
  actions: groupFields.actions.min(1),
  status: groupFields.status,
}).min(1);
