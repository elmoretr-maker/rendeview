# Database Migration Log

## Migration: Add Missing Columns to auth_users Table
**Date:** October 29, 2025  
**Purpose:** Add required columns for profile data and membership features

### SQL Executed:
```sql
-- Add 6 missing columns to auth_users table
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS immediate_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_photo_url TEXT,
ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(20) DEFAULT 'casual',
ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS availability_override BOOLEAN DEFAULT false;
```

### Test Data Seeding:
```sql
-- Update Admin user (ID 1)
UPDATE auth_users 
SET 
  immediate_available = true,
  membership_tier = 'dating',
  consent_accepted = true,
  primary_photo_url = image
WHERE id = 1;

-- Update Test User: Sarah Johnson (ID 4)
UPDATE auth_users 
SET 
  immediate_available = true,
  membership_tier = 'active',
  consent_accepted = true,
  primary_photo_url = 'https://i.pravatar.cc/300?img=47'
WHERE id = 4;

-- Update Test User: Mike Davis (ID 5)
UPDATE auth_users 
SET 
  immediate_available = false,
  membership_tier = 'dating',
  consent_accepted = true,
  primary_photo_url = 'https://i.pravatar.cc/300?img=33'
WHERE id = 5;

-- Create sample matches
INSERT INTO matches (user_a_id, user_b_id, created_at) 
VALUES (1, 4, NOW()), (1, 5, NOW());

-- Create sample messages
INSERT INTO messages (match_id, sender_id, body, created_at)
VALUES 
  (2, 4, 'Hey! Nice to meet you!', NOW() - INTERVAL '1 hour'),
  (2, 1, 'Hi Sarah! How are you?', NOW() - INTERVAL '30 minutes'),
  (3, 5, 'Hello there!', NOW() - INTERVAL '2 hours'),
  (3, 1, 'Hey Mike! Good to connect!', NOW() - INTERVAL '90 minutes');

-- Update match timestamps
UPDATE matches SET last_chat_at = NOW() WHERE id IN (2, 3);
```

### Verification:
```sql
-- Verify columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'auth_users' 
AND column_name IN ('immediate_available', 'primary_photo_url', 'membership_tier', 
                     'consent_accepted', 'consent_at', 'availability_override');

-- Verify test data
SELECT id, name, immediate_available, membership_tier, consent_accepted 
FROM auth_users 
WHERE id IN (1, 4, 5);
```

### Result:
✅ All columns added successfully  
✅ Test data populated  
✅ No data loss  
✅ Backward compatible (all new columns nullable or have defaults)

---

## Migration: Hybrid Chat Monetization System
**Date:** October 31, 2025  
**Purpose:** Implement tier-based message quotas, first-encounter bonuses, credit system, and per-match caps

### SQL Executed:
```sql
-- Table 1: Track daily tier message counts per user (resets daily)
CREATE TABLE IF NOT EXISTS user_daily_message_counts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Table 2: Track first-encounter bonus messages per match pair
CREATE TABLE IF NOT EXISTS match_first_encounter_messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  messages_remaining INTEGER NOT NULL DEFAULT 10,
  last_video_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Table 3: Track purchased message credits per user (persistent, no expiration)
CREATE TABLE IF NOT EXISTS user_message_credits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table 4: Track per-match daily message counts (for Business tier per-match caps)
CREATE TABLE IF NOT EXISTS match_daily_message_counts (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  video_call_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_id, date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_daily_message_counts_user_date ON user_daily_message_counts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_match_first_encounter_match_user ON match_first_encounter_messages(match_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_message_credits_user ON user_message_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_match_daily_counts_match_user_date ON match_daily_message_counts(match_id, user_id, date);
```

### Business Logic:
**Message Deduction Priority:**
1. First-encounter messages (10 per match, refreshes after video call)
2. Daily tier messages (Free: 15, Casual: 24, Dating: 50, Business: 500)
3. Purchased credits (persistent until used)

**Business Tier Per-Match Caps:**
- 50 messages per match per day (base)
- 75 messages per match per day (after video call with that match)
- Blocks ALL message types when exhausted (including credits)

**Video Call Benefits:**
- Refreshes 10 first-encounter messages for both users
- Business tier: Increases per-match cap from 50→75
- Unlocks premium features (photo sharing, voice messages, GIFs, read receipts)

### API Endpoints:
- `GET /api/messages/quota?matchId={id}` - Check available messages across all pools
- `POST /api/messages/{matchId}` - Send message (enforces all limits)
- `POST /api/video/complete` - Refresh bonuses after video call

### Verification:
```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_daily_message_counts', 
  'match_first_encounter_messages',
  'user_message_credits',
  'match_daily_message_counts'
);

-- Verify indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'user_daily_message_counts', 
  'match_first_encounter_messages',
  'user_message_credits',
  'match_daily_message_counts'
);
```

### Result:
✅ All 4 tables created successfully  
✅ All 4 indexes created successfully  
✅ Foreign key constraints established  
✅ Unique constraints prevent duplicate entries  
✅ ON DELETE CASCADE ensures data integrity  
✅ Message quota system fully operational
