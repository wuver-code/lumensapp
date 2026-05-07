import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateWallet, sendXlm } from "@/lib/wallet";
import { StrKey } from "@stellar/stellar-sdk";
import { toast } from "sonner";
import { PinDialog } from "@/components/PinDialog";
import { CryptoIcon, SUPPORTED_CRYPTO, cryptoMeta } from "@/components/CryptoIcon";

type Search = { to?: string; asset?: string };

export const Route = createFileRoute("/wallet/transfer")({
  component: TransferPage,
  validateSearch: (s: Record<string, unknown>): Search => ({
    to: typeof s.to === "string" ? s.to : undefined,
    asset: typeof s.asset === "string" ? s.asset : "XLM",
  }),
});

function TransferPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [destination, setDestination] = useState(search.to ?? "");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState(search.asset ?? "XLM");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const doTransfer = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const amt = Number(amount);
      let hash: string | null = null;
      if (asset === "XLM") {
        if (!StrKey.isValidEd25519PublicKey(destination)) throw new Error("Invalid Stellar address");
        const w = getOrCreateWallet();
        hash = await sendXlm({ secret: w.secret, destination, amount, memo });
      } else {
        // mock other assets
        await new Promise((r) => setTimeout(r, 800));
      }
      await supabase.from("wallet_transactions").insert({
        user_id: user.id, kind: "send", currency: asset, amount: amt,
        counterparty: destination, tx_hash: hash, status: "success",
      });
      toast.success("Transfer complete");
      navigate({ to: "/wallet" });
    } catch (e: any) {
      toast.error(e.message ?? "Transfer failed");
    } finally { setBusy(false); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !Number(amount)) return toast.error("Fill all fields");
    setPinOpen(true);
  };

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-5">
        <Link to="/wallet" className="glass h-10 w-10 rounded-full flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Transfer</h1>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <div className="glass-strong rounded-3xl p-5 space-y-4 shadow-soft">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Asset</label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {SUPPORTED_CRYPTO.map((c) => (
                <button type="button" key={c} onClick={() => setAsset(c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${asset === c ? "bg-foreground text-background" : "glass"}`}>
                  <CryptoIcon sym={c} className="h-3.5 w-3.5" /> {c}
                </button>
              ))}
            </div>
            {asset !== "XLM" && <p className="mt-1 text-[11px] text-amber-700">Demo mode for {asset}. Only XLM executes on-chain.</p>}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Recipient</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value.trim())}
              placeholder={asset === "XLM" ? "G…" : "@username or wallet"}
              className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Amount</label>
            <div className="mt-1 flex items-center bg-foreground/5 rounded-xl px-4 py-3">
              <input type="number" step="0.0000001" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className="flex-1 bg-transparent text-lg font-semibold outline-none" />
              <span className="text-sm font-semibold text-muted-foreground">{asset}</span>
            </div>
          </div>
          {asset === "XLM" && (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Memo (optional)</label>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={28}
                className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
          )}
        </div>
        <button type="submit" disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy ? "Processing…" : "Continue"}
        </button>
      </form>

      <PinDialog open={pinOpen} onClose={() => setPinOpen(false)} onSuccess={() => { setPinOpen(false); doTransfer(); }} title="Authorize transfer" />
    </div>
  );
}
