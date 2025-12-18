# Deployment Guide

## Quick Start Deployment to Vercel

### Prerequisites

1. GitHub account
2. Vercel account (free tier works)
3. Neon Postgres database
4. Clerk account for authentication
5. Translation API key (DeepL recommended)

### Step-by-Step Deployment

#### 1. Prepare Your Code

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin your-github-repo-url
git push -u origin main
```

#### 2. Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy your connection string (it looks like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
4. Keep this for step 4

#### 3. Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. In the dashboard, go to "API Keys"
4. Copy:
   - Publishable Key (starts with `pk_`)
   - Secret Key (starts with `sk_`)
5. In "Paths", configure:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/library`
   - After sign-up: `/library`

#### 4. Set Up Translation API (DeepL)

1. Go to [deepl.com](https://www.deepl.com/pro-api)
2. Sign up for a free account (500,000 characters/month free)
3. Copy your API key

#### 5. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)

#### 6. Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... (from Clerk)
CLERK_SECRET_KEY=sk_test_... (from Clerk)
DATABASE_URL=postgresql://... (from Neon)
DEEPL_API_KEY=your_deepl_key (from DeepL)
TRANSLATION_PROVIDER=deepL
```

**Important**: Make sure to add these for all environments (Production, Preview, Development)

#### 7. Configure Clerk for Production

1. In Clerk dashboard, go to "Paths"
2. Add your Vercel domain to allowed origins:
   - `https://your-app.vercel.app`
   - `https://your-custom-domain.com` (if you have one)

#### 8. Deploy and Run Migrations

1. Click "Deploy" in Vercel
2. Wait for deployment to complete
3. Once deployed, run database migrations:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
npm run db:push
```

Alternatively, you can run migrations directly in your Neon dashboard SQL editor using the schema from `db/schema.ts`.

#### 9. Verify Deployment

1. Visit your Vercel URL
2. Sign up for a new account
3. Test the flow:
   - Add a book (paste some text)
   - Open the book
   - Select a word to see translation
   - Save a word
   - Check Vocabulary page
   - Go to Review page

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `DATABASE_URL` | Neon Postgres connection string | Yes |
| `DEEPL_API_KEY` | DeepL API key | Yes (if using DeepL) |
| `TRANSLATION_PROVIDER` | `deepL`, `libreTranslate`, or `google` | Yes |
| `LIBRETRANSLATE_API_URL` | LibreTranslate API URL | If using LibreTranslate |
| `LIBRETRANSLATE_API_KEY` | LibreTranslate API key | If using LibreTranslate |

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct in Vercel
- Check Neon dashboard for connection limits
- Ensure SSL mode is enabled (`?sslmode=require`)

### Clerk Authentication Issues

- Verify publishable and secret keys match
- Check that Vercel domain is in Clerk's allowed origins
- Ensure sign-in/sign-up paths are correct

### Translation API Issues

- Verify API key is correct
- Check API quota/limits
- Review translation provider logs

### Build Errors

- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs in Vercel dashboard

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Authentication works (sign-in/sign-up)
- [ ] Can create books
- [ ] Can read books and select text
- [ ] Translations work
- [ ] Can save vocabulary
- [ ] Flashcards appear in Review page
- [ ] SM-2 scheduling works correctly

## Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Clerk allowed origins with your custom domain

## Monitoring

- Vercel provides built-in analytics
- Check Neon dashboard for database usage
- Monitor translation API usage in provider dashboard
- Set up error tracking (Sentry, etc.) for production

