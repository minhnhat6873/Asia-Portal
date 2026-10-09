export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const escapedCharacters: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return escapedCharacters[character] ?? character;
  });
}
