# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application designed to deliver a robust and scalable platform focused on user engagement and seamless communication. It offers video calling, messaging, scheduling, and media uploads. The business vision aims to capture a significant share of the online dating market by providing a superior user experience and advanced features, driving high user retention and monetization through a tiered membership model. The mobile application is production-ready, transitioning to EAS (Expo Application Services) for deployment with full native functionality, and achieves 100% aesthetic parity with the web platform.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture. The frontend uses React 18 with React Router 7, leveraging Chakra UI for the web application and native React Native components for mobile, ensuring aesthetic parity. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Authentication is handled by Auth.js with custom implementations for session management.

**UI/UX Decisions:**
- Mobile-first design with Tinder-style profile cards, gradient overlays, and a consistent purple brand theme.
- 100% aesthetic parity between web and mobile platforms with consistent Inter font family.

**Technical Implementations & Feature Specifications:**
- **Core Features**: Discovery with location-based filtering, Matches, Messages with real-time chat, Profile management, and a consolidated onboarding flow. Includes smart matching, mutual interests, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery.
- **Messaging System**: Separate Matches from Messages/Chats, allowing anyone to message anyone. Features enhanced UI, unread message badges, and comprehensive bidirectional blocking enforcement.
- **Membership Model**: A 4-tier system (Free, Casual, Dating, Business) governs media limits, chat durations, and meeting caps, enforced both client-side and via API.
- **Video Calling**: Complete video chat system with Daily.co integration, featuring tier-based duration limits, paid extensions via Stripe, real-time synchronized timers, post-call private notes, in-call reporting, and meeting caps. Includes a 2-week free video trial.
- **Media Management**: Supports photo uploads and camera-only video recording with tier-based limits for intro videos.
- **Authentication & Security**: Global authentication guard, two-step authentication, webhook monitoring, idempotency keys, database-backed rate limiting, and external contact detection. Custom authentication routes bypass `@hono/auth-js` middleware for signin/signup, utilizing direct database session creation and secure JWT handling.
- **Chat Monetization (Video-First Strategy)**: Implements a progressive video unlock system with message limits before video calls, smart prompts encouraging video scheduling, and a rolling monthly reward system for message credits based on video call completion. Also includes video messaging with flat daily allowances and paid bundles. The design prioritizes video interaction over text.
- **Matching System**: Enhanced matching incorporates a comprehensive interests system and a weighted scoring algorithm for compatibility calculation.
- **Match Differentiation**: Visual match indicator system displays a gold star badge with "Match" text on profile cards when users are currently matched. Badge appears on Discovery page, Matches page (Top Picks section), and Messages page. Uses React Query caching (30s staleness) for performance optimization and automatically disappears when users become unmatched.
- **Admin Dashboard**: Provides user safety management, revenue overview, and dynamic pricing settings that propagate immediately.
- **Deployment**: Mobile application uses EAS (Expo Application Services) for production-ready cloud builds.
- **Mobile Feature Parity**: Achieved 100% video chat feature parity with web. Includes Schedule Proposal Screen, Blocked Users Management, and enhanced Profile Organization.

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

## ✅ RESOLVED ISSUES

### Login Loop / Session Endpoint Missing
**Status:** ✅ RESOLVED (Nov 7, 2025)

