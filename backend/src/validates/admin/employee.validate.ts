import Joi from "joi";

import { EMPLOYEE_STATUSES } from "../../interfaces/employee.interface";

const employeeFields = {
  employeeCode: Joi.string().trim().uppercase().max(20),
  name: Joi.string().trim().min(2).max(100),
  position: Joi.string().trim().min(2).max(100),
  department: Joi.string().trim().min(2).max(100),
  rank: Joi.string().trim().valid("BOD", "Executive", "Manager", "Team Leader", "Staff", "Intern"),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(150)
    .pattern(/@asiafnb\.com$/i)
    .messages({
      "string.pattern.base": "Email công việc phải có đuôi @asiafnb.com",
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^0(?:3|5|7|8|9)\d{8}$/)
    .messages({
      "string.pattern.base": "Số điện thoại Việt Nam không hợp lệ",
    }),
  location: Joi.string().trim().min(2).max(100),
  avatar: Joi.string().trim().allow("").max(500),
  joinDate: Joi.date().iso(),
  birthDate: Joi.date().iso(),
  status: Joi.string().valid(...EMPLOYEE_STATUSES),
  description: Joi.string().trim().allow("").max(2000),
};

export const createEmployeeSchema = Joi.object({
  employeeCode: employeeFields.employeeCode.required(),
  name: employeeFields.name.required(),
  position: employeeFields.position.required(),
  department: employeeFields.department.required(),
  rank: employeeFields.rank.required(),
  email: employeeFields.email.required(),
  phone: employeeFields.phone.required(),
  location: employeeFields.location.required(),
  avatar: employeeFields.avatar.default(""),
  joinDate: employeeFields.joinDate.required(),
  birthDate: employeeFields.birthDate.optional(),
  status: employeeFields.status.default("active"),
  description: employeeFields.description.default(""),
});

export const updateEmployeeSchema = Joi.object(employeeFields).min(1);

export const employeeListQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(100),
  department: Joi.string().trim().min(2).max(100),
  position: Joi.string().trim().min(2).max(100),
  rank: employeeFields.rank,
  status: employeeFields.status,
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  sort: Joi.string().valid("latest", "oldest"),
});
