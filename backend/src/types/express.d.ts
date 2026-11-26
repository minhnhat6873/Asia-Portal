import type { AccountRole, AuthenticatedAccount } from "../interfaces/account.interface";

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAccount;
      /** Internal session identity; never included in account API responses. */
      adminSessionId?: string;
      /** Signed-in user-portal account (always user-level access). */
      user?: AuthenticatedAccount;
      /** User-portal session details; never included in API responses. */
      userSession?: { id: string; accountRole: AccountRole; persistent: boolean; expiresAt: Date };
    }
  }
}

export {};
