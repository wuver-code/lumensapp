import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getOrCreateWallet, NETWORK_LABEL } from "@/lib/wallet";
import { toast } from "sonner";

export const Route = createFileRoute("/receive")({ component: ReceivePage });

function ReceivePage() {
  const [addr, setAddr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setAddr(getOrCreateWallet().publicKey); }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen mx-auto max-w-md flex flex-col">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold">Receive XLM</h1>
      </header>
      <main className="flex-1 p-6 space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          Share your address to receive Stellar Lumens on {NETWORK_LABEL}.
        </p>
        <div className="glass-strong rounded-3xl p-6 flex flex-col items-center gap-4 shadow-soft">
          {addr && (
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={addr} size={200} />
            </div>
          )}
          <p className="font-mono text-xs break-all text-center">{addr}</p>
          <button onClick={copy} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background text-sm font-semibold px-5 py-2.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
      </main>
    </div>
  );
}
