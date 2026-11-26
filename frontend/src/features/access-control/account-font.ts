import { Be_Vietnam_Pro } from "next/font/google";

export const accountFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Inter", "Arial", "sans-serif"],
});
