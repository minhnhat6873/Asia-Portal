export default function MediaExpiryBadge({ isExpired }: { isExpired?: boolean }) {
  if (!isExpired) return null;
  return <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Tin đã hết hạn</span>;
}
