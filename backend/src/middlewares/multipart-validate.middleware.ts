import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema } from "joi";

import { removeVehicleReceiptFiles } from "../utils/vehicle/receipts";

/**
 * Multipart forms send the JSON body as one text field "payload" next to the files.
 * Parses it into request.body; a plain JSON request (no files) passes through unchanged.
 * On bad JSON the uploaded trip pictures are removed.
 */
export async function parseVehicleJsonPayload(request: Request, response: Response, next: NextFunction): Promise<void> {
  const payload = (request.body as { payload?: unknown } | undefined)?.payload;
  if (typeof payload !== "string") { next(); return; }
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    request.body = parsed;
    next();
  } catch {
    const files = (Array.isArray(request.files) ? request.files : []) as (Express.Multer.File & { filename?: string })[];
    await removeVehicleReceiptFiles(files.map((file) => file.filename));
    response.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
  }
}

/** Validates multipart text fields after the upload; on error the uploaded trip pictures are removed. */
export function validateVehicleMultipart(schema: ObjectSchema) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const { error, value } = schema.validate(request.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (!error) { request.body = value; next(); return; }
    const files = (Array.isArray(request.files) ? request.files : []) as (Express.Multer.File & { filename?: string })[];
    await removeVehicleReceiptFiles(files.map((file) => file.filename));
    const fieldErrors: Record<string, string> = {};
    for (const detail of error.details) {
      const field = detail.path[0];
      if (typeof field === "string" && !fieldErrors[field]) fieldErrors[field] = detail.message;
    }
    response.status(400).json({ success: false, message: "Dữ liệu không hợp lệ", errors: error.details.map((detail) => detail.message), fieldErrors });
  };
}
