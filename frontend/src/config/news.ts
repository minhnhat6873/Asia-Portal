export interface NewsItem {
  id: string | number;
  title: string;
  excerpt: string;
  summaryHtml?: string;
  content: string;
  category: "Sự kiện" | "Tin tức" | "Nhân sự" | "Thông báo" | "Đào Tạo";
  date: string;
  expiryDate?: string | null;
  publishIndefinitely?: boolean;
  isExpired?: boolean;
  createdAt?: string;
  author: string;
  image: string;
  featured?: boolean;
  featuredAt?: string | null;
}

export const newsCategories = ["Tất cả", "Sự kiện", "Tin tức", "Nhân sự", "Thông báo", "Đào Tạo"];
