import React, { useState } from "react";
import { useNavigate } from "react-router";

export default function Consent() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  const accept = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_accepted: true }),
      });
      if (!res.ok) {
        throw new Error("Failed to save consent");
      }
      navigate("/onboarding/membership", { replace: true });
    } catch (e) {
      console.error(e);
      alert("Could not save consent");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7fafc',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>
          Data Consent
        </h1>
        <p style={{ color: '#718096', marginBottom: '24px' }}>
          We use your location and interests to ensure perfect matches and reliable scheduling. 
          By consenting, you unlock all features for a superior dating experience.
        </p>
        <button
          onClick={accept}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: saving ? '#999' : '#38b2ac',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            marginBottom: '12px'
          }}
        >
          {saving ? 'Saving...' : 'Accept & Continue'}
        </button>
        <button
          onClick={() => navigate("/onboarding/welcome")}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: 'transparent',
            color: '#718096',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
