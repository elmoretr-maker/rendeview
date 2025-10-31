# Database Performance Indexes Migration

## Overview
This migration adds 11 performance indexes to improve query speed on frequently accessed columns in auth_users, video_sessions, and matches tables.

**Date:** October 31, 2025  
**Purpose:** Optimize database query performance for user lookups, session management, and match queries

## Indexes Created

### auth_users Table (3 indexes)
1. **idx_auth_users_membership_tier** - Speeds up filtering and grouping users by membership tier
2. **idx_auth_users_created_at** - Optimizes user list sorting and date range queries (descending)
3. **idx_auth_users_last_active** - Improves active user queries (partial index, only where last_active IS NOT NULL)

### video_sessions Table (5 indexes)
1. **idx_video_sessions_match_id** - Accelerates lookup of sessions by match
2. **idx_video_sessions_caller_id** - Speeds up queries for sessions initiated by specific users
3. **idx_video_sessions_callee_id** - Speeds up queries for sessions received by specific users
4. **idx_video_sessions_created_at** - Optimizes session history queries (descending)
5. **idx_video_sessions_state** - Improves filtering by session state (partial index, only where state IS NOT NULL)

### matches Table (3 indexes)
1. **idx_matches_user_a_id** - Accelerates queries for matches by first user
2. **idx_matches_user_b_id** - Accelerates queries for matches by second user
3. **idx_matches_created_at** - Optimizes match list sorting and date range queries (descending)

## SQL Migration Script

### Production Deployment
For production databases, use `CREATE INDEX CONCURRENTLY` to avoid locking tables:

```sql
-- PRODUCTION: Use CONCURRENTLY to avoid table locks during index creation
-- Note: Cannot be run in a transaction block

-- auth_users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_users_membership_tier 
ON auth_users(membership_tier);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_users_created_at 
ON auth_users(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_users_last_active 
ON auth_users(last_active DESC) 
WHERE last_active IS NOT NULL;

-- video_sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_sessions_match_id 
ON video_sessions(match_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_sessions_caller_id 
ON video_sessions(caller_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_sessions_callee_id 
ON video_sessions(callee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_sessions_created_at 
ON video_sessions(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_sessions_state 
ON video_sessions(state) 
WHERE state IS NOT NULL;

-- matches indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user_a_id 
ON matches(user_a_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user_b_id 
ON matches(user_b_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_created_at 
ON matches(created_at DESC);
```

### Development Deployment
For development databases (faster, with brief table locks):

```sql
-- DEVELOPMENT: Standard CREATE INDEX (may briefly lock tables)

-- auth_users indexes
CREATE INDEX IF NOT EXISTS idx_auth_users_membership_tier 
ON auth_users(membership_tier);

CREATE INDEX IF NOT EXISTS idx_auth_users_created_at 
ON auth_users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_users_last_active 
ON auth_users(last_active DESC) 
WHERE last_active IS NOT NULL;

-- video_sessions indexes
CREATE INDEX IF NOT EXISTS idx_video_sessions_match_id 
ON video_sessions(match_id);

CREATE INDEX IF NOT EXISTS idx_video_sessions_caller_id 
ON video_sessions(caller_id);

CREATE INDEX IF NOT EXISTS idx_video_sessions_callee_id 
ON video_sessions(callee_id);

CREATE INDEX IF NOT EXISTS idx_video_sessions_created_at 
ON video_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_sessions_state 
ON video_sessions(state) 
WHERE state IS NOT NULL;

-- matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_user_a_id 
ON matches(user_a_id);

CREATE INDEX IF NOT EXISTS idx_matches_user_b_id 
ON matches(user_b_id);

CREATE INDEX IF NOT EXISTS idx_matches_created_at 
ON matches(created_at DESC);
```

## Verification

After running the migration, verify all indexes were created:

```sql
-- Verify all new indexes exist
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('auth_users', 'video_sessions', 'matches')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Expected output: 11 rows showing all the indexes listed above.

## Rollback

To remove these indexes (not recommended unless needed for troubleshooting):

```sql
-- Remove all performance indexes
DROP INDEX IF EXISTS idx_auth_users_membership_tier;
DROP INDEX IF EXISTS idx_auth_users_created_at;
DROP INDEX IF EXISTS idx_auth_users_last_active;
DROP INDEX IF EXISTS idx_video_sessions_match_id;
DROP INDEX IF EXISTS idx_video_sessions_caller_id;
DROP INDEX IF EXISTS idx_video_sessions_callee_id;
DROP INDEX IF EXISTS idx_video_sessions_created_at;
DROP INDEX IF EXISTS idx_video_sessions_state;
DROP INDEX IF EXISTS idx_matches_user_a_id;
DROP INDEX IF EXISTS idx_matches_user_b_id;
DROP INDEX IF EXISTS idx_matches_created_at;
```

## Performance Impact

**Expected Improvements:**
- User tier filtering queries: 50-80% faster
- Match history queries: 60-90% faster (descending order)
- Video session lookups by user/match: 70-95% faster
- Active user queries: 40-60% faster

**Storage Impact:**
- Estimated additional storage: ~5-15 MB (depends on table sizes)
- Negligible impact on insert/update performance for these table sizes

## Applied To
- ✅ Development database (October 31, 2025) - **VERIFIED: All 11 indexes successfully created**
- ⬜ Staging database
- ⬜ Production database

### Verification Results (Development)
**Date Applied:** October 31, 2025  
**Indexes Created:** 11/11  
**Status:** ✅ All indexes verified via pg_indexes query

**auth_users table (3 indexes):**
- ✅ idx_auth_users_membership_tier
- ✅ idx_auth_users_created_at (DESC)
- ✅ idx_auth_users_last_active (partial index)

**video_sessions table (5 indexes):**
- ✅ idx_video_sessions_match_id
- ✅ idx_video_sessions_caller_id
- ✅ idx_video_sessions_callee_id
- ✅ idx_video_sessions_created_at (DESC)
- ✅ idx_video_sessions_state (partial index)

**matches table (3 indexes):**
- ✅ idx_matches_user_a_id
- ✅ idx_matches_user_b_id
- ✅ idx_matches_created_at (DESC)

## Notes
- All indexes use `IF NOT EXISTS` for safe re-running
- Partial indexes (last_active, state) reduce index size and maintenance
- Descending indexes (created_at) optimize common sort patterns
- Production deployment should use `CONCURRENTLY` to avoid downtime
