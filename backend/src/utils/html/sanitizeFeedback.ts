import { sanitizeRichText } from "./sanitizeRichText";
export function sanitizeFeedback(value: string): string {
 return sanitizeRichText(value, { allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "hr", "span"], allowedAttributes: { span: ["style"] }, allowedStyles: { span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i], "text-align": [/^(left|right|center|justify)$/] } } });
}
