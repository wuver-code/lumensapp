import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { hasPin, setPin, verifyPin } from "@/lib/pin";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

type Props = { open: boolean; onClose: () => void; onSuccess: () => void; title?: string };

export function PinDialog({ open, onClose, onSuccess, title = "Enter your PIN" }: Props) {
  const { user } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setPinValue(""); setConfirm("");
    hasPin(user.id).then((has) => setNeedsSetup(!has));
  }, [open, user]);

  if (!open) return null;

  const submit = async () => {
    if (!user) return;
    if (pin.length < 4) return toast.error("PIN must be at least 4 digits");
    setBusy(true);
    try {
      if (needsSetup) {
        if (pin !== confirm) { toast.error("PINs don't match"); return; }
        await setPin(user.id, pin);
        toast.success("PIN set");
        onSuccess();
      } else {
        const ok = await verifyPin(user.id, pin);
        if (!ok) { toast.error("Wrong PIN"); return; }
        onSuccess();
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm glass-strong rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="font-bold flex-1">{needsSetup ? "Create transaction PIN" : title}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          {needsSetup ? "This 4–6 digit PIN protects every transfer, withdrawal and swap." : "Enter your PIN to authorize this transaction."}
        </p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          className="w-full text-center text-2xl tracking-[0.5em] bg-foreground/5 rounded-2xl py-4 outline-none"
        />
        {needsSetup && (
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
          {needsSetup ? "Set PIN" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
