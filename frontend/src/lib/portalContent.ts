/**
 * Shared content store for the Asia portal.
 *
 * The admin dashboard (`/admin/dashboard`) is the single source of truth: it
 * writes employees and media posts into `localStorage` under the keys below.
 * The public pages (`/`, `/employees`, `/news`) used to read from the static
 * `@/config/employees` and `@/config/news` files, so anything an admin created
 * was invisible on the portal. This module is the bridge: it reads the same
 * localStorage, maps the admin shapes onto the public display shapes, and
 * notifies live listeners so an open public tab updates the moment an admin
 * saves.
 *
 * Shape mapping (admin -> public):
 *   Employee.fullName          -> name
 *   Employee.department        -> department
 *   Employee.position          -> position
 *   Employee.email/phone       -> email/phone
 *   Employee.birthDate         -> birthday
 *   Employee.location          -> location
 *   Employee.avatar            -> avatar
 *   Employee.joinDate          -> joinDate
 *   Employee.code "ACF0001"    -> id (parsed number, falls back to index+1)
 *
 *   MediaPost.title            -> title
 *   MediaPost.summary          -> excerpt
 *   MediaPost.content          -> content
 *   MediaPost.category         -> category (admin-only values are mapped)
 *   MediaPost.publishDate      -> date
 *   MediaPost.authorDepartment -> author
 *   MediaPost.coverImage       -> image
 */

import { departments as configDepartments } from "@/config/employees";
import type { Employee as PublicEmployee } from "@/config/employees";
import type { NewsItem } from "@/config/news";

/* -------------------------------------------------------------------------- *
 * Storage keys — must match `admin/dashboard/utils/storage.ts`.
 * -------------------------------------------------------------------------- */

export const EMPLOYEES_STORAGE_KEY = "asia_fnb_employees_v2";
export const MEDIA_STORAGE_KEY = "asia_fnb_media_v2";
const TEAM_BUILDING_RESTORE_KEY = "asia_fnb_team_building_2026_restored";

/** Dispatched after any write so both the admin tab and the public tab react. */
export const PORTAL_CONTENT_EVENT = "asia-portal-content";

/* -------------------------------------------------------------------------- *
 * Admin-side shapes (structurally identical to Dashboard/types.ts; kept local so
 * the public bundle never imports the admin dashboard).
 * -------------------------------------------------------------------------- */

type AdminEmployeeStatus = "active" | "probation" | "inactive";

interface AdminEmployee {
  id: string;
  code: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: AdminEmployeeStatus;
  joinDate: string;
  birthDate: string;
  location: string;
  avatar: string;
  bio?: string;
}

type AdminMediaCategory =
  | "Sự kiện"
  | "Tin tức"
  | "Nhân sự"
  | "Thông báo";

interface AdminMediaPost {
  id: string;
  title: string;
  category: AdminMediaCategory;
  summary: string;
  content: string;
  coverImage: string;
  authorDepartment: string;
  publishDate: string;
  status: "published" | "draft";
}

/* -------------------------------------------------------------------------- *
 * Reading raw admin data
 * -------------------------------------------------------------------------- */

