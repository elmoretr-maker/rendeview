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

## Known Issues / Notes
- The app expects some Create.xyz specific environment variables but works without them
- Stripe is configured with a placeholder key - payment features will use fallback mode
- Daily.co video features require a valid API key to function
- The auth session endpoint returns 400 errors when not logged in (this is expected behavior)

## Recent Changes (October 29, 2025)
- Imported from GitHub
- Installed Node.js 22 and dependencies
- Created complete database schema
- Configured port to 5000 for Replit
- Generated AUTH_SECRET
- Added placeholder Stripe key
- Seeded admin user and default settings
- Configured deployment for VM target
