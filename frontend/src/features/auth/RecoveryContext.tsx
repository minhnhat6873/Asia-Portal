"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Recovery = {
  email: string;
  code: string;
  purpose: "register" | "reset";
  expiresAt: number;
};
type RecoveryContextValue = Recovery & {
  start: (
    email: string,
    purpose?: Recovery["purpose"],
    expiresInSeconds?: number,
  ) => void;
  verify: (code: string) => void;
  clear: () => void;
};
const initial: Recovery = {
  email: "",
  code: "",
  purpose: "reset",
  expiresAt: 0,
};
const RecoveryContext = createContext<RecoveryContextValue | null>(null);

// Keep the short-lived challenge in memory only: never in URLs or browser storage.
// This is navigation state, not authorization; the backend still validates the OTP.
export function RecoveryProvider({ children }: { children: ReactNode }) {
  const [challenge, setChallenge] = useState(initial);
  return (
    <RecoveryContext.Provider
      value={{
        ...challenge,
        start: (email, purpose = "reset", expiresInSeconds = 180) =>
          setChallenge({
            email,
            purpose,
            code: "",
            expiresAt: Date.now() + expiresInSeconds * 1000,
          }),
        verify: (code) => setChallenge((current) => ({ ...current, code })),
        clear: () => setChallenge(initial),
      }}
    >
      {children}
    </RecoveryContext.Provider>
  );
}

export function useRecovery() {
  const context = useContext(RecoveryContext);
  if (!context) throw new Error("RecoveryProvider is required");
  return context;
}
