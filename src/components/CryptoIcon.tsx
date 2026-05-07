import { Bitcoin, CircleDollarSign, Coins, Hexagon, Triangle, Waves, Zap, Diamond, Star, Sparkles } from "lucide-react";

const map: Record<string, { Icon: any; label: string; price: number }> = {
  BTC:  { Icon: Bitcoin,           label: "Bitcoin",   price: 92000 },
  ETH:  { Icon: Hexagon,           label: "Ethereum",  price: 3400 },
  XLM:  { Icon: Sparkles,          label: "Stellar",   price: 0.12 },
  XRP:  { Icon: Waves,             label: "Ripple",    price: 0.55 },
  ADA:  { Icon: Triangle,          label: "Cardano",   price: 0.45 },
  SOL:  { Icon: Zap,               label: "Solana",    price: 165 },
  HBAR: { Icon: Coins,             label: "Hedera",    price: 0.08 },
  XVG:  { Icon: Star,              label: "Verge",     price: 0.005 },
  USDT: { Icon: CircleDollarSign,  label: "Tether",    price: 1 },
  USDC: { Icon: CircleDollarSign,  label: "USD Coin",  price: 1 },
};

export const SUPPORTED_CRYPTO = ["HBAR","XVG","XRP","XLM","ADA","SOL","BTC","USDT","USDC","ETH"] as const;
export type CryptoSym = typeof SUPPORTED_CRYPTO[number];

export function cryptoMeta(sym: string) {
  return map[sym] ?? { Icon: Diamond, label: sym, price: 0 };
}

export function CryptoIcon({ sym, className = "h-5 w-5" }: { sym: string; className?: string }) {
  const { Icon } = cryptoMeta(sym);
  return <Icon className={className} strokeWidth={1.75} />;
}
