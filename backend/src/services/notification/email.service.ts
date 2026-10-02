import nodemailer from "nodemailer";

import { AppError } from "../../utils/errors/AppError";

const OTP_EXPIRY_MINUTES = 3;

function getMailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE?.trim().toLowerCase() === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass || !from) {
    throw new AppError(500, "Máy chủ chưa cấu hình dịch vụ gửi email OTP.");
  }

  return { host, port, secure, user, pass, from };
}

export const emailService = {
  async sendRegistrationOtp(email: string, code: string): Promise<void> {
    const { host, port, secure, user, pass, from } = getMailConfig();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "Mã xác thực đăng ký Asia F&B",
        text: `Mã OTP của bạn là ${code}. Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Không chia sẻ mã này với bất kỳ ai.`,
        html: `<p>Mã xác thực đăng ký Asia Food &amp; Beverage của bạn là:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Không chia sẻ mã này với bất kỳ ai.</p>`,
      });
    } catch (error) {
      console.error("Không thể gửi email OTP:", error);
      throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");
    }
  },

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    const { host, port, secure, user, pass, from } = getMailConfig();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "Mã xác thực đặt lại mật khẩu Asia F&B",
        text: `Mã OTP đặt lại mật khẩu của bạn là ${code}. Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Không chia sẻ mã này với bất kỳ ai.`,
        html: `<p>Mã xác thực đặt lại mật khẩu Asia Food &amp; Beverage của bạn là:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Không chia sẻ mã này với bất kỳ ai.</p>`,
      });
    } catch (error) {
      console.error("Không thể gửi email OTP đặt lại mật khẩu:", error);
      throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");
    }
  },
};