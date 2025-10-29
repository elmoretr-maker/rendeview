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
