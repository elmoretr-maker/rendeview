# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication. The business vision is to capture a significant share of the online dating market by offering a superior user experience and advanced features not commonly found in competitors, thereby driving high user retention and monetization through a tiered membership model.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture with a React 18 frontend employing React Router 7 for navigation and TailwindCSS for styling, featuring a mobile-first UI/UX with Tinder-style profile cards and gradient overlays. Routing uses Next.js-style route grouping. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Auth.js handles authentication. Key features include Discovery, Matches, Messages with real-time chat, Profile management, and a consolidated onboarding flow. An `ErrorBoundary` ensures graceful error handling.

The system incorporates a 4-tier membership model (Free, Casual, Dating, Business) governing media limits, chat durations, and meeting caps, enforced both client-side and via backend API. A real-time video call extension system allows paid extensions with synchronized timers. Safety features include a 4-strike moderation logic. Core features include smart matching with prioritization, mutual interests highlighting, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery (profile viewers). Media management supports photo uploads and camera-only video recording with tier-based limits. Revenue-protection downgrade flows are implemented for subscription management.

The authentication flow utilizes a "Welcome Back Page" as a universal entry point for unauthenticated users, with a routing guard that directs users based on authentication state and onboarding completion. Robust error handling prevents authentication loops. Onboarding gates ensure completion of consent, membership selection, and profile setup.

UX enhancements include optimistic UI updates for immediate feedback, `ErrorBoundary` components for critical sections, and loading skeletons for improved perceived performance. Security measures include webhook monitoring, idempotency keys for payment processing, database-backed rate limiting on critical endpoints, and database constraints for data integrity. A unified pricing structure is sourced from configuration.

Data integrity and performance are managed through database indexes on frequently accessed tables and central configuration of all limits, thresholds, and pricing. A client-side session monitor ensures secure session management.

Code quality and scalability are maintained through comprehensive Vitest integration tests that interact with real API routes and databases, a full TypeScript migration of payment endpoints for type safety, a production-ready feature flag system for dynamic control, and structured logging for business events.

User experience features include a private user notes system for recording observations about matches, with integration points in post-call modals and chat. Admin features include a user photo management dashboard with search, filtering, and moderation status highlighting.

A hybrid chat monetization system uses a three-pool message deduction (first-encounter bonuses, daily tier allowances, purchased credits) with per-match caps for the Business tier. Video call completion incentives messaging, and credit packs are available for purchase. A real-time quota UI displays remaining messages.

The mobile app upload system uses base64 encoding for media uploads, resolving compatibility issues. Video recording limits are tier-based. A unified `/api/upload-base64` endpoint handles various input types. The profile onboarding UX includes photo requirements, enhanced upload progress, and navigation options.

An enhanced matching system incorporates a comprehensive interests system with 80+ predefined interests and extended preference fields. A weighted scoring algorithm (v2) calculates compatibility for Discovery and Daily Picks APIs, considering shared interests, relationship goals, lifestyle, activity, and tier similarity. The Discovery UI displays compatibility percentages, "Likes You" indicators, bio previews, and shared interests. All preferences, weights, and interests are centrally configured.

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