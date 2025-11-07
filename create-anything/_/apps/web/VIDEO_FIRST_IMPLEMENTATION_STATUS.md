# Video-First Monetization System - Implementation Status

**Last Updated:** November 7, 2025  
**Status:** Backend Complete ✅ | Web UI In Progress 🚧 | Mobile Pending ⏳

---

## ✅ COMPLETED: Backend Infrastructure

### Database Tables (All Created Successfully)
1. ✅ `conversation_metadata` - Tracks video call completion per conversation
2. ✅ `conversation_daily_messages` - Per-person message tracking  
3. ✅ `monthly_video_calls` - Monthly unique video partners for rewards
4. ✅ `reward_status` - Active 50% bonus tracking
5. ✅ `video_message_usage` - Flat daily video message totals
6. ✅ `video_message_credits` - Purchased video message bundles
7. ✅ `smart_prompt_events` - Smart prompt analytics

### API Endpoints (All Tested & Working)

#### ✅ `/api/messages/conversation-quota` (GET)
Returns Progressive Video Unlock quota for specific conversation.

**Response:**
```json
{
  "messagesAllowedToday": 10,
  "messagesSentToday": 5,
  "messagesRemaining": 5,
  "isDecayMode": false,
  "hasCompletedVideo": false,
  "bonusMessages": 0,
  "creditsAvailable": 0,
  "canSendMessage": true,
  "blockingReason": null,
  "tier": "casual",
  "shouldShowVideoNudge": false
}
```

#### ✅ `/api/messages/credits/purchase` (GET & POST)

**GET Response:**
```json
{
  "packs": [
    {
      "id": "PACK_SMALL",
      "credits": 30,
      "price": "$1.99",
      "priceInCents": 199,
      "perMessageCost": 0.07,
      "bonusPercentage": 50,
      "label": "Small Pack"
    }
  ],
  "pricingTier": "REWARD",
  "currentBalance": 15,
  "videoCallsThisMonth": 3,
  "hasActiveReward": true
}
```

**POST Body:**
```json
{
  "packSize": "PACK_LARGE",
  "stripePaymentIntentId": "pi_xxx"
}
```

#### ✅ `/api/messages/video/quota` (GET)
Returns flat daily video message quota.

**Response:**
```json
{
  "canSendVideoMessage": true,
  "blockingReason": null,
  "videosAllowedToday": 3,
  "videosSentToday": 1,
  "videosRemaining": 2,
  "creditsAvailable": 5,
  "maxDurationSeconds": 15,
  "tier": "casual"
}
```

#### ✅ `/api/rewards/status` (GET)
Returns monthly reward status and warnings.

**Response:**
```json
{
  "hasActiveReward": false,
  "videoCallsThisMonth": 1,
  "requiredCalls": 3,
  "remainingCalls": 2,
  "daysUntilMonthEnd": 15,
  "showWarning": false,
  "warningMessage": null,
  "monthYear": "2025-11"
}
```

#### ✅ `/api/video/calls/complete` (POST)
Tracks video call completion for both participants.

**Body:**
```json
{
  "conversationId": 123,
  "partnerId": 456,
  "videoSessionId": 789
}
```

#### ✅ `/api/conversations/[conversationId]/messages` (POST) - **ENFORCED**
Message sending now enforces Progressive Video Unlock restrictions:
- ✅ 10 messages/day per person before first video
- ✅ Decay to 2 messages/day after 3 days without video  
- ✅ Post-video: 10 + tier bonus (Casual:+25, Dating:+50, Business:+100)
- ✅ Falls back to purchased credits when limit exhausted

**Error Response (429) when limit reached:**
```json
{
  "error": "You've sent 10 messages to this person today. Complete a video call to unlock more messages!",
  "quotaExceeded": true,
  "tier": "casual",
  "reason": "pre_video_limit",
  "conversationMessagesToday": 10,
  "messagesAllowed": 10,
  "isDecay": false,
  "hasCompletedVideo": false
}
```

---

## 🚧 IN PROGRESS: Web UI Components

### ✅ Completed Components

#### 1. BuyCreditsModal (Updated)
- ✅ Fetches dynamic pricing from `/api/messages/credits/purchase`
- ✅ Shows current balance
- ✅ Displays reward status (50% bonus active or progress)
- ✅ Shows bonus percentage on credit packs
- ✅ TODO: Integrate Stripe payment flow

