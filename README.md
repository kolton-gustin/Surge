# Surge

A React and Vite workout tracker using Supabase for user accounts, workout sessions, progress, and goals.

## Multi-user setup

1. In Supabase, enable **Authentication → Providers → Email**. Configure the Site URL and any redirect URLs for your local and deployed app. Email confirmation is supported: users will be asked to confirm before their first sign-in when it is enabled.
2. Run the original database scripts in their documented order, then run [supabase-multi-user.sql](./supabase-multi-user.sql). This replaces the old public-anonymous policies with authenticated, owner-only policies.
3. If this is an upgrade from the former single-user app, use the commented migration block at the end of `supabase-multi-user.sql` to assign the existing data to its original account. Until then, old rows are deliberately invisible.

Authentication is persisted by Supabase in the browser, so a user stays signed in on a device until they explicitly sign out. New accounts begin with an empty, private library and can build separate Lift and Run workout schedules in **Edit**. Run templates can include an optional planned distance; completed runs record distance in miles and average pace in minutes per mile. The four existing Lift workouts remain legacy data; assign them to the original account with the migration block described above.

## Editable workout library

Run [supabase-workout-library.sql](./supabase-workout-library.sql) once in the Supabase SQL Editor (after `supabase-anon-access.sql`). It creates the editable workout-template tables and seeds them with the original four routines. After that, use **Edit** on the Today screen to add, change, or delete workouts and configure their exercises, sets, rep range, and rest timer. Past completed workouts remain unchanged.

Run [supabase-update-workout-plan.sql](./supabase-update-workout-plan.sql) afterward to apply the current four-workout plan and enable paired superset exercises.

## Run locally

1. Copy `.env.example` to `.env.local` and fill in the two values.
2. Run `npm ci` and `npm run dev`.

## Deploy on Vercel

1. Commit and push this project to GitHub. The current remote is `kolton-gustin/Surge`.
2. In Vercel, choose **Add New → Project**, import that repository, and leave the root directory at the repository root.
3. Select the **Vite** framework preset. The build command is `npm run build` and the output directory is `dist`; Vercel normally detects these automatically.
4. Before deploying, add these project environment variables for **Production** (and **Preview** if you plan to use preview deployments):
   - `VITE_SUPABASE_URL` — the value from your local `.env.local`.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — the value from your local `.env.local`.
5. Deploy. On the live URL, unlock the app, start and finish a workout, and check that Progress and Goals load and update.

Vite reads `VITE_*` values when it builds the app. If you change one in Vercel later, redeploy so the new value reaches the site. Local `.env.local`, `dist/`, and `.vercel/` are ignored by Git.

[Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) · [Vercel environment variables](https://vercel.com/docs/environment-variables)
