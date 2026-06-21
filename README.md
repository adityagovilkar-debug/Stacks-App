# Stacks 📚

Your whole library, finally in order — a personal book catalog **and** reading-habit
tracker with a risograph-zine aesthetic. Catalog every book (with an ISBN camera
scanner), classify them every way imaginable, keep a to-read queue, rate + review +
bookmark, log your daily reading, and watch the habit grow with charts and a streak.

Installable as a **PWA** — add it to your phone home screen to scan barcodes, and open
it on the desktop for the big-screen library + charts. Everything syncs through Supabase.

## Features

- **Add books** — live ISBN barcode scanner (rear camera), ISBN lookup, or manual entry.
  Lookup auto-fills via Google Books (Open Library fallback). **Batch mode** to rip
  through a whole shelf.
- **Classify every way** — genre / mood / theme / free tags, Dewey or genre shelving
  codes, series, format, your own collections, and a physical location.
- **Reading state** — unread / reading / read, with **re-read** counts, star ratings
  (half-steps), a **bookmark** (current page), and a **review** per book.
- **Queue** — a reorderable to-read list; "Start reading" moves a book into progress.
- **Habit tracking** — log daily reading (pages + optional minutes); your bookmark
  advances automatically, and minutes feed a **reading-speed** trend.
- **Progress** — streaks, an activity heatmap, pages over time, books finished, speed
  trend, genre + rating breakdowns, top authors, and yearly-goal progress.
- **Shelf map** — see every book grouped by where it physically lives in your home.

## Stack

Next.js 16 (App Router, TS) · Tailwind v4 · Supabase (Postgres + Auth + owner-only RLS)
· TanStack Query (+ IndexedDB offline) · @zxing barcode scanning · Recharts · PWA.

## Setup

1. **Create a Supabase project** (free tier) at [supabase.com](https://supabase.com).
2. **Run the schema** — open the SQL Editor and run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It creates
   all tables, owner-only RLS, and a trigger that seeds a starter location, two
   collections, and common genre tags on signup.
3. **Env vars** — copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...        # Project Settings → API
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # the publishable / anon key
   ```
4. **Auth redirect** — in Supabase → Authentication → URL Configuration, add your dev
   and prod URLs (`http://localhost:3030`, your Vercel URL) to the redirect allow-list.

## Develop

```bash
npm install
npm run dev          # http://localhost:3030
npm run icons        # re-rasterize PWA icons after editing public/icons/icon.svg
npm run build        # production build
```

(There's also a `stacks` entry in the repo's `.claude/launch.json` for the preview tool.)

## Deploy (Vercel)

Push to GitHub, import the repo in Vercel (root = this folder; `vercel.json` pins the
Next.js framework), set the two `NEXT_PUBLIC_SUPABASE_*` env vars, and deploy. Update
`NEXT_PUBLIC_SITE_URL` to the live URL.

## Branding

App name, tagline, and brand color live in [`lib/brand.ts`](lib/brand.ts). The full riso
palette (pink / blue / yellow) and design tokens are in
[`app/globals.css`](app/globals.css).
