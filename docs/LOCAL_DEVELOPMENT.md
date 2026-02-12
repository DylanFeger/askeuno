# Local Development & Preview Guide

## Quick Start: Preview Your App Locally

Unlike Replit's built-in preview pane, in Cursor you'll run the app locally and open it in your browser.

### Step 1: Install Dependencies (if not done already)

```bash
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the root directory with your configuration:

```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# Session & Security
SESSION_SECRET=your_random_secret_key_here
ENCRYPTION_KEY=your_64_character_hex_key_here

# OpenAI (optional)
OPENAI_API_KEY=your_openai_key

# Lightspeed (if testing integration)
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed

# Stripe (if testing payments)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# AWS (if using S3)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket_name

# Sentry (optional, for error tracking)
SENTRY_DSN=your_sentry_dsn

# App Configuration
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5000
```

### Step 3: Run the Development Server

```bash
npm run dev
```

This will:
- Start the Express backend server
- Start the Vite dev server for the React frontend
- Enable hot-reload (changes update automatically)
- Serve the app at `http://localhost:5000`

### Step 4: Open in Browser

Open your browser and go to:
```
http://localhost:5000
```

**That's it!** You now have a local preview of your app, just like Replit's preview pane.

---

## Development Workflow

### Making Changes

1. **Edit files** in Cursor
2. **Save** the files
3. **See changes instantly** - Vite hot-reloads the frontend automatically
4. **Backend changes** - The server will restart automatically (tsx watches for changes)

### Hot Reload

- **Frontend (React)**: Changes update instantly without page refresh
- **Backend (Express)**: Server restarts automatically on file changes
- **No manual refresh needed** for most changes

### Stopping the Server

Press `Ctrl+C` in the terminal where `npm run dev` is running.

---

## Port Configuration

The app runs on **port 5000** by default in development.

To change the port:
1. Set `PORT` environment variable: `PORT=3000 npm run dev`
2. Or update `.env` file: `PORT=3000`

---

## Troubleshooting

### "Port already in use"
If port 5000 is already in use:
```bash
# Find what's using the port
lsof -i :5000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
PORT=3000 npm run dev
```

### "Cannot connect to database"
- Check your `DATABASE_URL` in `.env`
- Ensure your database is accessible
- For Neon PostgreSQL, check the connection string format

### "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Frontend not loading
- Check that Vite dev server started successfully
- Look for errors in the terminal
- Try clearing browser cache

### Backend not responding
- Check server logs in terminal
- Verify all environment variables are set
- Check database connection

---

## Development vs Production

### Development Mode (`npm run dev`)
- Hot reload enabled
- Detailed error messages
- Source maps for debugging
- Vite dev server for frontend
- No minification

### Production Mode (`npm run build && npm start`)
- Optimized and minified
- No hot reload
- Production error handling
- Static files served from `dist/`

---

## Testing Features Locally

### Test Lightspeed Integration
1. Set `LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed` in `.env`
2. Update Lightspeed Developer Portal with the same redirect URI
3. Test the OAuth flow locally

### Test File Uploads
- Upload files via the `/upload` page
- Files are stored locally (or in S3 if configured)

### Test Database Connections
- Connect to local PostgreSQL or remote database
- Test queries through the chat interface

---

## Browser DevTools

Just like in Replit, you can:
- Open browser DevTools (`F12` or `Cmd+Option+I`)
- Inspect network requests
- Debug JavaScript
- View console logs
- Test responsive design

---

## Next Steps

Once you've tested locally and everything works:
1. **Commit your changes** to git
2. **Deploy to production** (see deployment guide)
3. **Test on production** at askeuno.com

---

**Note**: Local development is faster and easier than Replit's preview because:
- ✅ Instant hot-reload
- ✅ Full browser DevTools access
- ✅ Better debugging experience
- ✅ No external dependencies on Replit's infrastructure
