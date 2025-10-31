# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication. The business vision is to capture a significant share of the online dating market by offering a superior user experience and advanced features not commonly found in competitors, thereby driving high user retention and monetization through a tiered membership model.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture. The frontend, a React 18 application, employs React Router 7 for navigation and TailwindCSS for styling, with a mobile-first UI/UX featuring Tinder-style profile cards and gradient overlays. Routing uses Next.js-style route grouping. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Auth.js handles authentication. Key features include Discovery, Matches, Messages with chat, Profile management, a consolidated onboarding flow (Welcome → Consent → Membership → Payment → Profile Setup → Main App), scheduling, and video calling. An `ErrorBoundary` ensures graceful error handling. The system incorporates a 4-tier membership model (Free, Casual, Dating, Business) governing media limits, chat durations, and meeting caps, enforced both client-side and via backend API. A real-time video call extension system allows paid extensions with synchronized timers. Safety features include a 4-strike moderation logic. Core features include smart matching with prioritization, mutual interests highlighting, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery (profile viewers). Media management supports photo uploads and camera-only video recording with tier-based limits. Revenue-protection downgrade flows are implemented for subscription management, allowing scheduled tier changes without immediate refunds.

**UX Enhancements (October 2025):**
- **Optimistic UI Updates**: Discovery page Like/Pass buttons and Chat Send Message provide immediate visual feedback before server responses, with automatic rollback on failure
- **Error Boundaries**: Reusable ErrorBoundary component wraps critical sections (Discovery, Matches, Profile, Chat) to prevent component failures from crashing the entire app
- **Loading Skeletons**: Shimmer-effect skeleton loaders for Discovery cards and Profile page eliminate blank screen delays and improve perceived performance

**Security & Revenue Protection (October 31, 2025):**
- **Webhook Monitoring**: All Stripe webhook events logged to database (webhook_events table) with signature validation tracking, IP addresses, and processing status for security monitoring and alerting
- **Idempotency Keys**: Payment checkout endpoint supports idempotency keys with 24-hour cache to prevent duplicate charges from retried requests
- **Rate Limiting**: Database-backed rate limiting on critical endpoints - video room creation (10/hour), blocking users (20/hour), and profile likes (100/hour) - with proper 429 responses and retry-after headers
- **Database Constraints**: CHECK constraints enforce data integrity on auth_users table - block_count must be non-negative, membership_tier must be valid ('free', 'casual', 'dating', 'business')
- **Unified Pricing Structure**: All pricing consistently sourced from admin_settings database table and membershipTiers.js, with confirmed 4-tier system (Free $0, Casual $9.99/15min, Dating $29.99/25min, Business $49.99/45min) and single extension option ($8.00 for 10 minutes)

**Data Integrity & Performance (October 31, 2025):**
- **Database Indexes**: 11 performance indexes successfully deployed to auth_users (3), video_sessions (5), and matches (3) tables for 50-95% query speed improvement on frequently accessed columns. All indexes verified and operational in development database. Migration documented in DATABASE_INDEXES_MIGRATION.md
- **Central Configuration**: All magic numbers, limits, and thresholds centralized in src/config/constants.ts (300+ lines) covering rate limits, cache durations, pricing, video call config, media limits, daily limits, safety thresholds, pagination, and timeouts. Eliminates scattered hardcoded values
- **Session Timeout Monitoring**: Global client-side session monitor with 30-minute timeout, 5-minute warning modal with countdown, automatic session extension on user activity, and user-friendly re-login prompt for expired sessions

**Code Quality & Scalability (October 31, 2025):**
- **Integration Tests**: Comprehensive Vitest test suites (45+ tests) that **invoke actual API route handlers** with **real database interactions**. Subscription tests (20+ cases) cover checkout, scheduled downgrades, webhook processing, and idempotency keys. Safety tests (25+ cases) validate complete 4-strike moderation flow (3 blocks → flagged, 4 blocks → under_review), rate limiting (20 blocks/hour with 429 responses), and blocker CRUD operations. Test utilities provide authentication mocking, database cleanup, and state verification. All tests achieve proper isolation through comprehensive cleanup of rate limits, blockers, and user moderation states between runs. External services (Stripe) are mocked while core business logic executes through real route handlers
- **TypeScript Migration**: All 6 payment endpoints fully migrated to TypeScript (checkout, cancel-downgrade, downgrade, portal, receipts, webhook) with comprehensive type safety for request/response objects, database records, and Stripe API. Includes proper type assertions for Stripe objects (current_period_end, subscription on Invoice), typed error handling, and compile-time error detection. Migration verified by architect review with no regressions detected
- **Feature Flag System**: Production-ready feature flag system (src/utils/featureFlags.ts) supporting 12+ flags including scheduled downgrades, payment checkout, video extensions, matching features, and safety systems. Enables emergency feature shutdown via environment variables with user-friendly error messages
- **Structured Logging**: Comprehensive logging system (src/utils/logger.ts) tracking 20+ business events including subscriptions, payments, matches, video calls, and safety actions. All payment endpoints use structured logging with business event tracking, replacing console.log statements. JSON output for log aggregation, colored console for development, specialized helpers for each event type. Documented in CODE_QUALITY_ENHANCEMENTS.md