**Original Problem:**
- Users experienced infinite loop between Welcome page and Welcome Back page
- Console error: `ClientFetchError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- Auth.js client tried to fetch `/api/auth/session` but endpoint didn't exist
- Server returned HTML (404 page) instead of JSON, causing client crash

**Root Cause:**
The Auth.js client library automatically calls `/api/auth/session` to check authentication status. This endpoint was never created, so the server returned the React app HTML instead of a JSON response, causing the JSON parser to fail and the app to loop.

**Solution Implemented:**
Created `/api/auth/session/route.js` endpoint that:
1. Uses existing `auth()` wrapper to check session validity
2. Returns `null` (JSON) when user is not authenticated
3. Returns session object `{"user": {...}, "expires": "..."}` when authenticated
4. Always sets `Content-Type: application/json` header
5. Gracefully handles errors by returning `null` instead of throwing

**Technical Details:**
- Endpoint: `GET /api/auth/session`
- Unauthenticated response: `null`
- Authenticated response: `{"user": {"id", "email", "name", "image"}, "expires": "..."}`
- Error handling: Returns `null` on any error (no stack trace leaks)

**Key Benefits:**
- ✅ Eliminates login loop completely
- ✅ Proper JSON responses (no HTML errors)
- ✅ Welcome page loads without errors
- ✅ Auth.js client session checks work correctly
- ✅ Secure error handling without exposing internals

**Files Created:**
- `create-anything/_/apps/web/src/app/api/auth/session/route.js` (new session endpoint)

### Custom Authentication Routes (@hono/auth-js Bypass)
**Status:** ✅ RESOLVED (Nov 7, 2025)

**Original Problem:**
- `@hono/auth-js` middleware fundamentally incompatible with React Router 7
- Standard Auth.js signin/signup flow failed with "Cannot read properties of undefined (reading 'type')"
- Users unable to authenticate through normal Auth.js routes

**Solution Implemented:**
Custom authentication routes that bypass `@hono/auth-js` middleware:
1. `/api/auth/custom-signin` - Validates credentials, creates sessions, issues JWTs
2. `/api/auth/custom-signup` - Creates users with bcrypt hashing, sessions, and JWTs
3. Updated `auth()` wrapper to decode JWTs with proper salt parameter
4. Frontend calls custom routes directly instead of broken Auth.js flow

**Security Measures:**
- NO logging of JWT tokens, cookies, or credentials
- Secure HTTP-only cookies with `__Secure-` prefix for HTTPS
- Database-backed session validation (12-hour expiry)
- Password hashing with bcrypt (10 rounds)
- Architect-approved security implementation

**Files Modified:**
- `create-anything/_/apps/web/src/app/api/auth/custom-signin/route.js` (new)
- `create-anything/_/apps/web/src/app/api/auth/custom-signup/route.js` (new)
- `create-anything/_/apps/web/src/utils/useAuth.js` (updated to call custom routes)
- `create-anything/_/apps/web/src/__create/@auth/create.js` (JWT decode with salt)
- `create-anything/_/apps/web/__create/index.ts` (disabled @hono/auth-js middleware)

### Mobile App Login Loop Prevention
**Status:** ✅ RESOLVED (Nov 7, 2025)

**Original Problem:**
- Mobile app could experience login loop when user has stale session cookies in WebView
- User signs in → Session cookie stored in WebView + JWT in SecureStore
- User signs out → SecureStore cleared, but WebView cookies remain
- User tries to sign in again → Signin page loader sees stale session → Redirects to /discovery
- Mobile WebView never reaches callback URL → No JWT extracted → User stuck in loop

**Root Cause:**
Mobile app loads web signin/signup pages in WebView to authenticate. The server-side loader on signin/signup pages would redirect already-authenticated users to `/discovery`, breaking the mobile auth flow which needs to reach the callback URL (`/api/auth/token` for native, `/api/auth/expo-web-success` for web) to extract the JWT.

**Solution Implemented:**
Updated signin and signup page loaders to detect mobile authentication requests:
1. Check for `callbackUrl` query parameter (indicates mobile auth request)
2. Validate callbackUrl to prevent open redirect vulnerability (only allow same-origin paths starting with `/` but not `//`)
3. If user already has valid session AND callbackUrl is valid → Redirect to callbackUrl
4. This allows mobile WebView to reach the callback endpoint and extract JWT
5. Maintains server-side session validation for web users

**Security Measures:**
- Callback URL validation prevents open redirect attacks
- Only same-origin paths allowed (e.g., `/api/auth/token`)
- Rejects absolute URLs and protocol-relative URLs (e.g., `//attacker.com`)
- Architect-approved security implementation

**Technical Details:**
- Mobile Native: Loads `/account/signin?callbackUrl=/api/auth/token`
- Mobile Web (iframe): Loads `/account/signin?callbackUrl=/api/auth/expo-web-success`
- Both callback endpoints return JWT for mobile to store in SecureStore
- Loader redirects authenticated users to callback URL instead of /discovery when callbackUrl parameter present

**Files Modified:**
- `create-anything/_/apps/web/src/app/account/signin/page.jsx` (added callbackUrl detection)
- `create-anything/_/apps/web/src/app/account/signup/page.jsx` (added callbackUrl detection)

### Logout Endpoint Not Clearing Session Cookies
**Status:** ✅ RESOLVED (Nov 7, 2025)

**Original Problem:**
- Logout endpoint (`/api/auth/logout`) returned success message but failed to clear session cookies
- Users remained authenticated after logout attempt
- Protected API endpoints still accessible after logout
- Session cookies persisted in browser, leaving users logged in

**Root Cause:**
The logout endpoint attempted to set multiple `Set-Cookie` headers by passing an array to the Response headers object. However, HTTP requires each cookie to be set with a separate `Set-Cookie` header. The incorrect implementation prevented cookies from being cleared by the browser.

**Solution Implemented:**
Fixed logout endpoint to properly clear all authentication cookies:
1. Use the Fetch API `Headers` object to construct response headers
2. Call `headers.append('Set-Cookie', cookieValue)` for each cookie individually
3. Set expiry date to `Thu, 01 Jan 1970 00:00:00 GMT` to delete cookies
4. Preserve `Secure` attribute for `__Secure-*` prefixed cookies (HTTPS-only)
5. Clear all 6 authentication cookies: session-token, callback-url, csrf-token (both regular and secure variants)

**Technical Details:**
- All 6 cookies properly expired: `authjs.session-token`, `__Secure-authjs.session-token`, `authjs.callback-url`, `__Secure-authjs.callback-url`, `authjs.csrf-token`, `__Secure-authjs.csrf-token`
- Each cookie header includes: `Path=/`, `HttpOnly`, `SameSite=Lax`
- Secure cookies also include `Secure` flag for HTTPS enforcement
- Response body unchanged: `{"success":true,"message":"Logged out successfully"}`

**E2E Test Results:**
- ✅ User logged in → Profile API returns user data
- ✅ User logs out → Logout API returns success
- ✅ After logout → Profile API returns `{"error":"Unauthorized"}`
- ✅ Session cookies cleared from browser
- ✅ Architect review: PASSED

**Key Benefits:**
- ✅ Users can now properly log out of the application
- ✅ Session cookies immediately cleared from browser
- ✅ Security vulnerability eliminated
- ✅ Protected routes return 401 after logout

**Files Modified:**
- `create-anything/_/apps/web/src/app/api/auth/logout/route.js` (fixed cookie clearing with Headers API)