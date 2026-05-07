# Lumens Major Overhaul — Plan

This is a large multi-file change. I'll batch it into one cohesive shipment. Real on-chain logic stays Stellar-only; FIAT and non-XLM coins are mock UI per your selection.

## 1. Quick fixes
- **Sign-in page**: remove the Email OTP tab/section in `src/routes/auth.tsx`.
- **Contact request duplicate-key error**: change `find.tsx` send-request flow to upsert on `(from_user, to_user)` and detect existing reverse request — show "Already requested" instead of crashing.
- **RLS hardening**: tighten policies on `contact_requests`, `conversations`, `conversation_members`, `messages`, `stellar_contacts`, `wallet_transactions`, `profiles` so the `anon` role is denied. Currently policies target `authenticated` only, but linter wants explicit `TO authenticated` + revoke from anon. Migration will re-create policies with explicit role and add `REVOKE ... FROM anon`.

## 2. Global UI shell
- New **Plus Jakarta Sans** font (Google Fonts) applied globally via `src/styles.css`.
- New **bottom navigation bar** component with 5 tabs: Home, Chat, **Scan** (center, raised), Wallet, Profile. Modern Lucide icons (`Home`, `MessageCircle`, `ScanLine`, `Wallet`, `User`). Glassmorphic background (`backdrop-blur`, translucent surface).
- Profile tab: tapping it **expands a glassmorphic drawer leftward** showing Profile, Analytics (credit score placeholder), Settings, Keys, Sign out.
- Replaces existing top `ModeToggle`. Existing `/` (Chat) and Wallet view become routes `/` and `/wallet`.

## 3. Wallet redesign (clone structure from lumens-cashflow)
New `/wallet` route layout:
- Greeting header ("Hello {name}") with bell icon.
- **Total Balance** big number (sum of mock FIAT + XLM converted via static rate).
- **4 action tiles**: Transfer, Deposit, Withdraw, Swap (modern monotone icons: `ArrowUpRight`, `ArrowDownLeft`, `Banknote`, `ArrowLeftRight`).
- **Recipients** tiles row (from `stellar_contacts` favorites + "Add New").
- **Recent Activities** list (from `wallet_transactions`).

### Sub-pages
- `/wallet/transfer` — pick recipient → asset (XLM real, others mock) → amount → **PIN prompt** → execute. First-time use prompts **PIN setup** (stored hashed in `user_pins` table).
- `/wallet/deposit` — list of supported currencies: HBAR, XVG, XRP, XLM, ADA, SOL, BTC, USDT, USDC, ETH + FIAT. Each shows a deposit address/QR (XLM real, others mocked with placeholder address).
- `/wallet/withdraw` — pick FIAT wallet (defaults to user phone as wallet ID), amount, simulated.
- `/wallet/swap` — swap UI (FIAT↔Crypto mock; XLM↔trustlined assets uses real Stellar **path payment** via SDK).

## 4. PIN system
- New `user_pins` table (user_id, pin_hash, created_at). RLS owner-only.
- `src/lib/pin.ts` — SHA-256 hashing, set/verify helpers.
- `<PinDialog>` component reused for setup + verification before any transfer/withdraw/swap.

## 5. Profile & Settings
- `/profile` — avatar (tap to upload), display name, DOB, phone, email. Save to `profiles` (add `date_of_birth`, `email` columns). Avatar uploaded to new `avatars` storage bucket; URL saved to `profiles.avatar_url`.
- `/settings` — toggle theme, change PIN, export/import keys (link to existing `/keys`), sign out, language placeholder.
- `/analytics` — placeholder credit score / spending chart (stub).

## 6. QR Scan-to-Pay
- Install `html5-qrcode`.
- `/scan` route — opens camera, scans QR. If QR is a Stellar address payload, navigate to `/wallet/transfer` prefilled. Otherwise show raw payload + "Mark as paid" recording a `wallet_transactions` row.
- `/receive` already exists — extend to render Stellar payment QR (address + amount + memo) using existing QR lib if present, else add `qrcode` package.
- Scan tab is accessible from both Chat and Wallet via the bottom nav center button.

## 7. Cleanup
- Drop the existing top `ModeToggle` from page chrome (replaced by bottom nav).
- Update `WelcomeSplash` logo size remains as is.

## Database migration (single migration)
```sql
-- 1. Profile fields
alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists email text;

-- 2. PIN
create table user_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table user_pins enable row level security;
create policy "owner manages pin" on user_pins for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Avatars storage bucket
insert into storage.buckets (id, name, public) values ('avatars','avatars',true)
  on conflict do nothing;
create policy "avatars public read" on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy "users upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Tighten RLS — restrict to authenticated only, revoke from anon
revoke all on contact_requests, conversations, conversation_members, messages,
  stellar_contacts, wallet_transactions, profiles, user_pins from anon;

-- 5. Unique upsert handling for contact_requests already exists via constraint;
--    app code now upserts.
```

## Files to create / edit
**Create**: `src/components/BottomNav.tsx`, `src/components/PinDialog.tsx`, `src/components/CryptoIcon.tsx`, `src/lib/pin.ts`, `src/lib/avatar.ts`, `src/routes/wallet.tsx`, `src/routes/wallet.transfer.tsx`, `src/routes/wallet.deposit.tsx`, `src/routes/wallet.withdraw.tsx`, `src/routes/wallet.swap.tsx`, `src/routes/profile.tsx`, `src/routes/settings.tsx`, `src/routes/analytics.tsx`, `src/routes/scan.tsx`, plus migration.
**Edit**: `src/styles.css` (font + glass tokens), `src/routes/__root.tsx` (mount BottomNav), `src/routes/index.tsx` (drop ModeToggle), `src/routes/auth.tsx` (remove email OTP), `src/routes/find.tsx` (fix duplicate request), `src/components/WalletView.tsx` (replace with new wallet layout or deprecate).
**Install**: `html5-qrcode`, `qrcode` (+ types).

## What this does NOT do
- No real custody for non-XLM coins; balances/deposits/withdrawals for HBAR/XVG/XRP/ADA/SOL/BTC/USDT/USDC/ETH and all FIAT are simulated UI only.
- No KYC, no real banking rails.
- Credit score on Analytics is a placeholder.

Reply **proceed** to ship it, or tell me what to drop/change.