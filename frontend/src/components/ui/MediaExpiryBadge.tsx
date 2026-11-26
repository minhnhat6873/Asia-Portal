import { Clock3 } from "lucide-react";

export default function MediaExpiryBadge({ isExpired }: { isExpired?: boolean }) {
  if (!isExpired) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold leading-5 text-slate-600">
      <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
      Tin đã hết hạn
    </span>
  );
}
