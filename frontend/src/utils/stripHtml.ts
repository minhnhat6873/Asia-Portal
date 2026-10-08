export function stripHtml(value: string): string {
  if (!value) return "";
  if (typeof window !== "undefined") {
    const element = document.createElement("div");
    element.innerHTML = value;
    return (element.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

