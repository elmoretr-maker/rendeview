import * as React from 'react';
import { useSession } from "@auth/create/react";

// QA_BYPASS: Mock user for authentication bypass during QA testing
// REMOVE THIS ENTIRE BLOCK TO RESTORE REAL AUTHENTICATION
const QA_MOCK_USER = {
  id: 1,
  email: "main@example.com",
  name: "Trae",
  role: "user",
  membership_tier: "free",
  consent_accepted: true
};

const useUser = () => {
  const { data: session, status } = useSession();
  const id = session?.user?.id

  const [user, setUser] = React.useState(session?.user ?? null);

  const fetchUser = React.useCallback(async (session) => {
  return session?.user;
}, [])

  const refetchUser = React.useCallback(() => {
    if(process.env.NEXT_PUBLIC_CREATE_ENV === "PRODUCTION") {
      if (id) {
        fetchUser(session).then(setUser);
      } else {
        setUser(null);
      }
    }
  }, [fetchUser, id])

  React.useEffect(refetchUser, [refetchUser]);

  // QA_BYPASS: Return mock user to bypass all authentication checks
  // TO RESTORE: Remove the line below and uncomment the original return statements
  return { user: QA_MOCK_USER, data: QA_MOCK_USER, loading: false, refetch: refetchUser };

  // RESTORE THESE FOR PRODUCTION:
  // if (process.env.NEXT_PUBLIC_CREATE_ENV !== "PRODUCTION") {
  //   return { user, data: session?.user || null, loading: status === 'loading', refetch: refetchUser };
  // }
  // return { user, data: user, loading: status === 'loading' || (status === 'authenticated' && !user), refetch: refetchUser };
};

export { useUser }

export default useUser;