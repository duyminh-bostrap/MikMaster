# Prompt: thêm bán license MikMaster vào web Portfolio (Store)

Dán nguyên phần trong khung dưới vào một phiên Claude Code mở trong thư mục repo **Mike-Portfolio**
(`https://github.com/duyminh-bostrap/Mike-Portfolio`). Prompt viết bằng tiếng Anh để agent làm SQL/code chính xác; giao diện web vẫn theo ngôn ngữ của site.

---

```text
You are working in the repo "Mike-Portfolio" (Vite + React 19 + TypeScript + Tailwind + react-router-dom + @supabase/supabase-js, deployed on Vercel as a static SPA; see vercel.json, SETUP.md, supabase/schema.sql, src/pages/Store.tsx, ProductDetail.tsx, Admin.tsx, src/lib/auth.tsx, src/lib/supabase.ts).

GOAL
Turn the existing Store into a place where customers buy licenses for my desktop app "MikMaster" (AV projector control software), pay online, and see/manage their license in an account page.

LICENSE MODEL (like TouchDesigner / Resolume): a purchase is a LIFETIME license that includes updates for a period (default 12 months). While the update period is running the customer can use every new release. After it ends the software keeps working forever, but only with versions released on or before the last update day; newer releases need a renewal. Renewing extends the update period from max(today, current end) by the plan's months. There is no subscription lock-out. The same Supabase project is ALSO the account backend of the MikMaster app, so one login works on the website and in the app, and a purchase made here must unlock the app automatically.

BEFORE WRITING ANY CODE
1. Read the files above and summarise the current architecture (auth flow, roles/RLS, how products are stored and rendered, how Admin works) in 10 lines.
2. Ask me these questions and WAIT for answers (propose the default in brackets):
   a. Payment provider. Options: a merchant-of-record such as Lemon Squeezy / Paddle / Polar [recommended: works for sellers in Vietnam, handles VAT], PayOS / VNPay / MoMo (VietQR, domestic), Stripe (only if I have an eligible entity), or manual bank transfer approved by me in Admin. [Default: build the provider-agnostic layer + "manual bank transfer" first, then one real provider I choose.]
   b. Plans and prices: names, duration_days (or lifetime), max projectors, price + currency (VND / USD). [Default: Pro Monthly, Pro Yearly, Lifetime; prices left as placeholders in a seed file.]
   c. Site languages for the new pages (Vietnamese / English / both) — follow what the site already does.
   d. Refund policy text and legal pages needed (Terms, Privacy, Refunds).
3. Work on a new branch `feature/license-store`. Small, reviewable commits. Do not touch the 3D hero / gallery components.

THE MIKMASTER CONTRACT (must not break — the app depends on it)
The MikMaster app already uses this schema (from its supabase/schema.sql). Do NOT rename or change the meaning of these objects; you may ADD columns/tables.
- table public.trials (machine_code text primary key, user_id uuid unique -> auth.users, started_at timestamptz). One free 30-day trial per account AND per machine. Never write to it from the website.
- table public.entitlements (user_id uuid primary key -> auth.users on delete cascade, paid_until timestamptz, perpetual boolean not null default false, updates_until timestamptz, note text), RLS enabled, policy "read own entitlement" (select using auth.uid() = user_id). If it does not exist yet, create it like that (create table if not exists + alter table ... add column if not exists for perpetual and updates_until).
- functions public.claim_trial(p_machine text) and public.get_entitlement(p_machine text) (security definer, granted to `authenticated`). get_entitlement returns json {state: 'paid'|'trial'|'expired'|'other_machine'|'machine_used'|'none', expires_at, server_now}; state = 'paid' when (perpetual and updates_until is not null) — the response then carries updates_until and the APP compares its own build/release date with it — or, for legacy subscription rows, when paid_until > now(). So: a completed purchase = upsert entitlements SET perpetual = true, updates_until = greatest(now(), coalesce(updates_until, now())) + plan update months. Never write paid_until for lifetime plans. Nothing else is needed for the app to unlock.
- Machine code format (regex): ^[0-9A-F]{4}(-[0-9A-F]{4}){3}$ — shown to the user in the app under Settings -> License.
- Offline license keys (strings starting MIKM2-… or MIKM1.…) are signed with a PRIVATE Ed25519 key that lives ONLY on my own computer. NEVER put that key, or any signing capability, on the website/Vercel/Supabase. Offline keys are issued by me manually (node scripts/license.mjs in the MikMaster repo). The website only (1) collects the customer's machine code on request, (2) lets me paste the issued key into the order in Admin, (3) shows that key to the customer on their account page.

WHAT TO BUILD
A. Database — one migration file supabase/add-licenses.sql (idempotent, runnable in the Supabase SQL editor, reuse the existing profiles.role = 'admin' RLS pattern):
   - license_plans (id uuid, product_id -> products, name, description, update_months int default 12 (length of the included/renewal update period; every plan is a lifetime license), kind text check in ('new','renewal') (renewal only allowed for accounts that already own a lifetime license), max_projectors int default 0 (0 = unlimited), price numeric, currency text, active bool, sort int). Public read of active plans; admin write.
   - orders (id uuid, user_id, plan_id, amount, currency, status: pending|paid|failed|cancelled|refunded, provider text, provider_ref text unique, machine_code text null with the regex check, created_at, paid_at, note). RLS: a customer reads only their own rows; admin reads all; NO insert/update policy for customers (rows are created and changed only through the functions below).
   - license_keys (id, order_id, user_id, key text, machine_code text, issued_at, note). RLS: customer reads own; admin manages.
   - function create_order(p_plan uuid, p_machine text default null) — security definer, authenticated: takes price/currency/duration from license_plans (NEVER from the client), validates machine code, inserts a pending order for auth.uid(), returns the order row.
   - function apply_paid_order(p_order uuid, p_provider_ref text) — security definer, EXECUTE granted ONLY to service_role: idempotent (a second call for a paid order is a no-op), sets status paid + paid_at, upserts entitlements: perpetual = true and updates_until = greatest(now(), coalesce(updates_until, now())) + update_months; stores note. Renewal orders only extend updates_until.
   - function admin_mark_order_paid(p_order uuid) — security definer, checks profiles.role = 'admin' inside, calls the same logic (for manual bank transfer).
   - function admin_grant_entitlement(p_email text, p_days int, p_note text) and admin_revoke_entitlement(p_email text) — admin only.
   - refunds: apply_refund(p_order uuid) (service_role or admin) sets status refunded and reduces/clears the entitlement it granted.
B. Server side (Vercel serverless functions in /api — the SPA has no backend today):
   - IMPORTANT gotcha: vercel.json currently rewrites everything except /assets/ to /index.html; change the rewrite so /api/* is NOT rewritten.
   - api/checkout.ts (POST): verify the caller's Supabase JWT (Authorization: Bearer), call create_order via the user's JWT (not service_role), create the provider checkout session/payment link with order id in metadata, return the URL. Validate input strictly, return generic errors.
   - api/webhook.ts (POST): verify the provider's signature (raw body), map event -> order id, call apply_paid_order with the SERVICE ROLE key, be idempotent, always answer 2xx for known-duplicate events. Log without secrets/PII.
   - a small provider adapter interface (createCheckout, verifyWebhook, parseEvent) with two implementations: "manual" (bank transfer instructions + pending order) and the provider I choose in step 2a.
   - Secrets only as Vercel env vars WITHOUT the VITE_ prefix: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, provider API key + webhook secret. Update .env.example and SETUP.md (never commit real values).
C. Frontend (match the current visual language, use the existing supabase client/auth context, keep bundle small — lazy-load the new pages):
   - Store / ProductDetail: for the MikMaster product show the plans (price, duration, projector limit), a "Free 30 days: sign up and download the app" note, and a "Buy" button. Not signed in -> go to /login and come back. Optional machine-code field with a hint: "Only needed if you want an offline key. In MikMaster: Settings -> License -> Machine code". Show the download links (GitHub Releases of the MikMaster repo: MikMaster-Setup.exe, MikMaster-Setup.pkg, MikMaster.dmg).
   - /checkout/success and /checkout/cancel pages (poll the order status for a few seconds because the webhook may arrive slightly later).
   - /account (protected route): current license status ("Lifetime license — updates until <date>" with the latest MikMaster release included in it, or none) and a Renew updates button, orders list with status, offline keys with a copy button, machine code instructions, sign out. Explain: "Sign in to the MikMaster app with this same email and password."
   - Admin.tsx: new tab "Orders & licenses": list/filter orders, mark manual orders as paid, paste an issued offline key into an order, grant/revoke entitlement by email, refund. Reuse existing form/table components.
D. Tests and verification (do these, report results):
   - `npm run build` passes (tsc -b + vite build).
   - Run the SQL in a scratch Supabase project or via a local Postgres; prove with SQL tests/queries that: a customer cannot read others' orders, cannot insert/update orders or entitlements directly, cannot call apply_paid_order/admin_* (permission denied), create_order ignores any client-side price, apply_paid_order is idempotent, renewal extends from the end date, and the lifetime license never locks (updates_until in the past still returns state 'paid').
   - Unit-test the webhook signature verification and idempotency (vitest is fine to add).
   - Manual checklist in the PR description: sign up -> buy (manual flow) -> admin marks paid -> /account shows paid -> the MikMaster app (Settings -> License -> Check now) shows the paid state.

SECURITY RULES (non-negotiable)
- service_role key, provider secrets and any private signing key never reach the browser bundle, git history, logs or client-visible errors.
- All prices/durations are decided server-side. All new tables have RLS enabled with explicit policies; deny by default.
- Webhooks: verify signature on the raw body, reject old timestamps if the provider supports it, idempotent by provider_ref.
- Do not log emails/passwords/tokens. Rate-limit checkout (per user) at least with a simple DB-backed counter or provider-side limits.
- Keep the existing admin model (profiles.role). Do not add any way for a customer to become admin.

OUTPUT
Open a PR (or push the branch) with: the migration, /api functions, adapter + chosen provider, frontend pages, Admin tab, updated SETUP.md (step-by-step: run add-licenses.sql, set Vercel env vars, register the webhook URL https://<domain>/api/webhook, test mode checklist), and a short "How MikMaster picks this up" section. List anything you could not verify.
```

---

## Ghi chú cho bạn

- Web và app phải dùng **cùng project Supabase** (cùng URL và anon key) thì tài khoản và gói trả phí mới khớp. Chạy `supabase/schema.sql` của MikMaster **trước**, rồi `add-licenses.sql` của web.
- Web chỉ bán **gói theo tài khoản** (cập nhật `entitlements.paid_until`). Key offline vẫn do bạn cấp tay bằng `node scripts/license.mjs`, khóa bí mật không bao giờ lên server.
- Hiện app chưa dùng giới hạn số máy chiếu theo gói (gói trả phí = không giới hạn). Nếu bạn muốn gói khác nhau theo số máy, cần sửa thêm hàm `get_entitlement` và phần app; nói tôi khi cần.
