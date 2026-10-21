import { validateNetworkFolderPath } from "./networkFolderPath";

export function createNetworkFolderRegistry(path: string): string {
  const command = `"%SystemRoot%\\explorer.exe" "${validateNetworkFolderPath(path)}"`;
  const bytes = Buffer.from(`${command}\0`, "utf16le");
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 24) {
    lines.push(Array.from(bytes.subarray(offset, offset + 24), (byte) => byte.toString(16).padStart(2, "0")).join(","));
  }
  return [
    "Windows Registry Editor Version 5.00",
    "",
    "; Asia Portal - open the configured company shared-documents folder.",
    "; Registers the shortcut for the current Windows user.",
    "; The URL is not passed to Explorer.",
    "",
    "[HKEY_CURRENT_USER\\Software\\Classes\\asia-folder]",
    '@="URL:Asia Portal Shared Documents"',
    '"URL Protocol"=""',
    "",
    "[HKEY_CURRENT_USER\\Software\\Classes\\asia-folder\\shell\\open\\command]",
    `@=hex(2):${lines.join(",\\\r\n  ")}`,
    "",
  ].join("\r\n");
}