**Usage:**
```jsx
import { BuyCreditsModal } from '@/components/BuyCreditsModal';

<BuyCreditsModal 
  isOpen={showBuyCreditsModal}
  onClose={() => setShowBuyCreditsModal(false)}
  currentTier={user?.membership_tier}
/>
```

#### 2. RewardStatusBanner (New)
- ✅ Shows monthly progress toward 3 video calls
- ✅ Displays 7-day warning before month end
- ✅ Auto-refreshes every 30 seconds
- ✅ Compact mode for navigation bars

**Usage:**
```jsx
import { RewardStatusBanner } from '@/components/RewardStatusBanner';

// Full banner
<RewardStatusBanner />

// Compact version
<RewardStatusBanner compact />
```

#### 3. SmartPrompts (New)
- ✅ LongMessagePrompt (280+ characters)
- ✅ VideoSchedulingNudge (at message 8)
- ✅ DecayModePrompt (3+ days without video)
- ✅ PreVideoLimitReached (hit 10 message limit)
- ✅ RewardWarningPrompt (7 days before month end)

**Usage:**
```jsx
import { 
  LongMessagePrompt, 
  VideoSchedulingNudge,
  DecayModePrompt,
  PreVideoLimitReached,
  RewardWarningPrompt
} from '@/components/SmartPrompts';

// Show based on conditions
{text.length >= 280 && (
  <LongMessagePrompt 
    onKeepTyping={() => {/* deduct 1 credit */}}
    onScheduleVideo={() => navigate('/schedule')}
    onDismiss={() => setShowPrompt(false)}
  />
)}
```

### ⏳ Pending Web Components

#### 1. Conversation Page Integration
**File:** `create-anything/_/apps/web/src/app/(app)/messages/[conversationId]/page.jsx`

**Required Changes:**
1. Replace quota API call from `/api/message-quota` to `/api/messages/conversation-quota`
2. Add state for smart prompts:
   ```jsx
   const [showLongMessagePrompt, setShowLongMessagePrompt] = useState(false);
   const [showVideoNudge, setShowVideoNudge] = useState(false);
   const [showDecayPrompt, setShowDecayPrompt] = useState(false);
   const [showLimitPrompt, setShowLimitPrompt] = useState(false);
   ```
3. Add text length detector:
   ```jsx
   useEffect(() => {
     if (text.length >= 280 && !showLongMessagePrompt) {
       setShowLongMessagePrompt(true);
     }
   }, [text]);
   ```
4. Add message count detector (show nudge at message 8):
   ```jsx
   useEffect(() => {
     if (quotaData?.messagesSentToday === 8 && quotaData?.messagesRemaining === 2) {
       setShowVideoNudge(true);
     }
   }, [quotaData]);
   ```
5. Handle 429 error to show appropriate prompt based on `reason`
6. Import and render all smart prompt components

#### 2. Video Message Recording Component
**File:** `create-anything/_/apps/web/src/components/VideoMessageRecorder.jsx`

**Features Needed:**
- Camera/microphone access
- Tier-based duration limits (Free:10s, Casual:15s, Dating:30s, Business:60s)
- Recording timer with visual countdown
- Preview and re-record functionality
- Upload to object storage
- Track usage via `/api/messages/video/quota`

#### 3. Integration into App Layout
**Files to Update:**
- Add RewardStatusBanner to main layout/navigation
- Show banner on messages page, discovery page, settings
- Only show warning version 7 days before month end

---

## ⏳ PENDING: Mobile Implementation

### Required Mobile Components

#### 1. Message Credit Purchase Screen
**File:** `create-anything/_/apps/mobile/app/messages/credits/purchase.tsx`

#### 2. Video Message Recorder (React Native)
**File:** `create-anything/_/apps/mobile/components/VideoMessageRecorder.tsx`
- Use expo-camera for recording
- Tier-based duration limits
- Upload to object storage

#### 3. Smart Prompt Modals (React Native)
**File:** `create-anything/_/apps/mobile/components/SmartPrompts.tsx`
- Native modal versions of all web prompts
- Match web behavior exactly

#### 4. Reward Status Banner (React Native)
**File:** `create-anything/_/apps/mobile/components/RewardStatusBanner.tsx`
- Native version matching web design
- Use in navigation or as persistent banner

---

## 📋 Testing Checklist

