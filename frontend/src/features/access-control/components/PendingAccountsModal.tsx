import React, { useState } from 'react';
import Image from 'next/image';
import { User, Role } from '../types';
import { X, UserCheck, ShieldCheck, Check, Clock, AlertCircle, XCircle, Trash2 } from 'lucide-react';

interface PendingAccountsModalProps {
  mode: 'pending' | 'rejected';
  users: User[];
  roles: Role[];
  onClose: () => void;
  /** Duyệt tài khoản: nếu không chọn role, tài khoản chỉ được kích hoạt và giữ trạng thái không có quyền. */
  onApproveUser: (userId: string, roleId?: string) => void;
  /** Từ chối duyệt: tài khoản bị hạ xuống 'suspended' và rời danh sách chờ */
  onRejectUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

type ModalView = 'list' | 'confirm' | 'assign';

/**
 * Modal duyệt tài khoản chờ duyệt.
 * Flow: danh sách → (Duyệt tài khoản) → confirm phân quyền →
 *   Có  → view "Phân quyền" (gán nhóm quyền) → xong quay lại danh sách
 *   Không → duyệt luôn không gán quyền, ở lại danh sách
 * Nút X đóng modal được ở mọi view.
 */
export const PendingAccountsModal: React.FC<PendingAccountsModalProps> = ({
  mode,
  users,
  roles,
  onClose,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
}) => {
  const [view, setView] = useState<ModalView>('list');
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const rejectedUsers = users.filter((u) => u.status === 'rejected');
  const displayedUsers = mode === 'pending' ? pendingUsers : rejectedUsers;

  // Bấm "Duyệt tài khoản" → hỏi confirm
  const openConfirm = (user: User) => {
    setConfirmTarget(user);
    setView('confirm');
  };

  // Chọn "Có" → sang view Phân quyền
  const goAssign = () => {
    if (!confirmTarget) return;
    setAssignTarget(confirmTarget);
    setSelectedRoleId(roles[0]?.id ?? '');
    setConfirmTarget(null);
    setView('assign');
  };

  // Chọn "Không" → duyệt luôn không gán quyền, ở lại danh sách
  const approveWithoutRole = () => {
    if (!confirmTarget) return;
    onApproveUser(confirmTarget.id);
    setConfirmTarget(null);
    setView('list');
  };

  // Hoàn tất phân quyền → duyệt + gán quyền, quay lại danh sách
  const finishAssign = () => {
    if (!assignTarget) return;
    onApproveUser(assignTarget.id, selectedRoleId || undefined);
    setAssignTarget(null);
    setView('list');
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="flex h-[42rem] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header — nút X luôn khả dụng ở mọi view */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {view === 'assign' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {view === 'assign' ? 'Phân quyền cho người dùng' : mode === 'pending' ? 'Duyệt tài khoản' : 'Tài khoản từ chối'}
              </h3>
              <p className="text-xs text-slate-400">
                {view === 'assign'
                  ? 'Thay đổi vai trò và quyền hạn thao tác trong hệ thống ASIA F&B'
                  : mode === 'pending'
                    ? `${displayedUsers.length} tài khoản đang chờ phê duyệt truy cập`
                    : `${displayedUsers.length} tài khoản đã bị từ chối`}
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

        {/* View: DANH SÁCH tài khoản chờ duyệt */}
        {view === 'list' && (
          <div className="h-[34rem] space-y-4 overflow-y-auto p-6">
            {displayedUsers.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2Placeholder />
                <p className="text-sm text-slate-400">Không còn tài khoản nào chờ duyệt.</p>
              </div>
            ) : (
              displayedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                >
                  <div className="shrink-0">
                    <Image
                      src="/assets/images/asia-logo.png"
                      alt="Asia F&B Beverage"
                      width={52}
                      height={52}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {user.email} · {user.branch}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {mode === 'pending' ? 'Chưa duyệt' : 'Đã từ chối'}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {mode === 'pending' ? (
                      <>
                        <button onClick={() => onDeleteUser(user.id)} className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"><Trash2 className="w-4 h-4" />Xóa tài khoản</button>
                        <button onClick={() => onRejectUser(user.id)} className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50"><XCircle className="w-4 h-4" />Từ chối</button>
                        <button onClick={() => openConfirm(user)} className="flex items-center gap-1.5 rounded-xl border border-emerald-600/60 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"><UserCheck className="w-4 h-4" />Duyệt tài khoản</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => onDeleteUser(user.id)} className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"><Trash2 className="w-4 h-4" />Xóa</button>
                        <button onClick={() => onApproveUser(user.id, user.roleId)} className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"><UserCheck className="w-4 h-4" />Duyệt lại</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* View: CONFIRM phân quyền */}
        {view === 'confirm' && confirmTarget && (
          <div className="p-6 space-y-4">
            <div className="px-6 py-4 -mx-6 -mt-6 mb-2 bg-slate-800/30 border-b border-slate-800/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-slate-900 bg-transparent flex items-center justify-center shrink-0 overflow-hidden">
                <Image
                  src="/assets/images/asia-logo.png"
                  alt="Asia F&B Beverage"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{confirmTarget.name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {confirmTarget.email} · {confirmTarget.branch}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
              <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-black font-medium leading-relaxed">
                Bạn có muốn phân quyền cho tài khoản{' '}
                <strong className="font-bold">{confirmTarget.name}</strong> không?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={approveWithoutRole}
                className="px-4 py-2 text-sm font-bold border border-rose-300 bg-rose-100 text-rose-700 rounded-xl transition-colors hover:bg-rose-200 hover:border-rose-400"
              >
                Không
              </button>
              <button
                onClick={goAssign}
                className="px-5 py-2 text-sm font-semibold border border-emerald-600/60 bg-emerald-50 text-emerald-700 rounded-xl transition-colors hover:bg-emerald-100 hover:border-emerald-700"
              >
                Có
              </button>
            </div>
          </div>
        )}

        {/* View: PHÂN QUYỀN */}
        {view === 'assign' && assignTarget && (
          <div className="max-h-[60vh] overflow-y-auto">
            {/* User Info Bar — pattern như AssignRoleModal */}
            <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-slate-900 bg-transparent flex items-center justify-center shrink-0 overflow-hidden">
                  <Image
                    src="/assets/images/asia-logo.png"
                    alt="Asia F&B Beverage"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{assignTarget.name}</p>
                  <p className="text-xs text-slate-400">
                    {assignTarget.email} · {assignTarget.branch}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Trạng thái</span>
                <span className="text-xs font-medium text-emerald-400">Chờ duyệt</span>
              </div>
            </div>

            <div className="p-6 space-y-5">
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
                            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
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
            </div>

            {/* Footer — pattern như AssignRoleModal */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setAssignTarget(null);
                  setView('list');
                }}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={finishAssign}
                className="px-5 py-2 text-sm font-semibold border border-emerald-600/60 bg-emerald-50 text-emerald-700 rounded-xl transition-colors hover:bg-emerald-100 hover:border-emerald-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Lưu phân quyền
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Icon placeholder khi danh sách rỗng (tránh import thừa ở scope ngoài) */
const CheckCircle2Placeholder: React.FC = () => (
  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
    <Check className="w-6 h-6" />
  </div>
);
