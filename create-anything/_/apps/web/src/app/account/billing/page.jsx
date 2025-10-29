import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
};

function currencyFromCents(cents, currency = "usd") {
  if (typeof cents !== "number") return "-";
  const value = (cents / 100).toFixed(2);
  return `${currency.toUpperCase()} $${value}`;
}

export default function BillingPage() {
  const { data: user, loading } = useUser();
  const [authError, setAuthError] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  // Load pricing/admin settings
  const {
    data: settingsData,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        throw new Error(
          `When fetching /api/admin/settings, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: 1,
  });

  // Load receipts (Stripe charges) for current user
  const {
    data: receipts,
    isLoading: receiptsLoading,
    error: receiptsError,
  } = useQuery({
    queryKey: ["payments", "receipts"],
    queryFn: async () => {
      const res = await fetch("/api/payments/receipts");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) {
        throw new Error(
          `When fetching /api/payments/receipts, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: (count, err) => {
      // @ts-ignore
      if (err?.code === 401) return false;
      return count < 1;
    },
  });

  useEffect(() => {
    // @ts-ignore
    if (receiptsError?.code === 401) {
      setAuthError("Please sign in to view billing.");
    }
  }, [receiptsError]);

  const pricing = settingsData?.settings?.pricing || {};
  const tiers = pricing?.tiers || {};
  const tierEntries = useMemo(() => Object.entries(tiers), [tiers]);
  const firstTierKey = tierEntries[0]?.[0]; // add: first available plan for quick CTA

  const onCheckout = useCallback(async (payload) => {
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          redirectURL:
            typeof window !== "undefined"
              ? window.location.origin + "/account/billing"
              : undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Could not start checkout");
      }
      const j = await res.json();
      if (j?.url) {
        if (typeof window !== "undefined") {
          window.location.href = j.url;
        }
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Checkout failed");
    }
  }, []);

  const startSubscription = useCallback(
    (tier) => {
      onCheckout({ kind: "subscription", tier });
    },
    [onCheckout],
  );

  const paySecondDate = useCallback(() => {
    onCheckout({ kind: "second-date" });
  }, [onCheckout]);

  const openPortal = useCallback(async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/payments/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirectURL:
            typeof window !== "undefined"
              ? window.location.origin + "/account/billing"
              : undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Could not open portal");
      }
      const j = await res.json();
      if (j?.url && typeof window !== "undefined") {
        window.location.href = j.url;
      }
    } catch (e) {
      console.error(e);
      setPortalError(e.message || "Could not open portal");
    } finally {
      setPortalLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        style={{ color: COLORS.text }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="max-w-4xl mx-auto p-6 font-inter"
        style={{ color: COLORS.text }}
      >
        <h1 className="text-2xl font-bold mb-4">Billing</h1>
        <p className="mb-4">You need to be signed in to view billing.</p>
        <a
          href="/account/signin"
          className="inline-block px-4 py-2 rounded"
          style={{ backgroundColor: COLORS.primary, color: "#fff" }}
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div
      className="max-w-5xl mx-auto p-6 font-inter"
      style={{ color: COLORS.text }}
    >
      <h1 className="text-2xl font-bold mb-2">Billing</h1>
      <p className="opacity-80 mb-4">
        Manage your plan and view receipts. Status:{" "}
        <span className="font-semibold">
          {user?.subscription_status || "none"}
        </span>
        {user?.membership_tier ? ` • Plan: ${user.membership_tier}` : ""}
      </p>

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="px-4 py-2 rounded"
          style={{
            backgroundColor: COLORS.primary,
            color: "#fff",
            opacity: portalLoading ? 0.8 : 1,
          }}
        >
          {portalLoading ? "Opening portal…" : "Manage subscription"}
        </button>
        {portalError ? (
          <span className="text-sm" style={{ color: COLORS.error }}>
            {portalError}
          </span>
        ) : null}
      </div>

      {/* Plans */}
      {/* ADD: Loading and error states for plans */}
      {settingsLoading ? (
        <div
          className="p-4 rounded border mb-4"
          style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.border }}
        >
          Loading plans…
        </div>
      ) : settingsError ? (
        <div
          className="p-4 rounded border mb-4"
          style={{
            backgroundColor: COLORS.cardBg,
            borderColor: COLORS.border,
            color: COLORS.error,
          }}
        >
          {settingsError?.message || "Failed to load plans"}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tierEntries.length === 0 && !settingsLoading && !settingsError && (
          <div
            className="col-span-full p-4 rounded border"
            style={{
              backgroundColor: COLORS.cardBg,
              borderColor: COLORS.border,
            }}
          >
            <p>No plans configured yet.</p>
          </div>
        )}
        {tierEntries.map(([key, val]) => {
          const isCurrent =
            (user?.membership_tier || "").toLowerCase() === key.toLowerCase();
          return (
            <div
              key={key}
              className="p-4 rounded border flex flex-col"
              style={{
                backgroundColor: COLORS.cardBg,
                borderColor: COLORS.border,
              }}
            >
              <div className="flex-1">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: COLORS.text }}
                >
                  {key[0].toUpperCase() + key.slice(1)}
                </h2>
                <p className="text-sm opacity-80 mb-2">
                  Minutes: {val?.minutes ?? 0}
                </p>
                <p
                  className="text-xl font-bold"
                  style={{ color: COLORS.primary }}
                >
                  {currencyFromCents(val?.price_cents ?? 0)}
                </p>
              </div>
              {isCurrent ? (
                <button
                  disabled
                  className="mt-4 px-4 py-2 rounded cursor-not-allowed"
                  style={{ backgroundColor: "#E5E7EB", color: "#6B7280" }}
                >
                  Current plan
                </button>
              ) : (
                <button
                  onClick={() => startSubscription(key)}
                  className="mt-4 px-4 py-2 rounded"
                  style={{ backgroundColor: COLORS.primary, color: "#fff" }}
                >
                  Choose plan
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* One-off */}
      <div
        className="mt-8 p-4 rounded border"
        style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.border }}
      >
        <h3 className="text-lg font-semibold mb-1">Second Date</h3>
        <p className="opacity-80 mb-3">
          Pay the $10 second date fee to unlock scheduling a follow-up.
        </p>
        <button
          onClick={paySecondDate}
          className="px-4 py-2 rounded"
          style={{ backgroundColor: COLORS.secondary, color: "#fff" }}
        >
          Pay {currencyFromCents(pricing?.second_date_cents ?? 1000)}
        </button>
      </div>

      {/* Receipts */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Recent payments</h3>
        {authError ? (
          <div
            className="p-4 rounded border"
            style={{
              backgroundColor: COLORS.cardBg,
              borderColor: COLORS.border,
            }}
          >
            <p className="mb-3">{authError}</p>
            <a
              href="/account/signin"
              className="inline-block px-4 py-2 rounded"
              style={{ backgroundColor: COLORS.primary, color: "#fff" }}
            >
              Sign in
            </a>
          </div>
        ) : receiptsLoading ? (
          <div
            className="p-4 rounded border"
            style={{
              backgroundColor: COLORS.cardBg,
              borderColor: COLORS.border,
            }}
          >
            Loading…
          </div>
        ) : receiptsError ? (
          <div
            className="p-4 rounded border"
            style={{
              backgroundColor: COLORS.cardBg,
              borderColor: COLORS.border,
              color: COLORS.error,
            }}
          >
            {receiptsError?.message || "Failed to load receipts"}
          </div>
        ) : (
          <div className="space-y-2">
            {(receipts?.charges || []).length === 0 ? (
              <div
                className="p-4 rounded border flex items-center justify-between"
                style={{
                  backgroundColor: COLORS.cardBg,
                  borderColor: COLORS.border,
                }}
              >
                <div>
                  <div className="font-semibold">No payments yet</div>
                  <div className="text-sm opacity-80">
                    Pick a plan to get started.
                  </div>
                </div>
                {firstTierKey ? (
                  <button
                    onClick={() => startSubscription(firstTierKey)}
                    className="px-3 py-2 rounded text-sm"
                    style={{ backgroundColor: COLORS.primary, color: "#fff" }}
                  >
                    Choose a plan
                  </button>
                ) : null}
              </div>
            ) : (
              (receipts?.charges || []).map((c) => {
                const date = new Date((c.created || 0) * 1000);
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded border flex items-center justify-between"
                    style={{
                      backgroundColor: COLORS.cardBg,
                      borderColor: COLORS.border,
                    }}
                  >
                    <div>
                      <div className="font-semibold">
                        {c.description || "Payment"}
                      </div>
                      <div className="text-sm opacity-80">
                        {date.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="font-semibold"
                        style={{ color: COLORS.text }}
                      >
                        {currencyFromCents(c.amount_cents, c.currency)}
                      </span>
                      {c.receipt_url ? (
                        <a
                          href={c.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded text-sm"
                          style={{
                            backgroundColor: COLORS.primary,
                            color: "#fff",
                          }}
                        >
                          Receipt
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
