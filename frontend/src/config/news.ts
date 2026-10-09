export interface NewsItem {
  id: string | number;
  title: string;
  excerpt: string;
  summaryHtml?: string;
  content: string;
  category: "Sự kiện" | "Tin tức" | "Nhân sự" | "Thông báo";
  date: string;
  createdAt?: string;
  author: string;
  image: string;
  featured?: boolean;
}

export const newsCategories = ["Tất cả", "Sự kiện", "Tin tức", "Nhân sự", "Thông báo"];
