import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { getOrCreateWallet, getAllBalances, changeTrust, shortAddress, type AssetBalance } from "@/lib/wallet";
import { StrKey } from "@stellar/stellar-sdk";
import { toast } from "sonner";

export const Route = createFileRoute("/trustlines")({ component: TrustlinesPage });

const PRESETS = [
  { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", note: "Circle (mainnet)" },
  { code: "yXLM", issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55", note: "Ultra Stellar" },
];

function TrustlinesPage() {
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [code, setCode] = useState("");
  const [issuer, setIssuer] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const w = getOrCreateWallet();
    setBalances(await getAllBalances(w.publicKey));
  };
  useEffect(() => { refresh(); }, []);

  const add = async (c: string, i: string) => {
    if (!/^[A-Za-z0-9]{1,12}$/.test(c)) return toast.error("Invalid asset code");
    if (!StrKey.isValidEd25519PublicKey(i)) return toast.error("Invalid issuer address");
    setBusy(true);
    try {
      const w = getOrCreateWallet();
      await changeTrust({ secret: w.secret, code: c, issuer: i });
      toast.success(`Trustline added for ${c}`);
      setCode(""); setIssuer("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add trustline");
    } finally { setBusy(false); }
  };

  const remove = async (b: AssetBalance) => {
    if (!b.issuer) return;
    if (b.balance > 0) return toast.error("Balance must be zero to remove");
    setBusy(true);
    try {
      const w = getOrCreateWallet();
      await changeTrust({ secret: w.secret, code: b.code, issuer: b.issuer, limit: "0" });
      toast.success("Trustline removed");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen mx-auto max-w-md">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold">Trustlines</h1>
      </header>
      <main className="p-5 space-y-5">
        <div className="glass-strong rounded-3xl p-5 shadow-soft space-y-3">
          <h2 className="font-semibold">Your assets</h2>
          {balances.map((b) => {
            const k = b.issuer ? `${b.code}:${b.issuer}` : b.code;
            return (
              <div key={k} className="flex items-center gap-3 rounded-xl bg-foreground/5 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{b.code}</p>
                  {b.issuer && <p className="text-[11px] text-muted-foreground font-mono truncate">issuer {shortAddress(b.issuer)}</p>}
                  <p className="text-xs text-muted-foreground">{b.balance.toFixed(4)}</p>
                </div>
                {b.issuer && (
                  <button onClick={() => remove(b)} disabled={busy} className="rounded-full p-2 text-muted-foreground hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="glass-strong rounded-3xl p-5 shadow-soft space-y-3">
          <h2 className="font-semibold">Add trustline</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.code} onClick={() => add(p.code, p.issuer)} disabled={busy}
                className="rounded-full bg-foreground/5 hover:bg-foreground hover:text-background text-xs font-semibold px-3 py-1.5">
                + {p.code} <span className="opacity-60">{p.note}</span>
              </button>
            ))}
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Asset code (e.g. USDC)"
            className="w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm outline-none" />
          <input value={issuer} onChange={(e) => setIssuer(e.target.value.trim())} placeholder="Issuer G..."
            className="w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm font-mono outline-none" />
          <button onClick={() => add(code, issuer)} disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background text-sm font-semibold px-4 py-2 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add trustline
          </button>
          <p className="text-[11px] text-muted-foreground">Trustlines reserve 0.5 XLM each on the network.</p>
        </div>
      </main>
    </div>
  );
}
