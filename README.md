# Interactive Conway Name Wall

A public event web app where visitors scan a QR code, submit a name, and a host approves it into a fullscreen Conway's Game of Life display. Approved names are stamped as monochrome pixel text and then evolve under standard B3/S23 rules.

## Routes

- `/display` - fullscreen Life canvas with QR code and local display controls.
- `/submit` - mobile-first name submission flow.
- `/admin` - Supabase Auth sign-in, approval queue, and display controls.

## Setup

For a complete laptop-hosting walkthrough, including Supabase Auth magic links and QR setup, see [HOSTING.md](./HOSTING.md).

1. Create a Supabase project.
2. Run `supabase/migrations/20260622000000_create_submissions.sql`.
3. Run `supabase/migrations/20260628000000_create_app_settings.sql`.
4. Enable email magic links in Supabase Auth.
5. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS`
   - `SUBMISSION_TOKEN_SECRET`
   - `IP_HASH_SECRET`
6. Install and run:

```bash
npm install
npm run dev
```

## Deployment

Deploy to Vercel with the same environment variables. Set `NEXT_PUBLIC_APP_URL` to the public Vercel or custom domain so the QR code points phones to the right place.

## Testing

```bash
npm run test
npm run typecheck
npm run build
```

The Playwright e2e smoke tests can run against the local dev server:

```bash
npm run test:e2e
```

## Notes

- Public users never receive Supabase credentials beyond the anon key used for realtime reads.
- Submission writes and moderation updates go through server API routes using the service role key.
- Raw IPs are not stored. IPs and client tokens are HMAC-hashed server-side.
- `/display` can run in demo mode without Supabase configured, but live submissions require Supabase environment variables.
