import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema } from "joi";

export function validateBody(schema: ObjectSchema) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      response.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
      return;
    }

    request.body = value;
    next();
  };
}