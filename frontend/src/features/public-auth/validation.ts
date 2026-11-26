export type Mode = "login" | "register" | "forgot-password";
export type FieldName = "name" | "phone" | "email" | "password" | "confirm";
export const initial: Record<FieldName, string> = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirm: "",
};
// Frontend checks only the shape of the address. Which addresses may sign up is
// decided by the backend, so the allowed domain never ships in browser code.
const EMAIL_FORMAT =
  /^[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

// Backend field names differ from the form for the confirmation field.
const API_FIELDS: Record<string, FieldName> = {
  name: "name",
  phone: "phone",
  email: "email",
  password: "password",
  confirmPassword: "confirm",
};
export function fieldErrorsFromApi(
  fieldErrors: Record<string, string>,
): Partial<Record<FieldName, string>> {
  const result: Partial<Record<FieldName, string>> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    const field = API_FIELDS[key];
    if (field && message) result[field] = message;
  }
  return result;
}

export function validate(
  name: FieldName,
  value: string,
  values: typeof initial,
  mode: Mode,
): string {
  // Login: the field is the username (any name, often the email); only presence is checked.
  if (name === "email" && mode === "login")
    return value.trim() ? "" : "Vui lòng nhập tên đăng nhập.";
  if (name === "email")
    return !value.trim()
      ? "Vui lòng nhập địa chỉ email."
      : value.trim().length > 150 || !EMAIL_FORMAT.test(value.trim())
        ? "Email không đúng định dạng."
        : "";
  if (name === "name")
    return !value.trim()
      ? "Vui lòng nhập họ và tên."
      : value.trim().length < 2 || value.trim().length > 100
        ? "Họ và tên cần có từ 2 đến 100 ký tự."
        : !/^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)*$/u.test(
              value.trim(),
            )
          ? "Họ và tên chưa hợp lệ."
          : "";
  if (name === "phone")
    return !value.trim()
      ? "Vui lòng nhập số điện thoại."
      : !/^0[35789]\d{8}$/.test(value.trim().replace(/[\s.-]/g, "").replace(/^\+84/, "0"))
        ? "Nhập số di động Việt Nam gồm 10 chữ số, bắt đầu bằng 0."
        : "";
  if (name === "confirm")
    return !value
      ? "Vui lòng nhập lại mật khẩu."
      : value !== values.password
        ? "Hai mật khẩu chưa khớp."
        : "";
  if (!value)
    return mode === "register"
      ? "Vui lòng tạo mật khẩu."
      : "Vui lòng nhập mật khẩu.";
  // Login must not reveal the password policy; a wrong password gets the
  // backend's generic "email or password is incorrect" message instead.
  if (mode === "login") return "";
  if (/[^\x00-\x7F]/.test(value))
    return "Mật khẩu chỉ được dùng ký tự không dấu.";
  if (
    (value.length < 8 ||
      value.length > 32 ||
      /\s/u.test(value) ||
      new TextEncoder().encode(value).length > 72 ||
      !/[A-Z]/.test(value) ||
      !/[a-z]/.test(value) ||
      !/\d/.test(value) ||
      !/[^A-Za-z0-9\s]/.test(value))
  )
    return "Mật khẩu cần 8–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt, không chứa khoảng trắng.";
  return "";
}
