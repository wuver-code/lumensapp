import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, formatEther, parseEther } from "viem";
import { mainnet } from "viem/chains";

const PK_KEY = "lumens.wallet.pk";
const ADDR_KEY = "lumens.wallet.addr";

export type WalletInfo = { address: `0x${string}`; privateKey: `0x${string}` };

/** Get or create a non-custodial EVM wallet stored in localStorage. */
export function getOrCreateWallet(): WalletInfo {
  if (typeof window === "undefined") {
    return { address: "0x0000000000000000000000000000000000000000", privateKey: "0x0" as `0x${string}` };
  }
  let pk = localStorage.getItem(PK_KEY) as `0x${string}` | null;
  let addr = localStorage.getItem(ADDR_KEY) as `0x${string}` | null;
  if (!pk || !addr) {
    pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    addr = account.address;
    localStorage.setItem(PK_KEY, pk);
    localStorage.setItem(ADDR_KEY, addr);
  }
  return { address: addr, privateKey: pk };
}

export function shortAddress(addr?: string | null) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export const publicClient = createPublicClient({ chain: mainnet, transport: http() });

export async function getEthBalance(address: `0x${string}`): Promise<number> {
  try {
    const wei = await publicClient.getBalance({ address });
    return Number(formatEther(wei));
  } catch {
    return 0;
  }
}

export { parseEther, formatEther };