**User Experience Features (October 31, 2025):**
- **Private User Notes System**: Production-ready private notes feature allowing users to save personal observations about their matches. Database schema with UNIQUE(user_id, target_user_id) constraint ensures one note per match. Three integration points: (1) Post-call note modal appears automatically after video calls with retry capability on errors, (2) Inline note editor in chat detail pages with save/cancel workflow, (3) Note previews displayed on match list cards. Modal conflict resolution ensures post-call note prompt waits when video extension/payment modals are active, preventing overlapping UX. API endpoints (GET/POST /api/notes) handle authentication, validation, and upsert operations with proper error responses

**Hybrid Chat Monetization System (October 31, 2025):**
- **Three-Pool Message System**: Messages deduct in priority order - (1) First-encounter bonuses (10 per match, refreshes after video call), (2) Daily tier allowances (Free: 15, Casual: 24, Dating: 50, Business: 500), (3) Purchased credits (persistent, no expiration)
- **Business Tier Per-Match Caps**: 50 messages per match per day (base), increases to 75 after video call with that match. Blocks ALL message types (first-encounter, daily, credits) when exhausted to prevent abuse
- **Video Call Incentives**: Completing a video call refreshes 10 first-encounter messages for both users, encourages video engagement over endless texting
- **Credit Packs**: $1.99/10, $3.99/20, $7.99/50 messages. Persistent credits never expire, provide escape valve when daily caps exhausted
- **Real-time Quota UI**: Dual progress bars in chat interface show first-encounter and daily tier messages remaining, updates after each send
- **Database Tables**: user_daily_message_counts (resets daily), match_first_encounter_messages (per-match bonuses), user_message_credits (purchased credits), match_daily_message_counts (Business tier per-match tracking)
- **API Endpoints**: GET /api/messages/quota (check all pools), POST /api/messages/[matchId] (enforces limits with proper deduction), POST /api/video/complete (refreshes bonuses post-call)
- **Revenue Protection**: Prevents unlimited free messaging, drives tier upgrades and credit purchases, encourages video calls (core value proposition)

**Mobile App Upload System (October 31, 2025):**
- **Base64 Upload Architecture**: Mobile app uses base64 encoding for all media uploads (photos and videos) instead of React Native FormData, resolving compatibility with Replit's upload service
- **Video Recording Limits**: All tiers max 60 seconds - Free: 15s, Casual: 30s, Dating: 60s, Business: 60s (reduced from 5 minutes to ensure manageable file sizes ~20MB for base64 conversion)
- **Unified Upload Endpoint**: `/api/upload-base64` route accepts three input types - base64 (JSON), url (JSON), or buffer (octet-stream) - and returns { url, mimeType }
- **Photo Uploads**: expo-image-picker with base64:true option captures photos as base64 directly
- **Video Uploads**: expo-file-system converts recorded video URIs to base64 before upload
- **Profile Onboarding UX**: Photo requirement banner (minimum 2 photos), progress counter, back button navigation to membership page, video playback auto-pause after acceptance
- **Dependencies**: expo-file-system@~19.0.17 for video-to-base64 conversion

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js
- **Payment**: Stripe
- **Video Conferencing**: Daily.co
- **Object Storage**: Replit Object Storage (Google Cloud Storage via sidecar)
- **File Upload UI**: Uppy (@uppy/core, @uppy/react, @uppy/aws-s3)
- **Frontend Framework**: React 18
- **Frontend Router**: React Router 7
- **Styling**: TailwindCSS
- **Backend Framework**: Hono (Node.js)