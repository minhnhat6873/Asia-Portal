"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Globe2, LoaderCircle, LogOut, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { clearAdminSession, type AdminUser } from "@/lib/adminSession";
import type { ApiAccount } from "@/services/access-control.service";
import { getLoginSessions, getSessionAccounts, revokeLoginSession, revokeLoginSessions, type AdminLoginSession, type SessionListResult } from "@/services/admin-session.service";
import SessionAccountPicker from "./SessionAccountPicker";

const BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
type RevokeAction = { kind: "one"; session: AdminLoginSession } | { kind: "others" | "all" };

function dateTime(value: string | null) {
  if (!value) return "Chưa có thông tin";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa có thông tin" : date.toLocaleString("vi-VN", { hour12: false });
}

function ConfirmRevoke({ action, busy, error, accountName, onCancel, onConfirm }: {
  action: RevokeAction | null; busy: boolean; error: string; accountName: string; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (action) dialog.current?.showModal();
    else dialog.current?.close();
  }, [action]);
  const title = action?.kind === "one" ? "Đăng xuất phiên này?" : action?.kind === "others" ? "Đăng xuất các phiên khác?" : "Đăng xuất tất cả phiên?";
  return <dialog ref={dialog} aria-labelledby="revoke-session-title" aria-describedby="revoke-session-description" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><LogOut className="h-6 w-6" /></div>
    <h2 id="revoke-session-title" className="text-xl font-bold text-slate-900">{title}</h2>
    <p id="revoke-session-description" className="mt-3 text-sm leading-6 text-slate-600">
      {action?.kind === "one" ? <>Phiên {action.session.browser} trên {action.session.operatingSystem} của <strong>{accountName}</strong> sẽ bị thu hồi.{action.session.isCurrent && " Bạn sẽ được đưa về trang đăng nhập."}</>
        : action?.kind === "others" ? "Các phiên khác của bạn sẽ bị thu hồi. Phiên hiện tại được giữ lại."
          : <>Tất cả phiên của <strong>{accountName}</strong> sẽ bị thu hồi, kể cả phiên hiện tại nếu đây là tài khoản của bạn.</>}
      {" "}Muốn tiếp tục sử dụng, người dùng cần đăng nhập lại.
    </p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button autoFocus type="button" disabled={busy} onClick={onCancel} className={`${BUTTON} border-slate-200 text-slate-600 hover:bg-slate-50`}>Hủy</button>
      <button type="button" disabled={busy} onClick={onConfirm} className={`${BUTTON} border-rose-600 bg-rose-600 text-white hover:bg-rose-700`}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Xác nhận đăng xuất</button>
    </div>
  </dialog>;
}

