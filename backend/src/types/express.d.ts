import type { AuthenticatedAdmin } from "../interfaces/admin.interface";

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export {};