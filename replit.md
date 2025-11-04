# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication. The business vision is to capture a significant share of the online dating market by offering a superior user experience and advanced features, driving high user retention and monetization through a tiered membership model.

**EAS Build System - Production Ready (November 4, 2025):** The mobile application successfully transitioned from Expo Go to EAS (Expo Application Services) cloud builds. First build completed successfully with zero errors (Build ID: 93eb35a2-f0c2-4767-9fcc-af4252134b42). The application is now deployable to physical Android devices with full native functionality including camera access, native modules, and production-grade performance. Build configuration includes development (APK with QA_BYPASS), preview (beta testing), and production (app store) profiles. Environment secrets managed securely via EAS cloud (EXPO_PUBLIC_QA_BYPASS_AUTH, EXPO_PUBLIC_BASE_URL, EXPO_PUBLIC_PROXY_BASE_URL). Pre-flight testing validated 3,320 modules compiled successfully. Build time: ~15 minutes. EAS project: @travius777e/create-mobile-app. Comprehensive documentation at `mobile/EAS_BUILD_GUIDE.md`.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture with a React 18 frontend employing React Router 7 for navigation and TailwindCSS for styling, featuring a mobile-first UI/UX with Tinder-style profile cards and gradient overlays. Routing uses Next.js-style route grouping. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Auth.js handles authentication. Key features include Discovery, Matches, Messages with real-time chat, Profile management, and a consolidated onboarding flow. An `ErrorBoundary` ensures graceful error handling.

The system incorporates a 4-tier membership model (Free, Casual, Dating, Business) governing media limits, chat durations, and meeting caps, enforced both client-side and via backend API. A real-time video call extension system allows paid extensions with synchronized timers. Safety features include a 4-strike moderation logic. Core features include smart matching with prioritization, mutual interests highlighting, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery (profile viewers). Media management supports photo uploads and camera-only video recording with tier-based limits. Revenue-protection downgrade flows are implemented for subscription management.

Authentication is managed by a global authentication guard that protects all routes except public pages (`/welcome`, `/onboarding/*`), redirecting unauthenticated users to `/welcome`. A two-step authentication process first verifies user credentials, then checks for onboarding completion (consent, membership, profile photos) before directing users to `/discovery`. UX enhancements include optimistic UI updates, loading skeletons, and an `ErrorBoundary`. Security measures include webhook monitoring, idempotency keys, database-backed rate limiting, and database constraints.

Data integrity and performance are managed through database indexes and central configuration of all limits, thresholds, and pricing. A client-side session monitor ensures secure session management. Code quality and scalability are maintained through Vitest integration tests, TypeScript migration of payment endpoints, a production-ready feature flag system, and structured logging for business events. User experience features include a private user notes system and an admin dashboard for user photo management.

A hybrid chat monetization system uses a three-pool message deduction with per-match caps for the Business tier. Video call completion incentivizes messaging, and credit packs are available for purchase. A real-time quota UI displays remaining messages. The mobile app upload system uses base64 encoding for media uploads, resolving compatibility issues. Video recording limits are tier-based. A unified `/api/upload-base64` endpoint handles various input types.

An enhanced matching system incorporates a comprehensive interests system and a weighted scoring algorithm (v2) for compatibility calculation, considering shared interests, relationship goals, lifestyle, activity, and tier similarity. The Discovery UI displays compatibility percentages, "Likes You" indicators, bio previews, and shared interests. All preferences, weights, and interests are centrally configured.

The mobile application features full parity with the web app experience, including comprehensive profile viewing pages (`/profile/[userId]`), fully editable profile tabs, and smart media handling for uploads. A 6-tab bottom navigation system (Discovery, New Matches, Matches, Messages, Membership, Profile) provides consistent navigation. Quick access buttons in Discovery lead to Daily Picks and Profile Viewers. Aesthetic uniformity is maintained across mobile and web with consistent colors, fonts, spacing, shadows, and card styling. Real-time badge systems for unviewed matches are implemented.

Mobile API integration uses a centralized `apiFetch` helper for authentication and `getAbsoluteUrl()` for proper media loading across all screens. Profile availability controls (Show as Online, Appear Offline, Accept Video Calls) are implemented across both web and mobile, with server-side persistence via `/api/profile` and synchronization. The chat interface respects the `video_call_available` status of the match partner. Both platforms feature a Profile Preview page, allowing users to see how their profile appears to others.

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js
- **Payment**: Stripe
- **Video Conferencing**: Daily.co
- **Object Storage**: Replit Object Storage
- **Frontend Framework**: React 18
- **Frontend Router**: React Router 7
- **Styling**: TailwindCSS
- **Backend Framework**: Hono (Node.js)