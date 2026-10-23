import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema } from "joi";

export function validateBody(schema: ObjectSchema) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const fieldErrors: Record<string, string> = {};
      for (const detail of error.details) {
        const field = detail.path[0];
        if (typeof field === "string" && !fieldErrors[field]) fieldErrors[field] = detail.message;
      }
      response.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
        fieldErrors,
      });
      return;
    }

    request.body = value;
    next();
  };
}

export function validateQuery(schema: ObjectSchema) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const { error } = schema.validate(request.query, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (error) {
      response.status(400).json({
        success: false,
        message: "Tham số lọc không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
      return;
    }

    next();
  };
}
