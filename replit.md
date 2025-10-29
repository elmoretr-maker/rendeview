# Create Anything - Dating App

## Overview
This is a comprehensive dating/matching application with video calling, messaging, and scheduling features. The application was originally created on Create.xyz and is built with React Router 7, Hono server, and PostgreSQL (Neon).

## Project Structure
- **Web App**: `create-anything/_/apps/web` - The main web application (React Router + Hono)
- **Mobile App**: `create-anything/_/apps/mobile` - Expo/React Native mobile app (not configured)

## Technology Stack
- **Frontend**: React 18, React Router 7, TailwindCSS
- **Backend**: Hono (Node.js server), React Router Hono Server
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js with credentials provider
- **Payment**: Stripe (placeholder key configured)
- **Video**: Daily.co integration (requires DAILY_API_KEY)

## Setup Status
✅ Node.js 22 installed
✅ Dependencies installed
✅ Database schema created
✅ Port configured to 5000
✅ Environment variables configured
✅ Admin user seeded
✅ Workflow configured

## Environment Variables
Required environment variables are configured in `.env`:
- `AUTH_SECRET`: Generated authentication secret
- `STRIPE_SECRET_KEY`: Placeholder key (for development)
- `DATABASE_URL`: Auto-configured by Replit

Optional environment variables (can be added for full functionality):
- `STRIPE_WEBHOOK_SECRET`: For Stripe webhook verification
- `DAILY_API_KEY`: For video calling features
- `NEXT_PUBLIC_PROJECT_GROUP_ID`: Create.xyz project ID
- `NEXT_PUBLIC_CREATE_API_BASE_URL`: Create.xyz API base URL

## Database Schema
The following tables have been created:
- **Auth Tables**: `auth_users`, `auth_accounts`, `auth_sessions`, `auth_verification_token`
- **App Tables**: `admin_settings`, `matches`, `messages`, `blockers`, `profile_media`, `likes`, `schedule_proposals`, `video_sessions`

## Admin Access
- **Email**: trelmore.staff@gmail.com
- **Password**: ADMIN

## Running the Application
The application runs automatically via the configured workflow. To manually restart:
```bash
cd create-anything/_/apps/web && npm run dev
```

## How to Use
1. Visit `/account/signin` to sign in with the admin account (or create a new account at `/account/signup`)
2. The root path `/` redirects to the signin page
3. After signing in, you'll have access to the full application features

## Known Issues / Notes
- The app expects some Create.xyz specific environment variables but works without them
- Stripe is configured with a placeholder key - payment features will use fallback mode
- Daily.co video features require a valid API key to function
- React hydration warnings appear in browser console (SSR/client mismatch) - these are cosmetic and don't affect functionality
- LSP shows TypeScript module resolution warnings but these are false positives - the app compiles and runs correctly

## Recent Changes (October 29, 2025)
### Initial Setup
- Imported from GitHub
- Installed Node.js 22 and dependencies
- Configured port to 5000 for Replit
- Configured deployment for VM target

### Database Reset (October 29, 2025)
- Created brand new Neon PostgreSQL database to resolve authentication issues
- Dropped all existing tables and recreated complete schema with 12 tables
- Fixed Auth.js configuration by adding `basePath: '/api/auth'` to initAuthConfig
- Generated new AUTH_SECRET and configured AUTH_URL in environment
- Seeded database with admin user (trelmore.staff@gmail.com / ADMIN) and 2 test users
- Verified authentication endpoint returns HTTP 200
- Successfully tested login flow with HTTP 302 redirect and session token creation

### Discovery Page Implementation (October 29, 2025 - Latest)
- Created web-based Discovery page at `/discovery` (file: `(app)/discovery/page.jsx`)
- Adapted from React Native mobile app to React Router web app
- Converted React Native components to HTML with TailwindCSS styling
- Implemented profile card display with like/discard functionality
- Added authentication checks and error handling with toast notifications
- Updated routing system to support Next.js-style route groups (parentheses-wrapped folders)
- Route groups like `(app)` are now omitted from URLs but preserved in file structure
- Verified page loads correctly and handles unauthenticated users
