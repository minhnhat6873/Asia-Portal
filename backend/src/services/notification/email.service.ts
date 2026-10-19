import { existsSync } from "fs";
import path from "path";
import nodemailer from "nodemailer";

import { OTP_EXPIRY_MS } from "../../config/otp.config";
import { AppError } from "../../utils/errors/AppError";
import { escapeHtml } from "../../utils/html/escapeHtml";

const OTP_EXPIRY_MINUTES = 3;

export interface MeetingOtpEmailDetails {
  title: string;
  roomName: string;
  floor: string;
  date: string;
  start: string;
  end: string;
  organizer: string;
}

export interface MeetingReminderEmailDetails extends MeetingOtpEmailDetails {
  attendees: number;
  department: string;
}

type MeetingOtpAction = "đặt" | "hủy";

function getMeetingOtpEmailHtml(code: string, details: MeetingOtpEmailDetails, action: MeetingOtpAction): string {
  const safe = {
    code: escapeHtml(code),
    title: escapeHtml(details.title),
    roomName: escapeHtml(details.roomName),
    floor: escapeHtml(details.floor),
    date: escapeHtml(details.date),
    start: escapeHtml(details.start),
    end: escapeHtml(details.end),
    organizer: escapeHtml(details.organizer),
    action: escapeHtml(action),
  };

  return `
    <div style="margin:0;padding:24px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#173b35;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4efe9;overflow:hidden;">
        <tr>
          <td style="padding:30px 34px 14px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="width:56px;height:56px;text-align:center;vertical-align:middle;"><img src="cid:asia-fnb-logo" width="56" height="56" alt="Asia Food &amp; Beverage" style="display:block;width:56px;height:56px;border:0;outline:none;" /></td>
                <td style="padding-left:14px;vertical-align:middle;">
                  <div style="font-size:25px;line-height:30px;font-weight:700;color:#123d37;">Mã xác thực <span style="color:#08744d;">(OTP)</span></div>
                  <div style="margin-top:3px;font-size:14px;line-height:20px;color:#71817d;">${safe.action === "hủy" ? "Xác nhận hủy lịch phòng họp" : "Xác nhận đặt phòng họp"} · Asia Food &amp; Beverage</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 34px 8px;font-size:14px;line-height:21px;color:#2f4540;">
            <p style="margin:0 0 10px;font-weight:700;">Xin chào ${safe.organizer},</p>
            <p style="margin:0 0 7px;">${safe.action === "hủy" ? "Mã này dùng để xác nhận HỦY lịch phòng họp sau:" : "Mã này dùng để xác nhận đặt lịch phòng họp sau:"}</p>
            <p style="margin:0;"><strong>${safe.title}</strong></p>
            <p style="margin:4px 0 0;">${safe.roomName} · ${safe.floor}</p>
            <p style="margin:4px 0 0;">${safe.date}, ${safe.start}–${safe.end}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 34px 12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf9f1;border-radius:12px;">
              <tr><td style="padding:18px;text-align:center;font-family:Arial,sans-serif;font-size:30px;line-height:38px;font-weight:700;letter-spacing:8px;color:#08744d;">${safe.code}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 34px 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf9f1;border-radius:10px;">
              <tr>
                <td style="padding:13px 16px;width:26px;vertical-align:top;font-size:20px;color:#0b9a64;">◷</td>
                <td style="padding:12px 14px 12px 0;font-size:12px;line-height:18px;color:#526560;">
                  <strong style="font-size:13px;color:#173b35;">Mã có hiệu lực trong <span style="color:#08744d;">${OTP_EXPIRY_MS / 60_000} phút</span></strong><br />
                  Vì lý do bảo mật, vui lòng không chia sẻ mã OTP này với bất kỳ ai.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 34px 28px;border-top:1px solid #edf1ef;text-align:center;font-size:11px;line-height:17px;color:#82918d;">
            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
          </td>
        </tr>
      </table>
    </div>`;
}

function getLogoAttachment() {
  const logoPath = path.resolve(process.cwd(), "..", "frontend", "public", "assets", "images", "asia-logo.png");
  return existsSync(logoPath)
    ? [{ filename: "asia-logo.png", path: logoPath, cid: "asia-fnb-logo" }]
    : [];
}

