# Gym App

A React and Vite workout tracker using Supabase for workout sessions, progress, and goals.

## Editable workout library

Run [supabase-workout-library.sql](./supabase-workout-library.sql) once in the Supabase SQL Editor (after `supabase-anon-access.sql`). It creates the editable workout-template tables and seeds them with the original four routines. After that, use **Edit** on the Today screen to add, change, or delete workouts and configure their exercises, sets, rep range, and rest timer. Past completed workouts remain unchanged.

## Run locally

1. Copy `.env.example` to `.env.local` and fill in the three values.
2. Run `npm ci` and `npm run dev`.

## Deploy on Vercel

1. Commit and push this project to GitHub. The current remote is `kolton-gustin/Surge`.
2. In Vercel, choose **Add New → Project**, import that repository, and leave the root directory at the repository root.
3. Select the **Vite** framework preset. The build command is `npm run build` and the output directory is `dist`; Vercel normally detects these automatically.
4. Before deploying, add these project environment variables for **Production** (and **Preview** if you plan to use preview deployments):
   - `VITE_SUPABASE_URL` — the value from your local `.env.local`.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — the value from your local `.env.local`.
   - `VITE_PASSCODE` — the passcode you want for the deployed app.
5. Deploy. On the live URL, unlock the app, start and finish a workout, and check that Progress and Goals load and update.

Vite reads `VITE_*` values when it builds the app. If you change one in Vercel later, redeploy so the new value reaches the site. Local `.env.local`, `dist/`, and `.vercel/` are ignored by Git.

[Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) · [Vercel environment variables](https://vercel.com/docs/environment-variables)
