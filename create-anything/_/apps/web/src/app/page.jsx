import { Navigate } from 'react-router';
import useUser from '@/utils/useUser';

export default function Page() {
  const { data: user, loading } = useUser();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/account/signin" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/admin" replace />;
}
