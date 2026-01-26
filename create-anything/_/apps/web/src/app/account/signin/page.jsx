import { useState } from "react";
import { redirect, useSearchParams } from "react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import useAuth from "@/utils/useAuth";
import sql from "@/app/api/utils/sql";
import logoImage from "@/assets/logo-centered.png";

export function meta() {
  return [
    { title: "Sign In | Rende-View" },
    { name: "description", content: "Sign in to your Rende-View account" },
  ];
}

export async function loader({ request }) {
  const { auth } = await import("@/auth");
  const session = await auth();
  
  if (session?.user?.id) {
    const url = new URL(request.url);
    const callbackUrl = url.searchParams.get('callbackUrl');
    
    if (callbackUrl) {
      if (callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
        return redirect(callbackUrl);
      }
    }
    
    const userId = Number(session.user.id);
    
    const [profileData] = await sql`
      SELECT 
        profile_completed,
        data_consent_given,
        membership_tier
      FROM auth_users 
      WHERE id = ${userId}
    `;
    
    if (!profileData) {
      return null;
    }
    
    if (!profileData.data_consent_given) {
      return redirect("/onboarding/data-consent-required");
    }
    
    if (!profileData.profile_completed) {
      return redirect("/onboarding/profile");
    }
    
    return redirect("/discovery");
  }
  
  return null;
}

export default function SignInPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { signInWithCredentials } = useAuth();
  
  const selectedTier = searchParams.get("tier");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const callbackUrl = selectedTier 
        ? `/onboarding/profile?tier=${selectedTier}`
        : "/";
      
      await signInWithCredentials({
        email,
        password,
        callbackUrl,
        redirect: true,
      });
    } catch (err) {
      const errorMessages = {
        OAuthSignin:
          "Couldn't start sign-in. Please try again or use a different method.",
        OAuthCallback: "Sign-in failed after redirecting. Please try again.",
        OAuthCreateAccount:
          "Couldn't create an account with this sign-in method. Try another option.",
        EmailCreateAccount:
          "This email can't be used to create an account. It may already exist.",
        Callback: "Something went wrong during sign-in. Please try again.",
        OAuthAccountNotLinked:
          "This account is linked to a different sign-in method. Try using that instead.",
        CredentialsSignin:
          "Incorrect email or password. Try again or reset your password.",
        AccessDenied: "You don't have permission to sign in.",
        Configuration:
          "Sign-in isn't working right now. Please try again later.",
        Verification: "Your sign-in link has expired. Request a new one.",
      };

      setError(
        errorMessages[err.message] || "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%)',
        padding: '24px',
      }}
    >
      <form
        noValidate
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          position: 'relative',
        }}
      >
        <a
          href="/onboarding/membership"
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#9333ea',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          <ArrowLeft size={18} />
          Back
        </a>

        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '16px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              backgroundColor: '#1a1a2e',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <img
              src={logoImage}
              alt="Rende-View"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain',
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: '700',
              color: '#9333ea',
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: '0 0 8px 0',
            }}
          >
            Sign In to Rende-View
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
            Continue your journey to meaningful connections
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Email
            </label>
            <input
              required
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#9333ea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                required
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                color: '#dc2626',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: '#9333ea',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(147, 51, 234, 0.3)',
              marginTop: '8px',
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', margin: '8px 0 0 0' }}>
            Don't have an account?{" "}
            <a
              href={`/account/signup${selectedTier ? `?tier=${selectedTier}` : ''}`}
              style={{
                color: '#9333ea',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Sign up
            </a>
          </p>
        </div>
      </form>

      <p
        style={{
          marginTop: '24px',
          fontSize: '0.75rem',
          color: '#6b7280',
          textAlign: 'center',
        }}
      >
        Step 3 of 3
      </p>
    </div>
  );
}
