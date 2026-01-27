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