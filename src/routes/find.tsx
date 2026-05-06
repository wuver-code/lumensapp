import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, UserPlus, Check, X, Phone, ContactRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/find")({ component: Find });

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  phone: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
};

type Req = {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
  profile?: Profile | null;
};

function Find() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [bulk, setBulk] = useState("");
  const [incoming, setIncoming] = useState<Req[]>([]);
  const [outgoing, setOutgoing] = useState<Req[]>([]);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [requestTarget, setRequestTarget] = useState<Profile | null>(null);
  const [requestNote, setRequestNote] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: reqs } = await supabase
      .from("contact_requests")
      .select("*")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);
    const ids = Array.from(
      new Set((reqs ?? []).flatMap((r) => [r.from_user, r.to_user])),
    ).filter((id) => id !== user.id);
    let profs: Record<string, Profile> = {};
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, display_name, username, phone, wallet_address, avatar_url")
        .in("id", ids);
      profs = Object.fromEntries((ps ?? []).map((p) => [p.id, p as Profile]));
    }
    const enriched = (reqs ?? []).map((r) => ({
      ...r,
      profile: profs[r.from_user === user.id ? r.to_user : r.from_user] ?? null,
    })) as Req[];
    setIncoming(enriched.filter((r) => r.to_user === user.id && r.status === "pending"));
    setOutgoing(enriched.filter((r) => r.from_user === user.id && r.status === "pending"));
    setContacts(
      enriched
        .filter((r) => r.status === "accepted")
        .map((r) => r.profile)
        .filter(Boolean) as Profile[],
    );
  };

  useEffect(() => {
    if (!user) return;
    load();
    // Instant realtime updates so requests appear in <1s on both sides
    const ch = supabase
      .channel(`contact-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests" },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc("search_profile", { _q: q.trim() });
      if (error) throw error;
      setResults((data ?? []) as Profile[]);
    } catch (err: any) {
      toast.error(err.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const checkPhones = async () => {
    const phones = bulk
      .split(/[\s,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!phones.length) return;
    const { data, error } = await supabase.rpc("find_by_phones", { _phones: phones });
    if (error) return toast.error(error.message);
    setResults((data ?? []) as Profile[]);
    if (!data?.length) toast("No matches on Lumens yet.");
  };

  const openRequest = (p: Profile) => {
    setRequestTarget(p);
    setRequestNote("");
  };

  const submitRequest = async () => {
    if (!user || !requestTarget) return;
    const note = requestNote.trim().slice(0, 280) || null;
    const { error } = await supabase
      .from("contact_requests")
      .insert({ from_user: user.id, to_user: requestTarget.id, status: "pending", message: note });
    if (error) return toast.error(error.message);
    toast.success("Request sent");
    setRequestTarget(null);
    setRequestNote("");
    load();
  };

  const respond = async (req: Req, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("contact_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Contact added" : "Declined");
    load();
  };

  const startChat = async (otherId: string) => {
    if (!user) return;
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ created_by: user.id, is_group: false })
      .select()
      .single();
    if (error || !conv) return toast.error(error?.message ?? "Failed");
    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherId },
    ]);
    navigate({ to: "/chat/$id", params: { id: conv.id } });
  };

  const isContact = (id: string) => contacts.some((c) => c.id === id);
  const isPending = (id: string) => outgoing.some((r) => r.profile?.id === id);

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-6 pb-24 space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold">Find people</h1>

      {incoming.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Requests</h2>
          <div className="glass-strong rounded-3xl p-2">
            {incoming.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-3">
                <Avatar name={r.profile?.display_name ?? "?"} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.profile?.display_name ?? "Someone"}</p>
                  <p className="text-xs text-muted-foreground truncate">@{r.profile?.username ?? r.profile?.phone ?? ""}</p>
                  {(r as any).message && (
                    <p className="mt-1 text-xs italic text-foreground/80 break-words">"{(r as any).message}"</p>
                  )}
                </div>
                <button onClick={() => respond(r, "accepted")} className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"><Check className="h-4 w-4" /></button>
                <button onClick={() => respond(r, "declined")} className="h-9 w-9 rounded-full glass flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={search} className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Search by phone, username or wallet</h2>
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="+15551234567 / @alex / G…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button disabled={searching} type="submit" className="text-xs font-semibold">{searching ? "…" : "Search"}</button>
        </div>
      </form>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
          <ContactRound className="h-3.5 w-3.5" /> Match my phone contacts
        </h2>
        <div className="glass rounded-2xl p-3 space-y-2">
          <textarea
            rows={3}
            placeholder="Paste phone numbers separated by commas or new lines"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            className="w-full bg-transparent text-sm outline-none resize-none"
          />
          <button onClick={checkPhones} className="rounded-full bg-foreground text-background px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" /> Check who's on Lumens
          </button>
        </div>
      </section>

      {results.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Results</h2>
          <div className="glass-strong rounded-3xl p-2">
            {results.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <Avatar name={p.display_name ?? p.username ?? "?"} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.display_name ?? p.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.phone ?? p.username ?? ""}</p>
                </div>
                {isContact(p.id) ? (
                  <button onClick={() => startChat(p.id)} className="text-xs font-semibold rounded-full bg-foreground text-background px-3 py-1.5">Chat</button>
                ) : isPending(p.id) ? (
                  <span className="text-xs text-muted-foreground">Pending</span>
                ) : (
                  <button onClick={() => openRequest(p)} className="rounded-full glass px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1">
                    <UserPlus className="h-3.5 w-3.5" /> Request
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">My contacts ({contacts.length})</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts yet — search above to add someone.</p>
        ) : (
          <div className="glass-strong rounded-3xl p-2">
            {contacts.map((p) => (
              <button key={p.id} onClick={() => startChat(p.id)} className="flex w-full items-center gap-3 rounded-2xl p-3 hover:bg-accent/40 text-left">
                <Avatar name={p.display_name ?? "?"} />
                <span className="flex-1 font-medium truncate">{p.display_name ?? p.username}</span>
                <span className="text-xs text-muted-foreground">Chat →</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 ring-2 ring-white/60 flex items-center justify-center text-white font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
