import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/vehicleValidation.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { validateVehicleRequest: validate, isValidPhone, normalizeVietnamPhone, vietnamLocal } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

// 2026-11-25 08:00 Vietnam time.
const NOW = Date.parse("2026-11-25T08:00:00+07:00");
const base = {
  forOther: false, forOtherName: "", forOtherPhone: "",
  purpose: "guest", customerName: "Công ty ABC", customerPhone: "", passengerCount: 2,
  goodsDescription: "", goodsQuantity: "", senderName: "", senderPhone: "", receiverName: "", receiverPhone: "",
  pickup: "Văn phòng Á Châu", pickupLocation: null, destination: "Sân bay Tân Sơn Nhất",
  departAt: "2026-11-25T10:00", roundTrip: false, returnAt: null, note: "",
};
const delivery = { ...base, purpose: "delivery", customerName: "", passengerCount: null, senderName: "Kho A", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "Nước đóng chai", goodsQuantity: "15 thùng, 500 kg" };
const errorsOf = (change, from = base) => validate({ ...from, ...change }, NOW);

test("a complete guest or delivery request has no errors", () => {
  assert.deepEqual(errorsOf({}), {});
  assert.deepEqual(errorsOf({}, delivery), {});
  assert.deepEqual(errorsOf({ forOther: true, forOtherName: "Chị Lan", forOtherPhone: "0901 234 567" }), {});
});

test("only real Vietnamese mobile and landline numbers are accepted", () => {
  const good = ["0901234567", "0901 234 567", "090.123.4567", "+84 901 234 567", "84901234567", "+84 (0) 901 234 567",
    "0326123456", "0559123456", "0599123456", "0701234567", "0871234567", "0921234567", "0991234567", "028 3812 3456", "(0274) 381 2345"];
  for (const value of good) assert.equal(isValidPhone(value), true, value);
  const bad = ["--------", "0901abc567", "090123456", "09012345678", "0951234567", "0121698370", "0111234567", "0401234567", "0311234567",
    "901234567", "+1 202 555 0123", "028 3812 345"];
  for (const value of bad) {
    assert.equal(isValidPhone(value), false, value);
    // Every wrong number gets the same message.
    assert.equal(errorsOf({ customerPhone: value }).customerPhone, "Số điện thoại không hợp lệ.", value);
  }
  assert.equal(normalizeVietnamPhone("+84 901 234 567"), "0901234567");
  assert.match(errorsOf({ receiverPhone: "+84 901 234 567" }, delivery).receiverPhone, /khác người gửi/);
});

test("booking for someone else needs their name and phone", () => {
  assert.ok(errorsOf({ forOther: true }).forOtherName);
  assert.ok(errorsOf({ forOther: true }).forOtherPhone);
  assert.match(errorsOf({ forOther: true, forOtherName: "12", forOtherPhone: "0901234567" }).forOtherName, /chữ cái/);
});

test("the number of people is typed in: 1 to 50", () => {
  assert.equal(errorsOf({ passengerCount: null }).passengerCount, "Vui lòng nhập số người.");
  assert.match(errorsOf({ passengerCount: 0 }).passengerCount, /1 đến 50/);
  assert.match(errorsOf({ passengerCount: 51 }).passengerCount, /1 đến 50/);
  assert.equal(errorsOf({ passengerCount: 12 }).passengerCount, undefined);
});

test("names need letters; goods need a number", () => {
  assert.match(errorsOf({ customerName: "1234" }).customerName, /chữ cái/);
  assert.equal(errorsOf({ customerName: "Công ty 3M" }).customerName, undefined);
  assert.match(errorsOf({ goodsQuantity: "vài thùng" }, delivery).goodsQuantity, /con số/);
  assert.ok(errorsOf({ goodsQuantity: "  " }, delivery).goodsQuantity);
  assert.ok(errorsOf({ receiverPhone: "" }, delivery).receiverPhone);
});

test("pickup and destination must differ", () => {
  assert.match(errorsOf({ pickup: "Văn  phòng", destination: "văn phòng" }).destination, /khác điểm đón/);
  assert.match(errorsOf({ pickup: "A" }).pickup, /ít nhất 3/);
});

test("times: 15 minutes ahead, at most 90 days ahead, return within 30 days", () => {
  assert.equal(vietnamLocal(NOW), "2026-11-25T08:00");
  assert.match(errorsOf({ departAt: "2026-11-25T08:10" }).departAt, /15 phút/);
  assert.equal(errorsOf({ departAt: "2026-11-25T08:15" }).departAt, undefined);
  assert.match(errorsOf({ departAt: "2027-03-01T08:00" }).departAt, /90 ngày/);
  assert.match(errorsOf({ departAt: "2026-11-25" }).departAt, /đủ ngày và giờ/);
  assert.match(errorsOf({ roundTrip: true, returnAt: "2026-11-25T09:00" }).returnAt, /sau giờ đi/);
  assert.match(errorsOf({ roundTrip: true, returnAt: "2026-12-30T08:00" }).returnAt, /30 ngày/);
  assert.equal(errorsOf({ roundTrip: true, returnAt: "2026-11-25T17:00" }).returnAt, undefined);
});
