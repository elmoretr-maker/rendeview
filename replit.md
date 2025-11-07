# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication. The business vision is to capture a significant share of the online dating market by offering a superior user experience and advanced features, driving high user retention and monetization through a tiered membership model. The mobile application is production-ready, transitioning to EAS (Expo Application Services) for deployment with full native functionality. As of November 2025, the project has achieved 100% aesthetic parity between web and mobile platforms, with consistent Inter font family implementation across all 8 mobile screens.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture. The frontend uses React 18 with React Router 7 for navigation. The web application leverages Chakra UI for its component library, progressively phasing out TailwindCSS. The mobile application achieves aesthetic parity using native React Native components and consistent styling. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Auth.js handles authentication.

Key features include:
- **UI/UX**: Mobile-first design with Tinder-style profile cards, gradient overlays, and a consistent purple brand theme. 100% aesthetic parity achieved with Inter font family implemented across all 8 mobile screens.
- **Core Features**: Discovery with location-based proximity filtering, Matches, Messages with real-time chat, Profile management, and a consolidated onboarding flow. Includes smart matching with prioritization, mutual interests, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery.
- **Messaging System**: Separated Matches (mutual likes) from Messages/Chats (anyone can message anyone). Implemented standalone conversations system with new database tables and migrated existing messages. **Enhanced UI** features large profile pictures, clickable "Open Chat" buttons, and unread message badges. **Comprehensive blocking enforcement** prevents blocked users from appearing in conversation lists or accessing/sending messages via API (enforced bidirectionally in GET/POST endpoints with 403 responses).
- **Membership Model**: A 4-tier system (Free, Casual, Dating, Business) governs media limits, chat durations, and meeting caps, enforced client-side and via API.
- **Video Calling**: Complete video chat system with Daily.co integration. Features include tier-based duration limits (Free: 5min, Casual: 15min, Dating: 25min, Business: 45min), paid extensions ($8/10min), real-time synchronized timers, 20-second grace periods, extension request/payment flow with Stripe, post-call private notes, in-call reporting, meeting caps (Free tier: 3 meetings/day with 24-hour cooldown timer, 2-week trial period from first video call), tier upgrade nudges, and comprehensive session tracking. Initial duration calculated as minimum of both participants' tier limits. Free tier users see a live countdown timer showing when their next video call is available after hitting daily limit. **Free tier video trial**: Users get 2 weeks of video features from their first video call, after which they must upgrade to Casual, Dating, or Business tier to continue using video dating features.
- **Media Management**: Supports photo uploads and camera-only video recording with tier-based limits. Profile intro video recording limits: Free (15s), Casual (30s), Dating (60s), Business (60s). Profile intro video display limits: Free/Casual (1 video), Dating/Business (2 videos). All users can re-record videos at any time to replace existing ones.
- **Authentication & Security**: Global authentication guard, two-step authentication including onboarding completion checks. Security measures include webhook monitoring, idempotency keys, database-backed rate limiting, database constraints, and comprehensive external contact detection.
- **Chat Monetization (Video-First Strategy)**: 
  - **Progressive Video Unlock System**: 10 messages/person/day before first video call. Smart prompts at message 8 ("Getting to know each other? Schedule video!"). Decay to 2 messages/day after 3 days without video. Video completion unlocks tier-based bonus messages (Casual: +25, Dating: +50, Business: +100 daily). 
  - **Smart Prompts**: "Looks like you have a lot to say..." triggers after 280 characters, offering [Keep Typing (costs 1 message credit)] option. Gentle nudges toward video scheduling at conversation milestones.
  - **Message Credit Pricing (Rolling Monthly Reward System)**: Standard pricing ($1.99=20 msgs, $4.99=50 msgs, $9.99=100 msgs @ $0.10/msg) by default. Reward pricing ($1.99=30 msgs, $4.99=75 msgs, $9.99=150 msgs @ $0.07/msg, 50% bonus) unlocks after 3 video calls with different people. Must complete 3 NEW video calls each calendar month to maintain reward pricing. 7-day warning before month ends if requirement not met. Credits never expire.
  - **Video Messaging (Flat Daily Totals)**: Short video clips (10-60s based on tier) sendable in chat. Free daily allowance across ALL conversations (Free: 1/day, Casual: 3/day, Dating: 5/day, Business: 10/day) - user distributes however they choose. Paid bundles beyond limit ($2.99=10, $6.99=30, $14.99=100). Unlocks after completing first video call with person.
  - **Philosophy**: "If you want to text chat, get a different app. We're for people who want to VIDEO date." Text messaging designed to facilitate video dates, not replace them. All friction mechanisms push users toward video calls while rewarding ongoing video dating behavior with enhanced messaging capabilities.
