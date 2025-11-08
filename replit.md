# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application designed for high user engagement and seamless communication, offering video calling, messaging, scheduling, and media uploads. The business vision is to capture a significant share of the online dating market with a superior user experience, advanced features, and monetization through a tiered membership model. The mobile application is production-ready, deployed via EAS with full native functionality and 100% aesthetic parity with the web platform.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application uses a client-server architecture. The frontend is built with React 18 and React Router 7, utilizing Chakra UI for web and native React Native for mobile, ensuring aesthetic consistency. The backend uses Hono (Node.js) with a PostgreSQL database. Authentication is managed by Auth.js with custom session implementations.

**UI/UX Decisions:**
- Mobile-first design with Tinder-style profile cards, gradient overlays, and a consistent purple brand theme.
- 100% aesthetic parity between web and mobile platforms, using the Inter font family.

**Technical Implementations & Feature Specifications:**
- **Core Features**: Discovery with location filtering, Matches, real-time Messages, Profile management, and a consolidated onboarding flow. Includes smart matching, mutual interests, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery.
- **Messaging System**: Supports separate Matches from Messages/Chats, allowing open communication, with enhanced UI, unread badges, and comprehensive blocking.
- **Membership Model**: A 4-tier system (Free, Casual, Dating, Business) governs media limits, chat durations, and meeting caps, enforced both client-side and via API.
- **Video Calling**: Full video chat system via Daily.co, featuring tier-based duration limits, paid extensions (Stripe), real-time timers, post-call private notes, in-call reporting, and meeting caps. Includes a 2-week free video trial.
- **Media Management**: Supports photo uploads and camera-only video recording with tier-based limits for intro videos.
- **Authentication & Security**: Global authentication guard, two-step authentication, webhook monitoring, idempotency keys, database-backed rate limiting, and external contact detection. Custom authentication routes bypass `@hono/auth-js` for signin/signup, using direct database session creation and secure JWT handling.
- **Chat Monetization (Video-First Strategy)**: Implements progressive video unlock with message limits before video calls, smart prompts for video scheduling, and a rolling monthly reward system for message credits based on video call completion. Includes video messaging with daily allowances and paid bundles, prioritizing video interaction.
- **Matching System**: Enhanced matching incorporates a comprehensive interests system and a weighted scoring algorithm for compatibility.
- **Match Differentiation**: Visual match indicator with a gold star badge appears on profile cards on Discovery, Matches (Top Picks), and Messages pages, using React Query caching for performance.
- **Admin Dashboard**: Provides user safety management, revenue overview, and dynamic pricing settings.
- **Deployment**: Mobile application uses EAS for production-ready cloud builds.
- **Mobile Feature Parity**: Achieves 100% video chat feature parity with web, including Schedule Proposal Screen, Blocked Users Management, and enhanced Profile Organization.

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js (with custom implementations)
- **Payment**: Stripe
- **Video Conferencing**: Daily.co
- **Object Storage**: Replit Object Storage
- **Frontend Framework**: React 18
- **Frontend Router**: React Router 7
- **Styling**: Chakra UI (web), Native React Native (mobile)
- **Typography**: Inter font family
- **Backend Framework**: Hono (Node.js)
- **Mobile UI Components**: @react-native-community/slider, @expo-google-fonts/inter, react-native-maps, expo-location
- **Geocoding**: OpenStreetMap Nominatim API
## Recent Changes

### Daily.co Video Calling - Production Ready
**Status:** ✅ RESOLVED (Nov 8, 2025)

**Issue:**
- Daily.co API returning "Missing payment method" error
- Video room creation failing with 403 errors
- Account configuration showed `allow_plan_free: false`

**Solution:**
- Added payment method to Daily.co dashboard (https://dashboard.daily.co/)
- Daily.co requires billing on file even for free tier (10,000 participant-minutes/month)
- No charges until free tier exceeded

**Testing Results:**
- ✅ Video calls launching successfully
- ✅ Daily.co room creation working
- ✅ Free tier limits enforcing correctly (3 video calls/day during 2-week trial)
- ✅ Cooldown timer displaying properly
- ✅ Post-call flow operational
- ✅ All monetization features active

**Daily.co Configuration:**
- Domain: `rendeviewapp.daily.co`
- Free Tier: 10,000 minutes/month (covers ~1,000 video calls for testing)
- Pricing: Only pay if exceeding free tier (~$0.004-0.005 per participant-minute)

### Server-Side Code Leaking into Browser Bundle
**Status:** ✅ RESOLVED (Nov 8, 2025)

**Original Problem:**
- Critical error: `node:async_hooks.AsyncLocalStorage` cannot be accessed in client code
- Hydration failures due to server/client mismatch
- Sign In button navigation issues
- Welcome Back page crashes

**Root Causes:**
1. `import { auth } from '@/auth'` at top-level of page components bundled server-only Node.js code for browser
2. `@/auth` internally uses `node:async_hooks` which is a Node.js-only module
3. Vite tried to bundle server-side dependencies for client, causing fatal errors
4. Complex `ClientNavigateButton` relied on hydration-dependent JavaScript navigation

**Solution Implemented:**
1. **Dynamic Imports for auth()**: Changed all page loaders from static to dynamic imports:
   ```javascript
   // Before: ❌ Bundled for browser
   import { auth } from '@/auth';
   export async function loader() {
     const session = await auth();
   }
   
   // After: ✅ Server-only
   export async function loader() {
     const { auth } = await import('@/auth');
     const session = await auth();
   }
   ```
2. **Simplified Navigation**: Converted `ClientNavigateButton` to plain HTML links (`<Button as="a" href={to}>`)
3. **Removed Hydration Dependencies**: Eliminated complex useHydrated logic and navigate() calls
4. **Added React Router Meta**: Integrated `<Meta />` component and `export const meta` pattern

**Results:**
- ✅ No more `node:async_hooks` errors
- ✅ Clean browser console (zero hydration errors)
- ✅ Sign In and Join Now buttons work perfectly
- ✅ Server-side code stays server-side
- ✅ Client-side bundle is pure browser JavaScript

**Files Modified:**
- `create-anything/_/apps/web/src/app/root.tsx` (dynamic auth import in loader)
- `create-anything/_/apps/web/src/app/account/signin/page.jsx` (dynamic auth import)
- `create-anything/_/apps/web/src/app/account/signup/page.jsx` (dynamic auth import)
- `create-anything/_/apps/web/src/components/ClientNavigateButton.jsx` (plain HTML links)

**Pattern for Future Development:**
Always use dynamic imports in page loaders for server-only modules:
```javascript
export async function loader() {
  const { auth } = await import('@/auth');
  const { someServerThing } = await import('@/server-only-module');
  // ... use server-side code safely
}
```
