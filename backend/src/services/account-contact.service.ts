import { adminAccountRepository } from "../repositories/admin/account.repository";
import { AppError } from "../utils/errors/AppError";

export interface AccountContactInput { email?: string; phone?: string; }

export const accountContactService = {
  async check({ email, phone }: AccountContactInput) {
    const [emailMatch, phoneMatch] = await Promise.all([
      email ? adminAccountRepository.findByEmail(email) : null,
      phone ? adminAccountRepository.findByPhone(phone) : null,
    ]);
    return {
      ...(email !== undefined ? { emailAvailable: !emailMatch } : {}),
      ...(phone !== undefined ? { phoneAvailable: !phoneMatch } : {}),
    };
  },

  async ensureAvailable(input: AccountContactInput): Promise<void> {
    const result = await accountContactService.check(input);
    const fieldErrors: Record<string, string> = {};
    if (result.emailAvailable === false) fieldErrors.email = "Email đã được sử dụng.";
    if (result.phoneAvailable === false) fieldErrors.phone = "Số điện thoại đã được sử dụng.";
    if (Object.keys(fieldErrors).length) throw new AppError(409, Object.values(fieldErrors).join(" "), fieldErrors);
  },
};
