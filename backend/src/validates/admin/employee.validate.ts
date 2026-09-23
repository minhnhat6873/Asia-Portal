import Joi from "joi";

import { EMPLOYEE_STATUSES } from "../../interfaces/employee.interface";

const employeeFields = {
  employeeCode: Joi.string().trim().uppercase().max(20),
  name: Joi.string().trim().min(2).max(100),
  position: Joi.string().trim().min(2).max(100),
  department: Joi.string().trim().min(2).max(100),
  email: Joi.string().trim().lowercase().email().max(150),
  phone: Joi.string().trim().min(8).max(20),
  location: Joi.string().trim().min(2).max(100),
  avatar: Joi.string().trim().allow("").max(500),
  joinDate: Joi.date().iso(),
  status: Joi.string().valid(...EMPLOYEE_STATUSES),
  description: Joi.string().trim().allow("").max(2000),
};

export const createEmployeeSchema = Joi.object({
  employeeCode: employeeFields.employeeCode.required(),
  name: employeeFields.name.required(),
  position: employeeFields.position.required(),
  department: employeeFields.department.required(),
  email: employeeFields.email.required(),
  phone: employeeFields.phone.required(),
  location: employeeFields.location.required(),
  avatar: employeeFields.avatar.default(""),
  joinDate: employeeFields.joinDate.required(),
  status: employeeFields.status.default("active"),
  description: employeeFields.description.default(""),
});

export const updateEmployeeSchema = Joi.object(employeeFields).min(1);
