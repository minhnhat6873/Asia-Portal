import React from 'react';
import { 
  Users, 
  Newspaper, 
  Plus,
  ArrowUpRight,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Employee, MediaPost, ActiveTab } from '../types';

interface DashboardOverviewProps {
  employees: Employee[];
  mediaPosts: MediaPost[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenAddEmployee: () => void;
  onOpenAddMedia: () => void;
  onPreviewMedia: (post: MediaPost) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  employees,
  mediaPosts,
  onNavigate,
  onOpenAddEmployee,
  onOpenAddMedia,
  onPreviewMedia,
}) => {
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const probationEmployees = employees.filter((e) => e.status === 'probation').length;
  const publishedPosts = mediaPosts.filter((m) => m.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 text-white shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Asia Food & Beverage JSC
            </span>
            <span className="text-slate-400 text-xs">• Bảng Điều Khiển Tổng Quan</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Cổng Quản Trị Nhân Sự & Truyền Thông Asia F&B
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Theo dõi tình hình nhân sự, cơ cấu phòng ban và hoạt động truyền thông, sự kiện Asia Food & Beverage.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto md:flex-nowrap md:gap-3">
          <a
            href="https://asia-q5di.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors border border-white/15"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mở Trang Render</span>
          </a>
          <button
            onClick={onOpenAddEmployee}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nhân sự</span>
          </button>
          <button
            onClick={onOpenAddMedia}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Truyền thông</span>
          </button>
        </div>
      </div>

      {/* 2 Metric Cards Grid — two cards, so the row splits 50/50 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: Nhân sự */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs hover:border-emerald-500/50 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Số Nhân Sự
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {employees.length}
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {activeEmployees} đang làm việc
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{probationEmployees} nhân sự thử việc</span>
            <span className="text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Xem chi tiết <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Truyền thông */}
        <div
          onClick={() => onNavigate('media')}
          className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs hover:border-sky-500/50 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bài Viết Truyền Thông & Sự Kiện
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Newspaper className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {mediaPosts.length}
            </span>
            <span className="text-xs font-medium text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
              {publishedPosts} bài xuất bản
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tin tức, thông cáo & sự kiện</span>
            <span className="text-sky-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Xem chi tiết <ArrowUpRight className="w-3 h-3" />
            </span>
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
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {post.summary}
                </p>
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
