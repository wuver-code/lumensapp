import { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset, Memo } from "@stellar/stellar-sdk";

const SK_KEY = "lumens.wallet.sk";
const PK_KEY = "lumens.wallet.pk";

// Use testnet by default for safe demos; switch via VITE_STELLAR_NETWORK=public
const IS_PUBLIC = import.meta.env.VITE_STELLAR_NETWORK === "public";
export const HORIZON_URL = IS_PUBLIC
  ? "https://horizon.stellar.org"
  : "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = IS_PUBLIC ? Networks.PUBLIC : Networks.TESTNET;
export const NETWORK_LABEL = IS_PUBLIC ? "Stellar Mainnet" : "Stellar Testnet";

export const horizon = new Horizon.Server(HORIZON_URL);

export type WalletInfo = { publicKey: string; secret: string };

/** Get or create a non-custodial Stellar wallet stored in localStorage. */
export function getOrCreateWallet(): WalletInfo {
  if (typeof window === "undefined") {
    return { publicKey: "", secret: "" };
  }
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

/** Native XLM balance for an account. Returns 0 if unfunded. */
export async function getXlmBalance(publicKey: string): Promise<number> {
  try {
    const account = await horizon.loadAccount(publicKey);
    const native = account.balances.find((b: any) => b.asset_type === "native");
    return native ? Number(native.balance) : 0;
  } catch {
    return 0;
  }
}

/** Fund a testnet account via Friendbot. */
export async function fundTestnet(publicKey: string): Promise<boolean> {
  if (IS_PUBLIC) return false;
  try {
    const r = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`);
    return r.ok;
  } catch {
    return false;
  }
}

/** Send native XLM. Returns the transaction hash. */
export async function sendXlm(opts: {
  secret: string;
  destination: string;
  amount: string; // string to preserve precision
  memo?: string;
}): Promise<string> {
  const source = Keypair.fromSecret(opts.secret);
  const account = await horizon.loadAccount(source.publicKey());
  const fee = await horizon.fetchBaseFee().catch(() => 100);

  const builder = new TransactionBuilder(account, {
    fee: String(fee),
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    Operation.payment({
      destination: opts.destination,
      asset: Asset.native(),
      amount: opts.amount,
    })
  );

  if (opts.memo) builder.addMemo(Memo.text(opts.memo.slice(0, 28)));
  const tx = builder.setTimeout(120).build();
  tx.sign(source);
  const res = await horizon.submitTransaction(tx);
  return (res as any).hash;
}
