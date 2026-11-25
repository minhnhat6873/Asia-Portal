"use client";

import { refreshUnreadNotificationCount } from "@/lib/notificationCount";
import { useUserSession } from "@/lib/userSession";
import { getNotifications } from "@/services/notification.service";
import NotificationAlerts from "./NotificationAlerts";

const loadNotifications = () => getNotifications();
const refreshBell = () => { void refreshUnreadNotificationCount(); };

/** Chime and desktop pop-ups for the user portal (see NotificationAlerts). */
export default function NotificationSound() {
  const session = useUserSession();
  const scope = session.status === "user" ? `user:${session.account.id}` : null;
  return <NotificationAlerts scope={scope} streamUrl="/backend-api/user/notifications/stream" load={loadNotifications} fallbackLink="/user/account/notifications" onFresh={refreshBell} />;
}
