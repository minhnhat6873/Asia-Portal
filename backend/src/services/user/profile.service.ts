import type { AuthenticatedAccount } from "../../interfaces/account.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";
import { AppError } from "../../utils/errors/AppError";

/**
 * The user portal always works with user-level access. canAccessAdmin only tells the site
 * to show the "Vào trang quản trị" link; the admin portal still asks for its own sign-in.
 */
async function load(user: AuthenticatedAccount) {
  const [account, employee] = await Promise.all([
    adminAccountRepository.findActiveById(user.id),
    adminEmployeeRepository.findByEmail(user.email),
  ]);
  if (!account) throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
  return { account, employee };
}

const canAccessAdmin = (role: string) => role === "admin" || role === "manager";

export const userProfileService = {
  /** What the header and account menu need. */
  async summary(user: AuthenticatedAccount) {
    const { account, employee } = await load(user);
    return {
      ...user,
      canAccessAdmin: canAccessAdmin(account.role),
      position: employee?.position ?? "",
      department: employee?.department ?? "",
      // Own picture first, then the HR photo.
      avatar: account.avatar || employee?.avatar || "",
      customAvatar: Boolean(account.avatar),
    };
  },

  /** Read-only "Thông tin cá nhân": the account plus the linked employee record (same email). */
  async profile(user: AuthenticatedAccount) {
    const { account, employee } = await load(user);
    return {
      account: {
        name: account.name, email: account.email, phone: account.phone ?? "",
        createdAt: account.createdAt, canAccessAdmin: canAccessAdmin(account.role),
        avatar: account.avatar || employee?.avatar || "",
        customAvatar: Boolean(account.avatar),
      },
      employee: employee ? {
        employeeCode: employee.employeeCode, name: employee.name, position: employee.position,
        department: employee.department, phone: employee.phone, location: employee.location,
        avatar: employee.avatar, joinDate: employee.joinDate,
      } : null,
    };
  },
};
