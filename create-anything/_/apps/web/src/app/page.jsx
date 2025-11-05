import { Navigate } from 'react-router';
import useUser from '@/utils/useUser';

export default function Page() {
  const { data: user, loading } = useUser();

  // Debug logging
  console.log('[INDEX PAGE] Loading:', loading);
  console.log('[INDEX PAGE] User data:', user);
  console.log('[INDEX PAGE] consent_accepted:', user?.consent_accepted);
  console.log('[INDEX PAGE] role:', user?.role);
  console.log('[INDEX PAGE] membership_tier:', user?.membership_tier);
  console.log('[INDEX PAGE] name:', user?.name);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/welcome" replace />;
  }
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // NEW ONBOARDING FLOW: Welcome → Consent → Membership → [Payment] → Profile → Main App
  // Step 1: Check consent first (moved earlier in flow)
  if (!user.consent_accepted) {
    return <Navigate to="/onboarding/consent" replace />;
  }

  // Step 2: Check membership tier
  if (!user.membership_tier) {
    return <Navigate to="/onboarding/membership" replace />;
  }
  
  // Step 3: Check profile completion
  if (!user.name) {
    return <Navigate to="/onboarding/profile" replace />;
  }
  
  // User is fully onboarded, go to discovery
  return <Navigate to="/discovery" replace />;
}
