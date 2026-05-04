import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, XCircle, Copy } from "lucide-react";
import { horizon, explorerTxUrl, NETWORK_LABEL, shortAddress } from "@/lib/wallet";
import { toast } from "sonner";

export const Route = createFileRoute("/tx/$hash")({ component: TxPage });

type Status = "pending" | "success" | "fail";

function TxPage() {
  const { hash } = Route.useParams();
  const [status, setStatus] = useState<Status>("pending");
  const [details, setDetails] = useState<any>(null);
  const [ops, setOps] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const tx: any = await horizon.transactions().transaction(hash).call();
        if (cancelled) return;
        setDetails(tx);
        setStatus(tx.successful ? "success" : "fail");
        const opres = await horizon.operations().forTransaction(hash).call();
        if (!cancelled) setOps(opres.records);
      } catch {
        if (attempts < 20 && !cancelled) setTimeout(tick, 2000);
        else if (!cancelled) setStatus("fail");
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [hash]);

  const copy = () => { navigator.clipboard.writeText(hash); toast.success("Hash copied"); };

  const StatusIcon = status === "success" ? CheckCircle2 : status === "fail" ? XCircle : Clock;
  const color = status === "success" ? "text-emerald-500" : status === "fail" ? "text-rose-500" : "text-amber-500";

  return (
    <div className="min-h-screen mx-auto max-w-md">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold">Transaction</h1>
      </header>
      <main className="p-5 space-y-5">
        <div className="glass-strong rounded-3xl p-6 shadow-soft text-center">
          <StatusIcon className={`mx-auto h-14 w-14 ${color}`} />
          <p className="mt-3 text-2xl font-bold capitalize">{status}</p>
          <p className="mt-1 text-xs text-muted-foreground">{NETWORK_LABEL}</p>
          <button onClick={copy} className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5 text-xs font-mono">
            {hash.slice(0, 10)}…{hash.slice(-10)} <Copy className="h-3 w-3" />
          </button>
        </div>

        {ops.length > 0 && (
          <div className="glass-strong rounded-3xl p-5 shadow-soft space-y-3">
            <h2 className="font-semibold">Operations</h2>
            {ops.map((o) => (
              <div key={o.id} className="rounded-xl bg-foreground/5 p-3 text-sm">
                <p className="font-medium capitalize">{o.type.replace(/_/g, " ")}</p>
                {o.amount && <p className="text-xs text-muted-foreground">{o.amount} {o.asset_code ?? "XLM"}</p>}
                {o.to && <p className="text-xs text-muted-foreground font-mono">to {shortAddress(o.to)}</p>}
              </div>
            ))}
          </div>
        )}

        {details && (
          <div className="glass-strong rounded-3xl p-5 shadow-soft text-sm space-y-1">
            <Row k="Date" v={new Date(details.created_at).toLocaleString()} />
            <Row k="Fee" v={`${(Number(details.fee_charged) / 1e7).toFixed(7)} XLM`} />
            <Row k="Ledger" v={String(details.ledger)} />
          </div>
        )}

        <a href={explorerTxUrl(hash)} target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5">
          View on Stellar Expert <ExternalLink className="h-4 w-4" />
        </a>
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right truncate">{v}</span>
    </div>
  );
}
