import React from 'react';
import { User, Role, SystemPermission, ModuleCategory } from '../types';
import { X, ShieldCheck, Mail, Phone, Building2, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

interface UserDetailModalProps {
  user: User | null;
  role: Role | undefined;
  permissions: SystemPermission[];
  modules: ModuleCategory[];
  onClose: () => void;
  onOpenAssign: (user: User) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  role,
  permissions,
  modules,
  onClose,
  onOpenAssign,
}) => {
  if (!user || !role) return null;

  const rolePermissionIds = new Set(role.permissionIds);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b101b] border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              {user.name.split(' ').slice(-1)[0][0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{user.name}</h3>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    user.status === 'active'
                      ? 'bg-emerald-950/70 border border-emerald-700/50 text-emerald-400'
                      : 'bg-rose-950/70 border border-rose-700/50 text-rose-400'
                  }`}
                >
                  {user.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.department} · {user.branch}
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

        {/* Contact Strip */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{user.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Nhóm quyền: <strong className="text-emerald-300 font-semibold">{role.name}</strong>
            </span>
          </div>
        </div>

        {/* Body: List of inherited permissions grouped by module */}
        <div className="p-6 space-y-6 max-h-[55vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Quyền hệ thống được cấp ({role.permissionIds.length}/{permissions.length} quyền)
              </h4>
              <p className="text-xs text-slate-400">
                Thừa hưởng toàn bộ quyền từ vai trò{' '}
                <span className="text-emerald-400 font-medium">{role.name}</span>
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAssign(user);
              }}
              className="text-xs font-semibold px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors"
            >
              Đổi nhóm quyền
            </button>
          </div>

          <div className="space-y-4">
            {modules.map((mod) => {
              const modPerms = permissions.filter((p) => p.module === mod.id);
              const grantedPerms = modPerms.filter((p) => rolePermissionIds.has(p.id));

              return (
                <div
                  key={mod.id}
                  className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/30"
                >
                  <div className="px-4 py-2.5 bg-slate-800/50 flex items-center justify-between border-b border-slate-800/60">
                    <span className="text-xs font-bold text-slate-200">{mod.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {grantedPerms.length} / {modPerms.length} quyền được gán
                    </span>
                  </div>

                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {modPerms.map((perm) => {
                      const isGranted = rolePermissionIds.has(perm.id);
                      return (
                        <div
                          key={perm.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                            isGranted
                              ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                              : 'bg-slate-900/20 border-slate-800/50 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isGranted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                                ✕
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={`font-semibold ${isGranted ? 'text-white' : 'text-slate-400'}`}>
                              {perm.name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
