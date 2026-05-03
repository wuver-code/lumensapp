import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/chat/$id")({ component: ChatRoom });

type Msg = { id: string; sender_id: string; content: string | null; kind: string; created_at: string };

function ChatRoom() {
  const { id } = useParams({ from: "/chat/$id" });
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at")
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));
    const ch = supabase.channel(`chat-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (p) => setMsgs((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, content, kind: "text" });
  };

  return (
    <div className="min-h-screen flex flex-col mx-auto max-w-md">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold">Conversation</h1>
      </header>
      <main className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-foreground text-background" : "glass-strong"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </main>
      <form onSubmit={send} className="sticky bottom-0 px-4 py-3 glass-strong flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…"
          className="flex-1 bg-foreground/5 rounded-full px-4 py-2.5 text-sm outline-none" />
        <button type="submit" className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
