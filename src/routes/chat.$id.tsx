import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { encryptFor, decryptFrom, ensureKeypair } from "@/lib/crypto";
import { saveMessage, listMessages, type LocalMessage } from "@/lib/messageStore";

export const Route = createFileRoute("/chat/$id")({ component: ChatRoom });

function ChatRoom() {
  const { id } = useParams({ from: "/chat/$id" });
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<LocalMessage[]>([]);
  const [text, setText] = useState("");
  const [peerKey, setPeerKey] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("Conversation");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isAcceptedContact, setIsAcceptedContact] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Load local message history
  useEffect(() => {
    listMessages(id).then(setMsgs);
  }, [id]);

  // Load peer profile + public key, then subscribe to encrypted broadcast channel
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await ensureKeypair();
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", id);
      const peerIdLocal = (members ?? []).map((m) => m.user_id).find((u) => u !== user.id);
      if (!peerIdLocal) return;
      setPeerId(peerIdLocal);
      const { data: peer } = await supabase
        .from("profiles")
        .select("display_name, public_key")
        .eq("id", peerIdLocal)
        .maybeSingle();
      if (cancelled) return;
      setPeerName(peer?.display_name ?? "Conversation");
      setPeerKey(peer?.public_key ?? null);
      const { data: accepted } = await supabase.rpc("are_contacts", { _a: user.id, _b: peerIdLocal });
      if (!cancelled) setIsAcceptedContact(Boolean(accepted));

      const ch = supabase
        .channel(`e2ee-${id}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "msg" }, async (p) => {
          const payload = p.payload as { from: string; iv: string; ct: string; id: string; ts: number };
          if (payload.from === user.id || !peer?.public_key) return;
          try {
            const plain = await decryptFrom(peer.public_key, { iv: payload.iv, ct: payload.ct });
            const msg: LocalMessage = {
              id: payload.id,
              conversationId: id,
              senderId: payload.from,
              text: plain,
              createdAt: payload.ts,
            };
            await saveMessage(msg);
            setMsgs((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
          } catch {
            /* decrypt failed — likely stale key */
          }
        })
        .subscribe();
      channelRef.current = ch;
    })();
    return () => {
      cancelled = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [id, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user || !peerKey || !channelRef.current) return;
    setText("");
    const { iv, ct } = await encryptFor(peerKey, content);
    const msg: LocalMessage = {
      id: crypto.randomUUID(),
      conversationId: id,
      senderId: user.id,
      text: content,
      createdAt: Date.now(),
    };
    await saveMessage(msg);
    setMsgs((m) => [...m, msg]);
    await channelRef.current.send({
      type: "broadcast",
      event: "msg",
      payload: { from: user.id, iv, ct, id: msg.id, ts: msg.createdAt },
    });
    // Bump conversation timestamp (no plaintext stored)
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
  };

  return (
    <div className="min-h-screen flex flex-col mx-auto max-w-md">
      <header className="sticky top-0 z-10 glass-strong flex items-center gap-3 px-5 py-4">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{peerName}</h1>
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> End-to-end encrypted · device only
          </p>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {!peerKey && (
          <p className="text-center text-xs text-muted-foreground py-8">
            Waiting for the other person to open Lumens to exchange keys…
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-foreground text-background" : "glass-strong"}`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </main>
      <form onSubmit={send} className="sticky bottom-0 px-4 py-3 glass-strong flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={peerKey ? "Encrypted message…" : "Waiting for keys…"}
          disabled={!peerKey}
          className="flex-1 bg-foreground/5 rounded-full px-4 py-2.5 text-sm outline-none disabled:opacity-60"
        />
        <button type="submit" disabled={!peerKey} className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
