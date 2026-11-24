"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, CarFront, ChevronDown, ExternalLink, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Button, Menu, MenuItem, MenuTrigger, Popover, Separator, type Key } from "react-aria-components";
import { useState } from "react";
import { userAuthService } from "@/services/user-auth.service";
import { markSignedOut, useUserSession } from "@/lib/userSession";
import { useUnreadNotificationCount } from "@/lib/notificationCount";
import styles from "./Navbar.module.css";
import UserAvatar from "@/components/ui/UserAvatar";

const PAGES: Record<string, string> = {
  profile: "/account/profile",
  meetings: "/account/meetings",
  trips: "/account/trips",
  settings: "/account/settings",
  notifications: "/account/notifications",
};

export default function UserSessionButton() {
  const router = useRouter();
  const session = useUserSession();
  const unread = useUnreadNotificationCount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (session.status === "loading") return <span aria-hidden="true" className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-100" />;
  if (session.status === "guest") {
    return <Link href="/login" className={`${styles.loginButton} ${styles.guestLoginButton}`}><UserRound size={20} strokeWidth={1.75} aria-hidden="true" />Đăng nhập</Link>;
  }

  const account = session.account;
  const subtitle = account.position || "Nhân viên";

  const logout = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await userAuthService.logout();
      markSignedOut();
      // A full reload (not router.push) clears internal data (directory, meetings,
      // internal posts) that this tab still holds in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng xuất. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  const onAction = (key: Key) => {
    if (key === "logout") void logout();
    else if (key === "admin") window.open("/admin", "_blank", "noopener,noreferrer");
    else if (typeof key === "string" && PAGES[key]) router.push(PAGES[key]);
  };

  return <div className="relative min-w-0">
    <MenuTrigger>
      <Button aria-label={`Tài khoản ${account.name}`} className={styles.accountButton}>
        <UserAvatar src={account.avatar} name={account.name} className={styles.accountAvatar} />
        <span className={styles.accountDetails}>
          <span className={styles.accountName} title={account.name}>{account.name}</span>
          <span className={styles.accountRole}>{subtitle}</span>
        </span>
        <ChevronDown aria-hidden="true" size={17} className={styles.accountChevron} />
      </Button>
      <Popover placement="bottom end" offset={10} className={styles.accountPopover}>
        <div className={styles.menuProfile}>
          <UserAvatar src={account.avatar} name={account.name} className={styles.accountAvatar} />
          <span className={styles.accountDetails}>
            <span className={styles.accountName} title={account.name}>{account.name}</span>
            <span className={styles.accountRole}>{subtitle}</span>
            <span className={styles.accountRole} title={account.email}>{account.email}</span>
          </span>
        </div>
        <Menu aria-label="Tài khoản của bạn" className={styles.accountMenu} onAction={onAction}>
          <MenuItem id="profile" textValue="Thông tin cá nhân" className={styles.accountMenuItem}><UserRound size={19} aria-hidden="true" />Thông tin cá nhân</MenuItem>
          <MenuItem id="meetings" textValue="Lịch họp của tôi" className={styles.accountMenuItem}><CalendarDays size={19} aria-hidden="true" />Lịch họp của tôi</MenuItem>
          <MenuItem id="trips" textValue="Chuyến xe của tôi" className={styles.accountMenuItem}><CarFront size={19} aria-hidden="true" />Chuyến xe của tôi</MenuItem>
          <MenuItem id="notifications" textValue="Thông báo" className={styles.accountMenuItem}>
            <Bell size={19} aria-hidden="true" />Thông báo
            {unread > 0 && <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
          </MenuItem>
          <MenuItem id="settings" textValue="Cài đặt tài khoản" className={styles.accountMenuItem}><Settings size={19} aria-hidden="true" />Cài đặt tài khoản</MenuItem>
          {account.canAccessAdmin ? <>
            <Separator className="my-2 h-px bg-slate-200" />
            {/* Opens in a new tab so the page in use stays open; the admin portal asks to sign in again. */}
            <MenuItem id="admin" textValue="Vào trang quản trị" className={styles.accountMenuItem}>
              <ShieldCheck size={19} aria-hidden="true" />Vào trang quản trị
              <ExternalLink size={15} aria-hidden="true" className="ml-auto text-slate-400" />
            </MenuItem>
          </> : null}
          <MenuItem id="logout" isDisabled={busy} textValue="Đăng xuất" className={`${styles.accountMenuItem} ${styles.logoutItem}`}><LogOut size={19} aria-hidden="true" />{busy ? "Đang đăng xuất…" : "Đăng xuất"}</MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
    {error && <p role="alert" className="absolute right-0 top-full w-64 rounded-lg bg-white p-3 text-sm text-red-700 shadow">{error}</p>}
  </div>;
}
