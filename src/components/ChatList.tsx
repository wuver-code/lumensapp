import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Plus, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";

type ConvRow = {
  id: string;
  is_group: boolean;
  name: string | null;
  last_message_at: string;
  members: { user_id: string; profile: { display_name: string | null; avatar_url: string | null } | null }[];
  last: { content: string | null; kind: string }[];
};

const gradients = [
  "from-orange-300 to-rose-400",
  "from-amber-300 to-orange-400",
  "from-violet-300 to-fuchsia-400",
  "from-rose-300 to-pink-400",
  "from-yellow-300 to-amber-500",
  "from-sky-300 to-indigo-400",
];

function pickColor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return gradients[h % gradients.length];
}

export function ChatList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data: convIds } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);
      const ids = (convIds ?? []).map((r) => r.conversation_id);
      if (ids.length === 0) {
        if (active) { setRows([]); setLoading(false); }
        return;
      }
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, is_group, name, last_message_at")
        .in("id", ids)
        .order("last_message_at", { ascending: false });

      const enriched: ConvRow[] = await Promise.all(
        (convs ?? []).map(async (c) => {
          const { data: members } = await supabase
            .from("conversation_members")
            .select("user_id, profile:profiles(display_name, avatar_url)")
            .eq("conversation_id", c.id);
          return { ...c, members: (members ?? []) as any, last: [] as any };
        })
      );
      if (active) { setRows(enriched); setLoading(false); }
    };
    load();

    const ch = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const display = (c: ConvRow) => {
    if (c.is_group && c.name) return c.name;
    const other = c.members.find((m) => m.user_id !== user?.id);
    return other?.profile?.display_name ?? "Conversation";
  };

  const filtered = rows.filter((r) => display(r).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link to="/find" className="glass flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground hover:text-background transition">
          <Plus className="h-4 w-4" />
        </Link>
      </div>
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <div className="glass-strong rounded-3xl p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong rounded-3xl p-10 text-center">
          <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">No conversations yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Start a chat to send your first message or payment.</p>
          <Link to="/find" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Find people
          </Link>
        </div>
      ) : (
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          {filtered.map((c) => {
            const name = display(c);
            const peer = c.members.find((m) => m.user_id !== user?.id);
            const preview = "🔒 End-to-end encrypted";
            return (
              <Link
                key={c.id}
                to="/chat/$id"
                params={{ id: c.id }}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-accent/40 transition"
              >
                <Avatar url={peer?.profile?.avatar_url} name={name} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">{name}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{preview}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
