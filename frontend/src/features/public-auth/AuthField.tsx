"use client";
import { Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { initial, validate, type FieldName, type Mode } from "./validation";
export default function AuthField({
  name,
  mode,
  values,
  setValues,
  errors,
  setErrors,
}: {
  name: FieldName;
  mode: Mode;
  values: typeof initial;
  setValues: React.Dispatch<React.SetStateAction<typeof initial>>;
  errors: Partial<Record<FieldName, string>>;
  setErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<FieldName, string>>>
  >;
}) {
  const [visible, setVisible] = useState({ password: false, confirm: false });
  const field = (name: FieldName) => {
    const password = name === "password" || name === "confirm";
    const labels: Record<FieldName, string> = {
      name: "Họ và tên",
      phone: "Số điện thoại",
      email:
        mode === "forgot-password"
          ? "Email đã đăng ký"
          : mode === "login"
            ? "Tên đăng nhập"
            : "Email công ty",
      password: "Mật khẩu",
      confirm: "Xác nhận mật khẩu",
    };
    const placeholders: Record<FieldName, string> = {
      name: "Nguyễn Minh An",
      phone: "09xx xxx xxx",
      email: mode === "login" ? "Tên đăng nhâp" : "ten@example.com",
      password: mode === "register" ? "Tạo mật khẩu" : "Nhập mật khẩu",
      confirm: "Nhập lại mật khẩu",
    };
    const Icon =
      name === "email"
        ? mode === "login" ? UserRound : Mail
        : name === "phone"
          ? Phone
          : name === "name"
            ? UserRound
            : LockKeyhole;
    const id = `${mode}-${name}`,
      show = password && visible[name];
    return (
      <div className="field" key={name}>
        <div className="above">
          <label htmlFor={id}>{labels[name]}</label>
        </div>
        <div className={`input-wrap ${errors[name] ? "invalid" : ""}`}>
          <Icon className="icon" aria-hidden="true" />
          <input
            id={id}
            type={
              password
                ? show
                  ? "text"
                  : "password"
                : name === "email"
                  ? mode === "login" ? "text" : "email"
                  : name === "phone"
                    ? "tel"
                    : "text"
            }
            maxLength={password ? 32 : name === "email" ? 150 : name === "phone" ? 30 : 100}
            value={values[name]}
            placeholder={placeholders[name]}
            autoComplete={
              name === "password"
                ? mode === "login"
                  ? "current-password"
                  : "new-password"
                : name === "confirm"
                  ? "new-password"
                  : name === "phone"
                    ? "tel-national"
                    : name === "email" && mode === "login"
                      ? "username"
                      : name
            }
            aria-invalid={!!errors[name]}
            aria-describedby={`${id}-error${mode === "register" && name === "password" ? ` ${id}-hint` : ""}`}
            required
            onChange={(e) => {
              const next = { ...values, [name]: e.target.value };
              setValues(next);
              if (errors[name])
                setErrors((prev) => ({
                  ...prev,
                  [name]: validate(name, e.target.value, next, mode),
                }));
              if (name === "password" && next.confirm)
                setErrors((prev) => ({
                  ...prev,
                  confirm: validate("confirm", next.confirm, next, mode),
                }));
            }}
          />
          {password && (
            <button
              type="button"
              className="eye"
              aria-label={`${show ? "Ẩn" : "Hiện"} ${labels[name].toLowerCase()}`}
              onClick={() => setVisible((v) => ({ ...v, [name]: !v[name] }))}
            >
              {show ? <EyeOff className="icon" /> : <Eye className="icon" />}
            </button>
          )}
        </div>
        {mode === "register" && name === "confirm" && (
          <p className="help" id={`${mode}-password-hint`}>
            8–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
          </p>
        )}
        <p className="error" id={`${id}-error`} hidden={!errors[name]}>
          {errors[name]}
        </p>
      </div>
    );
  };

  return field(name);
}
