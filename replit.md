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

### Sign In Button Navigation Issue
**Status:** ✅ RESOLVED (Nov 8, 2025)

**Original Problem:**
- Sign In button on Welcome page didn't navigate when clicked
- Persistent hydration errors in browser console
- React Router 7 SSR compatibility issues

**Root Causes:**
1. Complex `ClientNavigateButton` tried to use SPA navigation via `navigate()` which failed when hydration had issues
2. React Router `<Meta />` component needed to be added to Layout for proper SSR meta tag handling
3. Meta tags were hardcoded in Layout instead of using React Router's `export const meta` pattern

**Solution Implemented:**
1. Simplified `ClientNavigateButton` to use plain HTML link behavior (`<Button as="a" href={to}>`)
2. Removed complex hydration detection and navigate() logic that was unreliable
3. Added `<Meta />` component to Layout's `<head>`
4. Moved meta tags from hardcoded HTML to `export const meta` function
5. Added root loader to fetch session server-side
6. Moved FontAwesome loading to client-only component

**Results:**
- ✅ Both Sign In and Join Now buttons work reliably
- ✅ Clean browser console (no hydration errors)
- ✅ Simple, maintainable button implementation
- ✅ Proper React Router 7 SSR pattern usage

**Files Modified:**
- `create-anything/_/apps/web/src/components/ClientNavigateButton.jsx` (simplified to plain links)
- `create-anything/_/apps/web/src/app/root.tsx` (added Meta component and export const meta)
