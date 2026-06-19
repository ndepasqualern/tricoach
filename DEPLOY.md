# TriCoach — Deployment Guide

## What you need
- A computer (Mac, Windows, or Linux)
- Node.js installed (free — download at nodejs.org, get the LTS version)
- A GitHub account (free — github.com)
- A Vercel account (free — vercel.com, sign up with your GitHub account)

---

## Step 1 — Install Node.js (if you haven't already)
1. Go to https://nodejs.org
2. Download the **LTS** version
3. Run the installer — click through all defaults
4. Open Terminal (Mac) or Command Prompt (Windows)
5. Type `node --version` and press Enter — you should see something like `v20.11.0`

---

## Step 2 — Put the project on GitHub
1. Go to https://github.com and sign in
2. Click the **+** button (top right) → **New repository**
3. Name it `tricoach`
4. Leave it **Private** if you want, or Public — either works
5. Click **Create repository**
6. GitHub will show you setup instructions. Follow the **"…or create a new repository on the command line"** section:

Open Terminal / Command Prompt and run these commands one at a time:

```bash
cd /path/to/tricoach       # navigate to the tricoach folder you downloaded
npm install                # installs React, Vite, and the PWA plugin (~1 min)
git init
git add .
git commit -m "Initial TriCoach build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tricoach.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 3 — Deploy to Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Find `tricoach` in the list and click **Import**
4. Vercel auto-detects Vite — you don't need to change any settings
5. Click **Deploy**
6. Wait ~60 seconds — Vercel builds and deploys automatically
7. You'll get a URL like `https://tricoach.vercel.app` (or a random name — you can customize it)

---

## Step 4 — Test it on your phone
1. Open the URL on your iPhone or Android
2. **iPhone:** Tap the Share button (box with arrow) → **Add to Home Screen** → **Add**
3. **Android:** Tap the browser menu → **Install App** (or "Add to Home Screen")
4. It now appears on your home screen like a real app
5. Open it — it works offline too

---

## Step 5 — Send it to someone else
Just send them the Vercel URL (e.g. `https://tricoach.vercel.app`).

They open it in their browser, tap Add to Home Screen, and they have their own completely separate copy — their data is stored on their phone, not shared with yours.

---

## Making updates later
If you ever want to update the app (e.g. after more changes from Claude):

1. Replace `src/App.jsx` with the new version
2. Run in Terminal:
```bash
git add .
git commit -m "Update app"
git push
```
3. Vercel automatically re-deploys within 30 seconds. The URL stays the same.

---

## Custom URL (optional)
If you want `tricoach.yourdomain.com` instead of the Vercel URL:
1. In Vercel dashboard → your project → **Settings → Domains**
2. Add your custom domain and follow the DNS instructions

Or you can rename the Vercel project URL for free:
1. Vercel dashboard → project → **Settings → General**
2. Change the project name to get e.g. `tricoach-app.vercel.app`

---

## File structure reference
```
tricoach/
├── src/
│   ├── App.jsx          ← The entire app lives here
│   └── main.jsx         ← React entry point (don't touch)
├── public/
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── index.html           ← HTML shell (don't touch)
├── vite.config.js       ← Build config + PWA setup (don't touch)
├── package.json         ← Dependencies (don't touch)
├── vercel.json          ← Vercel deployment config (don't touch)
└── .gitignore
```

The only file you ever need to touch is `src/App.jsx`.
