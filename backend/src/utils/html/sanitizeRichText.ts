import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a",
  "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody",
  "tr", "th", "td", "span", "code", "pre", "blockquote", "img",
];

export function sanitizeRichText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      img: ["src", "alt", "width", "height", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowedSchemesByTag: { img: ["https"] },
    allowedStyles: {
      span: {
        "font-family": [/^[\w\s,'"-]+$/],
      },
    },
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  });
}

export function richTextToPlainText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

