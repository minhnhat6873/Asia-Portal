import React from 'react';
import { 
  Building2,
  FileText,
  Users, 
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import { Employee, MediaPost, ActiveTab } from '../types';
import { RichText } from '@/components/ui/RichText';

import type { DashboardSummary } from '../dashboard.service';
interface DashboardOverviewProps {
  employees: Employee[];
  mediaPosts: MediaPost[];
  summary: DashboardSummary | null;
  onNavigate: (tab: ActiveTab) => void;
  onPreviewMedia: (post: MediaPost) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  employees,
  mediaPosts,
  onNavigate,
  summary,
  onPreviewMedia,
}) => {
  const totalEmployees = summary?.totalEmployees ?? employees.length;
  const totalDepartments = summary?.totalDepartments ?? new Set(employees.map((employee) => employee.department)).size;

  return (
    <div className="space-y-6">


      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          onClick={() => onNavigate('employees')}
          className="group flex min-h-40 cursor-pointer items-center gap-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all hover:border-emerald-400/60 hover:shadow-sm"
        >
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
            <Users className="h-10 w-10" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-base font-bold text-slate-600">Tổng số nhân viên</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{totalEmployees}</p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('employees')}
          className="group flex min-h-40 cursor-pointer items-center gap-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all hover:border-sky-400/60 hover:shadow-sm"
        >
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-sky-50 text-sky-500 transition-transform group-hover:scale-105">
            <Building2 className="h-10 w-10" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-base font-bold text-slate-600">Số phòng ban</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{totalDepartments}</p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('media')}
          className="group flex min-h-40 cursor-pointer items-center gap-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all hover:border-amber-400/60 hover:shadow-sm"
        >
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 transition-transform group-hover:scale-105">
            <FileText className="h-10 w-10" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-base font-bold text-slate-600">Bài viết</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{mediaPosts.length}</p>
          </div>
        </div>
      </div>

      {/* Recent media — full width now that the department panel is gone */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Tin Tức & Hoạt Động Truyền Thông Mới Nhất
            </h3>
            <p className="text-xs text-slate-500">
              Sự kiện, mở rộng nhà máy, đạt chứng nhận và ra mắt sản phẩm
            </p>
          </div>
          <button
            onClick={() => onNavigate('media')}
            className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1"
          >
            Xem tất cả ({mediaPosts.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Two-up on wide screens so the full-width panel does not stretch
            each row into a very long, thin strip. */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {mediaPosts.slice(0, 4).map((post) => (
            <div
              key={post.id}
              onClick={() => {
                onPreviewMedia(post);
                onNavigate('media');
              }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3.5 rounded-2xl border border-slate-100 hover:border-sky-200 hover:bg-slate-50/70 transition-all group cursor-pointer"
            >
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full sm:w-28 h-24 sm:h-20 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {post.publishDate}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-sky-700 transition-colors">
                  {post.title}
                </h4>
                <RichText
                  html={post.summary}
                  className="text-xs text-slate-500 line-clamp-1 mt-0.5 [&_p]:my-0"
                />
              </div>

              <div className="shrink-0">
                <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl group-hover:bg-sky-50 group-hover:text-sky-700 transition-colors">
                  Xem bài viết
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
