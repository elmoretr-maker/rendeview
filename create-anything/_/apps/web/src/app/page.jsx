import { Navigate } from 'react-router';
import useUser from '@/utils/useUser';

export default function Page() {
  const { data: user, loading } = useUser();

  // QA_BYPASS: Authentication disabled for QA testing
  // Original code checked user auth and redirected to signin/admin
  // To restore: uncomment the blocks below and remove this direct navigation
  
  // RESTORE THIS FOR PRODUCTION:
  // if (loading) {
  //   return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  // }
  // if (!user) {
  //   return <Navigate to="/account/signin" replace />;
  // }
  // if (user.role === 'admin') {
  //   return <Navigate to="/admin" replace />;
  // }
  
  // QA_BYPASS: Allow direct navigation to discovery page
  return <Navigate to="/discovery" replace />;
}
