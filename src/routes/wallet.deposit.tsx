import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { CryptoIcon, SUPPORTED_CRYPTO, cryptoMeta } from "@/components/CryptoIcon";
import { getOrCreateWallet, shortAddress } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet/deposit")({ component: DepositPage });

function DepositPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string>("XLM");
  const [xlmAddr, setXlmAddr] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setXlmAddr(getOrCreateWallet().publicKey); }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => setPhone(data?.phone ?? ""));
  }, [user]);

  const addr = selected === "XLM" ? xlmAddr : `seyo-${selected.toLowerCase()}-${(user?.id ?? "").slice(0, 8)}`;
  const copy = async () => {
    await navigator.clipboard.writeText(addr);
    setCopied(true); toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-5">
        <Link to="/wallet" className="glass h-10 w-10 rounded-full flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Deposit</h1>
      </header>

      <p className="text-xs text-muted-foreground mb-3">FIAT deposits land in your local-currency wallet (ID: <span className="font-mono">{phone || "set phone in Profile"}</span>)</p>

      <div className="grid grid-cols-5 gap-2 mb-6">
        <button onClick={() => setSelected("FIAT")} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${selected === "FIAT" ? "bg-foreground text-background" : "glass"}`}>
          <span className="text-base font-bold">$</span>
          <span className="text-[10px] font-semibold">FIAT</span>
        </button>
        {SUPPORTED_CRYPTO.map((c) => (
          <button key={c} onClick={() => setSelected(c)}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${selected === c ? "bg-foreground text-background" : "glass"}`}>
            <CryptoIcon sym={c} className="h-4 w-4" />
            <span className="text-[10px] font-semibold">{c}</span>
          </button>
        ))}
      </div>

      <div className="glass-strong rounded-3xl p-6 space-y-4 shadow-soft">
        {selected === "FIAT" ? (
          <>
            <h3 className="font-bold">Local currency wallet</h3>
            <p className="text-sm text-muted-foreground">Your wallet ID is your phone number. Share it with your sender.</p>
            <div className="bg-foreground/5 rounded-xl px-4 py-3 font-mono text-sm">{phone || "—"}</div>
            <p className="text-[11px] text-muted-foreground">Demo: linking real bank rails requires a licensed payment partner.</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <CryptoIcon sym={selected} className="h-6 w-6" />
              <div>
                <h3 className="font-bold">{cryptoMeta(selected).label}</h3>
                <p className="text-xs text-muted-foreground">Send {selected} to this address</p>
              </div>
            </div>
            <div className="bg-foreground/5 rounded-xl px-4 py-3 font-mono text-xs break-all">{addr}</div>
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background text-sm font-semibold px-4 py-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy address"}
            </button>
            {selected !== "XLM" && <p className="text-[11px] text-amber-700">Demo address. Only XLM is on-chain.</p>}
          </>
        )}
      </div>
    </div>
  );
}