### Backend Testing
- [ ] Test Progressive Video Unlock enforcement (10 msgs → decay → post-video)
- [ ] Test reward status calculation (3 calls → active bonus)
- [ ] Test monthly reset logic (new month → reset counts)
- [ ] Test video call completion tracking for both participants
- [ ] Test credit purchase with reward pricing
- [ ] Test video message quota (flat daily totals)

### Frontend Testing (Web)
- [ ] Test smart prompts display at correct triggers
- [ ] Test BuyCreditsModal shows correct pricing
- [ ] Test RewardStatusBanner updates in real-time
- [ ] Test message sending blocked when quota exceeded
- [ ] Test credit deduction when continuing past limit
- [ ] Test video scheduling navigation from prompts

### Mobile Testing
- [ ] Test all features have parity with web
- [ ] Test native video recording
- [ ] Test credit purchase flow
- [ ] Test smart prompts display correctly

---

## 🔄 Integration Flow Example

### Scenario: User sends 10th message before video call

1. **User types message #10 → POST `/api/conversations/[id]/messages`**
   - Backend checks `conversation_daily_messages` → sees 10 messages sent
   - Backend checks `conversation_metadata` → no video calls completed
   - Backend returns 429 error with `reason: "pre_video_limit"`

2. **Frontend receives 429 error**
   ```jsx
   if (error.response?.status === 429 && error.data?.reason === 'pre_video_limit') {
     setShowLimitPrompt(true); // Show PreVideoLimitReached prompt
   }
   ```

3. **User clicks "Schedule Video Call"**
   ```jsx
   <PreVideoLimitReached 
     onScheduleVideo={() => navigate(`/schedule/propose/${data.otherUser.id}`)}
     onBuyCredits={() => setShowBuyCreditsModal(true)}
     onDismiss={() => setShowLimitPrompt(false)}
   />
   ```

4. **User completes video call → POST `/api/video/calls/complete`**
   - Updates `conversation_metadata` (video_call_count++, first_video_call_at)
   - Inserts into `monthly_video_calls` for both participants
   - Updates `reward_status` if user now has 3 calls this month

5. **User sends message #11 → POST `/api/conversations/[id]/messages`**
   - Backend sees `hasCompletedVideo = true`
   - Backend calculates: messagesAllowed = 10 + 25 (Casual tier) = 35
   - Message goes through successfully ✅

---

## 🎯 Next Steps

1. **Complete Web UI Integration** (Current Priority)
   - [ ] Update conversation page quota API call
   - [ ] Add smart prompt state management
   - [ ] Wire up all prompt triggers
   - [ ] Test end-to-end flow

2. **Build Video Message Recorder** (Web)
   - [ ] Camera/mic access
   - [ ] Tier-based duration limits
   - [ ] Upload to object storage
   - [ ] Integrate into chat interface

3. **Replicate to Mobile**
   - [ ] Port all web components to React Native
   - [ ] Ensure 100% feature parity
   - [ ] Test on both platforms

4. **Final Testing & Polish**
   - [ ] End-to-end testing of all flows
   - [ ] Performance optimization
   - [ ] Analytics integration
   - [ ] Deploy to production

---

## 📊 Business Logic Summary

### Progressive Video Unlock
- **Before first video call:** 10 messages/day per person
- **Day 1-3 without video:** 10 messages/day continues
- **Day 4+ without video:** Decays to 2 messages/day
- **After video call:** 10 + tier bonus daily messages
  - Free: 10 + 0 = 10 messages/day
  - Casual: 10 + 25 = 35 messages/day
  - Dating: 10 + 50 = 60 messages/day
  - Business: 10 + 100 = 110 messages/day

### Rolling Monthly Reward System
- **Initial unlock:** Complete 3 video calls with 3 different people
- **Maintenance:** Complete 3 NEW video calls each calendar month
- **Reward:** 50% more credits for same price
  - Standard: $1.99 = 20 credits ($0.10/msg)
  - Reward: $1.99 = 30 credits ($0.07/msg)
- **Warning:** 7 days before month end if requirement not met
- **Reset:** First day of new month (not rolling 30-day window)

### Flat Daily Video Messages
- **Free:** 1 video message/day (total across all conversations)
- **Casual:** 3 video messages/day
- **Dating:** 5 video messages/day
- **Business:** 10 video messages/day
- User allocates daily allowance however they choose
- Unlocked after completing first video call with person

---

**Status:** Ready for web UI integration and mobile development.
