import { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset, Memo } from "@stellar/stellar-sdk";

const SK_KEY = "lumens.wallet.sk";
const PK_KEY = "lumens.wallet.pk";

const IS_PUBLIC = import.meta.env.VITE_STELLAR_NETWORK === "public";
export const HORIZON_URL = IS_PUBLIC
  ? "https://horizon.stellar.org"
  : "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = IS_PUBLIC ? Networks.PUBLIC : Networks.TESTNET;
export const NETWORK_LABEL = IS_PUBLIC ? "Stellar Mainnet" : "Stellar Testnet";
export const EXPLORER_BASE = IS_PUBLIC
  ? "https://stellar.expert/explorer/public"
  : "https://stellar.expert/explorer/testnet";

export const horizon = new Horizon.Server(HORIZON_URL);

export type WalletInfo = { publicKey: string; secret: string };
export type AssetBalance = { code: string; issuer?: string; balance: number; limit?: number };

export function getOrCreateWallet(): WalletInfo {
  if (typeof window === "undefined") return { publicKey: "", secret: "" };
  let secret = localStorage.getItem(SK_KEY);
  let publicKey = localStorage.getItem(PK_KEY);
  if (!secret || !publicKey) {
    const kp = Keypair.random();
    secret = kp.secret();
    publicKey = kp.publicKey();
    localStorage.setItem(SK_KEY, secret);
    localStorage.setItem(PK_KEY, publicKey);
  }
  return { publicKey, secret };
}

export function shortAddress(addr?: string | null) {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export function explorerTxUrl(hash: string) {
  return `${EXPLORER_BASE}/tx/${hash}`;
}
export function explorerAccountUrl(addr: string) {
  return `${EXPLORER_BASE}/account/${addr}`;
}

export async function getXlmBalance(publicKey: string): Promise<number> {
  try {
    const account = await horizon.loadAccount(publicKey);
    const native = account.balances.find((b: any) => b.asset_type === "native");
    return native ? Number(native.balance) : 0;
  } catch { return 0; }
}

export async function getAllBalances(publicKey: string): Promise<AssetBalance[]> {
  try {
    const account = await horizon.loadAccount(publicKey);
    return account.balances.map((b: any) => ({
      code: b.asset_type === "native" ? "XLM" : b.asset_code,
      issuer: b.asset_type === "native" ? undefined : b.asset_issuer,
      balance: Number(b.balance),
      limit: b.limit ? Number(b.limit) : undefined,
    }));
  } catch { return []; }
}

export async function fundTestnet(publicKey: string): Promise<boolean> {
  if (IS_PUBLIC) return false;
  try {
    const r = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`);
    return r.ok;
  } catch { return false; }
}

async function buildAndSubmit(
  secret: string,
  build: (b: TransactionBuilder) => TransactionBuilder,
  memo?: string,
): Promise<string> {
  const source = Keypair.fromSecret(secret);
  const account = await horizon.loadAccount(source.publicKey());
  const fee = await horizon.fetchBaseFee().catch(() => 100);
  let builder = new TransactionBuilder(account, { fee: String(fee), networkPassphrase: NETWORK_PASSPHRASE });
  builder = build(builder);
  if (memo) builder.addMemo(Memo.text(memo.slice(0, 28)));
  const tx = builder.setTimeout(120).build();
  tx.sign(source);
  const res = await horizon.submitTransaction(tx);
  return (res as any).hash;
}

export async function sendXlm(opts: { secret: string; destination: string; amount: string; memo?: string }) {
  return buildAndSubmit(opts.secret, (b) =>
    b.addOperation(Operation.payment({ destination: opts.destination, asset: Asset.native(), amount: opts.amount })),
    opts.memo,
  );
}

export async function sendAsset(opts: {
  secret: string; destination: string; amount: string; code: string; issuer: string; memo?: string;
}) {
  const asset = new Asset(opts.code, opts.issuer);
  return buildAndSubmit(opts.secret, (b) =>
    b.addOperation(Operation.payment({ destination: opts.destination, asset, amount: opts.amount })),
    opts.memo,
  );
}

export async function changeTrust(opts: { secret: string; code: string; issuer: string; limit?: string }) {
  const asset = new Asset(opts.code, opts.issuer);
  return buildAndSubmit(opts.secret, (b) =>
    b.addOperation(Operation.changeTrust({ asset, limit: opts.limit })),
  );
}

/** Subscribe to incoming/outgoing payments to refresh state. Returns unsubscribe fn. */
export function streamPayments(publicKey: string, onChange: () => void): () => void {
  const close = horizon
    .payments()
    .forAccount(publicKey)
    .cursor("now")
    .stream({
      onmessage: () => onChange(),
      onerror: () => {},
    });
  return () => { try { close(); } catch {} };
}
