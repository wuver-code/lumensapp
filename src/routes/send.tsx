import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { getOrCreateWallet, getXlmBalance, sendXlm, NETWORK_LABEL } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StrKey } from "@stellar/stellar-sdk";

export const Route = createFileRoute("/send")({ component: SendPage });

function SendPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [bal, setBal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [secret, setSecret] = useState("");
  const [pub, setPub] = useState("");

  useEffect(() => {
    const w = getOrCreateWallet();
    setSecret(w.secret);
    setPub(w.publicKey);
    getXlmBalance(w.publicKey).then(setBal);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!StrKey.isValidEd25519PublicKey(destination)) {
      toast.error("Invalid Stellar address");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter an amount"); return; }
    if (amt > bal) { toast.error("Insufficient balance"); return; }

    setSubmitting(true);
    try {
      const hash = await sendXlm({ secret, destination, amount, memo });
      toast.success("Payment sent");
      if (user) {
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          kind: "send",
          currency: "XLM",
          amount: amt,
          counterparty: destination,
          tx_hash: hash,
          status: "success",
        });
      }
      navigate({ to: "/" });
    } catch (err: any) {
      const msg = err?.response?.data?.extras?.result_codes?.operations?.join(", ")
        || err?.message || "Transaction failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mx-auto max-w-md flex flex-col">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold">Send XLM</h1>
      </header>
      <main className="flex-1 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="glass-strong rounded-3xl p-5 shadow-soft space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Destination</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value.trim())}
                placeholder="G..."
                className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm font-mono outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Amount</label>
                <button type="button" onClick={() => setAmount(String(Math.max(0, bal - 0.5)))} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                  Max · {bal.toFixed(4)} XLM
                </button>
              </div>
              <div className="mt-1 flex items-center bg-foreground/5 rounded-xl px-4 py-3">
                <input
                  type="number" step="0.0000001" min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-lg font-semibold outline-none"
                />
                <span className="text-sm font-semibold text-muted-foreground">XLM</span>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Memo (optional)</label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={28}
                placeholder="Note"
                className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm outline-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">From {pub.slice(0, 6)}…{pub.slice(-6)} · {NETWORK_LABEL}</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Sending…" : "Send payment"}
          </button>
        </form>
      </main>
    </div>
  );
}