function SessionList({ account, accountId }: { account: AdminUser; accountId: string }) {
  const [result, setResult] = useState<SessionListResult | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [action, setAction] = useState<RevokeAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const ownAccount = accountId === account.id;
  const reload = useCallback(() => { setRevision((value) => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    void getLoginSessions(accountId, page, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (page > Math.max(data.pagination.totalPages, 1)) {
        setLoading(true); setPage(Math.max(data.pagination.totalPages, 1)); return;
      }
      setResult(data); setLoadError(""); setLoading(false);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setLoadError(error instanceof Error ? error.message : "Không thể tải các phiên đăng nhập."); setLoading(false);
      }
    });
    return () => controller.abort();
  }, [accountId, page, revision]);

  const openAction = (next: RevokeAction) => { setMutationError(""); setAction(next); };
  const confirm = async () => {
    if (!action || busy) return;
    setBusy(true); setMutationError("");
    try {
      const outcome = action.kind === "one" ? await revokeLoginSession(accountId, action.session.id)
        : await revokeLoginSessions(accountId, action.kind);
      if (outcome.signedOut) {
        clearAdminSession(); window.location.replace("/admin/login"); return;
      }
      toast.success("Đã thu hồi phiên đăng nhập."); setAction(null); setLoading(true); reload();
    } catch (error) { setMutationError(error instanceof Error ? error.message : "Không thể thu hồi phiên. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };
  const total = result?.pagination.total ?? 0;
  const totalPages = Math.max(result?.pagination.totalPages ?? 1, 1);
  const title = result?.account.name ?? (ownAccount ? account.fullName : "tài khoản được chọn");

  return <>
    <section aria-label="Danh sách phiên đăng nhập" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div><h3 className="text-lg font-bold text-slate-900">{ownAccount ? "Các phiên của bạn" : title}</h3><p className="mt-1 text-sm text-slate-500">{result ? `${total} phiên còn hiệu lực` : "Thông tin phiên đăng nhập"}{!ownAccount && result ? ` · ${result.account.email}` : ""}</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setLoading(true); reload(); }} disabled={loading || busy} className={`${BUTTON} border-slate-200 text-slate-600 hover:bg-slate-50`}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Làm mới</button>
          {ownAccount && <button type="button" disabled={loading || busy || total <= 1 || Boolean(loadError)} onClick={() => openAction({ kind: "others" })} className={`${BUTTON} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>Đăng xuất các phiên khác</button>}
          <button type="button" disabled={loading || busy || total === 0 || Boolean(loadError)} onClick={() => openAction({ kind: "all" })} className={`${BUTTON} border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}><LogOut className="h-4 w-4" />Đăng xuất tất cả</button>
        </div>
      </div>
      {loadError ? <div role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); reload(); }} disabled={loading} className="mt-2 font-bold underline">Thử lại</button></div>
        : loading ? <div role="status" className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin text-emerald-600" />Đang tải phiên đăng nhập...</div>
          : !result?.items.length ? <div className="px-6 py-16 text-center"><Monitor className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 font-semibold text-slate-700">Không có phiên đăng nhập còn hiệu lực</p><p className="mt-2 text-sm text-slate-500">Phiên đã hết hạn hoặc bị thu hồi không xuất hiện trong danh sách này.</p></div>
            : <ul className="divide-y divide-slate-100">{result.items.map((session) => {
              const DeviceIcon = /Android|iOS/.test(session.operatingSystem) ? Smartphone : Monitor;
              return <li key={session.id} className={`p-5 sm:p-6 ${session.isCurrent ? "bg-emerald-50/40" : ""}`}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${session.isCurrent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><DeviceIcon className="h-6 w-6" /></span>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-slate-900">{session.browser} · {session.operatingSystem}</span>{session.isCurrent && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><Check className="h-3 w-3" />Phiên hiện tại</span>}</div>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500"><Globe2 className="h-4 w-4" />IP gần nhất: <span className="break-all font-medium text-slate-700">{session.lastIpAddress ?? "Chưa có thông tin"}</span></p>
                      {session.ipAddress && session.lastIpAddress !== session.ipAddress && <p className="mt-1 text-xs text-slate-500">IP khi đăng nhập: {session.ipAddress}</p>}
                    </div>
                  </div>
                  <button type="button" disabled={busy} onClick={() => openAction({ kind: "one", session })} aria-label={`Đăng xuất ${session.browser} trên ${session.operatingSystem}${session.isCurrent ? " (phiên hiện tại)" : ""}`} className={`${BUTTON} self-start border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50 xl:order-last xl:self-auto`}><LogOut className="h-4 w-4" />Đăng xuất</button>
                  <dl className="grid flex-1 grid-cols-1 gap-4 text-sm sm:grid-cols-3 xl:max-w-2xl">
                    <div><dt className="text-slate-500">Đăng nhập lúc</dt><dd className="mt-1 font-medium text-slate-700">{dateTime(session.createdAt)}</dd></div>
                    <div><dt className="text-slate-500">Hoạt động gần nhất</dt><dd className="mt-1 font-medium text-slate-700">{dateTime(session.lastSeenAt)}</dd></div>
                    <div><dt className="text-slate-500">Hết hạn lúc</dt><dd className="mt-1 font-medium text-slate-700">{dateTime(session.expiresAt)}</dd></div>
                  </dl>
                </div>
              </li>;
            })}</ul>}
      {result && !loading && !loadError && total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-sm text-slate-500"><span>Trang <strong className="text-emerald-700">{page}</strong> / {totalPages} · {total} phiên</span><div className="flex gap-2"><button type="button" aria-label="Trang trước" disabled={page <= 1 || busy} onClick={() => { setLoading(true); setPage((value) => value - 1); }} className={`${BUTTON} border-slate-200 bg-white px-3`}><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="Trang sau" disabled={page >= totalPages || busy} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className={`${BUTTON} border-slate-200 bg-white px-3`}><ChevronRight className="h-4 w-4" /></button></div></div>}
    </section>
    <ConfirmRevoke action={action} busy={busy} error={mutationError} accountName={title} onCancel={() => setAction(null)} onConfirm={() => void confirm()} />
  </>;
}

export default function SessionsPage({ account }: { account: AdminUser | null }) {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [accountsError, setAccountsError] = useState("");
  const [accountsRevision, setAccountsRevision] = useState(0);
  const isRoot = account?.role === "Toàn quyền Admin";
  useEffect(() => {
    if (!isRoot) return;
    const controller = new AbortController();
    void getSessionAccounts(controller.signal).then((data) => {
      if (!controller.signal.aborted) { setAccounts(data); setAccountsError(""); }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setAccountsError(error instanceof Error ? error.message : "Không thể tải danh sách tài khoản.");
    });
    return () => controller.abort();
  }, [isRoot, accountsRevision]);
  if (!account) return null;
  const selectedAccountId = isRoot && selectedId ? selectedId : account.id;
  return <div className="space-y-6">
    {isRoot && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SessionAccountPicker account={account} accounts={accounts} value={selectedAccountId} onChange={setSelectedId} />{accountsError && <p role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{accountsError}<button type="button" onClick={() => setAccountsRevision((value) => value + 1)} className="font-bold underline">Tải lại tài khoản</button></p>}</section>}
    <SessionList key={`${account.id}:${selectedAccountId}`} account={account} accountId={selectedAccountId} />
  </div>;
}
