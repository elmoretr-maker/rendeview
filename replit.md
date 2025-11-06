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
- **Chat Monetization**: Hybrid chat monetization with a three-pool message deduction and per-match caps for the Business tier, credit packs available.
- **Matching System**: Enhanced matching incorporates a comprehensive interests system and a weighted scoring algorithm (v2) for compatibility calculation. Compatibility percentage displayed on Discovery cards.
- **Admin Dashboard**: Features comprehensive user safety management, revenue overview, and dynamic pricing settings. Pricing changes made in the Admin Dashboard immediately propagate to all web and mobile surfaces.
- **Deployment**: Mobile application uses EAS (Expo Application Services) for production-ready cloud builds, supporting development, preview, and production profiles.

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

## 🚨 CRITICAL ISSUES TO FIX

### Authentication Session Persistence Problem (HIGH PRIORITY)
**Status:** UNRESOLVED - Marked for later fix (Nov 6, 2025)

**Problem:**
- User sessions do NOT persist and expire immediately despite 12-hour maxAge configuration
- `@auth/create` package (Replit internal) ignores the `adapter` parameter and database session strategy
- Database table `auth_sessions` exists but remains empty (0 sessions) even after successful login
- Users must re-authenticate frequently, breaking the expected 12-hour session duration

**Root Cause:**
- The `@auth/create` package in `create-anything/_/apps/web/src/auth.js` is a Replit proprietary package that does NOT respect standard Auth.js configuration
- File warning states: "Do not attempt to edit it. Modifying it will have no effect"
- Configuration specifies `strategy: "database"` and `maxAge: 12 * 60 * 60` but sessions are NOT stored in database
- Adding `adapter: adapter` parameter had no effect
- Likely using JWT cookie-based sessions instead of database-backed sessions

**Impact:**
- Users experience frequent "Session Expired" errors
- Poor user experience - constant re-authentication required
- Defeats purpose of 12-hour session duration

**Solution Options (Not Yet Implemented):**
1. **Replace with standard Auth.js v5** - Migrate from `@auth/create` to proper Auth.js/NextAuth with database adapter for true persistent sessions
2. **Migrate to Passport.js** - Use Replit's official Auth blueprint (OpenID Connect) with PostgreSQL-backed sessions
3. **Debug @auth/create** - Attempt to find undocumented configuration (low probability of success)

**Recommendation:** Option 1 or 2 - Replace proprietary auth system with standard, well-documented solution.

**Files Affected:**
- `create-anything/_/apps/web/src/auth.js` (current broken auth config)
- `create-anything/_/apps/web/src/app/api/utils/auth.js` (session utilities)
- Database: `auth_sessions` table (unused), `auth_users` table (working)

**TODO:** Schedule time to implement proper authentication system with persistent database sessions.