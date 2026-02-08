# Deploy Odicam / StockPILE (first version, free)

This guide covers hosting the **frontend** and **Supabase** backend for free.

---

## 1. Prerequisites

- A **Supabase** account (free tier): [supabase.com](https://supabase.com)
- A **Git** repo (e.g. GitHub) with this code
- Your Supabase **Project ID** and **anon (public) key** from:  
  Supabase Dashboard → Project Settings → API

---

## 2. Backend: Supabase (free tier)

- Create a project at [app.supabase.com](https://app.supabase.com).
- In **Authentication → URL Configuration**, set **Site URL** to your future frontend URL (e.g. `https://your-app.vercel.app`). Add the same under **Redirect URLs** if you use redirects.
- Deploy the Edge Function (API) from this repo:

```bash
cd app
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set SERVICE_ROLE_KEY="your-service-role-key"
npx supabase functions deploy server
```

- Replace `YOUR_PROJECT_REF` (Dashboard → Project Settings → General) and set `SERVICE_ROLE_KEY` (Project Settings → API → service_role secret) in a secure way (e.g. GitHub Actions secrets or CI env, not in the doc).

---

## 3. Frontend: build and env

From the `app` folder:

```bash
cd app
npm ci
```

Set these **before** building (they are baked into the bundle):

- `VITE_SUPABASE_PROJECT_ID` = your Supabase project ref (e.g. `llbzxfbyuspriitmjjho`)
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon/public key

Then build:

```bash
npm run build
```

Output is in `app/dist/`. The app expects to call the API at  
`https://<VITE_SUPABASE_PROJECT_ID>.supabase.co/functions/v1/server`.

---

## 4. Host the frontend (free options)

Use **one** of the options below. Configure the same env vars on the host as in step 3.

### A. Vercel (recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** → import your repo.
3. **Root Directory**: set to `app` (so Vercel runs commands from `app/`).
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Environment Variables** (Project Settings → Environment Variables):
   - `VITE_SUPABASE_PROJECT_ID` = your project ref
   - `VITE_SUPABASE_ANON_KEY` = your anon key
7. Deploy. Your app will be at `https://<project>.vercel.app`.

**SPA routing:** Vercel serves `index.html` for unknown paths by default for static exports; if you use client-side routing, add a `vercel.json` in `app/` with:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### B. Netlify

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub.
2. **Add new site** → **Import an existing project** → choose the repo.
3. **Base directory**: `app`
4. **Build command**: `npm run build`
5. **Publish directory**: `app/dist`
6. **Environment variables** (Site settings → Build & deploy → Environment):
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy.

**SPA routing:** add `app/public/_redirects` (or in Netlify UI: Redirects) with:

```
/*    /index.html   200
```

---

### C. Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select repo, then:
   - **Production branch**: e.g. `main`
   - **Build command**: `cd app && npm ci && npm run build`
   - **Build output directory**: `app/dist`
3. **Environment variables** (Settings → Variables):
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_ANON_KEY`
4. Save and Deploy.

**SPA routing:** in **Settings → Functions and redirects**, add a redirect rule so all routes serve `index.html` (e.g. single-page app rule if available, or a `_redirects` file in `app/dist` after build).

---

## 5. After first deploy

1. In Supabase, set **Site URL** and **Redirect URLs** to your live frontend URL (e.g. `https://your-app.vercel.app`).
2. Test login and main flows; confirm the app calls `https://<project-ref>.supabase.co/functions/v1/server` and that the Edge Function is deployed (step 2).

---

## 6. Optional: `base` for subpath or Electron

The app uses `base: './'` in `app/vite.config.ts` (for Electron/Capacitor). For **web-only** hosting at the root of a domain, you can leave it as is; if you ever host at a subpath (e.g. `https://example.com/app/`), set in `vite.config.ts`:

```ts
base: '/app/',  // or your subpath
```

Then rebuild and redeploy.

---

## Summary

| What        | Where / How                          |
|------------|---------------------------------------|
| Backend    | Supabase (Auth + Edge Functions)     |
| Frontend   | Vercel / Netlify / Cloudflare Pages  |
| Env vars   | `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY` |
| Build      | From `app/`: `npm run build` → `dist`|

All of the above can be done on **free tiers** for a first version.
