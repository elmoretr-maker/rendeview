# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application focused on high user engagement and seamless communication, offering video calling, messaging, scheduling, and media uploads. The business vision is to capture a significant share of the online dating market with a superior user experience, advanced features, and monetization through a tiered membership model. The mobile application is production-ready, deployed via EAS with full native functionality and 100% aesthetic parity with the web platform.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application uses a client-server architecture. The frontend is built with React 18 and React Router 7, utilizing Chakra UI for web and native React Native for mobile, ensuring aesthetic consistency. The backend uses Hono (Node.js) with a PostgreSQL database. Authentication is managed by Auth.js with custom session implementations.

**UI/UX Decisions:**
- Mobile-first design with Tinder-style profile cards, gradient overlays, and a consistent purple brand theme.
- 100% aesthetic parity between web and mobile platforms, using the Inter font family.

**Technical Implementations & Feature Specifications:**
- **Core Features**: Discovery with location filtering, Matches, real-time Messages, Profile management, and a consolidated onboarding flow. Includes smart matching, mutual interests, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery.
- **Messaging System**: Supports separate Matches from Messages/Chats, with enhanced UI, unread badges, and comprehensive blocking.
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
- **Invitation-Based Calling**: Both web and mobile use an invitation flow with caller/callee handshake, including polling for real-time updates and accept/decline functionality.

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

### Cross-Platform Navigation & Flow Audit
**Status:** ✅ COMPLETE (Jan 26, 2026)

**Changes:**
1. **Welcome Page Consolidation:**
   - Deleted duplicate `/welcome/page.jsx` (web) and `/welcome.jsx` (mobile)
   - Root URL (/) now serves `/onboarding/welcome` as single source of truth
   - 100% inline styles for purple gradient background and 60px logo

2. **Navbar Restoration:**
   - Created `WelcomeNavbar.jsx` component with About, Safety, Success Stories links
   - Navbar appears on web onboarding/welcome page
   - Mobile welcome page updated with matching navbar for 100% parity

3. **Functional Routing:**
   - Web: Join Now → `/onboarding/consent`, Sign In → `/account/signin`
   - Mobile: Join Now → `/onboarding/consent`, Sign In → auth modal
   - All onboarding pages (consent, membership, profile) verified active and styled

4. **Mobile UI Parity:**
   - Redesigned mobile welcome to match web: purple gradient, 60px logo, buttons
   - LinearGradient background, matching color scheme (#9333ea purple)

**Files Modified:**
- `apps/web/src/components/WelcomeNavbar.jsx` - NEW: Landing page navbar
- `apps/web/src/app/(app)/onboarding/welcome/page.jsx` - Added navbar, inline styles
- `apps/mobile/src/app/onboarding/welcome.jsx` - Complete redesign for web parity
- `apps/web/src/app/routes.ts` - Root URL serves onboarding/welcome
- `apps/mobile/src/app/_layout.jsx` - Auth guard redirects to /onboarding/welcome

### Introduction Content Restoration
**Status:** ✅ COMPLETE (Jan 26, 2026)

**Restored Content:**
1. **Headline:** "Date Smarter, Not Harder"
2. **Tagline:** "No Catfishing. Know who they are before you meet. Your time is valuable—only pay for connections that matter."
3. **Value Props (with icons):**
   - Video-First Dating (CheckCircle)
   - Safety First (Shield)
   - Meaningful Connections (Heart)
   - Inclusive Community (Users)

**Created Stub Pages:**
- Web: `/about`, `/safety`, `/success-stories`
- Mobile: `/about.jsx`, `/safety.jsx`, `/success-stories.jsx`

**Files Created:**
- `apps/web/src/app/(app)/about/page.jsx`
- `apps/web/src/app/(app)/safety/page.jsx`
- `apps/web/src/app/(app)/success-stories/page.jsx`
- `apps/mobile/src/app/about.jsx`
- `apps/mobile/src/app/safety.jsx`
- `apps/mobile/src/app/success-stories.jsx`

**Preserved:**
- 60px logo in white card
- Purple gradient background (#f3e8ff → #ffffff → #dbeafe)
- All inline styles for SSR reliability
- Join Now → /onboarding/consent routing verified

### Page Identity Headers
**Status:** ✅ COMPLETE (Jan 26, 2026)

**Pattern:** All public pages now have primary h1 identity headers matching navbar link text:
- Welcome page: "Welcome to Rende-View" (purple, Playfair Display font)
- About page: "About" (purple, centered)
- Safety page: "Safety" (purple, centered)
- Success Stories page: "Success Stories" (purple, centered)

**Technical Details:**
- Web: h1 headers with inline styles, positioned after Back button, before logo
- Mobile: Text component with pageHeader style, positioned after back button
- All headers use #9333ea purple color and serif/Playfair Display font
- Removed duplicate h1 elements from content sections to prevent redundancy
- Routes.ts updated with welcome-alias ID to prevent duplicate route ID errors

**Files Modified:**
- `apps/web/src/app/(app)/onboarding/welcome/page.jsx` - Added "Welcome to Rende-View" h1
- `apps/web/src/app/(app)/about/page.jsx` - Added "About" h1, removed duplicate
- `apps/web/src/app/(app)/safety/page.jsx` - Added "Safety" h1
- `apps/web/src/app/(app)/success-stories/page.jsx` - Added "Success Stories" h1, removed duplicate
- `apps/mobile/src/app/onboarding/welcome.jsx` - Added pageHeader with ScrollView
- `apps/mobile/src/app/about.jsx` - Added pageHeader style
- `apps/mobile/src/app/safety.jsx` - Added pageHeader style
- `apps/mobile/src/app/success-stories.jsx` - Added pageHeader style
- `apps/web/src/app/routes.ts` - Fixed with welcome-alias route ID