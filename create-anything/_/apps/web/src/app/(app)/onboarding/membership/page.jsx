import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, Star, Video, Camera, MessageCircle, Clock, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildDynamicTiers, buildDynamicExtensions } from "@/utils/membershipTiers";
import logoImage from "@/assets/logo-centered.png";

export function meta() {
  return [
    { title: "Choose Your Plan | Rende-View" },
    { name: "description", content: "Select your membership tier for the best video-first dating experience." },
  ];
}

function MembershipContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  const totalSteps = 3;
  const stepIndex = 2;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load pricing");
        const data = await res.json();
        if (mounted) {
          setPricing(data?.settings?.pricing || null);
          setLoadingPricing(false);
        }
      } catch (e) {
        console.error("Failed to load pricing:", e);
        if (mounted) {
          setLoadingPricing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tiers = useMemo(() => buildDynamicTiers(pricing), [pricing]);
  const extensions = useMemo(() => buildDynamicExtensions(pricing), [pricing]);

  const chooseTier = useCallback(
    async (key) => {
      try {
        setLoading(true);
        setSelectedTier(key);
        
        sessionStorage.setItem("selected_tier", key);
        
        // Check if user is authenticated
        const profileRes = await fetch("/api/profile");
        const isAuthenticated = profileRes.ok;
        
        if (isAuthenticated) {
          // User is authenticated
          if (key === "free") {
            // Set tier and go to profile
            await fetch("/api/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ membership_tier: "free", consent_accepted: true }),
            });
            navigate("/onboarding/profile?tier=free");
          } else {
            // Paid tier - initiate Stripe checkout
            const redirectURL = window.location.origin + `/onboarding/profile?tier=${key}`;
            const res = await fetch("/api/payments/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kind: "subscription",
                tier: key,
                redirectURL,
              }),
            });
            
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.error || "Could not start checkout");
            }
            
            const { url } = await res.json();
            if (url) {
              navigate("/stripe", { 
                state: { 
                  checkoutUrl: url,
                  returnTo: `/onboarding/profile?tier=${key}`,
                } 
              });
            } else {
              throw new Error("Missing checkout URL");
            }
          }
        } else {
          // User not authenticated - go to signup with tier
          sessionStorage.setItem("needs_stripe_checkout", key !== "free" ? "true" : "false");
          navigate(`/account/signup?tier=${key}`);
        }
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const getTierIcon = (key) => {
    switch (key) {
      case 'free': return Users;
      case 'casual': return MessageCircle;
      case 'dating': return Video;
      case 'business': return Sparkles;
      default: return Users;
    }
  };

  const getTierColor = (key) => {
    switch (key) {
      case 'free': return '#6b7280';
      case 'casual': return '#9333ea';
      case 'dating': return '#ec4899';
      case 'business': return '#f59e0b';
      default: return '#9333ea';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%)',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: `${(stepIndex / totalSteps) * 100}%`,
                height: '100%',
                backgroundColor: '#9333ea',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Step {stepIndex} of {totalSteps}</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/onboarding/consent")}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#9333ea',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '24px',
            padding: 0,
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
              style={{ width: '60px', height: '60px', objectFit: 'contain' }}
            />
          </div>
          
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#9333ea',
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: '0 0 8px 0',
            }}
          >
            Choose Your Plan
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
            Unlock video chat with a membership. Upgrade anytime.
          </p>
        </div>

        {loadingPricing ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                borderTopColor: '#9333ea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ color: '#6b7280' }}>Loading plans...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {tiers.map((tier) => {
              const TierIcon = getTierIcon(tier.key);
              const tierColor = getTierColor(tier.key);
              const isHighlighted = tier.highlight;
              const isSelected = selectedTier === tier.key;
              
              return (
                <div
                  key={tier.key}
                  style={{
                    backgroundColor: isHighlighted ? '#faf5ff' : '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: isHighlighted ? '2px solid #9333ea' : '1px solid #e5e7eb',
                    boxShadow: isHighlighted 
                      ? '0 10px 25px -5px rgba(147, 51, 234, 0.2)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isHighlighted && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#9333ea',
                        color: '#ffffff',
                        padding: '4px 16px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Star size={12} fill="currentColor" />
                      MOST POPULAR
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: `${tierColor}15`,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <TierIcon size={24} color={tierColor} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                          {tier.title}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{tier.desc}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: '700', color: tierColor, margin: 0 }}>
                        {tier.price}
                      </p>
                    </div>
                  </div>
                  
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Camera size={16} color="#9333ea" />
                      <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>{tier.photos} Photos</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={16} color="#9333ea" />
                      <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                        {tier.videos} Video ({tier.videoDuration}s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#9333ea" />
                      <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>{tier.chatMinutes} min Video Chat</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageCircle size={16} color="#9333ea" />
                      <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>{tier.dailyMessages} Daily Messages</span>
                    </div>
                    {tier.maxMeetings !== undefined && tier.maxMeetings !== Infinity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2' }}>
                        <Check size={16} color="#22c55e" />
                        <span style={{ fontSize: '0.875rem', color: '#22c55e', fontWeight: '500' }}>
                          {tier.maxMeetings} Meeting Limit
                        </span>
                      </div>
                    )}
                    {tier.key === 'free' && tier.videoTrialDays && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2' }}>
                        <Check size={16} color="#22c55e" />
                        <span style={{ fontSize: '0.875rem', color: '#22c55e', fontWeight: '500' }}>
                          {tier.videoTrialDays}-day Video Trial
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => chooseTier(tier.key)}
                    disabled={loading && selectedTier === tier.key}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: tier.key === 'free' ? '#9333ea' : '#ffffff',
                      backgroundColor: tier.key === 'free' ? 'transparent' : '#9333ea',
                      border: tier.key === 'free' ? '2px solid #9333ea' : 'none',
                      borderRadius: '12px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading && selectedTier === tier.key ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: tier.key === 'free' ? 'none' : '0 4px 6px -1px rgba(147, 51, 234, 0.3)',
                    }}
                  >
                    {loading && selectedTier === tier.key
                      ? "Processing..."
                      : tier.key === "free"
                        ? "Start Free"
                        : `Choose ${tier.title}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!loadingPricing && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0' }}>
              Need More Time?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 4px 0' }}>
              Extend any video call with our pay-as-you-go option:
            </p>
            <p style={{ fontSize: '1rem', fontWeight: '600', color: '#22c55e', margin: 0 }}>
              {extensions.formattedPrice} for {extensions.durationMinutes} extra minutes
            </p>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af' }}>
          All plans include our safety features and verified profiles.
          Cancel anytime from your account settings.
        </p>
      </div>
    </div>
  );
}

export default function MembershipScreen() {
  return <MembershipContent />;
}
