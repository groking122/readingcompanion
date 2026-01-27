# Localhost Troubleshooting Guide

If `localhost` doesn't work, here are the most common causes and solutions:

## Quick Checks

### 1. Is the server actually running?

Check your terminal for:
```
✓ Ready in X.Xs
○ Compiling / ...
```

If you see errors, the server isn't running properly.

### 2. What port is it using?

By default, Next.js runs on port **3000**. Check your terminal output:
```
- Local:        http://localhost:3000
```

If it says a different port (like 3001, 3002, etc.), use that port instead.

---

## Common Issues & Solutions

### Issue 1: Port 3000 is Already in Use

**Symptoms:**
- Error: `Port 3000 is already in use`
- Server won't start

**Solutions:**

**Option A: Kill the process using port 3000**

**Windows (PowerShell):**
```powershell
# Find the process
netstat -ano | findstr :3000

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

**Windows (Command Prompt):**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Option B: Use a different port**

Modify `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

Then access: `http://localhost:3001`

**Option C: Let Next.js pick an available port**

```json
{
  "scripts": {
    "dev": "next dev -p 0"
  }
}
```

---

### Issue 2: Firewall Blocking Port

**Symptoms:**
- Server starts but browser can't connect
- Connection timeout

**Solutions:**

**Windows:**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Find "Node.js" and enable it for Private networks
4. Or temporarily disable firewall to test

**Alternative:** Use `127.0.0.1` instead of `localhost`:
```
http://127.0.0.1:3000
```

---

### Issue 3: Server Binding to Wrong Address

**Symptoms:**
- Server starts but only shows `127.0.0.1` not `localhost`
- Can't access via `localhost`

**Solution:**

Explicitly bind to localhost:
```json
{
  "scripts": {
    "dev": "next dev -H localhost"
  }
}
```

Or bind to all interfaces (if you need network access):
```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0"
  }
}
```

---

### Issue 4: Windows Hosts File Issue

**Symptoms:**
- `localhost` doesn't resolve
- `127.0.0.1` works but `localhost` doesn't

**Solution:**

Check your hosts file: `C:\Windows\System32\drivers\etc\hosts`

It should contain:
```
127.0.0.1       localhost
::1             localhost
```

If not, add those lines (requires admin privileges).

---

### Issue 5: Antivirus/Windows Defender Blocking

**Symptoms:**
- Server starts but browser shows "connection refused"
- No errors in terminal

**Solution:**

1. Add exception for Node.js in Windows Defender
2. Temporarily disable antivirus to test
3. Check Windows Defender logs for blocked connections

---

### Issue 6: Browser Cache/DNS Issues

**Symptoms:**
- Old version loads
- Can't connect even though server is running

**Solutions:**

1. **Hard refresh:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Clear browser cache**
3. **Try incognito/private mode**
4. **Try a different browser**
5. **Flush DNS cache:**

**Windows:**
```cmd
ipconfig /flushdns
```

---

### Issue 7: Environment Variables Not Loading

**Symptoms:**
- Server starts but app crashes
- Database/auth errors

**Solution:**

Make sure `.env.local` exists in the root directory and restart the server:
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

---

### Issue 8: Next.js Cache Issues

**Symptoms:**
- Server starts but shows errors
- Build issues

**Solution:**

Clear Next.js cache:
```bash
# Delete .next folder
rm -rf .next
# Windows: rmdir /s .next

# Restart server
npm run dev
```

---

## Diagnostic Steps

### Step 1: Check if server is listening

**Windows:**
```powershell
netstat -ano | findstr :3000
```

You should see:
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    <PID>
```

### Step 2: Test with curl or PowerShell

**PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:3000
```

**Command Prompt:**
```cmd
curl http://localhost:3000
```

If this works but browser doesn't, it's a browser issue.

### Step 3: Check browser console

Open browser DevTools (F12) and check:
- Console for errors
- Network tab for failed requests
- See what URL it's trying to access

### Step 4: Try different URLs

Try these in order:
1. `http://localhost:3000`
2. `http://127.0.0.1:3000`
3. `http://[::1]:3000` (IPv6)
4. `http://0.0.0.0:3000` (usually doesn't work)

---

## Recommended Fix: Update package.json

Add explicit hostname and port configuration:

```json
{
  "scripts": {
    "dev": "next dev -H localhost -p 3000",
    "dev:alt": "next dev -H 127.0.0.1 -p 3001"
  }
}
```

This ensures:
- Server binds to `localhost`
- Uses port 3000 (or falls back to 3001 if busy)
- Explicit configuration prevents ambiguity

---

## Still Not Working?

1. **Check terminal output** - Look for actual error messages
2. **Check Windows Event Viewer** - Look for blocked connections
3. **Try different port** - Use `-p 3001` or `-p 8080`
4. **Check if Node.js is installed correctly:**
   ```bash
   node --version
   npm --version
   ```
5. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## Quick Test Script

Create `test-server.js`:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is working!');
});

server.listen(3000, 'localhost', () => {
  console.log('Test server running on http://localhost:3000');
});
```

Run: `node test-server.js`

If this works but Next.js doesn't, the issue is with Next.js configuration.
