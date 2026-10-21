export function validateNetworkFolderPath(value: string): string {
  const parts = value.slice(2).split("\\");
  const hasControlCharacters = Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  if (
    !value.startsWith("\\\\") || parts.length < 2 ||
    parts.some((part) => !part || part === "." || part === ".." || part !== part.trim()) ||
    /[<>:"/|?*%]/.test(value) || hasControlCharacters
  ) {
    throw new Error("NEXT_PUBLIC_NETWORK_FOLDER_PATH must be a UNC folder path such as \\\\server\\share\\folder, without quotes, control characters, or environment variables.");
  }
  return value;
}
