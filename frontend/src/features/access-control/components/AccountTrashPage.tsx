"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getDeletedAccounts, permanentlyDeleteAccount, restoreAccount, type ApiAccount } from "@/services/access-control.service";
import { useDelayedLoading } from "@/lib/useDelayedLoading";
import { AccountActionDialog } from "./AccountActionDialog";
import { PermissionGroupBadge } from "./PermissionGroupBadge";
import { ACCOUNT_ROLE_LABELS } from "./UserManagementView";

const formatTime = (value?: string) => value ? new Date(value).toLocaleString("vi-VN") : "—";

// Account trash: restore (comes back locked) or delete for good. Needs "accounts:trash".
export function AccountTrashPage({ onChanged }: { onChanged?: () => void }) {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<{ account: ApiAccount; action: "restore" | "delete" } | null>(null);
  const showLoading = useDelayedLoading(loading);

  const load = useCallback(async () => {
    try { setAccounts(await getDeletedAccounts()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải thùng rác tài khoản."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const confirm = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      if (target.action === "restore") {
        await restoreAccount(target.account.id);
        toast.success(`Đã khôi phục ${target.account.name}. Tài khoản đang bị khóa, hãy mở khóa khi cần dùng lại.`);
      } else {
        await permanentlyDeleteAccount(target.account.id);
        toast.success(`Đã xóa vĩnh viễn tài khoản ${target.account.name}.`);
      }
      setTarget(null);
      await load();
      onChanged?.();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Không thể thực hiện thao tác.");
    } finally { setBusy(false); }
  };

  if (loading) return <div hidden={!showLoading} role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải thùng rác tài khoản...</div>;
  if (error) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}<button type="button" onClick={() => { setLoading(true); void load(); }} className="ml-3 font-bold underline">Thử lại</button></div>;

  return <div className="asia-access-control space-y-5">
    <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Tài khoản trong thùng rác không đăng nhập được và vẫn giữ email. Khôi phục sẽ đưa tài khoản về danh sách ở trạng thái Tạm khóa. Xóa vĩnh viễn không thể hoàn tác.</p>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>{["Tài khoản", "Loại tài khoản", "Ngày xóa", "Người xóa", "Thao tác"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!accounts.length && <tr><td colSpan={5} className="p-10 text-center text-slate-500">Thùng rác trống.</td></tr>}
          {accounts.map((account) => <tr key={account.id} className="align-top hover:bg-slate-50">
            <td className="px-4 py-3"><strong className="block text-slate-900">{account.name}</strong><span className="text-slate-500">{account.email}</span></td>
            <td className="px-4 py-3"><PermissionGroupBadge name={ACCOUNT_ROLE_LABELS[account.role]} color={account.role === "admin" ? "orange" : account.role === "user" ? "slate" : "blue"} icon={account.role === "admin" ? "crown" : "user"} /></td>
            <td className="px-4 py-3 text-slate-500">{formatTime(account.deletedAt)}</td>
            <td className="px-4 py-3 text-slate-600">{account.deletedBy?.name ?? (account.lock?.kind === "employee-deleted" ? "Tự động (xóa hồ sơ nhân viên)" : "—")}</td>
            <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setTarget({ account, action: "restore" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Khôi phục</button>
              <button type="button" disabled={busy} onClick={() => setTarget({ account, action: "delete" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" />Xóa vĩnh viễn</button>
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
      <div className="border-t border-slate-200 p-4 text-sm text-slate-600">Tổng cộng {accounts.length} tài khoản trong thùng rác</div>
    </div>
    {target?.action === "restore" && <AccountActionDialog title="Khôi phục tài khoản?" Icon={RotateCcw} tone="emerald" confirmLabel="Khôi phục" busyLabel="Đang khôi phục..." saving={busy} onClose={() => setTarget(null)} onConfirm={() => { void confirm(); }}>
      <p>Tài khoản <strong>{target.account.name}</strong> ({target.account.email}) sẽ quay lại danh sách ở trạng thái <strong>Tạm khóa</strong>. Mở khóa để người dùng đăng nhập lại.</p>
    </AccountActionDialog>}
    {target?.action === "delete" && <AccountActionDialog title="Xóa vĩnh viễn tài khoản?" Icon={Trash2} tone="rose" confirmLabel="Xóa vĩnh viễn" busyLabel="Đang xóa..." saving={busy} onClose={() => setTarget(null)} onConfirm={() => { void confirm(); }}>
      <p>Tài khoản <strong>{target.account.name}</strong> ({target.account.email}) sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác.</p>
      <p className="text-sm text-slate-500">Hồ sơ nhân viên (nếu có) không bị ảnh hưởng. Email này có thể dùng để tạo tài khoản mới.</p>
    </AccountActionDialog>}
  </div>;
}
