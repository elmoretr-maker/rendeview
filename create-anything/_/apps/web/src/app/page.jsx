import { Navigate } from 'react-router';
import useUser from '@/utils/useUser';

export default function Page() {
  const { data: user, loading } = useUser();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/onboarding/welcome" replace />;
  }
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Check onboarding completion status
  if (!user.membership_tier) {
    return <Navigate to="/onboarding/membership" replace />;
  }
  
  if (!user.name) {
    return <Navigate to="/onboarding/profile" replace />;
  }
  
  if (!user.consent_accepted) {
    return <Navigate to="/onboarding/consent?returnTo=/discovery" replace />;
  }
  
  // User is fully onboarded, go to discovery
  return <Navigate to="/discovery" replace />;
}
