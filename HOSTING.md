# Laptop Hosting Guide

Use this guide to run the Interactive Conway Name Wall from any laptop on the same Wi-Fi as the phones scanning the QR code.

## What You Need

- Node.js 20 or newer.
- A Supabase project.
- The laptop and visitor phones on the same Wi-Fi network.
- An admin email address that is listed in `ADMIN_EMAILS`.

## 1. Install The App

```bash
git clone https://github.com/e1daru/gol-codex.git
cd gol-codex
npm install
```

If the project is already on the laptop, open the existing project folder and run:

```bash
npm install
```

## 2. Set Up Supabase

In Supabase, create or open the project for the event.

Open **SQL Editor** and run these migrations in order:

```text
supabase/migrations/20260622000000_create_submissions.sql
supabase/migrations/20260628000000_create_app_settings.sql
supabase/migrations/20260703000000_enable_auto_approve_by_default.sql
```

The first migration creates the submissions table. The second migration creates the admin setting used by the auto-approve toggle. The third migration makes public submissions live-by-default.

## 3. Configure Supabase Auth

In Supabase, go to **Authentication -> Providers -> Email** and make sure email magic links / OTP sign-in are enabled.

Then go to **Authentication -> URL Configuration** and add the URLs you will use:

```text
http://localhost:3000/admin
http://YOUR-LAPTOP-IP:3000/admin
```

If you later deploy to Vercel, add the production admin URL too.

## 4. Create `.env.local`

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in these values:

```bash
NEXT_PUBLIC_APP_URL=http://YOUR-LAPTOP-IP:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAILS=host@example.com,producer@example.com
SUBMISSION_TOKEN_SECRET=replace-with-random-secret
IP_HASH_SECRET=replace-with-different-random-secret
```

Find the laptop IP:

```bash
ipconfig getifaddr en0
```

Generate the two random secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Important: `NEXT_PUBLIC_APP_URL` controls the QR code. If the laptop IP changes, update `NEXT_PUBLIC_APP_URL` and restart the dev server.

## 5. Run On The Laptop

Start the app:

```bash
npm run dev -- --hostname 0.0.0.0
```

Open these pages:

```text
Display: http://YOUR-LAPTOP-IP:3000/display
Submit:  http://YOUR-LAPTOP-IP:3000/submit
Admin:   http://YOUR-LAPTOP-IP:3000/admin
```

Keep the display page open on the projector or main screen. Phones should scan the QR code on `/display`.

## 6. Admin Login With Supabase Email Link

Open `/admin` on the host laptop and enter an email address from `ADMIN_EMAILS`.

Supabase sends a magic login link to that email. Open that confirmation link in the same browser that will control the admin page.

If the email arrives on another device, copy the full Supabase confirmation link and send it to the host laptop, then open it there. The redirect URL inside the link must be allowed in Supabase Auth URL Configuration.

After login, the admin can:

- Watch submission analytics.
- Approve or reject pending submissions if manual review is enabled.
- Send text directly to the display.
- Send Codex logo variants.
- Change display speed.
- Enable or disable auto-approve. It is enabled by default.

## 7. Event Checklist

- Laptop and phones are on the same Wi-Fi.
- `NEXT_PUBLIC_APP_URL` uses the laptop IP, not `localhost`.
- Supabase Auth redirect URLs include the laptop IP admin URL.
- All migrations have been run.
- `/display` shows a QR code with the laptop IP.
- `/api/display/submissions` returns a JSON response.
- Admin login works before guests arrive.

## Troubleshooting

If phones cannot open the QR URL, check that they are on the same Wi-Fi and that the laptop firewall allows incoming connections to port `3000`.

If the QR code has the wrong IP, update `NEXT_PUBLIC_APP_URL` in `.env.local` and restart the dev server.

If admin login says the redirect is not allowed, add the exact `/admin` URL to Supabase Auth URL Configuration.

If submissions do not appear on the display, confirm Supabase keys are set, the migrations ran, and auto-approve is enabled or the name was manually approved.
