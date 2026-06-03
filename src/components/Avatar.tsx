import { useState } from "react";

const gradients = [
  "from-orange-300 to-rose-400",
  "from-amber-300 to-orange-400",
  "from-violet-300 to-fuchsia-400",
  "from-rose-300 to-pink-400",
  "from-yellow-300 to-amber-500",
  "from-sky-300 to-indigo-400",
  "from-emerald-300 to-teal-400",
];

function pickGradient(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return gradients[h % gradients.length];
}

type Props = {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

/**
 * Renders a user avatar with `loading="lazy"`, circular crop, and an
 * automatic initials fallback when the image is missing or broken.
 */
export function Avatar({ url, name, size = 40, className = "" }: Props) {
  const [broken, setBroken] = useState(false);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const grad = pickGradient(name ?? "?");
  const dim = { width: size, height: size };

  if (url && !broken) {
    return (
      <img
        src={url}
        alt={name ?? "avatar"}
        loading="lazy"
        onError={() => setBroken(true)}
        style={dim}
        className={`rounded-full object-cover ring-2 ring-white/40 ${className}`}
      />
    );
  }

  return (
    <div
      style={dim}
      className={`rounded-full bg-gradient-to-br ${grad} ring-2 ring-white/40 flex items-center justify-center text-white font-bold ${className}`}
    >
      {initial}
    </div>
  );
}
