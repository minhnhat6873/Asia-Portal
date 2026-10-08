import type { NextFunction, Request, Response } from "express";

import type { MediaListQuery } from "../../interfaces/media.interface";
import { userMediaService } from "../../services/user/media.service";

export async function getMedia(
  request: Request<unknown, unknown, unknown, MediaListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await userMediaService.getMedia(request.query);
    response.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMediaById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await userMediaService.getMediaById(request.params.id);
    response.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
}

