import { validateNetworkFolderPath } from "@/lib/networkFolderPath";

export const NETWORK_FOLDER = {
  path: validateNetworkFolderPath(process.env.NEXT_PUBLIC_NETWORK_FOLDER_PATH ?? "\\\\192.168.16.10\\data\\Chung"),
  uri: "asia-folder://chung/",
  setupUrl: "/downloads/Cai-dat-mo-thu-muc.reg",
  setupFilename: "Cai-dat-mo-thu-muc.reg",
} as const;
