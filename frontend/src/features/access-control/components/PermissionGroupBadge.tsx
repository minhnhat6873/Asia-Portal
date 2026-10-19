import { getGroupAppearance } from "../permission-group-appearance";

export function PermissionGroupBadge({ name, color, icon }: { name: string; color?: string; icon?: string }) {
  const { color: tone, Icon } = getGroupAppearance(color, icon);
  return <span className="inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ color: tone.foreground, backgroundColor: tone.background }}>
    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="break-words">{name}</span>
  </span>;
}
