import { toast } from "sonner";
export function showToast(
  title: string,
  message?: string,
  type: "success" | "error" | "info" = "info",
) {
  const notify =
    type === "success"
      ? toast.success
      : type === "error"
        ? toast.error
        : toast.info;
  notify(title, { description: message });
}
