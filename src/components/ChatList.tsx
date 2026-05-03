import { Search, Plus } from "lucide-react";

const chats = [
  { name: "Maya Chen", last: "Sent you 0.05 ETH 🎉", time: "2m", unread: 2, color: "from-orange-300 to-rose-400" },
  { name: "Design Team", last: "Alex: ship it 🚢", time: "14m", unread: 0, color: "from-amber-300 to-orange-400" },
  { name: "Jordan Reeves", last: "thanks for the split!", time: "1h", unread: 0, color: "from-violet-300 to-fuchsia-400" },
  { name: "Mom 💛", last: "call me when free", time: "3h", unread: 1, color: "from-rose-300 to-pink-400" },
  { name: "Crypto Pals", last: "BTC just broke 90k", time: "Yesterday", unread: 0, color: "from-yellow-300 to-amber-500" },
  { name: "Sara K.", last: "see you at 7", time: "Yesterday", unread: 0, color: "from-sky-300 to-indigo-400" },
];

export function ChatList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chats</h1>
        <button className="glass flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground hover:text-background transition">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search messages, contacts…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="glass-strong rounded-3xl p-2 shadow-soft">
        {chats.map((c, i) => (
          <button
            key={c.name}
            className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-accent/40 transition"
          >
            <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${c.color} ring-2 ring-white/60`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">{c.name}</p>
                <span className="text-[11px] text-muted-foreground">{c.time}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground truncate">{c.last}</p>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background">
                    {c.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
