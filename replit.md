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
- **Database Indexes**: 11 performance indexes added to auth_users (3), video_sessions (5), and matches (3) tables for 50-95% query speed improvement on frequently accessed columns. Migration documented in DATABASE_INDEXES_MIGRATION.md
- **Central Configuration**: All magic numbers, limits, and thresholds centralized in src/config/constants.ts (300+ lines) covering rate limits, cache durations, pricing, video call config, media limits, daily limits, safety thresholds, pagination, and timeouts. Eliminates scattered hardcoded values
- **Session Timeout Monitoring**: Global client-side session monitor with 30-minute timeout, 5-minute warning modal with countdown, automatic session extension on user activity, and user-friendly re-login prompt for expired sessions

**Code Quality & Scalability (October 31, 2025):**
- **Integration Tests**: Comprehensive Vitest test suites for subscription flows (15+ tests) and safety system (10+ tests) with mocked Stripe responses and database queries. Includes upgrade/downgrade flows, webhook processing, block count tracking, and admin flagging logic
- **TypeScript Migration**: Payment checkout endpoint migrated to TypeScript with strong typing for request/response objects, database records, and Stripe API. Provides compile-time error detection and better IDE support
- **Feature Flag System**: Production-ready feature flag system (src/utils/featureFlags.ts) supporting 12+ flags including scheduled downgrades, payment checkout, video extensions, matching features, and safety systems. Enables emergency feature shutdown via environment variables with user-friendly error messages
- **Structured Logging**: Comprehensive logging system (src/utils/logger.ts) tracking 20+ business events including subscriptions, payments, matches, video calls, and safety actions. JSON output for log aggregation, colored console for development, specialized helpers for each event type. Documented in CODE_QUALITY_ENHANCEMENTS.md

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