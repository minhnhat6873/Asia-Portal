import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAvailableMeetingDurations, getMeetingStartOptions } from '../src/lib/meetingSchedule.ts';

const now = new Date('2026-10-27T00:00:00Z');
const booking = { roomId: 'room-01', date: '2026-10-27', start: '09:00', end: '10:00' };
const durations = (start, entries = [booking], room = 'room-01', date = booking.date) => getAvailableMeetingDurations(start, date, room, entries);

test('a 09:00–10:00 booking blocks overlapping starts and the 15-minute gap', () => {
  const options = getMeetingStartOptions(booking.date, booking.roomId, [booking], now);
  for (const value of ['08:30', '08:45', '09:00', '09:30', '10:00']) {
    const option = options.find((entry) => entry.value === value);
    assert.equal(option.disabled, true, value);
    assert.match(option.label, /Đã có lịch/);
  }
  assert.equal(options.find((entry) => entry.value === '10:15').disabled, false);
  assert.deepEqual(durations('08:00'), [30, 45]);
  assert.deepEqual(durations('08:15'), [30]);
});

test('limits duration using the next booking and exact 15-minute boundary', () => {
  const next = { ...booking, start: '11:00', end: '12:00' };
  assert.deepEqual(durations('10:00', [next]), [30, 45]);
  assert.deepEqual(durations('10:15', [next]), [30]);
  assert.deepEqual(durations('10:30', [next]), []);
});

test('availability is isolated by room and date', () => {
  assert.ok(durations('09:00', [booking], 'room-02').includes(60));
  assert.ok(durations('09:00', [booking], 'room-01', '2026-10-28').includes(60));
  assert.equal(durations('09:00').length, 0);
});

test('respects lunch, minimum duration and 17:00 closing time', () => {
  assert.deepEqual(durations('11:00', []), [30, 45, 60]);
  assert.deepEqual(durations('11:30', []), [30]);
  assert.deepEqual(durations('11:45', []), []);
  assert.deepEqual(durations('12:00', []), []);
  assert.ok(durations('13:00', []).includes(240));
  assert.deepEqual(durations('16:30', []), [30]);
  assert.deepEqual(durations('16:45', []), []);
});

test('a full room disables every start, another room stays available', () => {
  const fullDay = [{ ...booking, start: '08:00', end: '12:00' }, { ...booking, start: '13:00', end: '17:00' }];
  assert.equal(getMeetingStartOptions(booking.date, 'room-01', fullDay, now).every((entry) => entry.disabled), true);
  assert.equal(getMeetingStartOptions(booking.date, 'room-02', fullDay, now).some((entry) => !entry.disabled), true);
});

test('removing a confirmed booking releases its hours without retaining a lock', () => {
  assert.equal(durations('09:00').length, 0);
  assert.ok(durations('09:00', []).includes(60));
});

test('elapsed times disappear; unavailable future times remain visible and disabled', () => {
  const options = getMeetingStartOptions(booking.date, booking.roomId, [booking], new Date('2026-10-27T02:00:00Z'));
  assert.equal(options.some((entry) => entry.value === '09:00'), false);
  assert.equal(options.find((entry) => entry.value === '09:15').disabled, true);
  assert.equal(options.find((entry) => entry.value === '10:15').disabled, false);
  assert.deepEqual(getMeetingStartOptions('2026-10-26', booking.roomId, [], now), []);
});
