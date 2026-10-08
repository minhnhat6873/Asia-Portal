"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import type { NewsItem } from "@/config/news";
import { ApiError } from "@/services/api";
import { getPublicMedia, getPublicMediaById } from "@/services/media.service";
import NewsArticle from "./components/NewsArticle";

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getPublicMediaById(params.id, controller.signal),
      getPublicMedia({ limit: 4, sort: "latest" }, controller.signal),
    ]).then(([post, list]) => {
      setItem(post);
      setRelated(list.items.filter((entry) => String(entry.id) !== String(post.id)).slice(0, 3));
      setError(null);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setItem(null);
        setError(reason instanceof ApiError && reason.status === 404 ? "Không tìm thấy bài viết." : reason instanceof Error ? reason.message : "Không thể tải bài viết.");
      }
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [params.id]);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      {isLoading ? <div className="mx-auto max-w-4xl px-4 py-24"><div className="h-72 animate-pulse rounded-3xl bg-slate-100" /></div> : item ? <NewsArticle item={item} related={related} /> : <div className="mx-auto max-w-4xl px-4 py-24 text-center"><h1 className="text-2xl font-black text-slate-900">{error}</h1><Link href="/news" className="mt-5 inline-block rounded-full bg-emerald-700 px-5 py-3 font-bold text-white">Về trang tin tức</Link></div>}
      <Footer />
    </main>
  );
}
