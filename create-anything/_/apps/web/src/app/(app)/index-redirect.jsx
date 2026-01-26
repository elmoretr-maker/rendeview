import { useNavigate } from "react-router";
import { useEffect } from "react";

export default function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/welcome", { replace: true });
  }, [navigate]);

  return null;
}
