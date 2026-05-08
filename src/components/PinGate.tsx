import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { hasPin } from "@/lib/pin";
import { PinDialog } from "@/components/PinDialog";
import { Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

const SESSION_KEY = "lumens.pin.unlocked";

export function isPinUnlocked() {
  return typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";
}
export function lockPin() {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_KEY);
}

/** Wraps a screen so the user must pass the PIN gate (or set one) before viewing. */
export function PinGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (isPinUnlocked()) { setUnlocked(true); return; }
    // Always prompt — sets up PIN if missing, otherwise verify
    hasPin(user.id).finally(() => setOpen(true));
  }, [user, loading, navigate]);

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="glass-strong rounded-3xl p-8 max-w-sm w-full shadow-soft">
        <div className="h-14 w-14 rounded-2xl glass mx-auto flex items-center justify-center mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold">Locked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your PIN to access this area.</p>
        <button onClick={() => setOpen(true)} className="mt-5 w-full rounded-full bg-foreground text-background py-3 font-semibold">
          Unlock
        </button>
      </div>
      <PinDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setOpen(false);
          setUnlocked(true);
        }}
        title="Unlock"
      />
    </div>
  );
}
