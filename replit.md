# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application designed for high user engagement, offering video calling, messaging, scheduling, and media uploads. The primary goal is to capture a significant share of the online dating market by providing a superior user experience, advanced features, and a tiered membership monetization model. The mobile application is production-ready, deployed via EAS, ensuring full native functionality and complete aesthetic parity with the web platform.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application employs a client-server architecture. The frontend leverages React 18 and React Router 7, using Chakra UI for web and native React Native for mobile to maintain aesthetic consistency. The backend is built with Hono (Node.js) and uses a PostgreSQL database. Authentication is handled by Auth.js with custom session implementations.

**UI/UX Decisions:**
- Mobile-first design featuring Tinder-style profile cards, gradient overlays, and a consistent purple brand theme.
- 100% aesthetic parity across web and mobile platforms, utilizing the Inter font family.

**Technical Implementations & Feature Specifications:**
- **Core Features**: Includes discovery with location filtering, matches, real-time messaging, profile management, and a unified onboarding process. Features smart matching, mutual interests, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery.
- **Messaging System**: Supports distinct "Matches" from "Messages/Chats," with an enhanced UI, unread badges, and comprehensive blocking capabilities.
- **Membership Model**: A 4-tier system (Free, Casual, Dating, Business) dictates media limits, chat durations, and meeting caps, enforced both client-side and via API.
- **Video Calling**: A full video chat system powered by Daily.co, incorporating tier-based duration limits, paid extensions (Stripe), real-time timers, post-call private notes, in-call reporting, and meeting caps. Includes a 2-week free video trial.
- **Media Management**: Supports photo uploads and camera-only video recording, with tier-based limits for intro videos.
- **Authentication & Security**: Features a global authentication guard, two-step authentication, webhook monitoring, idempotency keys, database-backed rate limiting, and external contact detection. Custom authentication routes bypass `@hono/auth-js` for signin/signup, directly creating database sessions and managing secure JWTs.
- **Chat Monetization (Video-First Strategy)**: Implements progressive video unlock with message limits before video calls, smart prompts for video scheduling, and a rolling monthly reward system for message credits based on video call completion. Includes video messaging with daily allowances and paid bundles, prioritizing video interaction.
- **Matching System**: Enhanced matching incorporates a comprehensive interests system and a weighted scoring algorithm for compatibility.
- **Match Differentiation**: Visual match indicator with a gold star badge appears on profile cards on Discovery, Matches (Top Picks), and Messages pages, utilizing React Query caching for performance.
- **Admin Dashboard**: Provides tools for user safety management, revenue overview, and dynamic pricing settings.
- **Deployment**: The mobile application uses EAS for production cloud builds.
- **Mobile Feature Parity**: Achieves 100% video chat feature parity with the web, including Schedule Proposal Screen, Blocked Users Management, and enhanced Profile Organization.
- **Video History Requirement**: Instant video calling (green dot) requires users to have completed at least one video call together. First-time callers must schedule via the scheduling system, enforced with database validation and a composite index.
- **Invitation-Based Calling**: Both web and mobile platforms use an invitation flow with caller/callee handshake, including polling for real-time updates and accept/decline functionality.

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

### Video-First Feature Verification (Jan 27, 2026)
**Status:** ✅ VERIFIED

**Extension/Continuation Flow:**

1. **2-Minute Warning Trigger:**
   - Location: `apps/web/src/app/(app)/video/call/page.jsx` lines 562, 724-739
   - Logic: `showExtendButton = remaining <= 120` displays "Extend Call" button
   - Button shows at 2-minute mark with cost and duration info

2. **Real-Time Acceptance Notification:**
   - Location: `apps/web/src/app/(app)/video/call/page.jsx` lines 210-219
   - Polling interval: 500ms during pending extensions for real-time updates
   - Responder receives modal with Accept/Decline buttons

3. **Instant Billing Integration:**
   - Extension request: `/api/video/sessions/[id]/extensions/route.js`
   - Accept triggers Stripe PaymentIntent: `/api/video/sessions/[id]/extensions/[extId]/route.js`
   - Payment confirmation: `/api/video/sessions/[id]/extensions/[extId]/confirm/route.js`
   - Timer updates in real-time without dropping call

