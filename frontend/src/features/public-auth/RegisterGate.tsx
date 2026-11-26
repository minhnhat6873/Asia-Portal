"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "./AuthForm";
import { useRegistrationEnabled } from "./useRegistrationEnabled";

// /register only works while self-registration is open; otherwise go back to login.
export default function RegisterGate() {
  const enabled = useRegistrationEnabled();
  const router = useRouter();
  useEffect(() => { if (enabled === false) router.replace("/login"); }, [enabled, router]);
  return enabled ? <AuthForm mode="register" /> : null;
}
