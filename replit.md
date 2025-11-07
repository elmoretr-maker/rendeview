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