async function sendMeetingOtp(
  email: string,
  code: string,
  details: MeetingOtpEmailDetails,
  action: MeetingOtpAction,
): Promise<void> {
  const { host, port, secure, user, pass, from } = getMailConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: action === "hủy"
        ? "Mã xác thực (OTP) hủy lịch phòng họp Asia F&B"
        : "Mã xác thực (OTP) đặt phòng họp Asia F&B",
      text: [
        `Mã OTP xác nhận ${action} lịch phòng họp của bạn là ${code}.`,
        `Cuộc họp: ${details.title}.`,
        `Phòng: ${details.roomName} - ${details.floor}.`,
        `Thời gian: ${details.date}, ${details.start}-${details.end}.`,
        `Người đặt: ${details.organizer}.`,
        `Mã có hiệu lực trong ${OTP_EXPIRY_MS / 60_000} phút. Không chia sẻ mã OTP này với bất kỳ ai.`,
      ].join(" "),
      attachments: getLogoAttachment(),
      html: getMeetingOtpEmailHtml(code, details, action),
    });

    const acceptedRecipient = info.accepted.some(
      (address) => address.toLowerCase() === email.toLowerCase(),
    );

    if (!acceptedRecipient || info.rejected.length > 0) {
      throw new Error("SMTP did not accept the recipient.");
    }
  } catch {
    console.error("Không thể gửi email OTP lịch phòng họp.");
    throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");
  }
}

function getMeetingReminderEmailHtml(details: MeetingReminderEmailDetails): string {
  const safe = {
    title: escapeHtml(details.title),
    roomName: escapeHtml(details.roomName),
    floor: escapeHtml(details.floor),
    date: escapeHtml(details.date.split("-").reverse().join("/")),
    start: escapeHtml(details.start),
    end: escapeHtml(details.end),
    organizer: escapeHtml(details.organizer),
    department: escapeHtml(details.department),
    attendees: escapeHtml(String(details.attendees)),
  };

  return `
    <div style="margin:0;padding:24px 12px;background:#f4faf6;font-family:Arial,Helvetica,sans-serif;color:#173b35;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4efe9;overflow:hidden;">
        <tr><td style="padding:28px 32px 18px;background:#08744d;color:#ffffff;">
          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d5f5df;">Asia Food &amp; Beverage co.ltd</div>
          <h1 style="margin:8px 0 0;font-size:23px;line-height:30px;">Nhắc lịch họp</h1>
          <p style="margin:5px 0 0;font-size:14px;color:#e5f5ea;">Cuộc họp của bạn sẽ bắt đầu sau khoảng 30 phút.</p>
        </td></tr>
        <tr><td style="padding:24px 32px 10px;font-size:14px;line-height:22px;color:#2f4540;">
          <p style="margin:0 0 14px;font-weight:700;">Xin chào ${safe.organizer},</p>
          <p style="margin:0 0 6px;">Đây là email nhắc lịch cuộc họp đã đặt:</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#123d37;">${safe.title}</p>
          <p style="margin:12px 0 0;"><strong>Phòng:</strong> ${safe.roomName} · ${safe.floor}</p>
          <p style="margin:4px 0 0;"><strong>Thời gian:</strong> ${safe.date}, ${safe.start}–${safe.end}</p>
          <p style="margin:4px 0 0;"><strong>Phòng ban:</strong> ${safe.department}</p>
          <p style="margin:4px 0 0;"><strong>Số người tham dự:</strong> ${safe.attendees}</p>
        </td></tr>
        <tr><td style="padding:18px 32px 26px;font-size:12px;line-height:18px;color:#71817d;">Vui lòng đến phòng họp đúng giờ. Nếu lịch đã thay đổi, hãy liên hệ người quản lý để cập nhật.</td></tr>
      </table>
    </div>`;
}

