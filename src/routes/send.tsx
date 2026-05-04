import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Send, BookUser } from "lucide-react";
import {
  getOrCreateWallet, getAllBalances, sendXlm, sendAsset,
  NETWORK_LABEL, shortAddress, type AssetBalance,
} from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StrKey } from "@stellar/stellar-sdk";

type SendSearch = { to?: string; memo?: string; asset?: string };

export const Route = createFileRoute("/send")({
  component: SendPage,
  validateSearch: (s: Record<string, unknown>): SendSearch => ({
    to: typeof s.to === "string" ? s.to : undefined,
    memo: typeof s.memo === "string" ? s.memo : undefined,
    asset: typeof s.asset === "string" ? s.asset : undefined,
  }),
});

type Contact = { id: string; label: string; address: string; memo: string | null; is_favorite: boolean };

function SendPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [destination, setDestination] = useState(search.to ?? "");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState(search.memo ?? "");
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [assetKey, setAssetKey] = useState<string>(search.asset ?? "XLM");
  const [submitting, setSubmitting] = useState(false);
  const [secret, setSecret] = useState("");
  const [pub, setPub] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const w = getOrCreateWallet();
    setSecret(w.secret); setPub(w.publicKey);
    getAllBalances(w.publicKey).then(setBalances);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("stellar_contacts").select("*").eq("user_id", user.id)
      .order("is_favorite", { ascending: false }).order("created_at", { ascending: false })
      .then(({ data }) => setContacts((data ?? []) as Contact[]));
  }, [user]);

  const selected = useMemo(
    () => balances.find((b) => (b.issuer ? `${b.code}:${b.issuer}` : b.code) === assetKey) ?? balances[0],
    [balances, assetKey],
  );
  const bal = selected?.balance ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!StrKey.isValidEd25519PublicKey(destination)) return toast.error("Invalid Stellar address");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter an amount");
    if (amt > bal) return toast.error("Insufficient balance");
    if (!selected) return toast.error("Pick an asset");

    setSubmitting(true);
    try {
      const hash = selected.issuer
        ? await sendAsset({ secret, destination, amount, code: selected.code, issuer: selected.issuer, memo })
        : await sendXlm({ secret, destination, amount, memo });
      toast.success("Payment sent");
      if (user) {
        await supabase.from("wallet_transactions").insert({
          user_id: user.id, kind: "send", currency: selected.code,
          amount: amt, counterparty: destination, tx_hash: hash, status: "success",
        });
      }
      navigate({ to: "/tx/$hash", params: { hash } });
    } catch (err: any) {
      const msg = err?.response?.data?.extras?.result_codes?.operations?.join(", ") || err?.message || "Transaction failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mx-auto max-w-md flex flex-col">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold flex-1">Send</h1>
        <Link to="/contacts" className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <BookUser className="h-4 w-4" /> Contacts
        </Link>
      </header>
      <main className="flex-1 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="glass-strong rounded-3xl p-5 shadow-soft space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Asset</label>
              <select value={assetKey} onChange={(e) => setAssetKey(e.target.value)}
                className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none">
                {balances.map((b) => {
                  const k = b.issuer ? `${b.code}:${b.issuer}` : b.code;
                  return <option key={k} value={k}>{b.code} — {b.balance.toFixed(4)}{b.issuer ? ` · ${shortAddress(b.issuer)}` : ""}</option>;
                })}
              </select>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Need another token? <Link to="/trustlines" className="underline">Add a trustline</Link>.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Destination</label>
                <button type="button" onClick={() => setPickerOpen((o) => !o)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                  {pickerOpen ? "Hide" : "Pick from contacts"}
                </button>
              </div>
              <input value={destination} onChange={(e) => setDestination(e.target.value.trim())} placeholder="G..."
                className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm font-mono outline-none" />
              {pickerOpen && (
                <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-foreground/10 divide-y divide-foreground/5">
                  {contacts.length === 0 && <p className="p-3 text-xs text-muted-foreground">No saved contacts.</p>}
                  {contacts.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setDestination(c.address); if (c.memo) setMemo(c.memo); setPickerOpen(false); }}
                      className="w-full text-left p-3 hover:bg-foreground/5">
                      <p className="text-sm font-semibold">{c.label}{c.is_favorite ? " ★" : ""}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{shortAddress(c.address)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Amount</label>
                <button type="button" onClick={() => setAmount(String(Math.max(0, bal - (selected?.issuer ? 0 : 0.5))))}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                  Max · {bal.toFixed(4)} {selected?.code ?? "XLM"}
                </button>
              </div>
              <div className="mt-1 flex items-center bg-foreground/5 rounded-xl px-4 py-3">
                <input type="number" step="0.0000001" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" className="flex-1 bg-transparent text-lg font-semibold outline-none" />
                <span className="text-sm font-semibold text-muted-foreground">{selected?.code ?? "XLM"}</span>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Memo (optional)</label>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={28} placeholder="Note"
                className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
            <p className="text-[11px] text-muted-foreground">From {pub.slice(0, 6)}…{pub.slice(-6)} · {NETWORK_LABEL}</p>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5 disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Sending…" : "Send payment"}
          </button>
        </form>
      </main>
    </div>
  );
}