function readJsonArray<T>(key: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- *
 * Mapping helpers
 * -------------------------------------------------------------------------- */

const DEFAULT_AVATAR = "/assets/images/default-avatar.png";

/** "Phòng Logistics" / "Phòng IT" all live in the public departments list. */
function buildDepartments(employees: PublicEmployee[]): string[] {
  const seen = new Set<string>();
  const extra: string[] = [];

  for (const employee of employees) {
    const department = employee.department?.trim();
    if (!department) continue;
    if (configDepartments.includes(department) || seen.has(department)) continue;
    seen.add(department);
    extra.push(department);
  }

  return [...configDepartments, ...extra];
}

/** "ACF0007" -> 7, so the public profile can still render a stable code. */
function employeeIdFromCode(code: string, fallback: number): number {
  const digits = code.replace(/[^0-9]/g, "");
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Public news only understands four buckets; map the rest onto the closest. */
function mapNewsCategory(category: AdminMediaCategory): NewsItem["category"] {
  switch (category) {
    case "Sự kiện":
      return "Sự kiện";
    case "Nhân sự":
      return "Nhân sự";
    case "Thông báo":
      return "Thông báo";
    default:
      return "Tin tức";
  }
}

function toPublicEmployee(admin: AdminEmployee, index: number): PublicEmployee {
  return {
    id: employeeIdFromCode(admin.code ?? "", index + 1),
    name: admin.fullName ?? "",
    position: admin.position ?? "",
    department: admin.department ?? "",
    email: admin.email ?? "",
    phone: admin.phone ?? "",
    birthday: admin.birthDate ?? "",
    location: admin.location ?? "",
    avatar: admin.avatar?.trim() ? admin.avatar : DEFAULT_AVATAR,
    joinDate: admin.joinDate ?? "",
  };
}

function toPublicNews(admin: AdminMediaPost, index: number): NewsItem {
  return {
    id: employeeIdFromCode(admin.id ?? "", index + 1),
    title: admin.title ?? "",
    excerpt: admin.summary ?? "",
    content: admin.content || admin.summary || "",
    category: mapNewsCategory(admin.category),
    date: admin.publishDate ?? "",
    author: admin.authorDepartment ?? "",
    image: admin.coverImage?.trim() ? admin.coverImage : DEFAULT_AVATAR,
    // The three newest published posts get the hero treatment on the home page.
    featured: index < 3,
  };
}

/* -------------------------------------------------------------------------- *
 * Public accessors — fall back to the static config when the admin has not
 * touched anything yet.
 * -------------------------------------------------------------------------- */

export function readPublicEmployees(fallback: PublicEmployee[]): PublicEmployee[] {
  const admin = readJsonArray<AdminEmployee>(EMPLOYEES_STORAGE_KEY);
  if (!admin) return fallback;
  return admin.map(toPublicEmployee);
}

export function readPublicNews(fallback: NewsItem[]): NewsItem[] {
  const admin = readJsonArray<AdminMediaPost>(MEDIA_STORAGE_KEY);
  if (!admin) return fallback;

  // The original admin seed omitted this featured event. Restore it once here
  // too, since the public page can be opened before the admin dashboard.
  if (!window.localStorage.getItem(TEAM_BUILDING_RESTORE_KEY)) {
    const feature = fallback.find((item) => item.title === "Team Building 2026 – Cùng nhau mạnh hơn");
    const isPresent = admin.some(
      (post) => post.id === "media-team-building-2026" || post.title === feature?.title
    );
    if (feature && !isPresent) {
      admin.unshift({
        id: "media-team-building-2026",
        title: feature.title,
        category: "Sự kiện",
        summary: feature.excerpt,
        content: feature.content,
        coverImage: feature.image,
        authorDepartment: feature.author,
        publishDate: feature.date,
        status: "published",
      });
      window.localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(admin));
    }
    window.localStorage.setItem(TEAM_BUILDING_RESTORE_KEY, "true");
  }

  // Drafts are admin-only; the public portal shows published posts only.
  return admin
    .filter((post) => post.status !== "draft")
    .map(toPublicNews);
}

export function readPublicDepartments(
  employees: PublicEmployee[] | undefined | null,
  fallback: string[]
): string[] {
  if (!employees || !employees.length) return fallback;
  return buildDepartments(employees);
}

/* -------------------------------------------------------------------------- *
 * Live sync — a public tab subscribes and re-reads when the admin tab writes.
 * -------------------------------------------------------------------------- */

/** Tells every listener (same tab) to re-read the store. */
export function notifyPortalContentChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PORTAL_CONTENT_EVENT));
}

/**
 * Subscribes to content changes from both the same tab (`PORTAL_CONTENT_EVENT`)
 * and other tabs (the native `storage` event). Returns an unsubscribe function.
 */
export function subscribePortalContent(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === EMPLOYEES_STORAGE_KEY ||
      event.key === MEDIA_STORAGE_KEY
    ) {
      listener();
    }
  };

  window.addEventListener(PORTAL_CONTENT_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PORTAL_CONTENT_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