async function deliverMeetingReminder(email: string, details: MeetingReminderEmailDetails): Promise<void> {
  const { host, port, secure, user, pass, from } = getMailConfig();
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  const text = [
    `Xin chào ${details.organizer},`,
    "Cuộc họp của bạn sẽ bắt đầu sau khoảng 30 phút.",
    `Cuộc họp: ${details.title}.`,
    `Phòng: ${details.roomName} - ${details.floor}.`,
    `Thời gian: ${details.date.split("-").reverse().join("/")}, ${details.start}-${details.end}.`,
    `Phòng ban: ${details.department}.`,
    `Số người tham dự: ${details.attendees}.`,
  ].join(" ");

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: `Nhắc lịch họp còn 30 phút - ${details.title}`,
    text,
    attachments: getLogoAttachment(),
    html: getMeetingReminderEmailHtml(details),
  });

  if (!info.accepted.some((address) => address.toLowerCase() === email.toLowerCase()) || info.rejected.length > 0) {
    throw new Error("SMTP did not accept the meeting reminder recipient.");
  }
}

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
  async sendEmailChangeOtp(email: string, code: string): Promise<void> {
    const { host, port, secure, user, pass, from } = getMailConfig();
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    try {
      const info = await transporter.sendMail({
        from, to: email, subject: "Mã OTP xác nhận đổi email Asia F&B",
        text: `Mã OTP xác nhận đổi email của bạn là ${code}. Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Không chia sẻ mã này với bất kỳ ai.`,
        html: `<div style="max-width:560px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#173b35;border:1px solid #e2e8f0;border-radius:16px;">
          <h2 style="margin-top:0;color:#047857;">Xác nhận đổi email</h2>
          <p>Bạn vừa yêu cầu dùng địa chỉ email này cho tài khoản Asia Food &amp; Beverage. Nhập mã bên dưới để xác nhận email mới:</p>
          <p style="padding:20px;background:#ecfdf5;border-radius:12px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#047857;">${escapeHtml(code)}</p>
          <p>Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút và chỉ dùng một lần. Không chia sẻ mã này với bất kỳ ai.</p>
          <p>Nếu bạn không yêu cầu đổi email, hãy liên hệ bộ phận IT.</p>
        </div>`,
      });
      if (!info.accepted.some((address) => address.toLowerCase() === email.toLowerCase()) || info.rejected.length) throw new Error("Recipient rejected");
    } catch {
      console.error("Không thể gửi email OTP đổi email.");
      throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");
    }
  },

  async sendPasswordChangeOtp(email: string, code: string): Promise<void> {
    const { host, port, secure, user, pass, from } = getMailConfig();
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    try {
      const info = await transporter.sendMail({
        from, to: email, subject: "Mã OTP xác nhận đổi mật khẩu Asia F&B",
        text: `Mã OTP xác nhận đổi mật khẩu của bạn là ${code}. Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Không chia sẻ mã này với bất kỳ ai.`,
        html: `<div style="max-width:560px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#173b35;border:1px solid #e2e8f0;border-radius:16px;">
          <h2 style="margin-top:0;color:#047857;">Xác nhận đổi mật khẩu</h2>
          <p>Bạn vừa yêu cầu đổi mật khẩu tài khoản Asia Food &amp; Beverage. Nhập mã bên dưới để xác nhận:</p>
          <p style="padding:20px;background:#ecfdf5;border-radius:12px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#047857;">${escapeHtml(code)}</p>
          <p>Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút và chỉ dùng một lần. Không chia sẻ mã này với bất kỳ ai.</p>
          <p>Nếu bạn không yêu cầu đổi mật khẩu, hãy liên hệ bộ phận IT.</p>
        </div>`,
      });
      if (!info.accepted.some((address) => address.toLowerCase() === email.toLowerCase()) || info.rejected.length) throw new Error("Recipient rejected");
    } catch {
      console.error("Không thể gửi email OTP đổi mật khẩu.");
      throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");
    }
  },

  async sendMeetingBookingOtp(email: string, code: string, details: MeetingOtpEmailDetails): Promise<void> {
    await sendMeetingOtp(email, code, details, "đặt");
  },

  async sendMeetingCancelOtp(email: string, code: string, details: MeetingOtpEmailDetails): Promise<void> {
    await sendMeetingOtp(email, code, details, "hủy");
  },

  async sendMeetingReminder(email: string, details: MeetingReminderEmailDetails): Promise<void> {
    await deliverMeetingReminder(email, details);
  },

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
