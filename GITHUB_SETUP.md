# GitHub Setup Instructions

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `reading-companion` (or your preferred name)
   - **Description**: "A vocabulary learning app with reading integration and spaced repetition"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 2: Connect and Push

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/reading-companion.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH

If you prefer SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/reading-companion.git
git branch -M main
git push -u origin main
```

## What's Already Committed

✅ All source code
✅ Configuration files
✅ Documentation (README, feature suggestions, etc.)
✅ Database migration files
✅ .gitignore (excludes node_modules, .env, etc.)

## What's NOT Committed (by design)

❌ `.env.local` - Contains your secrets (API keys, database URLs)
❌ `node_modules/` - Dependencies (will be installed via npm install)
❌ `.next/` - Build files
❌ Database migrations folder

## Next Steps After Pushing

1. **Add Environment Variables to GitHub Secrets** (if using GitHub Actions):
   - Go to repository → Settings → Secrets and variables → Actions
   - Add your environment variables

2. **Deploy to Vercel**:
   - Connect your GitHub repo to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy!

3. **Share Your Project**:
   - Add topics/tags to your repo
   - Write a good README description
   - Consider adding a LICENSE file

## Troubleshooting

**If you get authentication errors:**
- Use GitHub CLI: `gh auth login`
- Or use a Personal Access Token instead of password
- Or set up SSH keys

**If branch name is different:**
- Check current branch: `git branch`
- Rename if needed: `git branch -M main`

