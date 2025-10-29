# SECURITY BYPASS FOR QA TESTING

**⚠️ WARNING: ALL AUTHENTICATION AND ONBOARDING CHECKS ARE TEMPORARILY DISABLED**

## Purpose
This configuration allows QA testing and flow verification without authentication barriers.
All users can access all pages directly for testing purposes.

## What Was Disabled

### 1. Root Page Authentication (page.jsx)
- **File**: `src/app/page.jsx`
- **Change**: Removed authentication checks and redirects
- **Original**: Checked user auth and role, redirected to signin/admin
- **Modified**: Direct navigation allowed to any route

### 2. User Authentication Hook (useUser.js)
- **File**: `src/utils/useUser.js`
- **Change**: Returns mock authenticated user
- **Original**: Fetched real user from API, handled 401s
- **Modified**: Returns fake user data to bypass auth gates

### 3. Discovery Page Auth Check
- **File**: `src/app/(app)/discovery/page.jsx`
- **Change**: Removed 401 error handling
- **Modified**: Allows unauthenticated access

### 4. Profile Page Auth Check
- **File**: `src/app/(app)/profile/page.jsx`
- **Change**: Removed 401 handling
- **Modified**: Allows direct access without login

### 5. Matches/Messages Auth Checks
- **Files**: Multiple in `(app)/matches/` and `(app)/messages/`
- **Change**: Removed session expiry checks
- **Modified**: Direct page access enabled

## How to Re-Enable Security

### Step 1: Restore Root Page
In `src/app/page.jsx`, uncomment the original authentication logic:
```javascript
// RESTORE THIS CODE:
if (!user) {
  return <Navigate to="/account/signin" replace />;
}
if (user.role === 'admin') {
  return <Navigate to="/admin" replace />;
}
```

### Step 2: Restore useUser Hook
In `src/utils/useUser.js`, remove the mock user and restore API calls:
```javascript
// REMOVE mock user return
// RESTORE original fetch("/api/user") logic
```

### Step 3: Restore Page-Level Auth Checks
Search for `// QA_BYPASS` comments in all page files and restore original auth handling

### Step 4: Test Authentication Flow
After re-enabling:
1. Test signin/signup flow
2. Verify protected routes redirect to signin
3. Test onboarding gates
4. Verify API 401 responses trigger signin

## Files Modified for QA Bypass
1. `src/app/page.jsx` - Root redirect logic
2. `src/utils/useUser.js` - User auth hook
3. `src/app/(app)/discovery/page.jsx` - Discovery auth
4. `src/app/(app)/profile/page.jsx` - Profile auth
5. `src/app/(app)/matches/page.jsx` - Matches auth
6. `src/app/(app)/messages/page.jsx` - Messages auth
7. (Additional pages with auth checks)

## Testing Notes
- All pages are accessible without login
- No onboarding requirements enforced
- API calls may still return 401 but UI ignores them
- Use this ONLY for UI/UX flow testing
- NEVER deploy to production with these bypasses

## Date of Bypass
Created: October 29, 2025
**MUST BE REVERTED BEFORE PRODUCTION DEPLOYMENT**
