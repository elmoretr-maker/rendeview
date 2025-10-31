import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export function OnboardingGuard({ children, allowUnauthenticated = false }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const res = await fetch("/api/profile");
        
        if (!res.ok) {
          if (res.status === 401 && !allowUnauthenticated) {
            navigate("/onboarding/welcome", { replace: true });
            return;
          }
          if (res.status === 401 && allowUnauthenticated) {
            setChecking(false);
            return;
          }
          throw new Error("Failed to check profile");
        }

        const data = await res.json();
        const user = data?.user;
        const media = data?.media || [];
        const photos = media.filter((m) => m.type === "photo");

        if (
          user?.consent_accepted &&
          user?.membership_tier &&
          user?.name &&
          photos.length >= 2
        ) {
          navigate("/discovery", { replace: true });
          return;
        }

        setChecking(false);
      } catch (e) {
        console.error("Onboarding guard error:", e);
        setChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [navigate, allowUnauthenticated]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return children;
}
