"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import { getEmployeeRankLabel } from "@/components/ui/employee-rank-options";
import {
  getDeletedAdminEmployees,
  permanentlyDeleteAdminEmployee,
  restoreAdminEmployee,
  type AdminEmployeeResult,
} from "@/services/admin-employee.service";

interface EmployeeTrashPageProps {
  onBack: () => void;
  onRestored: () => void | Promise<void>;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export function EmployeeTrashPage({ onBack, onRestored }: EmployeeTrashPageProps) {
  const pageSize = 20;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState<AdminEmployeeResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminEmployeeResult | null>(null);

  const loadTrash = useCallback(async (search: string, pageNumber: number, signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const result = await getDeletedAdminEmployees({
        search: search.trim() || undefined,
        page: pageNumber,
        limit: pageSize,
      }, signal);
      setEmployees(result.items);
      setTotal(result.pagination.total);
      setLoadError(null);
    } catch (error) {
      if (!signal?.aborted) {
        setEmployees([]);
        setTotal(0);
        setLoadError(error instanceof Error ? error.message : "Không thể tải thùng rác nhân viên.");
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadTrash(query, page, controller.signal);
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadTrash, page, query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const removeEmployeeFromPage = (employeeId: string) => {
    setEmployees((items) => items.filter((item) => item._id !== employeeId));
    const nextTotal = Math.max(0, total - 1);
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
    setTotal(nextTotal);
    if (page > nextTotalPages) setPage(nextTotalPages);
  };

  const restore = async (employee: AdminEmployeeResult) => {
    if (restoringId || deletingId) return;
    setRestoringId(employee._id);
    try {
      await restoreAdminEmployee(employee._id);
      removeEmployeeFromPage(employee._id);
      await onRestored();
      toast.success(`Đã khôi phục nhân viên ${employee.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể khôi phục nhân viên.");
    } finally {
      setRestoringId(null);
    }
  };

  const permanentlyDelete = async () => {
    if (!deleteTarget || deletingId || restoringId) return;
    setDeletingId(deleteTarget._id);
    try {
      await permanentlyDeleteAdminEmployee(deleteTarget._id);
      removeEmployeeFromPage(deleteTarget._id);
      toast.success(`Đã xóa vĩnh viễn nhân viên ${deleteTarget.name}.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa vĩnh viễn nhân viên.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Quay lại danh sách nhân viên">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Thùng rác nhân viên</h1>
            <p className="text-xs text-slate-500">Dữ liệu nhân viên đã xóa từ backend</p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo tên hoặc mã nhân viên..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-500" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải thùng rác...
          </div>
        ) : loadError ? (
          <div className="min-h-64 p-8 text-center text-sm text-rose-600">{loadError}</div>
        ) : employees.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Trash2 className="h-7 w-7" /></span>
            <div><p className="font-bold text-slate-700">Thùng rác nhân viên đang trống</p><p className="mt-1 text-xs text-slate-500">Nhân viên đã xóa sẽ xuất hiện tại đây.</p></div>
          </div>
        ) : (
          <div className="employee-table-scroll overflow-x-auto">
            <table className="w-full min-w-[1180px] text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-left">Mã nhân viên</th><th className="px-4 py-4 text-left">Họ và tên</th><th className="px-4 py-4 text-left">Phòng ban</th><th className="px-4 py-4 text-left">Chức vụ</th><th className="px-4 py-4 text-left">Cấp bậc</th><th className="px-4 py-4 text-left">Người xóa</th><th className="px-4 py-4 text-left">Ngày xóa</th><th className="px-4 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((employee) => {
                  const isRestoring = restoringId === employee._id;
                  const isDeleting = deletingId === employee._id;
                  return (
                    <tr key={employee._id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-mono font-bold text-emerald-700">{employee.employeeCode}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{employee.name}</td>
                      <td className="px-4 py-4">{getEmployeeDepartmentLabel(employee.department)}</td>
                      <td className="px-4 py-4">{employee.position}</td>
                      <td className="px-4 py-4">{getEmployeeRankLabel(employee.rank)}</td>
                      <td className="px-4 py-4"><p className="font-semibold text-slate-800">{employee.deletedBy?.name ?? "—"}</p><p className="mt-0.5 text-slate-500">{employee.deletedBy?.email ?? "—"}</p></td>
                      <td className="whitespace-nowrap px-4 py-4">{formatDate(employee.deletedAt)}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" disabled={restoringId !== null || deletingId !== null} onClick={() => void restore(employee)} className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
                            {isRestoring ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            {isRestoring ? "Đang khôi phục" : "Khôi phục"}
                          </button>
                          <button type="button" disabled={restoringId !== null || deletingId !== null} onClick={() => setDeleteTarget(employee)} className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                            {isDeleting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            {isDeleting ? "Đang xóa" : "Xóa vĩnh viễn"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !loadError && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Trang <strong className="text-slate-800">{page}</strong> / {totalPages}</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Trang trước
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                Trang sau <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="employee-permanent-delete-title" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h2 id="employee-permanent-delete-title" className="mt-4 text-lg font-bold text-slate-900">Xóa vĩnh viễn nhân viên?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bạn sắp xóa vĩnh viễn <strong className="font-semibold text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.employeeCode}). Dữ liệu này sẽ không thể khôi phục.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={deletingId !== null} onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Hủy
              </button>
              <button type="button" disabled={deletingId !== null} onClick={() => void permanentlyDelete()} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
                {deletingId ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingId ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
