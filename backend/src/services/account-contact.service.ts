import { adminAccountRepository } from "../repositories/admin/account.repository";
import { AppError } from "../utils/errors/AppError";

export interface AccountContactInput { username?: string; email?: string; phone?: string; }

export const accountContactService = {
  async check({ username, email, phone }: AccountContactInput) {
    const [usernameMatch, emailMatch, phoneMatch] = await Promise.all([
      username ? adminAccountRepository.findByUsername(username) : null,
      email ? adminAccountRepository.findByEmail(email) : null,
      phone ? adminAccountRepository.findByPhone(phone) : null,
    ]);
    return {
      ...(username !== undefined ? { usernameAvailable: !usernameMatch } : {}),
      ...(email !== undefined ? { emailAvailable: !emailMatch } : {}),
      ...(phone !== undefined ? { phoneAvailable: !phoneMatch } : {}),
    };
  },

  async ensureAvailable(input: AccountContactInput): Promise<void> {
    const result = await accountContactService.check(input);
    const fieldErrors: Record<string, string> = {};
    if (result.usernameAvailable === false) fieldErrors.username = "Tên đăng nhập đã được sử dụng.";
    if (result.emailAvailable === false) fieldErrors.email = "Email đã được sử dụng.";
    if (result.phoneAvailable === false) fieldErrors.phone = "Số điện thoại đã được sử dụng.";
    if (Object.keys(fieldErrors).length) throw new AppError(409, Object.values(fieldErrors).join(" "), fieldErrors);
  },
};
