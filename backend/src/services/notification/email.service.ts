import { existsSync } from "fs";
import path from "path";
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
    const logoPath = path.resolve(process.cwd(), "..", "frontend", "public", "assets", "images", "asia-logo.png");
    const logoAttachment = existsSync(logoPath)
      ? [{ filename: "asia-logo.png", path: logoPath, cid: "asia-fnb-logo" }]
      : [];
    const otpBoxes = code
      .split("")
      .map((digit) => `<td style="width:48px;height:52px;border:1px solid #cce8da;border-radius:8px;background:#ffffff;text-align:center;font-family:Arial,sans-serif;font-size:30px;line-height:52px;font-weight:700;color:#08744d;">${digit}</td>`)
      .join('<td style="width:8px"></td>');

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "Mã xác thực (OTP) đặt lại mật khẩu Asia F&B",
        text: `Mã OTP đặt lại mật khẩu của bạn là ${code}. Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Không chia sẻ mã này với bất kỳ ai.`,
        attachments: logoAttachment,
        html: `
          <div style="margin:0;padding:24px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#173b35;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4efe9;overflow:hidden;">
              <tr>
                <td style="padding:30px 34px 14px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="width:56px;height:56px;text-align:center;vertical-align:middle;"><img src="cid:asia-fnb-logo" width="56" height="56" alt="Asia Food &amp; Beverage" style="display:block;width:56px;height:56px;border:0;outline:none;" /></td>
                      <td style="padding-left:14px;vertical-align:middle;">
                        <div style="font-size:25px;line-height:30px;font-weight:700;color:#123d37;">Mã xác thực <span style="color:#08744d;">(OTP)</span></div>
                        <div style="margin-top:3px;font-size:14px;line-height:20px;color:#71817d;">Đặt lại mật khẩu Asia Food &amp; Beverage</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 34px 8px;font-size:14px;line-height:21px;color:#2f4540;">
                  <p style="margin:0 0 10px;font-weight:700;">Xin chào,</p>
                  <p style="margin:0 0 7px;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>Asia Food &amp; Beverage</strong>.</p>
                  <p style="margin:0;">Vui lòng sử dụng mã xác thực bên dưới để tiếp tục:</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 34px 12px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf9f1;border-radius:12px;">
                    <tr><td style="padding:12px 16px;text-align:center;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr>${otpBoxes}</tr></table></td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 34px 18px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf9f1;border-radius:10px;">
                    <tr>
                      <td style="padding:13px 16px;width:26px;vertical-align:top;font-size:20px;color:#0b9a64;">◷</td>
                      <td style="padding:12px 14px 12px 0;font-size:12px;line-height:18px;color:#526560;">
                        <strong style="font-size:13px;color:#173b35;">Mã có hiệu lực trong <span style="color:#08744d;">${OTP_EXPIRY_MINUTES} phút</span></strong><br />
                        Vì lý do bảo mật, vui lòng không chia sẻ mã này với bất kỳ ai.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 34px 28px;border-top:1px solid #edf1ef;text-align:center;font-size:11px;line-height:17px;color:#82918d;">
                  Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này<br />hoặc liên hệ với bộ phận IT nếu cần hỗ trợ.
                </td>
              </tr>
            </table>
          </div>`,
      });
    } catch (error) {
      console.error("Không thể gửi email OTP đặt lại mật khẩu:", error);
      throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");
    }
  },
};
