import { createFileRoute } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PinGate } from "@/components/PinGate";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/Avatar";
import { getOrCreateWallet } from "@/lib/wallet";

export const Route = createFileRoute("/profile")({
  component: () => <PinGate><ProfilePage /></PinGate>,
});

type P = {
  display_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
};

function ProfilePage() {
  const { user } = useAuth();
  const [p, setP] = useState<P>({
    display_name: "", username: "", email: "", phone: "",
    date_of_birth: "", avatar_url: "", wallet_address: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Always ensure a wallet address is stored on the profile for the owner
    const w = getOrCreateWallet();
    supabase
      .from("profiles")
      .select("display_name, username, email, phone, date_of_birth, avatar_url, wallet_address")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        let next = (data as P) ?? null;
        if (next && !next.wallet_address) {
          await supabase.from("profiles").update({ wallet_address: w.publicKey }).eq("id", user.id);
          next = { ...next, wallet_address: w.publicKey };
        }
        if (next) setP({ ...next, email: next.email ?? user.email ?? "" });
        else setP((x) => ({ ...x, email: user.email ?? "", wallet_address: w.publicKey }));
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: p.display_name,
      username: p.username?.toLowerCase() ?? null,
      email: p.email,
      phone: p.phone,
      date_of_birth: p.date_of_birth || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    setP((x) => ({ ...x, avatar_url: data.publicUrl }));
    setUploading(false);
    toast.success("Avatar updated");
  };

  return (
    <>
      <AppHeader title="Profile" />
      <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
        <div className="flex flex-col items-center mb-6">
          <label className="relative cursor-pointer group">
            <div className="h-24 w-24 rounded-full overflow-hidden">
              <Avatar url={p.avatar_url} name={p.display_name} size={96} />
            </div>
            <span className="absolute bottom-1 right-1 glass-strong h-9 w-9 rounded-full flex items-center justify-center shadow-soft">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </span>
            <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          </label>
          <p className="mt-3 text-sm text-muted-foreground">Tap photo to change</p>
        </div>

        <div className="glass-strong rounded-3xl p-5 space-y-3 shadow-soft">
          {[
            { k: "display_name", label: "Full Name", type: "text" },
            { k: "date_of_birth", label: "Date of Birth", type: "date" },
            { k: "phone", label: "Phone Number", type: "tel" },
            { k: "email", label: "Email Address", type: "email" },
            { k: "username", label: "Username", type: "text" },
          ].map((f) => (
            <div key={f.k}>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input
                type={f.type as any}
                value={(p as any)[f.k] ?? ""}
                onChange={(e) => setP({ ...p, [f.k]: e.target.value } as P)}
                placeholder="Not set"
                className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm outline-none"
              />
            </div>
          ))}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Stellar Wallet</label>
            <p className="mt-1 w-full bg-foreground/5 rounded-xl px-4 py-3 text-xs font-mono break-all">
              {p.wallet_address || <span className="text-muted-foreground">Not set</span>}
            </p>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
        </button>
      </div>
    </>
  );
}
