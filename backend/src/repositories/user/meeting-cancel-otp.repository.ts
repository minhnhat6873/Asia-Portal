import type { ClientSession } from "mongoose";

import type { MeetingCancelOtp, UpdateMeetingOtpInput } from "../../interfaces/meeting.interface";
import MeetingCancelOtpModel from "../../models/meeting-cancel-otp.model";

export const meetingCancelOtpRepository = {
  create(data: MeetingCancelOtp, session?: ClientSession) {
    return MeetingCancelOtpModel.create([data], session ? { session } : undefined)
      .then(([otp]) => otp);
  },

  findByBookingId(bookingId: string, session?: ClientSession) {
    return MeetingCancelOtpModel.findOne({ bookingId }).session(session ?? null).lean();
  },

  findByBookingIdWithOtpHash(bookingId: string, session?: ClientSession) {
    return MeetingCancelOtpModel.findOne({ bookingId })
      .select("+otpHash")
      .session(session ?? null)
      .lean();
  },

  incrementOtpAttempts(
    bookingId: string,
    maxAttempts: number,
    now = new Date(),
    expectedOtpHash?: string,
    session?: ClientSession,
  ) {
    return MeetingCancelOtpModel.findOneAndUpdate(
      {
        bookingId,
        ...(expectedOtpHash ? { otpHash: expectedOtpHash } : {}),
        otpExpiresAt: { $gt: now },
        otpAttempts: { $lt: maxAttempts },
      },
      { $inc: { otpAttempts: 1 } },
      { returnDocument: "after", session },
    ).lean();
  },

  claimResend(
    bookingId: string,
    now: Date,
    resendAvailableAt: Date,
    maxResendCount: number,
    session?: ClientSession,
  ) {
    return MeetingCancelOtpModel.findOneAndUpdate(
      {
        bookingId,
        otpExpiresAt: { $gt: now },
        resendAvailableAt: { $lte: now },
        resendCount: { $lt: maxResendCount },
      },
      { $set: { resendAvailableAt }, $inc: { resendCount: 1 } },
      { returnDocument: "after", session },
    ).lean();
  },

  commitResendOtp(
    bookingId: string,
    claimedResendCount: number,
    claimedResendAvailableAt: Date,
    data: UpdateMeetingOtpInput,
    session?: ClientSession,
  ) {
    return MeetingCancelOtpModel.findOneAndUpdate(
      { bookingId, resendCount: claimedResendCount, resendAvailableAt: claimedResendAvailableAt },
      {
        $set: {
          otpHash: data.otpHash,
          otpExpiresAt: data.otpExpiresAt,
          otpAttempts: 0,
        },
      },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  rollbackResend(
    bookingId: string,
    claimedResendCount: number,
    claimedResendAvailableAt: Date,
    previousResendCount: number,
    previousResendAvailableAt: Date,
    session?: ClientSession,
  ) {
    return MeetingCancelOtpModel.updateOne(
      { bookingId, resendCount: claimedResendCount, resendAvailableAt: claimedResendAvailableAt },
      { $set: { resendCount: previousResendCount, resendAvailableAt: previousResendAvailableAt } },
      { session },
    );
  },

  consumeOtp(bookingId: string, otpHash: string, now = new Date(), maxAttempts = 5, session?: ClientSession) {
    return MeetingCancelOtpModel.findOneAndDelete({
      bookingId,
      otpHash,
      otpExpiresAt: { $gt: now },
      otpAttempts: { $lt: maxAttempts },
    }).session(session ?? null).lean();
  },

  deleteIfOtpHash(bookingId: string, otpHash: string, session?: ClientSession) {
    return MeetingCancelOtpModel.findOneAndDelete({ bookingId, otpHash })
      .session(session ?? null)
      .lean();
  },

  updateOtp(bookingId: string, data: UpdateMeetingOtpInput, session?: ClientSession) {
    return MeetingCancelOtpModel.findOneAndUpdate(
      { bookingId },
      {
        $set: {
          otpHash: data.otpHash,
          otpExpiresAt: data.otpExpiresAt,
          resendAvailableAt: data.resendAvailableAt,
          resendCount: data.resendCount,
          otpAttempts: 0,
        },
      },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  deleteByBookingId(bookingId: string, session?: ClientSession) {
    return MeetingCancelOtpModel.findOneAndDelete({ bookingId }).session(session ?? null).lean();
  },
};
