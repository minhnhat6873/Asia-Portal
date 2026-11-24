"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import type { NewsItem } from "@/config/news";
import { ApiError } from "@/services/api";
import { loginHref } from "@/components/auth/LoginRequired";
import { LockKeyhole } from "lucide-react";
import { getPublicMedia, getPublicMediaById } from "@/services/media.service";
import NewsArticle from "./components/NewsArticle";

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Internal posts are for signed-in accounts; guests are asked to sign in.
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const refresh = () => {
      if (inFlight) return;
      inFlight = true;
      void Promise.all([
        getPublicMediaById(params.id, controller.signal),
        getPublicMedia({ limit: 4, sort: "latest" }, controller.signal),
      ]).then(([post, list]) => {
        if (controller.signal.aborted) return;
        setItem(post);
        setRelated(list.items.filter((entry) => String(entry.id) !== String(post.id)).slice(0, 3));
        setError(null);
        setNeedsLogin(false);
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setItem(null);
          setNeedsLogin(reason instanceof ApiError && reason.status === 401);
          setError(reason instanceof ApiError && reason.status === 404 ? "Không tìm thấy bài viết." : reason instanceof Error ? reason.message : "Không thể tải bài viết.");
        }
      }).finally(() => { inFlight = false; if (!controller.signal.aborted) setIsLoading(false); });
    };
    refresh();
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refreshWhenVisible); };
  }, [params.id]);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      {isLoading ? <div className="mx-auto max-w-4xl px-4 py-24"><div className="h-72 animate-pulse rounded-3xl bg-slate-100" /></div> : item ? <NewsArticle item={item} related={related} /> : needsLogin ? <div className="mx-auto max-w-md px-4 py-24 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><LockKeyhole aria-hidden="true" size={26} /></span><h1 className="mt-5 text-2xl font-black text-slate-900">Bài viết nội bộ</h1><p className="mt-2 text-sm leading-6 text-slate-600">Bài viết này chỉ dành cho nhân viên. Vui lòng đăng nhập để xem.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href={loginHref(`/news/${params.id}`)} className="rounded-full bg-emerald-700 px-5 py-3 font-bold text-white">Đăng nhập</Link><Link href="/news" className="rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-700">Về trang tin tức</Link></div></div> : <div className="mx-auto max-w-4xl px-4 py-24 text-center"><h1 className="text-2xl font-black text-slate-900">{error}</h1><Link href="/news" className="mt-5 inline-block rounded-full bg-emerald-700 px-5 py-3 font-bold text-white">Về trang tin tức</Link></div>}
      <Footer />
    </main>
  );
}
