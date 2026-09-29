"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { newsCategories, NewsItem } from "@/config/news";
import { useNews } from "@/lib/usePortalContent";
import { ArrowRight, Calendar, User, ChevronRight, Search, ArrowDownUp, LayoutGrid, Newspaper, Users, Megaphone, X, RotateCcw } from "lucide-react";

interface Props {
  preview?: boolean;
}

function SearchBox({ query, onChange }: { query: string; onChange: (value: string) => void }) {
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      role="search"
      aria-label="Tìm kiếm tin tức"
      className="flex w-full min-w-0 items-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-[#dbe9e0] transition focus-within:ring-2 focus-within:ring-[#16894a] lg:max-w-xl"
    >
      <Search size={20} aria-hidden="true" className="mx-2 shrink-0 text-[#0d7c49] sm:mx-3" />
      <input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Bạn muốn tìm tin gì?"
        aria-label="Từ khóa tin tức"
        className="w-full min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[#16241a] outline-none placeholder:text-slate-400"
      />
      <button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#087a43] px-3 text-sm font-bold text-white transition-colors hover:bg-[#066838] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087a43] sm:px-5">
        Tìm kiếm <ArrowRight size={16} aria-hidden="true" className="hidden sm:block" />
      </button>
    </form>
  );
}

function FeaturedEvent({ item, onSelect }: { item: NewsItem; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group mb-12 grid w-full cursor-pointer grid-cols-1 items-center gap-6 text-left md:grid-cols-[1.1fr_1fr]"
    >
      <div className="relative h-80 overflow-hidden rounded-xl md:h-[420px]">
        <Image
          src={item.image}
          alt={item.title}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="md:pr-6">
        <span className={`mb-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${categoryBadgeClass[item.category]}`}>
          {item.category}
        </span>
        <h3 className="mb-3 text-3xl font-black leading-tight text-[#16241a] md:text-4xl">{item.title}</h3>
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-500">{item.excerpt}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
          <span className="flex items-center gap-1"><User size={12} /> {item.author}</span>
        </div>
      </div>
    </button>
  );
}

