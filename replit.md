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
- **Video History Requirement**: Instant video calling (green dot) requires users to have completed at least one video call together. First-time callers must schedule via the scheduling system. Enforced with database validation and composite index for performance.
- **Invitation-Based Calling**: Both web and mobile use invitation flow with caller/callee handshake. Caller sees "Waiting for Response..." UI, callee receives modal with Accept/Decline. Polling every 3s for real-time updates.

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

### Video History Requirement & Invitation Flow - Web/Mobile Parity
**Status:** ✅ COMPLETE (Nov 9, 2025)

**Feature:**
- Instant video calling now requires completed video history between users
- First video call must be scheduled through the scheduling system
- Invitation-based calling with caller/callee handshake replaces direct room creation

**Implementation:**
1. **Backend Validation**:
   - Messages API returns `hasVideoHistory: true/false` for each conversation
   - Create invitation API validates video history, returns 403 if none exists
   - Database query: `SELECT FROM video_sessions WHERE state='ended' AND ended_at IS NOT NULL`
   - Added composite index: `idx_video_sessions_history_check` on (state, ended_at, caller_id, callee_id)

2. **Mobile UI**:
   - Green dot (clickable) only shows if user is online AND hasVideoHistory
   - If online but no history: Shows "Online • Schedule first call • Profile"
   - If offline: Shows "Offline • Tap to view profile"

3. **Web UI** (100% Parity with Mobile):
   - Same green/gray status dot logic as mobile
   - Replaced direct `/api/video/room/create` with invitation flow
   - Added invitation polling (React Query, 3s intervals, scoped queryKey)
   - Created IncomingCallModal component (Chakra UI)
   - Modal states: Confirmation → Waiting → Accepted/Declined
   - `outgoingInvitationPolled` flag prevents modal flicker during polling gap

4. **Invitation Flow**:
   - Caller taps green dot → confirmation modal → creates invitation → waiting state
   - Polling returns invitation → callee sees incoming modal with Accept/Decline
   - Accept: both navigate to `/video/call`
   - Decline: caller sees toast with reason
   - Cancel: caller can cancel pending invitation
   - Expire: auto-cleanup after timeout

**Error Handling**:
- If user tries instant call without history: navigates to schedule page after toast
- Hydration on page refresh: reopens modal with waiting state
- Stale invitation cleanup: clears when poll reports cancellation

**Database Changes**:
- Index: `CREATE INDEX idx_video_sessions_history_check ON video_sessions(state, ended_at, caller_id, callee_id)`

**Files Modified**:
- `apps/web/src/app/api/messages/[matchId]/route.js` - Added hasVideoHistory field
- `apps/web/src/app/api/video/invitations/create/route.js` - Added video history validation
- `apps/mobile/src/app/(tabs)/messages/[matchId].jsx` - Updated green dot logic
- `apps/web/src/app/(app)/messages/[conversationId]/page.jsx` - Full invitation flow implementation

### Onboarding Authentication Bug - Critical Fix
**Status:** ✅ RESOLVED (Nov 9, 2025)

**Problem:**
- All three onboarding pages (`/onboarding/consent`, `/onboarding/membership`, `/onboarding/profile`) redirected unauthenticated users to `/onboarding/welcome`
- 401 (Unauthorized) errors blocked the entire new user signup flow
- Profile page stuck in infinite "Loading..." state

**Root Cause:**
1. OnboardingGuard called `/api/profile` which returns 401 for unauthenticated users
2. Without `allowUnauthenticated={true}`, guard redirected to `/onboarding/welcome`
3. Profile page's useQuery threw errors on 401, causing infinite loading

**Solution:**
1. Added `allowUnauthenticated={true}` to all three onboarding pages
2. Modified `/onboarding/profile` useQuery to handle 401 gracefully:
   - Returns empty profile data `{ user: {}, media: [] }` on 401
   - Added `retry: false` to prevent React Query retries

**Testing Results:**
- ✅ `/onboarding/consent` loads correctly with "Data Consent" form (Step 2 of 4)
- ✅ `/onboarding/membership` loads correctly with "Choose your plan" (Step 3 of 4)
- ✅ `/onboarding/profile` loads correctly with profile form (Step 4 of 4)
- ✅ No more infinite loading states
- ✅ Expected 401 errors are benign and handled gracefully

**Files Modified:**
- `apps/web/src/app/(app)/onboarding/consent/page.jsx` - Added allowUnauthenticated
- `apps/web/src/app/(app)/onboarding/membership/page.jsx` - Added allowUnauthenticated
- `apps/web/src/app/(app)/onboarding/profile/page.jsx` - Added allowUnauthenticated + 401 handling

**Impact:**
New user signup flow is now fully functional. Users can complete onboarding without authentication errors.

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
