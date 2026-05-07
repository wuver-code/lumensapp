import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Banknote } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PinDialog } from "@/components/PinDialog";

export const Route = createFileRoute("/wallet/withdraw")({ component: WithdrawPage });

function WithdrawPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [pinOpen, setPinOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => setPhone(data?.phone ?? ""));
  }, [user]);

  const doWithdraw = async () => {
    if (!user) return;
    setBusy(true);
    await supabase.from("wallet_transactions").insert({
      user_id: user.id, kind: "withdraw", currency, amount: Number(amount),
      counterparty: phone, status: "pending",
    });
    toast.success("Withdrawal requested");
    setBusy(false);
    navigate({ to: "/wallet" });
  };

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-5">
        <Link to="/wallet" className="glass h-10 w-10 rounded-full flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Withdraw</h1>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); if (!phone) return toast.error("Set a phone number in Profile"); if (!Number(amount)) return toast.error("Enter amount"); setPinOpen(true); }} className="space-y-4">
        <div className="glass-strong rounded-3xl p-5 space-y-4 shadow-soft">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Local wallet (phone)</label>
            <div className="mt-1 bg-foreground/5 rounded-xl px-4 py-3 font-mono text-sm">{phone || "Not set"}</div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none">
              {["USD","EUR","GBP","NGN","KES","ZAR","INR","BRL"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Amount</label>
            <div className="mt-1 flex items-center bg-foreground/5 rounded-xl px-4 py-3">
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className="flex-1 bg-transparent text-lg font-semibold outline-none" />
              <span className="text-sm font-semibold text-muted-foreground">{currency}</span>
            </div>
          </div>
        </div>
        <button type="submit" disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          Withdraw
        </button>
      </form>
      <PinDialog open={pinOpen} onClose={() => setPinOpen(false)} onSuccess={() => { setPinOpen(false); doWithdraw(); }} title="Authorize withdrawal" />
    </div>
  );
}
