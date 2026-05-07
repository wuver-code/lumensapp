import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({ component: ScanPage });

function ScanPage() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [running, setRunning] = useState(false);

  const stop = async () => {
    try { await scannerRef.current?.stop(); } catch {}
    try { await scannerRef.current?.clear(); } catch {}
    scannerRef.current = null;
    setRunning(false);
  };

  const start = async () => {
    if (!ref.current) return;
    try {
      const scanner = new Html5Qrcode(ref.current.id);
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 },
        async (decoded) => {
          await stop();
          handleResult(decoded);
        }, () => {});
      setRunning(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Camera not available");
    }
  };

  const handleResult = (text: string) => {
    // Stellar address?
    if (/^G[A-Z0-9]{55}$/.test(text)) {
      navigate({ to: "/wallet/transfer", search: { to: text, asset: "XLM" } });
      return;
    }
    // web+stellar:G...?amount=...
    const m = text.match(/^web\+stellar:pay\?destination=([^&]+)(?:&amount=([0-9.]+))?/);
    if (m) {
      navigate({ to: "/wallet/transfer", search: { to: m[1], asset: "XLM" } });
      return;
    }
    toast(`Scanned: ${text.slice(0, 60)}`);
  };

  useEffect(() => () => { stop(); }, []);

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-5">
        <Link to="/wallet" className="glass h-10 w-10 rounded-full flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Scan to pay</h1>
      </header>

      <div className="glass-strong rounded-3xl p-4 shadow-soft">
        <div id="qr-region" ref={ref} className="rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center">
          {!running && <ScanLine className="h-12 w-12 text-white/40" />}
        </div>
        <div className="mt-4 flex gap-2">
          {!running ? (
            <button onClick={start} className="flex-1 rounded-full bg-foreground text-background font-semibold py-3">
              Start camera
            </button>
          ) : (
            <button onClick={stop} className="flex-1 rounded-full glass font-semibold py-3 inline-flex items-center justify-center gap-2">
              <X className="h-4 w-4" /> Stop
            </button>
          )}
          <Link to="/receive" className="flex-1 rounded-full glass font-semibold py-3 text-center">My QR</Link>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground text-center">Camera permission required. Stellar QR codes auto-fill the transfer screen.</p>
      </div>
    </div>
  );
}
