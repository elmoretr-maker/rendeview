import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useSession } from "@auth/create/react";

export default function AppLayout() {
  const { status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === "loading") return;
    
    const PUBLIC_PATHS = [
      "/onboarding/welcome",
      "/onboarding/consent",
      "/onboarding/membership",
      "/onboarding/profile",
      "/account/signin",
      "/account/signup",
    ];
    
    const isPublicPath = PUBLIC_PATHS.some(path => location.pathname.startsWith(path));
    
    if (status === "unauthenticated" && !isPublicPath) {
      navigate("/welcome", { replace: true });
    }
  }, [status, location.pathname, navigate]);

  if (status === "loading") {
    return null;
  }

  return <Outlet />;
}
