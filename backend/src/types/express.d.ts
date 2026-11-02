import type { AuthenticatedAccount } from "../interfaces/account.interface";

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAccount;
      /** Internal session identity; never included in account API responses. */
      adminSessionId?: string;
    }
  }
}

export {};
