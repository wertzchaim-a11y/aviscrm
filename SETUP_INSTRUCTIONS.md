# Avi's CRM — Deployment Guide
## Total time: ~15 minutes

---

## STEP 1 — Set up your Supabase database (5 min)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Open the file `SUPABASE_SCHEMA.sql` from this folder
5. Copy the entire contents and paste into the SQL editor
6. Click **"Run"** (green button)
7. You should see "Success. No rows returned" — that means it worked!

---

## STEP 2 — Enable Magic Link login (1 min)

1. In Supabase, go to **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. Go to **Authentication → URL Configuration**
4. Under "Site URL", you'll update this after Step 4 with your Vercel URL

---

## STEP 3 — Deploy to Vercel (5 min)

1. Go to **https://vercel.com** and sign in
2. Click **"Add New Project"**
3. Click **"Import from Git"** — OR — click **"Deploy without Git"**

### If using "Deploy without Git" (easiest — no GitHub needed):
1. Click **"Deploy without Git"**  
2. Drag and drop the entire **`aviscrm`** folder onto the upload area
3. Vercel will detect it's a React app automatically

### Environment variables (IMPORTANT — do this before deploying):
In Vercel, before clicking the final Deploy button, scroll to **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `REACT_APP_SUPABASE_URL` | `https://rdokuofrrxyahfrdrsyf.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkb2t1b2Zycnh5YWhmcmRyc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTI5NDIsImV4cCI6MjA2MzgyODk0Mn0.eyJpc3MiOiJzdXBhYmFzZSYmFsZ` |

> ⚠️ The anon key above is truncated — use the full key from your Supabase dashboard (Settings → API → anon public)

4. Click **Deploy**
5. Wait ~2 minutes — Vercel will give you a URL like `https://aviscrm-xxxx.vercel.app`

---

## STEP 4 — Connect your domain to Supabase (1 min)

1. Copy your Vercel URL (e.g. `https://aviscrm-xxxx.vercel.app`)
2. Go back to Supabase → **Authentication → URL Configuration**
3. Set **Site URL** to your Vercel URL
4. Under **Redirect URLs**, add your Vercel URL

---

## STEP 5 — Log in for the first time

1. Open your Vercel URL in any browser
2. Enter `wertzchaim@gmail.com`
3. Check your email for the magic link
4. Click it — you're in!

---

## STEP 6 — Install on iPhone as an app

1. Open your Vercel URL in **Safari** on your iPhone
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "Avi's CRM" and tap **Add**
5. It will appear as an app icon on your home screen
6. Open it — it runs fullscreen like a native app
7. First time opening from home screen, tap "Allow" when asked about notifications

---

## Adding team members

Just tell them to go to your Vercel URL and enter their email. 
To restrict who can sign in, go to Supabase → Authentication → and you can invite specific emails only.

---

## Your URLs
- **App:** (your Vercel URL after deployment)
- **Supabase dashboard:** https://supabase.com/dashboard/project/rdokuofrrxyahfrdrsyf

---

## Need help?
If anything goes wrong, the most common issue is the environment variables not being set correctly in Vercel. Double-check both values are pasted in full with no spaces.
