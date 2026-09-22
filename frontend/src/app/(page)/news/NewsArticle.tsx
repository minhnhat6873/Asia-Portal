"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, User } from "lucide-react";
import type { NewsItem } from "@/config/news";

/**
 * Badge colours for the four news categories. Tailwind classes cannot be built
 * from a runtime string, so every category is written out in full.
 */
const categoryBadgeClass: Record<string, string> = {
  "Sự kiện": "bg-[#1a7a1a] text-white",
  "Tin tức": "bg-[#0077b6] text-white",
  "Nhân sự": "bg-[#9b2226] text-white",
  "Thông báo": "bg-[#e76f51] text-white",
};

type Props = {
  item: NewsItem;
  related: NewsItem[];
};

export default function NewsArticle({ item, related }: Props) {
  const badge = categoryBadgeClass[item.category] ?? "bg-[#0077b6] text-white";

  return (
    <article className="bg-white pb-12 sm:pb-16">
      {/* Hero — banner image with the headline */}
      <div className="relative h-[280px] w-full overflow-hidden sm:h-[360px] md:h-[430px]">
        <Image
          src={item.image}
          alt={item.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 sm:pb-10">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
              {item.category}
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">
              {item.title}
            </h1>
            <div className="mt-4 flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/75 sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" /> {item.date}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={14} aria-hidden="true" /> {item.author}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-10">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a7a1a] transition-colors hover:underline"
        >
          <ArrowLeft size={15} /> Về trang Tin tức
        </Link>

        <p className="mt-6 border-l-4 border-[#f5c800] pl-4 text-base font-medium leading-relaxed text-slate-700 sm:text-lg">
          {item.excerpt}
        </p>

        <p className="mt-6 text-sm leading-relaxed text-slate-600 sm:text-base">
          {item.content}
        </p>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="mt-12 border-t border-slate-100 pt-8">
            <h2 className="text-lg font-black text-[#16241a] sm:text-xl">
              Tin liên quan
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/news/${entry.id}`}
                  className="group overflow-hidden rounded-2xl border-slate-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-32">
                    <Image
                      src={entry.image}
                      alt={entry.title}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        categoryBadgeClass[entry.category] ?? "bg-[#0077b6] text-white"
                      }`}
                    >
                      {entry.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#16241a] group-hover:text-[#1a7a1a]">
                      {entry.title}
                    </h3>
                    <span className="mt-2 block text-xs text-slate-400">{entry.date}</span>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/news"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#056a57] px-6 py-3 text-sm font-semibold text-[#d7ee46] transition-colors hover:bg-[#045847]"
            >
              Xem tất cả tin tức <ArrowRight size={15} />
            </Link>
          </section>
        )}
      </div>
    </article>
  );
}
