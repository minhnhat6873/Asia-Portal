import type { AuthenticatedAccount } from "../interfaces/account.interface";

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAccount;
    }
  }
}

export {};
