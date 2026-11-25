import { escapeRegex } from "../regex/escapeRegex";

const variants: Record<string, string> = {};
for (const [first, last] of [[0x00c0, 0x024f], [0x1e00, 0x1eff]]) {
  for (let code = first; code <= last; code += 1) {
    const character = String.fromCodePoint(code);
    const base = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/^[a-z]$/.test(base)) variants[base] = (variants[base] ?? base) + character;
  }
}
variants.d = `${variants.d ?? "d"}đĐ`;

/** Literal substring search with Vietnamese accent and case variants. */
export function vietnameseSearchRegex(value: string): RegExp {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
  const pattern = Array.from(normalized).map((character) => {
    if (/\s/.test(character)) return "\\s+";
    return variants[character] ? `[${variants[character]}]` : escapeRegex(character);
  }).join("");
  return new RegExp(pattern, "i");
}