4. **Timer Control & Navigation:**
   - Timer visible at top-right with Clock icon
   - Color changes to red when `remaining <= 60` or in grace period
   - End Call button updates session state and shows post-call note modal
   - All exit paths (End Call, Report, Block & End, Save/Skip Note) navigate to `/discovery`

5. **High-Fidelity UI:**
   - Uses Chakra UI Modal, Button, VStack, HStack components
   - Purple gradients: `bgGradient="linear(to-b, blackAlpha.900, transparent)"`
   - Stripe Elements integration with PaymentElement
   - Orange extension button, green accept, red decline

**Extension Pricing:**
- Cost: $8.00 per extension (EXTENSION_COST = 8)
- Duration: 10 minutes per extension (EXTENSION_MINUTES = 10)
- Grace period: 20 seconds after timer expires

### Authentication Setup - Console Provider & Dev Bypass (Jan 27, 2026)
**Status:** ✅ COMPLETE

**Console Email Provider:**
- Magic link API at `/api/auth/magic-link/send` generates verification tokens
- Token stored in `auth_verification_token` table with 15-minute expiry
- Magic link URL printed to server console logs for development testing
- Verification API at `/api/auth/magic-link/verify` validates token, creates session, sets cookie

**Developer URL Bypass:**
- Welcome page loader checks for `?dev_key=...` query parameter
- Redirects to `/api/auth/dev-bypass` with the key
- If key matches `DEV_BYPASS_KEY` secret, auto-signs in as `trelmore.staff@gmail.com` with admin role
- Creates or updates user with profile_completed and data_consent_given flags
- All error cases redirect to appropriate pages (no JSON responses)

**Magic Link UI:**
- Signin page uses magic link as primary authentication flow
- Password signin available as fallback option
- Shows confirmation screen after sending magic link
- Handles URL error params: InvalidLink, ExpiredLink, VerificationFailed, AccessDenied

**Redirect Strategy:**
- Successful auth redirects to `/discovery` (or `/onboarding/profile` if incomplete)
- All auth error cases redirect with error params to `/account/signin`

### Admin Dashboard Integration (Jan 27, 2026)
**Status:** ✅ COMPLETE

**Safety Reports UI:**
- New "Safety Reports" section in Admin Dashboard with pending report table
- Displays reporter, reported user, reason, block count, and creation date
- Action buttons: Resolve (marks report reviewed) and Ban User (bans reported user)
- Consistent admin authorization: role=admin OR staff email across UI and APIs

**Database Performance:**
- Added indexes on safety_reports: status, reported_user_id, created_at DESC
- Optimized query performance for admin pending report retrieval

### Video Call Feature Hardenings (Jan 27, 2026)
**Status:** ✅ COMPLETE

**One-Click Extension Billing:**
- `default_payment_method_id` column added to auth_users
- Accept API checks for saved payment method, charges off-session if available
- Falls back to PaymentIntent flow with `oneClickFailed` flag if one-click fails
- Confirm endpoint saves payment method after first successful manual payment for future one-click use
- `setup_future_usage: "off_session"` on PaymentIntent enables card saving

**Safety Reports System:**
- Created `safety_reports` table with reporter_id, reported_user_id, reason, video_session_id, status
- `/api/safety-reports` POST endpoint wired to Report button in video call
- Increments `block_count` on reported user, sets `flagged_for_admin=true` when count >= 3
- GET endpoint for admin dashboard with pending report filtering

**Discovery Navigation Strategy:**
- All video call exit paths now navigate to `/discovery` for continuous user engagement
- Updated: handleEndCall, handleReport, handleBlockAndEnd, handleSaveNote, handleSkipNote
- Updated: grace-period timeout, error page button
- Keeps users actively searching instead of returning to messages

### Saved Profiles Enhancement (Jan 27, 2026)
**Status:** ✅ COMPLETE

- Added Like/Pass buttons wired to backend APIs
- Distance marker with live haversine calculation
- Compatibility score from calculateCompatibility function
- Video Call navigation to `/schedule/propose/:userId`
- MatchBadge with real-time status via useIsMatched hook