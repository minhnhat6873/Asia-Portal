"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronDown, LayoutDashboard, Newspaper, Users } from "lucide-react";
import type { ModuleCategory, Role, SystemPermission } from "../types";
import { GROUP_COLORS, GROUP_ICONS, type GroupColor, type GroupIcon } from "../permission-group-appearance";
import { PermissionGroupBadge } from "./PermissionGroupBadge";

export interface PermissionGroupFormData {
  name: string;
  description: string;
  permissionIds: string[];
  color: GroupColor;
  icon: GroupIcon;
}

interface Props {
  initialRole?: Role;
  permissions: SystemPermission[];
  modules: ModuleCategory[];
  saving: boolean;
  onSave: (data: PermissionGroupFormData) => Promise<boolean>;
  onCancel: () => void;
}

export function PermissionGroupForm({ initialRole, permissions, modules, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialRole?.name ?? "");
  const [description, setDescription] = useState(initialRole?.description ?? "");
  const [color, setColor] = useState<GroupColor>(initialRole?.color ?? "emerald");
  const [icon, setIcon] = useState<GroupIcon>(initialRole?.icon ?? "shield");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialRole?.permissionIds ?? []);
  const [expandedIds, setExpandedIds] = useState<string[]>(() => initialRole
    ? modules.filter((module) => permissions.some((permission) => permission.module === module.id && initialRole.permissionIds.includes(permission.id))).map((module) => module.id)
    : modules.slice(0, 1).map((module) => module.id));
  const [error, setError] = useState("");
  const editing = Boolean(initialRole);
  const allSelected = permissions.length > 0 && permissions.every((permission) => selectedIds.includes(permission.id));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (name.trim().length < 2 || name.trim().length > 100) { setError("Tên nhóm quyền phải từ 2 đến 100 ký tự."); return; }
    if (description.trim().length > 500) { setError("Mô tả không được vượt quá 500 ký tự."); return; }
    if (!selectedIds.length) { setError("Vui lòng chọn ít nhất một quyền cho nhóm."); return; }
    setError("");
    await onSave({ name: name.trim(), description: description.trim(), permissionIds: selectedIds, color, icon });
  };

  const togglePermission = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className="asia-access-control min-w-0 space-y-5 text-base sm:text-lg">
      {editing && <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <button type="button" disabled={saving} onClick={onCancel} aria-label="Quay lại nhóm quyền" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="text-base text-slate-500">Chỉnh sửa nhóm quyền</p><h2 className="break-words text-2xl font-bold text-slate-900">{initialRole?.name}</h2></div>
      </header>}
      <form noValidate onSubmit={(event) => void submit(event)} className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-2">
        <section className="min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Thông tin nhóm quyền</h2>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-base text-rose-700">{error}</p>}
          <div>
            <label htmlFor="role-name" className="mb-2 block font-semibold text-slate-700">Tên nhóm quyền <span className="text-rose-600">*</span></label>
            <input id="role-name" name="name" required minLength={2} maxLength={100} disabled={saving} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập tên nhóm quyền..." className="min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60" />
          </div>
          <div>
            <label htmlFor="role-description" className="mb-2 block font-semibold text-slate-700">Mô tả</label>
            <textarea id="role-description" name="description" maxLength={500} disabled={saving} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Nhập mô tả về nhóm quyền..." className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60" />
          </div>
          <fieldset disabled={saving}>
            <legend className="mb-3 font-semibold">Màu sắc hiển thị</legend>
            <div className="flex flex-wrap gap-3">
              {GROUP_COLORS.map((option) => <label key={option.id} className="relative cursor-pointer" title={option.name}>
                <input type="radio" name="role-color" aria-label={`Màu ${option.name}`} value={option.id} checked={color === option.id} onChange={() => setColor(option.id)} className="peer sr-only" />
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-transparent peer-checked:border-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" style={{ backgroundColor: option.swatch }}>
                  {color === option.id && <Check aria-hidden="true" className="h-5 w-5 text-white" />}
                </span>
              </label>)}
            </div>
          </fieldset>
          <fieldset disabled={saving}>
            <legend className="mb-3 font-semibold">Icon</legend>
            <div className="flex flex-wrap gap-3">
              {GROUP_ICONS.map(({ id, name: label, Icon }) => <label key={id} className="relative cursor-pointer" title={label}>
                <input type="radio" name="role-icon" aria-label={`Icon ${label}`} value={id} checked={icon === id} onChange={() => setIcon(id)} className="peer sr-only" />
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#64748b] peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50"><Icon aria-hidden="true" className="h-5 w-5" /></span>
              </label>)}
            </div>
          </fieldset>
          <div>
            <p className="mb-3 text-sm font-medium">Xem trước</p>
            <PermissionGroupBadge name={name.trim() || "Tên nhóm quyền"} color={color} icon={icon} />
          </div>
        </section>
        <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div><h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Chọn quyền cho nhóm</h2><p className="mt-1 text-base text-slate-500">Chọn các quyền mà nhóm này sẽ được sử dụng</p></div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 whitespace-nowrap"><input type="checkbox" disabled={saving} checked={allSelected} onChange={(event) => setSelectedIds(event.target.checked ? permissions.map((permission) => permission.id) : [])} className="h-6 w-6 shrink-0 rounded accent-emerald-700" />Chọn tất cả</label>
          </div>
          <div className="space-y-4 xl:max-h-[38rem] xl:overflow-y-auto xl:pr-2">
            {modules.map((module) => {
              const items = permissions.filter((permission) => permission.module === module.id);
              if (!items.length) return null;
              const checked = items.every((permission) => selectedIds.includes(permission.id));
              const expanded = expandedIds.includes(module.id);
              const Icon = { meetings: CalendarDays, employees: Users, media: Newspaper, dashboard: LayoutDashboard }[module.id];
              return <div key={module.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex min-h-16 items-center gap-3 bg-slate-50 px-3 sm:px-4">
                  <input type="checkbox" disabled={saving} checked={checked} aria-label={`Chọn tất cả quyền ${module.name}`} onChange={() => setSelectedIds((current) => checked ? current.filter((id) => !items.some((permission) => permission.id === id)) : [...new Set([...current, ...items.map((permission) => permission.id)])])} className="h-6 w-6 shrink-0 rounded accent-emerald-700" />
                  <button type="button" aria-expanded={expanded} aria-controls={`permission-module-${module.id}`} onClick={() => setExpandedIds((current) => expanded ? current.filter((id) => id !== module.id) : [...current, module.id])} className="flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 py-3 text-left">
                    <span className="flex min-w-0 flex-wrap items-center gap-2"><Icon className="h-6 w-6 shrink-0 text-emerald-700" /><span className="break-words font-semibold">{module.name}</span><span className="text-base text-slate-500">({items.length} quyền)</span></span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-emerald-700 transition-transform ${expanded ? "" : "-rotate-90"}`} />
                  </button>
                </div>
                {expanded && <div id={`permission-module-${module.id}`} className="ml-5 border-l border-emerald-100 pl-3 pr-3 sm:ml-7 sm:pl-4 sm:pr-4">
                  {items.map((permission) => <label key={permission.id} className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"><input type="checkbox" disabled={saving} checked={selectedIds.includes(permission.id)} onChange={() => togglePermission(permission.id)} className="h-6 w-6 shrink-0 rounded accent-emerald-700" /><span>{permission.name}</span></label>)}
                </div>}
              </div>;
            })}
          </div>
        </section>
        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end xl:col-span-2">
          <button type="button" disabled={saving} onClick={onCancel} className="min-h-12 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><Check className="h-5 w-5" />{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo nhóm quyền"}</button>
        </footer>
      </form>
    </div>
  );
}
