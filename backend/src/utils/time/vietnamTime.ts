const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

function getVietnamDateTimeParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getVietnamNow(now: Date = new Date()): { date: string; time: string } {
  const parts = getVietnamDateTimeParts(now);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function getVietnamDateTimeAsUtc(date: string, time: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) throw new RangeError("Ngày hoặc giờ Việt Nam không hợp lệ.");

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    throw new RangeError("Ngày hoặc giờ Việt Nam không hợp lệ.");
  }

  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
}

export function addMinutes(time: string, minutes: number): string {
  const [hours, currentMinutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + currentMinutes + minutes;
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const normalizedHours = Math.floor(normalizedMinutes / 60);
  const normalizedRemainder = normalizedMinutes % 60;

  return `${String(normalizedHours).padStart(2, "0")}:${String(normalizedRemainder).padStart(2, "0")}`;
}

export function subtractMinutes(time: string, minutes: number): string {
  return addMinutes(time, -minutes);
}

export function compareTimes(first: string, second: string): number {
  const firstMinutes = timeToMinutes(first);
  const secondMinutes = timeToMinutes(second);
  return Math.sign(firstMinutes - secondMinutes);
}

function timeToMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new RangeError("Thời gian phải theo định dạng HH:mm.");

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new RangeError("Thời gian không hợp lệ.");

  return hours * 60 + minutes;
}
