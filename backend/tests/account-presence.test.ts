import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import { adminAccountService } from "../src/services/admin/account.service";

describe("account presence", () => {
  afterEach(() => jest.restoreAllMocks());
  it("checks current session versions and activity while excluding internal authVersion", async () => {
    jest.spyOn(adminAccountRepository, "findAll").mockResolvedValue([
      { _id: "recent", status: "active", authVersion: 2 },
      { _id: "revoked", status: "active", authVersion: 3 },
      { _id: "idle", status: "active" },
      { _id: "legacy", status: "active" },
      { _id: "disabled", status: "inactive" },
      { _id: "absent", status: "active" },
    ] as never);
    jest.spyOn(authSessionRepository, "recentActivity").mockResolvedValue([
      { _id: { accountId: "recent", authVersion: 2 }, lastSeenAt: new Date() },
      { _id: { accountId: "revoked", authVersion: 2 }, lastSeenAt: new Date() },
      { _id: { accountId: "idle", authVersion: 0 }, lastSeenAt: new Date(Date.now() - 181_000) },
      { _id: { accountId: "legacy", authVersion: 0 }, lastSeenAt: null },
      { _id: { accountId: "disabled", authVersion: 0 }, lastSeenAt: new Date() },
    ]);
    const result = await adminAccountService.getAccounts();
    expect(result.map((account) => account.presence)).toEqual(["online", "offline", "offline", "unknown", "offline", "offline"]);
    expect(result.every((account) => !("authVersion" in account))).toBe(true);
  });
});
