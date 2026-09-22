import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import { news } from "@/config/news";
import NewsArticle from "../NewsArticle";

type Props = {
  params: Promise<{ id: string }>;
};

/** The site is exported statically, so every article URL is pre-rendered. */
export function generateStaticParams() {
  return news.map((item) => ({ id: String(item.id) }));
}

/** Unknown ids are not generated at all. */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = news.find((entry) => String(entry.id) === id);

  if (!item) {
    return { title: "Tin tức · Asia Food & Beverage" };
  }

  return {
    title: `${item.title} · Asia Food & Beverage`,
    description: item.excerpt,
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;
  const index = news.findIndex((entry) => String(entry.id) === id);

  if (index === -1) {
    notFound();
  }

  const item = news[index];
  const related = news.filter((entry) => entry.id !== item.id).slice(0, 3);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <NewsArticle item={item} related={related} />

      <Footer />
    </main>
  );
}
