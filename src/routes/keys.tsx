import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Upload, ShieldCheck, AlertTriangle } from "lucide-react";
import { exportKeypairBackup, importKeypairBackup } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/keys")({ component: KeysPage });

function KeysPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onExport = () => {
    try {
      const json = exportKeypairBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumens-keys-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded — store it somewhere safe.");
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    setBusy(true);
    try {
      const text = await f.text();
      const { publicKey } = await importKeypairBackup(text);
      await supabase.from("profiles").update({ public_key: publicKey }).eq("id", user.id);
      toast.success("Keys restored — your chats will decrypt on this device.");
    } catch (err: any) {
      toast.error(err.message ?? "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-6 pb-24 space-y-5">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-500" />
        <h1 className="text-2xl font-bold">Encryption keys</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Lumens chats use end-to-end encryption. Your private key lives only on this device.
        Export it to move chats to another device — or restore a backup here.
      </p>

      <div className="glass-strong rounded-3xl p-5 space-y-3">
        <h2 className="font-semibold">Export this device's keypair</h2>
        <p className="text-xs text-muted-foreground">Saves a JSON file containing your public + private keys. Anyone with this file can read your chats — keep it secret.</p>
        <button onClick={onExport} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold">
          <Download className="h-4 w-4" /> Download backup
        </button>
      </div>

      <div className="glass-strong rounded-3xl p-5 space-y-3">
        <h2 className="font-semibold">Import keypair on this device</h2>
        <p className="text-xs text-muted-foreground">
          Loads a backup so this device shares the same keys. Existing chats will decrypt correctly.
        </p>
        <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" />
        <button disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold disabled:opacity-50">
          <Upload className="h-4 w-4" /> {busy ? "Importing…" : "Import backup file"}
        </button>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Importing a key replaces this device's keys. Lumens has no way to recover messages if you lose your backup.
        </p>
      </div>
    </div>
  );
}
