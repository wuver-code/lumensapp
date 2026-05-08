import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { hasPin, setPin, verifyPin } from "@/lib/pin";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

type Props = { open: boolean; onClose: () => void; onSuccess: () => void; title?: string };

type Stage = "enter" | "setup" | "reset";

export function PinDialog({ open, onClose, onSuccess, title = "Enter your PIN" }: Props) {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("enter");
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setPinValue(""); setConfirm(""); setPassword("");
    hasPin(user.id).then((has) => setStage(has ? "enter" : "setup"));
  }, [open, user]);

  if (!open) return null;

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (stage === "setup") {
        if (pin.length < 4) return toast.error("PIN must be at least 4 digits");
        if (pin !== confirm) return toast.error("PINs don't match");
        await setPin(user.id, pin);
        toast.success("PIN set");
        onSuccess();
      } else if (stage === "enter") {
        if (pin.length < 4) return toast.error("PIN must be at least 4 digits");
        const ok = await verifyPin(user.id, pin);
        if (!ok) return toast.error("Wrong PIN");
        onSuccess();
      } else {
        // reset
        if (!user.email) return toast.error("No email on file");
        if (pin.length < 4 || pin !== confirm) return toast.error("PINs don't match");
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (error) return toast.error("Wrong password");
        await setPin(user.id, pin);
        toast.success("PIN reset");
        onSuccess();
      }
    } finally { setBusy(false); }
  };

  const heading = stage === "setup" ? "Create transaction PIN" : stage === "reset" ? "Reset PIN" : title;
  const sub = stage === "setup"
    ? "This 4–6 digit PIN protects every transfer, withdrawal and swap."
    : stage === "reset"
      ? "Confirm your account password, then choose a new PIN."
      : "Enter your PIN to authorize this action.";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm glass-strong rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="font-bold flex-1">{heading}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground">{sub}</p>

        {stage === "reset" && (
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Account password"
            className="w-full bg-foreground/5 rounded-2xl px-4 py-3 text-sm outline-none"
          />
        )}

        <input
          autoFocus={stage !== "reset"}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
          placeholder={stage === "reset" ? "New PIN" : "••••"}
          className="w-full text-center text-2xl tracking-[0.5em] bg-foreground/5 rounded-2xl py-4 outline-none"
        />
        {(stage === "setup" || stage === "reset") && (
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder="Confirm PIN"
            className="w-full text-center text-2xl tracking-[0.5em] bg-foreground/5 rounded-2xl py-4 outline-none"
          />
        )}

        <button onClick={submit} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background py-3 font-semibold disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {stage === "setup" ? "Set PIN" : stage === "reset" ? "Reset PIN" : "Confirm"}
        </button>

        {stage === "enter" && (
          <button type="button" onClick={() => setStage("reset")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            Forgot PIN? Reset with password
          </button>
        )}
        {stage === "reset" && (
          <button type="button" onClick={() => setStage("enter")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            Back to PIN entry
          </button>
        )}
      </div>
    </div>
  );
}
