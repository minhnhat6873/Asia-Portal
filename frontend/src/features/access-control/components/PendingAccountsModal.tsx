import React from 'react';
import Image from 'next/image';
import { User } from '../types';
import { X, UserCheck, Check, Clock, XCircle, Trash2 } from 'lucide-react';

interface PendingAccountsModalProps {
  users: User[];
  onClose: () => void;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export const PendingAccountsModal: React.FC<PendingAccountsModalProps> = ({
  users,
  onClose,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
}) => {
  const pendingUsers = users.filter((user) => user.status === 'pending');
  const displayedUsers = users.filter(
    (user) => user.status === 'pending' || user.status === 'rejected',
  );

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="m-auto flex h-[42rem] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{'Duy\u1ec7t t\u00e0i kho\u1ea3n'}</h3>
              <p className="text-xs text-slate-500">
                {pendingUsers.length} {'t\u00e0i kho\u1ea3n \u0111ang ch\u1edd ph\u00ea duy\u1ec7t truy c\u1eadp'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={'\u0110\u00f3ng'}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[34rem] space-y-4 overflow-y-auto p-6">
          {displayedUsers.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <Check className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-500">{'Kh\u00f4ng c\u00f2n t\u00e0i kho\u1ea3n n\u00e0o ch\u1edd duy\u1ec7t.'}</p>
            </div>
          ) : (
            displayedUsers.map((user) => {
              const isRejected = user.status === 'rejected';

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                >
                  <Image
                    src="/assets/images/asia-logo.png"
                    alt="Asia F&B Beverage"
                    width={52}
                    height={52}
                    className="shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email} {'\u00b7'} {user.branch}</p>
                    <p className={`mt-0.5 inline-flex items-center gap-1 text-[11px] ${isRejected ? 'text-rose-600' : 'text-amber-600'}`}>
                      <Clock className="h-3 w-3" />
                      {isRejected ? '\u0110\u00e3 t\u1eeb ch\u1ed1i' : 'Ch\u01b0a duy\u1ec7t'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApproveUser(user.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/60 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      <UserCheck className="h-4 w-4" />
                      {'Duy\u1ec7t'}
                    </button>
                    {!isRejected && (
                      <button
                        type="button"
                        onClick={() => onRejectUser(user.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        <XCircle className="h-4 w-4" />
                        {'T\u1eeb ch\u1ed1i'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteUser(user.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      {'X\u00f3a'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
