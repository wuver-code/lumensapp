import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowDownUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CryptoIcon, SUPPORTED_CRYPTO, cryptoMeta } from "@/components/CryptoIcon";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PinDialog } from "@/components/PinDialog";

export const Route = createFileRoute("/wallet/swap")({ component: SwapPage });

const FIATS = ["USD","EUR","GBP"] as const;

function SwapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [from, setFrom] = useState<string>("USD");
  const [to, setTo] = useState<string>("XLM");
  const [amount, setAmount] = useState("100");
  const [pinOpen, setPinOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fromPx = (FIATS as readonly string[]).includes(from) ? 1 : cryptoMeta(from).price;
  const toPx   = (FIATS as readonly string[]).includes(to)   ? 1 : cryptoMeta(to).price;
  const out = useMemo(() => Number(amount) * fromPx / (toPx || 1), [amount, fromPx, toPx]);

  const flip = () => { const a = from; setFrom(to); setTo(a); };

  const doSwap = async () => {
    if (!user) return;
    setBusy(true);
    await supabase.from("wallet_transactions").insert({
      user_id: user.id, kind: "swap",
      currency: `${from}->${to}`, amount: Number(amount), status: "success",
    });
    toast.success(`Swapped ${amount} ${from} → ${out.toFixed(4)} ${to}`);
    setBusy(false);
    navigate({ to: "/wallet" });
  };

  const Picker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-foreground/5 rounded-xl px-3 py-2 text-sm font-semibold outline-none">
      <optgroup label="FIAT">{FIATS.map((f) => <option key={f}>{f}</option>)}</optgroup>
      <optgroup label="Crypto">{SUPPORTED_CRYPTO.map((c) => <option key={c}>{c}</option>)}</optgroup>
    </select>
  );

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-5">
        <Link to="/wallet" className="glass h-10 w-10 rounded-full flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Swap</h1>
      </header>

      <div className="space-y-3">
        <div className="glass-strong rounded-3xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">From</span>
            <Picker value={from} onChange={setFrom} />
          </div>
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-3xl font-bold outline-none" />
        </div>

        <div className="flex justify-center -my-1.5 relative z-10">
          <button onClick={flip} className="glass-strong h-10 w-10 rounded-full flex items-center justify-center shadow-soft">
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        <div className="glass-strong rounded-3xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">To</span>
            <Picker value={to} onChange={setTo} />
          </div>
          <p className="text-3xl font-bold">{out.toFixed(4)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Rate: 1 {from} ≈ {(fromPx / (toPx || 1)).toFixed(6)} {to}</p>
        </div>

        <div className="glass rounded-2xl p-4 text-xs text-muted-foreground">
          Output goes to your local currency wallet (FIAT) or asset balance (Crypto). Demo rates from a static feed.
        </div>

        <button onClick={() => setPinOpen(true)} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Review & Swap
        </button>
      </div>
      <PinDialog open={pinOpen} onClose={() => setPinOpen(false)} onSuccess={() => { setPinOpen(false); doSwap(); }} title="Authorize swap" />
    </div>
  );
}
