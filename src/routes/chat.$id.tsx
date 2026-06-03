import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, ShieldCheck, ImagePlus, Mic, Square, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { encryptFor, decryptFrom, ensureKeypair } from "@/lib/crypto";
import { saveMessage, listMessages, type LocalMessage } from "@/lib/messageStore";
import { compressImage, blobToDataUrl, startVoiceRecorder, type Recorder } from "@/lib/media";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/chat/$id")({ component: ChatRoom });

// Realtime broadcast frames are capped — keep a hard ceiling on per-message ciphertext.
const MAX_MEDIA_BYTES = 900_000;

function ChatRoom() {
  const { id } = useParams({ from: "/chat/$id" });
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<LocalMessage[]>([]);
  const [text, setText] = useState("");
  const [peerKey, setPeerKey] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("Conversation");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isAcceptedContact, setIsAcceptedContact] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const recorderRef = useRef<Recorder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
        .select("display_name, public_key, avatar_url")
        .eq("id", peerIdLocal)
        .maybeSingle();
      if (cancelled) return;
      setPeerName(peer?.display_name ?? "Conversation");
      setPeerAvatar(peer?.avatar_url ?? null);
      setPeerKey(peer?.public_key ?? null);
      const { data: accepted } = await supabase.rpc("are_contacts", { _a: user.id, _b: peerIdLocal });
      if (!cancelled) setIsAcceptedContact(Boolean(accepted));

      const ch = supabase
        .channel(`e2ee-${id}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "msg" }, async (p) => {
          const payload = p.payload as { from: string; iv: string; ct: string; id: string; ts: number; kind?: "text" | "image" | "audio" };
          if (payload.from === user.id || !peer?.public_key) return;
          try {
            const plain = await decryptFrom(peer.public_key, { iv: payload.iv, ct: payload.ct });
            const kind = payload.kind ?? "text";
            const msg: LocalMessage = {
              id: payload.id,
              conversationId: id,
              senderId: payload.from,
              text: kind === "text" ? plain : "",
              media: kind === "text" ? undefined : plain,
              kind,
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

  const sendPayload = async (payload: string, kind: "text" | "image" | "audio") => {
    if (!user || !peerKey || !channelRef.current || !isAcceptedContact) return;
    setSending(true);
    try {
      const { iv, ct } = await encryptFor(peerKey, payload);
      if (ct.length > MAX_MEDIA_BYTES) {
        toast.error("Attachment is too large after compression");
        return;
      }
      const msg: LocalMessage = {
        id: crypto.randomUUID(),
        conversationId: id,
        senderId: user.id,
        text: kind === "text" ? payload : "",
        media: kind === "text" ? undefined : payload,
        kind,
        createdAt: Date.now(),
      };
      await saveMessage(msg);
      setMsgs((m) => [...m, msg]);
      await channelRef.current.send({
        type: "broadcast",
        event: "msg",
        payload: { from: user.id, iv, ct, id: msg.id, ts: msg.createdAt, kind },
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
    } finally {
      setSending(false);
    }
  };

  const sendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    await sendPayload(content, "text");
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      await sendPayload(dataUrl, "image");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not attach image");
    }
  };

  const toggleRecording = async () => {
    if (!isAcceptedContact) return;
    if (recording && recorderRef.current) {
      try {
        const blob = await recorderRef.current.stop();
        recorderRef.current = null;
        setRecording(false);
        const dataUrl = await blobToDataUrl(blob);
        await sendPayload(dataUrl, "audio");
      } catch (err: any) {
        toast.error(err?.message ?? "Recording failed");
      }
      return;
    }
    try {
      recorderRef.current = await startVoiceRecorder();
      setRecording(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Microphone unavailable");
    }
  };

  const cancelRecording = () => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecording(false);
  };

  const canSend = Boolean(peerKey && isAcceptedContact);

  return (
    <div className="min-h-screen flex flex-col mx-auto max-w-md">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/60 border-b border-white/10 flex items-center gap-3 px-4 py-3">
        <Link to="/chat" className="text-muted-foreground" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        {peerId ? (
          <Link to="/profile/$userId" params={{ userId: peerId }} className="shrink-0">
            <Avatar url={peerAvatar} name={peerName} size={36} />
          </Link>
        ) : (
          <Avatar name={peerName} size={36} />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate text-sm">{peerName}</h1>
          <p className="text-[11px] inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-semibold">
              <ShieldCheck className="h-3 w-3" /> Encrypted
            </span>
            {!isAcceptedContact && peerId && (
              <span className="text-amber-600 dark:text-amber-400">· not a contact</span>
            )}
          </p>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {!peerKey && (
          <p className="text-center text-xs text-muted-foreground py-8">
            Waiting for the other person to open Lumens to exchange keys…
          </p>
        )}
        {!isAcceptedContact && peerId && (
          <div className="glass-strong rounded-2xl p-4 text-center text-sm shadow-soft">
            <p className="font-semibold mb-1">Sending is locked</p>
            <p className="text-xs text-muted-foreground mb-3">
              You can only send messages once {peerName} accepts your contact request.
            </p>
            <Link to="/find" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-3 py-1.5 text-xs font-semibold">
              Manage requests
            </Link>
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.senderId === user?.id;
          const bubble = `max-w-[78%] rounded-2xl text-sm shadow-soft ${mine ? "bg-foreground text-background" : "glass-strong"}`;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              {m.kind === "image" && m.media ? (
                <div className={`${bubble} overflow-hidden p-1`}>
                  <img src={m.media} alt="attachment" className="rounded-xl max-h-72 w-auto" />
                </div>
              ) : m.kind === "audio" && m.media ? (
                <div className={`${bubble} px-3 py-2`}>
                  <audio src={m.media} controls className="h-9" />
                </div>
              ) : (
                <div className={`${bubble} px-4 py-2`}>{m.text}</div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </main>
      <form onSubmit={sendText} className="sticky bottom-0 px-3 py-3 glass-strong flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPickImage}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!canSend || sending}
          className="h-10 w-10 rounded-full glass flex items-center justify-center disabled:opacity-50"
          aria-label="Attach image"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        {recording ? (
          <div className="flex-1 flex items-center gap-2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 px-4 py-2.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            Recording… tap stop to send
            <button type="button" onClick={cancelRecording} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={!isAcceptedContact ? "Locked — accept contact first" : peerKey ? "Encrypted message…" : "Waiting for keys…"}
            disabled={!canSend || sending}
            className="flex-1 bg-foreground/5 rounded-full px-4 py-2.5 text-sm outline-none disabled:opacity-60"
          />
        )}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={!canSend}
          className={`h-10 w-10 rounded-full flex items-center justify-center disabled:opacity-50 ${recording ? "bg-rose-500 text-white" : "glass"}`}
          aria-label={recording ? "Stop recording" : "Record voice note"}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          type="submit"
          disabled={!canSend || !text.trim() || sending}
          className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
