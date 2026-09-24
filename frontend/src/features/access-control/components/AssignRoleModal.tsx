import React, { useState } from 'react';
import { User, Role, SystemPermission } from '../types';
import { X, ShieldCheck, Check, AlertCircle, Info } from 'lucide-react';

interface AssignRoleModalProps {
  user: User | null;
  roles: Role[];
  permissions: SystemPermission[];
  onClose: () => void;
  onSave: (userId: string, newRoleId: string) => void;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  user,
  roles,
  permissions,
  onClose,
  onSave,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(user?.roleId ?? '');

  if (!user) return null;

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const assignedPermissions = permissions.filter((p) =>
    selectedRole?.permissionIds.includes(p.id)
  );

  const handleSave = () => {
    onSave(user.id, selectedRoleId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0c121e] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Phân quyền cho người dùng</h3>
              <p className="text-xs text-slate-400">
                Thay đổi vai trò và quyền hạn thao tác trong hệ thống ASIA F&B
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Bar */}
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-700/30 border border-emerald-600/40 flex items-center justify-center font-bold text-emerald-300 text-sm">
              {user.name.split(' ').slice(-1)[0][0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-slate-400">
                {user.email} · {user.branch}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Quyền hiện tại</span>
            <span className="text-xs font-medium text-emerald-400">
              {roles.find((r) => r.id === user.roleId)?.name}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Chọn nhóm quyền áp dụng
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/50'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-sm text-white">{role.name}</div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          {role.permissionIds.length} quyền
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {role.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions Preview */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Quyền sẽ cấp cho nhân viên ({assignedPermissions.length} quyền)
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Nhóm: <strong className="text-slate-200">{selectedRole?.name}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {assignedPermissions.map((perm) => (
                <div
                  key={perm.id}
                  className="text-[11px] px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-md text-slate-300 flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{perm.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/40 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Lưu phân quyền
          </button>
        </div>
      </div>
    </div>
  );
};
