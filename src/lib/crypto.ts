// Lightweight end-to-end encryption helpers using WebCrypto.
// Each user generates an ECDH P-256 keypair on first launch. Public key is published
// to their profile; private key NEVER leaves the device (stored in localStorage).
// Messages are encrypted per-recipient using a shared AES-GCM key derived from ECDH.

const PRIV_KEY = "lumens.privKey.v1";
const PUB_KEY = "lumens.pubKey.v1";

async function exportJwk(key: CryptoKey) {
  return JSON.stringify(await crypto.subtle.exportKey("jwk", key));
}
async function importPriv(jwk: string) {
  return crypto.subtle.importKey("jwk", JSON.parse(jwk), { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
}
async function importPub(jwk: string) {
  return crypto.subtle.importKey("jwk", JSON.parse(jwk), { name: "ECDH", namedCurve: "P-256" }, true, []);
}

export async function ensureKeypair(): Promise<{ publicKey: string }> {
  let pub = localStorage.getItem(PUB_KEY);
  let priv = localStorage.getItem(PRIV_KEY);
  if (!pub || !priv) {
    const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
    priv = await exportJwk(kp.privateKey);
    pub = await exportJwk(kp.publicKey);
    localStorage.setItem(PRIV_KEY, priv);
    localStorage.setItem(PUB_KEY, pub);
  }
  return { publicKey: pub };
}

async function deriveAes(theirPubJwk: string): Promise<CryptoKey> {
  const myPriv = await importPriv(localStorage.getItem(PRIV_KEY)!);
  const theirPub = await importPub(theirPubJwk);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPub },
    myPriv,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptFor(theirPubJwk: string, plaintext: string) {
  const key = await deriveAes(theirPubJwk);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { iv: b64(iv.buffer), ct: b64(ct) };
}

export async function decryptFrom(theirPubJwk: string, payload: { iv: string; ct: string }) {
  const key = await deriveAes(theirPubJwk);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(payload.iv) },
    key,
    unb64(payload.ct),
  );
  return new TextDecoder().decode(pt);
}
