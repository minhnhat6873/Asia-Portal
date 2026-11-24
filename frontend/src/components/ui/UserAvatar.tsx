"use client";

import { useState } from "react";

export function nameInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
}

/** Only https pictures are shown; anything else (or a broken link) falls back to initials. */
function safeImage(src?: string | null): string {
  return src && /^https:\/\//i.test(src) ? src : "";
}

/**
 * Round account picture: the person's own upload, else the HR photo, else initials.
 * The caller's className sets size, background and text style for the initials.
 */
export default function UserAvatar({ src, name, className = "", alt = "" }: { src?: string | null; name: string; className?: string; alt?: string }) {
  const image = safeImage(src);
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = image && failed !== image;
  return (
    <span aria-hidden={alt ? undefined : true} className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars come from Cloudinary or other HR sources; a plain img keeps the initials fallback simple.
        <img src={image} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(image)} className="h-full w-full object-cover" />
      ) : nameInitials(name)}
    </span>
  );
}
