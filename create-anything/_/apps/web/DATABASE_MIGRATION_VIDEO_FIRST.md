# Database Migration: Video-First Monetization System
**Date:** November 7, 2025  
**Purpose:** Implement Progressive Video Unlock, Rolling Monthly Rewards, and Flat Daily Video Messages

## New Tables Required

### 1. Conversation Metadata
Tracks conversation start dates and video call completion status for decay logic.

```sql
CREATE TABLE IF NOT EXISTS conversation_metadata (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_video_call_at TIMESTAMPTZ,
  last_video_call_at TIMESTAMPTZ,
  video_call_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_metadata_conversation ON conversation_metadata(conversation_id);
```

### 2. Per-Person Message Tracking
Tracks daily message counts per conversation (10/day before video, then unlocks tier bonuses).

```sql
CREATE TABLE IF NOT EXISTS conversation_daily_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_conversation_daily_messages_conv_user_date 
  ON conversation_daily_messages(conversation_id, user_id, date);
```

### 3. Monthly Video Call Tracking
Tracks unique video call partners per calendar month for rolling reward system.

```sql
CREATE TABLE IF NOT EXISTS monthly_video_calls (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  partner_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  video_session_id INTEGER REFERENCES video_sessions(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partner_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_video_calls_user_month 
  ON monthly_video_calls(user_id, month_year);
```

### 4. Reward Status Tracking
Tracks whether user currently has active reward pricing (3 calls this month).

```sql
CREATE TABLE IF NOT EXISTS reward_status (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  has_active_reward BOOLEAN NOT NULL DEFAULT FALSE,
  current_month_calls INTEGER NOT NULL DEFAULT 0,
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  last_warning_shown_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_status_user ON reward_status(user_id);
```

### 5. Video Message Usage Tracking
Tracks flat daily video message usage across all conversations.

```sql
CREATE TABLE IF NOT EXISTS video_message_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  videos_sent INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_video_message_usage_user_date 
  ON video_message_usage(user_id, date);
```

### 6. Video Message Credits
Tracks purchased video message bundles (never expire).

```sql
CREATE TABLE IF NOT EXISTS video_message_credits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_message_credits_user ON video_message_credits(user_id);
```

### 7. Smart Prompt Events
Logs when smart prompts are shown (for analytics and to prevent spam).

```sql
CREATE TABLE IF NOT EXISTS smart_prompt_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  prompt_type VARCHAR(50) NOT NULL, -- 'long_message', 'message_count_warning', 'video_scheduling', 'reward_warning'
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_taken VARCHAR(50), -- 'dismissed', 'continued_typing', 'purchased_credits', 'scheduled_video'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_prompt_events_user_type 
  ON smart_prompt_events(user_id, prompt_type, shown_at);
```

## Migration Execution

Run this SQL to create all tables:

```sql
-- Execute all CREATE TABLE statements above in order
-- Then verify:

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'conversation_metadata',
  'conversation_daily_messages',
  'monthly_video_calls',
  'reward_status',
  'video_message_usage',
  'video_message_credits',
  'smart_prompt_events'
);

-- Verify all indexes exist
SELECT indexname, tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'conversation_metadata',
  'conversation_daily_messages',
  'monthly_video_calls',
  'reward_status',
  'video_message_usage',
  'video_message_credits',
  'smart_prompt_events'
);
```

## Expected Result
✅ 7 new tables created successfully  
✅ 7 indexes created for performance  
✅ Foreign key constraints established  
✅ Unique constraints prevent duplicate entries  
✅ ON DELETE CASCADE ensures data integrity
