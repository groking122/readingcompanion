# Service Worker Causing Localhost Issues - Quick Fix

## Problem

The error `ERR_FAILED` and `a redirected response was used for a request whose redirect mode is not "follow"` is caused by the service worker intercepting requests in development mode.

## Quick Fix (Choose One)

### Option 1: Unregister Service Worker in Browser (Fastest)

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in the left sidebar
4. Find your service worker for `localhost:3000`
5. Click **Unregister**
6. Refresh the page (Ctrl+Shift+R for hard refresh)

### Option 2: Disable Service Worker in Development

The code has been updated to only register service workers in production. Restart your dev server:

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Option 3: Clear All Site Data

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Clear storage** in the left sidebar
4. Check all boxes
5. Click **Clear site data**
6. Refresh the page

### Option 4: Use Incognito Mode

Open `http://localhost:3000` in an incognito/private window (service workers are disabled there).

---

## Why This Happens

Service workers cache requests and can interfere with Next.js hot reloading and development server redirects. They're meant for production (offline support), not development.

## Permanent Fix

The code has been updated to automatically disable service workers in development mode. After restarting your server, service workers will only register in production builds.
