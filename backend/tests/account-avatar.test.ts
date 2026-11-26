jest.mock("../src/helpers/multerCloudinary.helper", () => ({
  ACCOUNT_AVATAR_FOLDER: "asia-portal/account-avatars",
  deleteCloudinaryAsset: jest.fn().mockResolvedValue(undefined),
}));

import { deleteCloudinaryAsset } from "../src/helpers/multerCloudinary.helper";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { accountAvatarService } from "../src/services/user/account-avatar.service";
import { removeAccountAvatarFile, resolveAccountAvatar, resolveAccountAvatars } from "../src/utils/account/accountAvatar";

const hrPhoto = "https://res.cloudinary.com/demo/image/upload/asia-portal/avatars/van.jpg";
const ownPhoto = "https://res.cloudinary.com/demo/image/upload/asia-portal/account-avatars/new.jpg";

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(adminEmployeeRepository, "findAvatarsByEmails").mockImplementation(async (emails) =>
    new Map(emails.filter((email) => email.toLowerCase() === "van@asiafnb.com").map((email) => [email.toLowerCase(), hrPhoto])));
});
afterEach(() => jest.restoreAllMocks());

it("uses the HR photo by default and the person's own picture once uploaded", async () => {
  await expect(resolveAccountAvatar({ email: "VAN@asiafnb.com", avatar: "" })).resolves.toBe(hrPhoto);
  await expect(resolveAccountAvatar({ email: "van@asiafnb.com", avatar: ownPhoto })).resolves.toBe(ownPhoto);
  await expect(resolveAccountAvatar({ email: "no-record@asiafnb.com" })).resolves.toBe("");
});

it("resolves a whole account list with a single employee lookup", async () => {
  const avatars = await resolveAccountAvatars([
    { _id: "a", email: "van@asiafnb.com", avatar: "" },
    { _id: "b", email: "own@asiafnb.com", avatar: ownPhoto },
    { _id: "c", email: "none@asiafnb.com" },
  ]);
  expect(adminEmployeeRepository.findAvatarsByEmails).toHaveBeenCalledTimes(1);
  expect(Object.fromEntries(avatars)).toEqual({ a: hrPhoto, b: ownPhoto, c: "" });
});

it("saving a new picture removes the previous upload but never touches HR photos", async () => {
  jest.spyOn(adminAccountRepository, "setAvatar").mockResolvedValue({ avatar: "old", avatarPublicId: "asia-portal/account-avatars/old" } as never);
  await expect(accountAvatarService.set("id", "van@asiafnb.com", { url: ownPhoto, publicId: "asia-portal/account-avatars/new" }))
    .resolves.toMatchObject({ avatar: ownPhoto, customAvatar: true });
  expect(deleteCloudinaryAsset).toHaveBeenCalledWith("asia-portal/account-avatars/old");

  await removeAccountAvatarFile("asia-portal/avatars/van");
  await removeAccountAvatarFile("asia-portal/account-avatars/../avatars/van");
  expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(1);
});

it("removing the own picture falls back to the HR photo", async () => {
  jest.spyOn(adminAccountRepository, "clearAvatar").mockResolvedValue({ avatar: ownPhoto, avatarPublicId: "asia-portal/account-avatars/new" } as never);
  await expect(accountAvatarService.clear("id", "van@asiafnb.com")).resolves.toEqual({ avatar: hrPhoto, customAvatar: false, email: "van@asiafnb.com" });
  expect(deleteCloudinaryAsset).toHaveBeenCalledWith("asia-portal/account-avatars/new");
});

it("an upload for a locked or missing account is discarded", async () => {
  jest.spyOn(adminAccountRepository, "setAvatar").mockResolvedValue(null as never);
  await expect(accountAvatarService.set("id", "van@asiafnb.com", { url: ownPhoto, publicId: "asia-portal/account-avatars/new" }))
    .rejects.toMatchObject({ statusCode: 401 });
  expect(deleteCloudinaryAsset).toHaveBeenCalledWith("asia-portal/account-avatars/new");
});
