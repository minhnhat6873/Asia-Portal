import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database.config";
import type { MeetingBooking } from "../src/interfaces/meeting.interface";
import MeetingBookingModel from "../src/models/meeting-booking.model";
import { meetingBookingRepository } from "../src/repositories/user/meeting-booking.repository";
import { addMinutes, getVietnamNow } from "../src/utils/time/vietnamTime";

const demoMeetings = [
  { title: "[DEMO] Kế hoạch tuyển dụng quý IV", organizer: "Nguyễn Minh Anh", email: "demo.meeting01@asiafnb.com", department: "Nhân sự", attendees: 6 },
  { title: "[DEMO] Rà soát báo cáo doanh thu", organizer: "Trần Hoàng Nam", email: "demo.meeting02@asiafnb.com", department: "Tài chính", attendees: 4 },
  { title: "[DEMO] Đánh giá chiến dịch ra mắt sản phẩm", organizer: "Lê Thảo Vy", email: "demo.meeting03@asiafnb.com", department: "Marketing", attendees: 8 },
  { title: "[DEMO] Kế hoạch nhập hàng quý", organizer: "Trương Minh Khoa", email: "demo.meeting04@asiafnb.com", department: "Mua hàng", attendees: 5 },
  { title: "[DEMO] Điều phối kế hoạch giao nhận", organizer: "Bùi Thanh Tùng", email: "demo.meeting05@asiafnb.com", department: "Logistics", attendees: 6 },
  { title: "[DEMO] Duyệt mẫu bao bì sản phẩm", organizer: "Phạm Gia Huy", email: "demo.meeting06@asiafnb.com", department: "Thiết kế", attendees: 4 },
  { title: "[DEMO] Cập nhật sản phẩm mùa mới", organizer: "Nguyễn Nhật Quang", email: "demo.meeting07@asiafnb.com", department: "Nghiên cứu và phát triển", attendees: 10 },
  { title: "[DEMO] Đào tạo bảo mật nội bộ", organizer: "Đặng Quốc Bảo", email: "demo.meeting08@asiafnb.com", department: "Công nghệ thông tin", attendees: 5 },
  { title: "[DEMO] Đánh giá nhà cung cấp nguyên liệu", organizer: "Võ Anh Tuấn", email: "demo.meeting09@asiafnb.com", department: "Mua hàng", attendees: 7 },
  { title: "[DEMO] Tổng kết kế hoạch kinh doanh", organizer: "Đỗ Ngọc Trâm", email: "demo.meeting10@asiafnb.com", department: "Kinh doanh", attendees: 6 },
] as const;

const roomIds = ["room-01", "room-02"] as const;
const startTimes = ["09:00", "10:30", "13:30", "15:00"] as const;
const durationMinutes = 60;

function dateAfterDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function createDemoMeeting(
  sample: (typeof demoMeetings)[number],
  sampleIndex: number,
  today: string,
): Promise<boolean> {
  const existing = await MeetingBookingModel.findOne({ email: sample.email }).select("isDemoData").lean();
  if (existing) {
    if (!existing.isDemoData) throw new Error(`Email mẫu đã được dùng bởi lịch không phải dữ liệu demo: ${sample.email}`);
    return false;
  }

  for (let dayOffset = 1; dayOffset <= 45; dayOffset += 1) {
    const date = dateAfterDays(today, dayOffset);
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    for (let roomOffset = 0; roomOffset < roomIds.length; roomOffset += 1) {
      const roomId = roomIds[(sampleIndex + roomOffset) % roomIds.length];
      for (let timeOffset = 0; timeOffset < startTimes.length; timeOffset += 1) {
        const start = startTimes[(sampleIndex + timeOffset) % startTimes.length];
        const end = addMinutes(start, durationMinutes);
        if (await meetingBookingRepository.findOverlapping(roomId, date, start, end)) continue;

        const booking: MeetingBooking = {
          ...sample,
          roomId,
          date,
          start,
          end,
          isDemoData: true,
        };
        await meetingBookingRepository.create(booking);
        return true;
      }
    }
  }

  throw new Error(`Không tìm thấy khung giờ trống để tạo lịch mẫu: ${sample.title}`);
}

async function seedMeetings(): Promise<void> {
  await connectDatabase();
  if (mongoose.connection.readyState !== 1) throw new Error("DATABASE chưa được cấu hình hoặc MongoDB chưa kết nối.");

  const { date } = getVietnamNow();
  let created = 0;
  let alreadyPresent = 0;

  for (const [index, sample] of demoMeetings.entries()) {
    if (await createDemoMeeting(sample, index, date)) created += 1;
    else alreadyPresent += 1;
  }

  console.log(`Dữ liệu phòng họp mẫu: đã tạo ${created}, đã có sẵn ${alreadyPresent}, tổng ${demoMeetings.length}.`);
}

void seedMeetings()
  .catch((error: unknown) => {
    console.error("Không thể tạo dữ liệu phòng họp mẫu.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