- **Matching System**: Enhanced matching incorporates a comprehensive interests system and a weighted scoring algorithm (v2) for compatibility calculation. Compatibility percentage displayed on Discovery cards.
- **Admin Dashboard**: Features comprehensive user safety management, revenue overview, and dynamic pricing settings. Pricing changes made in the Admin Dashboard immediately propagate to all web and mobile surfaces.
- **Deployment**: Mobile application uses EAS (Expo Application Services) for production-ready cloud builds, supporting development, preview, and production profiles.
- **Mobile Feature Parity**: As of November 2025, achieved 100% video chat feature parity between web and mobile platforms. Recent additions include:
  - **Schedule Proposal Screen** (`schedule/propose/[userId]`): Users can propose video dates with calendar date selection, time slots (9 AM - 9 PM, 30-min intervals), and duration options (15/30/45/60 min). Validates match status before allowing proposals.
  - **Blocked Users Management** (`settings/blocked`): Users can view blocked users list, add private notes explaining why they blocked someone, and unblock users. Includes formatted dates and search functionality.
  - **Enhanced Profile Organization**: Mobile profile screen now mirrors web app structure with clear visual section headers (Basic Info, Preferences & Lifestyle, Photos & Media, Availability & Privacy, Location) for improved usability and consistency.
  - **Video Chat Parity** (Nov 7, 2025): Complete modernization of mobile video call to match web architecture. Both platforms now feature:
    - Session-based polling with server-synchronized timers
    - Tier-based duration limits with grace periods
    - Extension request/accept/pay flow ($8 for 10 minutes)
    - In-call reporting and blocking functionality
    - Post-call private notes
    - Consistent pricing and user experience across all devices

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js
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

## ✅ RESOLVED ISSUES

### Authentication Session Persistence Problem
**Status:** ✅ RESOLVED (Nov 6, 2025)

**Original Problem:**
- User sessions did NOT persist and expired immediately despite 12-hour maxAge configuration
- `@auth/create` package (Replit internal) was using JWT-only authentication without database backing
- Database table `auth_sessions` existed but remained empty (0 sessions)
- Users had to re-authenticate frequently, breaking the expected 12-hour session duration

**Solution Implemented:**
Hybrid authentication system that combines JWT transport with database-backed session validation:

1. **Modified `@auth/create` package** (`create-anything/_/apps/web/src/__create/@auth/create.js`):
   - Changed to extract `sessionToken` from JWT payload
   - Perform database lookup using `adapter.getSessionAndUser(sessionToken)`
   - Return user data only if valid database session exists
   - Removed JWT-only fallback to strictly enforce database sessions
   - Added session expiration checking and automatic cleanup

2. **Updated signin/signup flows** (`create-anything/_/apps/web/src/auth.js`):
   - Both `credentials-signin` and `credentials-signup` providers now create database sessions
   - Each session gets unique UUID token with 12-hour expiration
   - Added error handling - authorization fails if session creation fails
   - Session tokens embedded in user object for JWT callback processing

3. **Added JWT callbacks** (`create-anything/_/apps/web/src/auth.js`):
   - JWT callback embeds `sessionToken` and `sessionExpires` from user object
   - Session callback propagates session metadata to client
   - Enables session token transport via JWT while enforcing database validation

**Technical Flow:**
1. User logs in → `authorize` creates database session with UUID token
2. Session token embedded in JWT → JWT stored in secure cookie
3. User makes request → JWT decoded → session token extracted
4. Database session lookup → if valid and not expired → user authenticated
5. If session missing/expired → authentication fails (forced re-login)

**Key Benefits:**
- ✅ True 12-hour persistent sessions stored in database
- ✅ Session revocation works (logout deletes DB session)
- ✅ Hard 12-hour expiration (no indefinite renewal)
- ✅ Security: expired/deleted sessions immediately invalidate requests
- ✅ No breaking changes to existing user accounts or authentication flow

**Files Modified:**
- `create-anything/_/apps/web/src/__create/@auth/create.js` (session validation logic)
- `create-anything/_/apps/web/src/auth.js` (session creation in authorize + callbacks)
- Database: `auth_sessions` table (now actively used for session storage)