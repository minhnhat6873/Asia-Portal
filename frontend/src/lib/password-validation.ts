export const PASSWORD_MAX_LENGTH = 32;
export const PASSWORD_REQUIREMENTS = "Mật khẩu từ 8 đến 32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt; không chứa khoảng trắng.";

export function getPasswordValidationError(password: string): string | undefined {
  if (!password) return "Vui lòng nhập mật khẩu.";
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (password.length > PASSWORD_MAX_LENGTH) return "Mật khẩu không được vượt quá 32 ký tự.";
  if (/\s/u.test(password)) return "Mật khẩu không được chứa khoảng trắng.";
  if (new TextEncoder().encode(password).length > 72) return "Mật khẩu chứa ký tự Unicode vượt giới hạn an toàn. Vui lòng rút ngắn hoặc dùng ít ký tự có dấu/biểu tượng hơn.";
  const missing: string[] = [];
  if (!/[a-z]/.test(password)) missing.push("chữ thường");
  if (!/[A-Z]/.test(password)) missing.push("chữ hoa");
  if (!/\d/.test(password)) missing.push("chữ số");
  if (!/[^A-Za-z0-9\s]/.test(password)) missing.push("ký tự đặc biệt");
  if (!missing.length) return undefined;
  const list = missing.length < 2 ? missing[0] : `${missing.slice(0, -1).join(", ")} và ${missing[missing.length - 1]}`;
  return `Mật khẩu còn thiếu: ${list}.`;
}
