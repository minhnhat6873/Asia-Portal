"use client";

import { Toaster } from "sonner";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      richColors
      closeButton
      visibleToasts={4}
      toastOptions={{
        duration: 4500,
        classNames: {
          toast: "border border-white/15 bg-[#0d100e] shadow-2xl shadow-black/50",
          title: "font-semibold text-white",
          description: "text-zinc-300",
          closeButton: "border-white/15 bg-[#171a18] text-zinc-300 hover:bg-white/10",
        },
      }}
    />
  );
}