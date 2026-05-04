import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Star, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { shortAddress } from "@/lib/wallet";
import { StrKey } from "@stellar/stellar-sdk";
import { toast } from "sonner";

export const Route = createFileRoute("/contacts")({ component: ContactsPage });

type Contact = { id: string; label: string; address: string; memo: string | null; is_favorite: boolean };

function ContactsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Contact[]>([]);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stellar_contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Contact[]);
  };

  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!label.trim()) return toast.error("Add a name");
    if (!StrKey.isValidEd25519PublicKey(address)) return toast.error("Invalid Stellar address");
    const { error } = await supabase.from("stellar_contacts").insert({
      user_id: user.id, label: label.trim(), address, memo: memo.trim() || null,
    });
    if (error) return toast.error(error.message);
    setLabel(""); setAddress(""); setMemo("");
    toast.success("Contact saved");
    load();
  };

  const toggleFav = async (c: Contact) => {
    await supabase.from("stellar_contacts").update({ is_favorite: !c.is_favorite }).eq("id", c.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("stellar_contacts").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen mx-auto max-w-md">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold">Address book</h1>
      </header>
      <main className="p-5 space-y-5">
        <form onSubmit={add} className="glass-strong rounded-3xl p-5 shadow-soft space-y-3">
          <h2 className="font-semibold">Add recipient</h2>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name (e.g. Alice)" className="w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm outline-none" />
          <input value={address} onChange={(e) => setAddress(e.target.value.trim())} placeholder="G..." className="w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm font-mono outline-none" />
          <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={28} placeholder="Default memo (optional)" className="w-full bg-foreground/5 rounded-xl px-4 py-3 text-sm outline-none" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background text-sm font-semibold px-4 py-2">
            <Plus className="h-4 w-4" /> Save contact
          </button>
        </form>

        <div>
          <h2 className="mb-3 px-1 text-lg font-bold">Saved</h2>
          <div className="glass-strong rounded-3xl shadow-soft divide-y divide-foreground/5">
            {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No contacts yet.</div>}
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4">
                <button onClick={() => toggleFav(c)} aria-label="favorite">
                  <Star className={`h-4 w-4 ${c.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.label}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{shortAddress(c.address)}</p>
                </div>
                <Link to="/send" search={{ to: c.address, memo: c.memo ?? "" } as any} className="rounded-full bg-foreground/5 hover:bg-foreground hover:text-background p-2">
                  <Send className="h-4 w-4" />
                </Link>
                <button onClick={() => remove(c.id)} className="rounded-full p-2 text-muted-foreground hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
