"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";

type Mode = "login" | "register" | "forgot-password";
type FieldName = "name" | "phone" | "email" | "password" | "confirm";
const initial: Record<FieldName,string> = {name:"",phone:"",email:"",password:"",confirm:""};
const storageKey = "asia-portal.auth-preview.remembered-email";
function validate(name: FieldName, value: string, values: typeof initial, mode: Mode): string {
  if (name === "email") return !value.trim() ? "Vui lòng nhập địa chỉ email." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim()) ? "Địa chỉ email chưa đúng định dạng." : !/^[a-z0-9._%+-]+@asiafnb\.com$/i.test(value.trim()) ? "Vui lòng dùng email công ty có đuôi @asiafnb.com." : "";
  if (name === "name") return !value.trim() ? "Vui lòng nhập họ và tên." : value.trim().length < 2 || value.trim().length > 100 ? "Họ và tên cần có từ 2 đến 100 ký tự." : !/^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)*$/u.test(value.trim()) ? "Họ và tên chưa hợp lệ." : "";
  if (name === "phone") return !value.trim() ? "Vui lòng nhập số điện thoại." : !/^0[35789]\d{8}$/.test(value.trim().replace(/[\s.-]/g,"")) ? "Nhập số di động Việt Nam gồm 10 chữ số, bắt đầu bằng 0." : "";
  if (name === "confirm") return !value ? "Vui lòng nhập lại mật khẩu." : value !== values.password ? "Hai mật khẩu chưa khớp." : "";
  if (!value) return mode === "register" ? "Vui lòng tạo mật khẩu." : "Vui lòng nhập mật khẩu.";
  if (mode === "register" && /[^\x00-\x7F]/.test(value)) return "Mật khẩu chỉ được dùng ký tự không dấu.";
  if (mode === "register" && (value.length < 8 || value.length > 32 || /\s/u.test(value) || new TextEncoder().encode(value).length > 72 || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9\s]/.test(value))) return "Mật khẩu cần 8–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt, không chứa khoảng trắng.";
  return "";
}
const titles: Record<Mode,string> = {login:"Đăng nhập",register:"Đăng ký tài khoản","forgot-password":"Quên mật khẩu"};
export default function AuthForm({mode}:{mode:Mode}) {
  const [values,setValues] = useState(initial), [errors,setErrors] = useState<Partial<Record<FieldName,string>>>({}), [visible,setVisible] = useState({password:false,confirm:false}), [remember,setRemember] = useState(false), [notice,setNotice] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"email" | "otp" | "password">("email");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [registerOtp, setRegisterOtp] = useState(false);
  const [registerComplete, setRegisterComplete] = useState(false);
  useEffect(() => { if (mode !== "login") return; const timer = setTimeout(() => { try { const saved=localStorage.getItem(storageKey); if (saved) { setValues(v=>({...v,email:saved})); setRemember(true); } } catch {} }, 0); return () => clearTimeout(timer); },[mode]);
  const fields: FieldName[] = mode === "register" ? ["name","phone","email","password","confirm"] : mode === "login" ? ["email","password"] : ["email"];
  function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const next:Partial<Record<FieldName,string>>={}; fields.forEach(field=>{ next[field]=validate(field,values[field],values,mode); }); setErrors(next); setNotice("");
    const first=fields.find(field=>next[field]); if (first) { document.getElementById(`${mode}-${first}`)?.focus(); return; }
    if (mode === "forgot-password") { setRecoveryStep("otp"); return; }
    if (mode === "register") { setRegisterOtp(true); return; }
    if (mode === "login") { try { if (remember) localStorage.setItem(storageKey,values.email.trim()); else localStorage.removeItem(storageKey); } catch {} }
    setValues(v=>({...v,password:"",confirm:""})); setVisible({password:false,confirm:false}); setNotice("Biểu mẫu hợp lệ. Chức năng xác thực người dùng đang chờ kết nối hệ thống.");
  }
  const field = (name:FieldName) => {
    const password=name === "password" || name === "confirm";
    const labels:Record<FieldName,string>={name:"Họ và tên",phone:"Số điện thoại",email:mode === "forgot-password" ? "Email đã đăng ký" : "Email công ty",password:"Mật khẩu",confirm:"Xác nhận mật khẩu"};
    const placeholders:Record<FieldName,string>={name:"Nguyễn Minh An",phone:"09xx xxx xxx",email:"ten@asiafnb.com",password:mode === "register" ? "Tạo mật khẩu" : "Nhập mật khẩu",confirm:"Nhập lại mật khẩu"};
    const Icon=name === "email" ? Mail : name === "phone" ? Phone : name === "name" ? UserRound : LockKeyhole;
    const id=`${mode}-${name}`, show=password && visible[name];
    return <div className="field" key={name}><div className="above"><label htmlFor={id}>{labels[name]}</label></div><div className={`input-wrap ${errors[name] ? "invalid" : ""}`}><Icon className="icon" aria-hidden="true"/><input id={id} type={password ? show ? "text" : "password" : name === "email" ? "email" : name === "phone" ? "tel" : "text"} value={values[name]} placeholder={placeholders[name]} autoComplete={name === "password" ? mode === "login" ? "current-password" : "new-password" : name === "confirm" ? "new-password" : name === "phone" ? "tel-national" : name === "email" && mode === "login" ? "username" : name} aria-invalid={!!errors[name]} aria-describedby={`${id}-error${mode === "register" && name === "password" ? ` ${id}-hint` : ""}`} required onChange={e=>{const next={...values,[name]:e.target.value}; setValues(next); setNotice(""); if (errors[name]) setErrors(prev=>({...prev,[name]:validate(name,e.target.value,next,recoveryStep === "password" ? "register" : mode)})); if (name === "password" && next.confirm) setErrors(prev=>({...prev,confirm:validate("confirm",next.confirm,next,mode)}));}} />{password && <button type="button" className="eye" aria-label={`${show ? "Ẩn" : "Hiện"} ${labels[name].toLowerCase()}`} onClick={()=>setVisible(v=>({...v,[name]:!v[name]}))}>{show ? <EyeOff className="icon"/> : <Eye className="icon"/>}</button>}</div>{mode === "register" && name === "confirm" && <p className="help" id={`${mode}-password-hint`}>8–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>}<p className="error" id={`${id}-error`} hidden={!errors[name]}>{errors[name]}</p></div>;
  };
  if (mode === "register" && registerComplete) {
    return <section className="view" aria-labelledby="register-success-title">
      <header className="intro"><h1 id="register-success-title">Tạo tài khoản thành công</h1><p>Giao diện xem trước. Tài khoản sẽ được tạo sau khi kết nối hệ thống xác thực.</p></header>
      <Link className="primary" href="/login">Quay về đăng nhập <ArrowRight className="icon"/></Link>
    </section>;
  }
  if (mode === "register" && registerOtp) {
    return <section className="view" aria-labelledby="register-otp-title">
      <header className="intro"><h1 id="register-otp-title">Xác nhận email</h1><p>Nhập mã OTP gồm 6 chữ số cho email <strong>{values.email.trim()}</strong>.</p></header>
      <form noValidate onSubmit={(event) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(otp)) {
          setOtpError("Vui lòng nhập mã OTP gồm 6 chữ số.");
          document.getElementById("register-otp")?.focus();
          return;
        }
        setOtpError("");
        setValues(current => ({...current, password: "", confirm: ""}));
        setOtp("");
        setRegisterComplete(true);
      }}>
        <div className="field"><div className="above"><label htmlFor="register-otp">Mã xác thực</label></div><div className={`input-wrap ${otpError ? "invalid" : ""}`}><LockKeyhole className="icon" aria-hidden="true"/><input id="register-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Nhập mã 6 chữ số" value={otp} aria-invalid={!!otpError} aria-describedby="register-otp-error" onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); setNotice(""); }}/></div><p className="error" id="register-otp-error" role="alert" hidden={!otpError}>{otpError}</p></div>
        <button className="primary" type="submit">Xác nhận <ArrowRight className="icon"/></button>
        <p className="help">Giao diện xem trước. Mã chưa được gửi đến email.</p>
        <p className="notice" role="status" aria-live="polite">{notice}</p>
      </form>
      <p className="switch"><button className="recovery-back" type="button" onClick={() => { setOtp(""); setOtpError(""); setNotice(""); setRegisterOtp(false); }}><ArrowLeft className="icon"/>Quay lại đăng ký</button></p>
    </section>;
  }
  if (mode === "forgot-password" && recoveryStep === "otp") {
    return <section className="view" aria-labelledby="otp-title">
      <header className="intro"><h1 id="otp-title">Nhập mã xác thực</h1><p>Nhập mã OTP gồm 6 chữ số cho email <strong>{values.email.trim()}</strong>.</p></header>
      <form noValidate onSubmit={(event) => { event.preventDefault(); if (!/^\d{6}$/.test(otp)) { setOtpError("Vui lòng nhập mã OTP gồm 6 chữ số."); document.getElementById("recovery-otp")?.focus(); return; } setOtpError(""); setRecoveryStep("password"); }}>
        <div className="field"><div className="above"><label htmlFor="recovery-otp">Mã xác thực</label></div><div className={`input-wrap ${otpError ? "invalid" : ""}`}><LockKeyhole className="icon" aria-hidden="true"/><input id="recovery-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Nhập mã 6 chữ số" value={otp} aria-invalid={!!otpError} aria-describedby="recovery-otp-error" onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}/></div><p className="error" id="recovery-otp-error" role="alert" hidden={!otpError}>{otpError}</p></div>
        <button className="primary" type="submit">Tiếp tục <ArrowRight className="icon"/></button>
        <p className="help">Giao diện xem trước. Mã chưa được gửi hoặc xác thực.</p>
      </form>
      <p className="switch"><button className="recovery-back" type="button" onClick={() => { setOtp(""); setOtpError(""); setRecoveryStep("email"); }}><ArrowLeft className="icon"/>Đổi email</button></p>
    </section>;
  }
  if (mode === "forgot-password" && recoveryStep === "password") {
    return <section className="view" aria-labelledby="reset-title">
      <header className="intro"><h1 id="reset-title">Đặt lại mật khẩu</h1><p>Tạo mật khẩu mới cho tài khoản {values.email.trim()}.</p></header>
      <form noValidate onSubmit={(event) => { event.preventDefault(); const next = {password: validate("password", values.password, values, "register"), confirm: validate("confirm", values.confirm, values, "register")}; setErrors(next); const first = next.password ? "password" : next.confirm ? "confirm" : null; if (first) { document.getElementById(`${mode}-${first}`)?.focus(); return; } setValues(current => ({...current, password: "", confirm: ""})); setVisible({password: false, confirm: false}); setNotice("Giao diện xem trước. Mật khẩu chưa được thay đổi vì chưa kết nối hệ thống."); }}>
        <div className="fields">{field("password")}{field("confirm")}</div>
        <p className="help">8–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
        <button className="primary" type="submit">Đặt lại mật khẩu <ArrowRight className="icon"/></button>
        <p className="notice" role="status" aria-live="polite">{notice}</p>
      </form>
      <p className="switch"><button className="recovery-back" type="button" onClick={() => { setValues(current => ({...current, password: "", confirm: ""})); setErrors({}); setNotice(""); setRecoveryStep("otp"); }}><ArrowLeft className="icon"/>Quay lại nhập mã</button></p>
    </section>;
  }
  return <section className="view" aria-labelledby={`${mode}-title`}><header className="intro"><h1 id={`${mode}-title`}>{titles[mode]}</h1>{mode === "login" && <p>Truy Cập Cổng Thông Tin Nội Bộ Asia Food &amp; Beverage</p>}{mode === "forgot-password" && <p>Nhập email đã đăng ký để nhận mã xác thực.</p>}</header><form noValidate onSubmit={submit}><div className="fields">{mode === "register" ? <><div className="field-pair">{field("name")}{field("phone")}</div>{fields.slice(2).map(field)}</> : fields.map(field)}</div>{mode === "login" && <div className="options"><label className="remember"><input type="checkbox" checked={remember} onChange={e=>{setRemember(e.target.checked); if (!e.target.checked) {try {localStorage.removeItem(storageKey);} catch {}}}}/>Ghi nhớ email</label><Link href="/forgot-password">Quên mật khẩu?</Link></div>}<button className="primary" type="submit">{mode === "forgot-password" ? "Gửi mã xác thực" : mode === "register" ? "Đăng ký" : "Đăng nhập"}<ArrowRight className="icon"/></button><p className="notice" role="status" aria-live="polite">{notice}</p></form>{mode !== "login" && <p className="switch">{mode === "register" ? "Đã có tài khoản?" : ""}<Link href="/login">{mode === "forgot-password" && <ArrowLeft className="icon"/>}{mode === "forgot-password" ? "Quay lại đăng nhập" : "Đăng nhập"}</Link></p>}</section>;
}