function NewsDetailPanel({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  return (
    <aside className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6">
      <div className="relative h-44">
        <Image src={item.image} alt={item.title} fill sizes="360px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <span className={`absolute bottom-3 left-4 text-xs px-2.5 py-1 rounded-full font-semibold ${categoryBadgeClass[item.category]}`}>
          {item.category}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết bài viết"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-black leading-snug text-[#16241a]">{item.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.excerpt}</p>
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-center gap-2 text-slate-400"><Calendar size={15} /> <span>{item.date}</span></div>
          <div className="mt-3 flex items-center gap-2 text-slate-400"><User size={15} /> <span>{item.author}</span></div>
        </div>
        <div className="mt-5 rounded-xl bg-[#eff9f1] p-3 text-xs leading-relaxed text-[#287348]">
          {item.content}
        </div>
      </div>
    </aside>
  );
}

const categoryIcons: Record<string, typeof LayoutGrid> = {
  "Tất cả": LayoutGrid,
  "Sự kiện": Calendar,
  "Tin tức": Newspaper,
  "Nhân sự": Users,
  "Thông báo": Megaphone,
};

const categoryBadgeClass: Record<string, string> = {
  "Sự kiện": "badge-event",
  "Tin tức": "badge-news",
  "Nhân sự": "badge-hr",
  "Thông báo": "badge-announce",
};

export default function NewsSection({ preview = false }: Props) {
  // Live content: static config until the admin dashboard publishes, then the
  // admin's published posts only (drafts stay admin-side).
  const news = useNews();
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const filtered = news.filter(
    (n) => activeCategory === "Tất cả" || n.category === activeCategory
  );

  // On the home page preview we surface the newest featured posts; when the
  // admin has published their own posts those become the featured ones.
  const featuredPosts = filtered.filter((n) => n.featured);
  const displayed = preview
    ? (featuredPosts.length ? featuredPosts : filtered).slice(0, 3)
    : filtered;
  const searched = displayed.filter((item) => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return !query || item.title.toLocaleLowerCase().includes(query) || item.excerpt.toLocaleLowerCase().includes(query);
  });
  const sortedItems = [...searched].sort((first, second) => {
    const toTimestamp = (value: string) => {
      const [day, month, year] = value.split("/");
      return new Date(`${year}-${month}-${day}`).getTime();
    };
    const difference = toTimestamp(second.date) - toTimestamp(first.date);
    return sortOrder === "newest" ? difference : -difference;
  });
  const isSearching = searchQuery.trim() !== "";
  // Matches the Employees filter bar: the reset button only appears once
  // something is actually filtered.
  const hasActiveFilters = searchQuery.trim() !== "" || activeCategory !== newsCategories[0];
  const clearFilters = () => {
    setSearchQuery("");
    setActiveCategory(newsCategories[0]);
  };

  /**
   * Opening an article always does both things, in this order: move the
   * category filter to the article's own category, then highlight it in the
   * detail panel. The featured card has always behaved this way; applying it to
   * the grid cards too keeps the two consistent — a grid card used to open the
   * panel while leaving the chips on "Tất cả", which looked like the filter and
   * the panel disagreed about what was being shown.
   */
  const openArticle = (item: NewsItem) => {
    setActiveCategory(item.category);
    setSelectedNews(item);
  };
  // While searching we drop the hero-style featured card so every result sits in
  // the grid and can open the detail panel on the right.
  const showFeatured = !preview && !isSearching && activeCategory === newsCategories[0];
  const featuredEvent = showFeatured
    ? sortedItems.find((item) => categoryBadgeClass[item.category] === "badge-event") ?? null
    : null;
  const gridItems = featuredEvent ? sortedItems.filter((item) => item.id !== featuredEvent.id) : sortedItems;
  // The panel opens on click and stays closed until then. It used to be forced
  // open on the grid-only tabs, which meant clicking a card while the featured
  // hero was showing (e.g. the "Thông báo" post) selected it but rendered
  // nothing — the panel only existed when `showFeatured` was false.
  const selectedItem =
    !preview && selectedNews && sortedItems.some((item) => item.id === selectedNews.id)
      ? selectedNews
      : null;
  const showDetailPanel = selectedItem !== null;

  return (
    <section className={preview ? "bg-white py-8 sm:py-12 xl:py-16" : "bg-white pb-8 sm:pb-12 xl:pb-16"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        {!preview && (
          <div className="relative left-1/2 mb-8 h-[260px] w-screen -translate-x-1/2 overflow-hidden md:h-[340px]">
            <Image
              src="/assets/images/truyenthong1.png"
              alt="Tin tức và truyền thông"
              fill
              priority
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: "60% center" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
            <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6">
              <div className="max-w-[430px]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#f5c800] sm:text-xs">
                  Asia Stories
                </p>
                <h1 className="mt-2 text-3xl font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-4xl md:text-5xl">
                  Asia Food &amp; Beverage
                </h1>
                <p className="mt-3 text-xl font-black leading-tight text-[#f5c800] sm:text-2xl md:text-3xl">
                  Tin tức &amp; Truyền thông
                </p>
              </div>
            </div>
          </div>
        )}
        <div className={preview ? "mb-7 flex flex-col items-start gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6" : "hidden"}>
          <div className="max-w-2xl">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#16894a] sm:mb-3 sm:text-xs">
              Wana Stories
            </p>
            <h2 className="text-3xl font-black leading-[1.05] tracking-[-0.035em] text-[#073d37] sm:text-4xl xl:text-5xl">
              Tin tức &amp; Truyền thông
            </h2>
            <p className={preview ? "mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-500 sm:mt-4 sm:text-base xl:text-lg" : "hidden"}>
              Cập nhật những hoạt động, sự kiện và câu chuyện<br className="hidden md:block" /> mới nhất tại Á Châu.
            </p>
          </div>
          {preview && (
            <Link
              href="/news"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-bold sm:mb-1 sm:gap-3 sm:text-base text-[#0c5743] transition-colors hover:text-[#16894a] md:text-lg"
            >
              Xem tất cả <ArrowRight size={22} strokeWidth={2.5} />
            </Link>
          )}
        </div>
        {/* News discovery menu (full page only) */}
        {!preview && (
          <div className="mb-9 overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-16px_rgba(7,61,55,0.18)] ring-1 ring-[#dce9e1]">
            <div className="flex flex-col gap-5 bg-gradient-to-br from-[#edf7ef] via-[#f7faf7] to-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#073d37] text-[#f5c800] shadow-sm">
                  <Newspaper size={23} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-[#073d37] sm:text-xl">Khám phá tin tức</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">Kết nối với những câu chuyện tại Á Châu</p>
                </div>
              </div>
              <SearchBox query={searchQuery} onChange={setSearchQuery} />
            </div>
            <div className="px-5 pb-4 pt-5 sm:px-6">
              <div role="group" aria-label="Danh mục tin tức" className="flex flex-wrap gap-2">
                {newsCategories.map((category) => {
                  const Icon = categoryIcons[category] ?? Newspaper;
                  const isActive = activeCategory === category;
                  // Only the chip matching the active category carries a number.
                  // Its value is the result count after applying BOTH the category
                  // and the search keyword, so searching rewrites the badge on the
                  // chip that is currently selected.
                  const showCount = activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveCategory(category)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087a43] sm:gap-2.5 sm:px-4 ${isActive ? "bg-[#087a43] text-white shadow-[0_4px_12px_rgba(8,122,67,0.18)]" : "bg-[#f5f7f6] text-slate-600 hover:bg-[#edf7ef] hover:text-[#087a43]"}`}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {category}
                      {showCount && (
                        <span
                          aria-label={`${sortedItems.length} bài viết`}
                          className={`flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-white text-slate-500"}`}
                        >
                          {sortedItems.length}
                        </span>
                      )}
                    </button>
                  );
                })}
                <span aria-hidden="true" className="mx-1 hidden h-6 w-px self-center bg-[#e2ebe5] sm:block" />
                <button
                  type="button"
                  onClick={() => setSortOrder((current) => current === "newest" ? "oldest" : "newest")}
                  aria-pressed={sortOrder === "oldest"}
                  aria-label={`Sắp xếp theo ngày đăng: ${sortOrder === "newest" ? "Mới nhất" : "Cũ nhất"}. Bấm để đổi thứ tự.`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f5f7f6] px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-[#edf7ef] hover:text-[#087a43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087a43] sm:gap-2.5 sm:px-4"
                >
                  <ArrowDownUp size={17} aria-hidden="true" className="text-[#087a43]" />
                  {sortOrder === "newest" ? "Mới nhất" : "Cũ nhất"}
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border-green-100 bg-green-50 px-3 py-2.5 text-sm font-bold text-[#087a43] shadow-[0_2px_8px_rgba(15,73,45,0.06)] transition-colors hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087a43] sm:gap-2.5 sm:px-4"
                  >
                    <RotateCcw size={17} aria-hidden="true" /> Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* News Grid */}
        {featuredEvent && (
          <FeaturedEvent item={featuredEvent} onSelect={() => openArticle(featuredEvent)} />
        )}
        <div className={showDetailPanel ? "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" : ""}>
          <div
          className={`grid grid-cols-1 gap-4 sm:gap-5 ${
            preview ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"
          }`}
        >
            {gridItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => openArticle(item)}
                className={`group relative h-56 sm:h-64 cursor-pointer overflow-hidden rounded-2xl shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${preview && index === 0 ? "xl:col-span-2" : ""}`}
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes={preview && index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Overlay */}
                <div className="news-overlay absolute inset-0" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-between p-5">
                  {/* Top: badge */}
                  <div>
                    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${categoryBadgeClass[item.category]}`}>
                      {item.category}
                    </span>
                  </div>

                  {/* Bottom: title + date */}
                  <div>
                    <h3 className={`mb-2 line-clamp-2 font-bold leading-snug text-white ${preview && index === 0 ? "text-lg" : "text-sm"}`}>
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-xs">{item.date}</span>
                      <div className="w-7 h-7 bg-[#f5c800] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={14} className="text-gray-900" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {showDetailPanel && selectedItem && (
            <NewsDetailPanel item={selectedItem} onClose={() => setSelectedNews(null)} />
          )}
        </div>

        {/* No results */}
        {searched.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p>Không có bài viết nào trong danh mục này</p>
          </div>
        )}

      </div>

    </section>
  );
}
