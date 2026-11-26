jest.mock("../src/utils/vehicle/receipts", () => ({ removeVehicleReceiptFiles: jest.fn() }));

import type { NextFunction, Request, Response } from "express";
import { parseVehicleJsonPayload } from "../src/middlewares/multipart-validate.middleware";
import { removeVehicleReceiptFiles } from "../src/utils/vehicle/receipts";

const run = async (body: unknown, files: object[] = []) => {
  const request = { body, files } as unknown as Request;
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response & { status: jest.Mock };
  const next = jest.fn() as NextFunction & jest.Mock;
  await parseVehicleJsonPayload(request, response, next);
  return { request, response, next };
};

beforeEach(() => jest.clearAllMocks());

describe("parseVehicleJsonPayload", () => {
  it("leaves a plain JSON body unchanged", async () => {
    const { request, next } = await run({ pickup: "A" });
    expect(request.body).toEqual({ pickup: "A" });
    expect(next).toHaveBeenCalled();
  });

  it("turns the multipart 'payload' field into the request body", async () => {
    const { request, next } = await run({ payload: JSON.stringify({ pickup: "A", passengerCount: 2, roundTrip: false }) });
    expect(request.body).toEqual({ pickup: "A", passengerCount: 2, roundTrip: false });
    expect(next).toHaveBeenCalled();
  });

  it.each(["{bad", "[1]", "null", "\"text\""])("rejects payload %p and removes the uploaded pictures", async (payload) => {
    const { response, next } = await run({ payload }, [{ filename: "asia-portal/vehicle-receipts/a" }]);
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(removeVehicleReceiptFiles).toHaveBeenCalledWith(["asia-portal/vehicle-receipts/a"]);
  });
});
