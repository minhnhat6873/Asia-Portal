import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Eye, 
  Calendar, 
  User, 
  ArrowRight, 
  X,
  LayoutGrid,
  List
} from 'lucide-react';
import { MediaPost, MediaCategory } from '../types';

interface MediaManagementProps {
  mediaPosts: MediaPost[];
  onAddMedia: (post: Omit<MediaPost, 'id'>) => void;
  onUpdateMedia: (post: MediaPost) => void;
  onDeleteMedia: (id: string) => void;
  previewPost: MediaPost | null;
  onSelectPreview: (post: MediaPost | null) => void;
  onNavigateToAdd?: () => void;
  openAddModalTrigger?: boolean;
  onResetAddTrigger?: () => void;
}

const CATEGORIES: MediaCategory[] = [
  'Tin tức',
  'Sự kiện',
  'Thông cáo báo chí',
  'Sản phẩm mới'
];

export const MediaManagement: React.FC<MediaManagementProps> = ({
  mediaPosts,
  onAddMedia,
  onUpdateMedia,
  onDeleteMedia,
  previewPost,
  onSelectPreview,
  onNavigateToAdd,
  openAddModalTrigger,
  onResetAddTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MediaPost | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (openAddModalTrigger) {
      setIsAddModalOpen(true);
      onResetAddTrigger?.();
    }
  }, [openAddModalTrigger]);

  // Form State - balanced and clean
  const [formData, setFormData] = useState({
    title: '',
    category: 'Tin tức' as MediaCategory,
    summary: '',
    content: '',
    coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
    authorDepartment: 'Phòng Marketing',
    publishDate: '22/09/2026',
    status: 'published' as 'published' | 'draft'
  });

  const filteredPosts = useMemo(() => {
    return mediaPosts.filter((post) => {
      const matchSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.authorDepartment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.publishDate.includes(searchQuery);

      const matchCategory =
        selectedCategory === 'all' || post.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [mediaPosts, searchQuery, selectedCategory]);

  // Reset filter function requested by user
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'Tin tức',
      summary: '',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
      authorDepartment: 'Phòng Marketing',
      publishDate: '22/09/2026',
      status: 'published'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (post: MediaPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      category: post.category,
      summary: post.summary,
      content: post.content,
      coverImage: post.coverImage,
      authorDepartment: post.authorDepartment,
      publishDate: post.publishDate,
      status: post.status
    });
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onAddMedia({
      title: formData.title.trim(),
      category: formData.category,
      summary: formData.summary.trim(),
      content: formData.content.trim(),
      coverImage: formData.coverImage.trim() || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
      authorDepartment: formData.authorDepartment.trim() || 'Phòng Marketing',
      publishDate: formData.publishDate.trim() || '22/09/2026',
      status: formData.status
    });

    setIsAddModalOpen(false);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !formData.title.trim()) return;

    onUpdateMedia({
      ...editingPost,
      title: formData.title.trim(),
      category: formData.category,
      summary: formData.summary.trim(),
      content: formData.content.trim(),
      coverImage: formData.coverImage.trim() || editingPost.coverImage,
      authorDepartment: formData.authorDepartment.trim(),
      publishDate: formData.publishDate.trim(),
      status: formData.status
    });

    setEditingPost(null);
  };

  // The detail drawer stays closed until the user explicitly selects a post.
  const activePost = previewPost;

  return (
    <div className="space-y-6">
      {/* Search, Filter & Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tin tức, bài viết, ngày đăng, phòng ban..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="all">Tất cả chuyên mục</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Toggle View Mode (Image 5) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Xem dạng thẻ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Xem dạng bảng"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Đặt lại</span>
          </button>

          {/* Add Media Button */}
          <button
            onClick={onNavigateToAdd || handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng Bài Mới</span>
          </button>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Đang hiển thị <strong>{filteredPosts.length}</strong> bài viết truyền thông & sự kiện Asia F&B
        </span>
      </div>

      {/* VIEW: GRID (Cards + Side Drawer) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Grid: Media Cards */}
          <div
            className={`${
              activePost ? 'lg:col-span-7 sm:grid-cols-2' : 'lg:col-span-12 sm:grid-cols-2 lg:grid-cols-3'
            } grid grid-cols-1 gap-5`}
          >
            {filteredPosts.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                Không tìm thấy bài viết nào phù hợp.
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isSelected = activePost?.id === post.id;
                return (
                  <div
                    key={post.id}
                    onClick={() => onSelectPreview(post)}
                    className={`group relative rounded-3xl overflow-hidden aspect-[4/3] cursor-pointer shadow-md transition-all duration-300 ${
                      isSelected
                        ? 'ring-4 ring-sky-500 shadow-xl scale-[1.01]'
                        : 'hover:shadow-xl hover:scale-[1.005]'
                    }`}
                  >
                    {/* Background Cover Image */}
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay for high text contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-900/20" />

                    {/* Content Layer */}
                    <div className="absolute inset-0 p-5 flex flex-col justify-between text-white">
                      {/* Top Left Category Pill */}
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/25 backdrop-blur-md text-white border border-white/20">
                          {post.category}
                        </span>
                        {post.status === 'draft' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                            Bản nháp
                          </span>
                        )}
                      </div>

                      {/* Bottom Details & Arrow Button */}
                      <div className="flex items-end justify-between gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-bold text-base leading-snug line-clamp-2 text-white drop-shadow-sm group-hover:text-amber-300 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-xs text-slate-300 mt-2 font-medium">
                            {post.publishDate}
                          </p>
                        </div>

                        {/* Yellow Circular Arrow Button */}
                        <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg group-hover:bg-amber-300 group-hover:translate-x-1 transition-all">
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Side: Detail Drawer */}
          {activePost && (
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden sticky top-20 flex flex-col">
              {/* Header Image with Category Pill and Close Button */}
              <div className="relative w-full h-56 sm:h-64 overflow-hidden bg-slate-100">
                <img
                  src={activePost.coverImage}
                  alt={activePost.title}
                  className="w-full h-full object-cover"
                />

                {/* Red Category Pill at Bottom-Left */}
                <div className="absolute bottom-4 left-4">
                  <span className="px-3.5 py-1 rounded-full bg-[#991b1b] text-white text-xs font-bold shadow-sm">
                    {activePost.category}
                  </span>
                </div>

                {/* Circular Close X at Top-Right */}
                <button
                  onClick={() => onSelectPreview(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-sm transition-colors"
                  title="Đóng chi tiết"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-3.5">
                {/* Title */}
                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                  {activePost.title}
                </h2>

                {/* Sapo Summary */}
                <p className="text-sm text-slate-500 leading-relaxed">
                  {activePost.summary}
                </p>

                {/* Subtle Divider */}
                <div className="border-b border-slate-100 pt-1"></div>

                {/* Metadata Row: Date & Department */}
                <div className="space-y-2 text-sm text-slate-400 font-normal">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    <span>{activePost.publishDate}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    <span>{activePost.authorDepartment}</span>
                  </div>
                </div>

                {/* Characteristic Mint Content Box */}
                <div className="bg-[#f0fdf4] border border-emerald-100/80 rounded-2xl p-4 text-xs md:text-sm text-emerald-900/90 leading-relaxed font-normal mt-2">
                  <p className="whitespace-pre-line">
                    {activePost.content}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Trạng thái: <strong>{activePost.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(activePost)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                    <button
                      onClick={() => setDeletingId(activePost.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW: TABLE (Dạng bảng giống như bên nhân viên) */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Bài viết & Ảnh bìa</th>
                  <th className="py-3.5 px-4">Chuyên mục</th>
                  <th className="py-3.5 px-4">Ngày đăng</th>
                  <th className="py-3.5 px-4">Người đăng / Phòng ban</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="w-32 py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 max-w-sm">
                          <span
                            onClick={() => {
                              onSelectPreview(post);
                              setViewMode('grid');
                            }}
                            className="font-bold text-slate-900 block text-xs hover:text-sky-700 cursor-pointer truncate"
                          >
                            {post.title}
                          </span>
                          <span className="text-[11px] text-slate-400 line-clamp-1">
                            {post.summary}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {post.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{post.publishDate}</td>
                    <td className="py-3 px-4 text-slate-600">{post.authorDepartment}</td>
                    <td className="py-3 px-4">
                      {post.status === 'published' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Đã xuất bản
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Bản nháp
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPreview(post);
                            setViewMode('grid');
                          }}
                          className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(post)}
                          className="rounded-md p-1 text-emerald-600 transition-colors hover:bg-emerald-50"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(post.id)}
                          className="rounded-md p-1 text-rose-500 transition-colors hover:bg-rose-50"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MEDIA POST */}
      {/* Redesigned: 100% straight, balanced 50%-50% equal columns, ONE single frame, NO internal scrollbar */}
      {(isAddModalOpen || editingPost) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="pb-4 mb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isAddModalOpen ? 'Đăng Bài Viết Truyền Thông / Sự Kiện Mới' : 'Chỉnh Sửa Bài Viết Truyền Thông'}
                </h3>
                <p className="text-xs text-slate-500">
                  Asia Food & Beverage Media & Public Relations
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingPost(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleSubmitAdd : handleSubmitEdit}
              className="space-y-3.5 text-xs"
            >
              {/* Row 1: Tiêu đề bài viết (50%) & Chuyên mục (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tiêu đề bài viết / sự kiện *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold text-slate-900"
                    placeholder="Á Châu mở rộng dây chuyền sản xuất mới"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại tin / Chuyên mục *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as MediaCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Ngày đăng (50%) & Người đăng / Phòng ban (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày đăng (DD/MM/YYYY) *</label>
                  <input
                    type="text"
                    required
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="22/09/2026"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Người đăng / Phòng ban phụ trách *</label>
                  <input
                    type="text"
                    required
                    value={formData.authorDepartment}
                    onChange={(e) => setFormData({ ...formData, authorDepartment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="Phòng Marketing"
                  />
                </div>
              </div>

              {/* Row 3: Link ảnh bìa (50%) & Trạng thái (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Link ảnh bìa bài viết *</label>
                  <input
                    type="url"
                    required
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trạng thái xuất bản *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'published' | 'draft' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium"
                  >
                    <option value="published">Đã xuất bản</option>
                    <option value="draft">Bản nháp</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Tóm tắt ngắn (50%) & Nội dung chi tiết (50%) - Straight aligned side by side, same height! */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tóm tắt ngắn (Sapo hiển thị dưới tiêu đề) *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none leading-relaxed"
                    placeholder="Á Châu vừa khánh thành nhà máy sản xuất mới tại Bình Dương..."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nội dung chi tiết (Hiển thị trong khung xanh) *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none leading-relaxed"
                    placeholder="Ngày 05/09/2026, Asia Food & Beverage chính thức khánh thành..."
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingPost(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
                >
                  {isAddModalOpen ? 'Đăng Bài Viết' : 'Cập Nhật Bài Viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Bài Viết?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Bài viết sẽ bị xóa khỏi trang web và danh sách quản trị. Bạn có chắc chắn muốn xóa?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onDeleteMedia(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Đồng Ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
