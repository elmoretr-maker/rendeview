import { useEffect, useState } from "react";
import useUser from "@/utils/useUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const { data: user, loading } = useUser();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  const { data: settingsResp, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
  });
  const settings = settingsResp?.settings || null;

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => setError("Failed to save settings"),
  });
  const handleSave = () => {
    setError(null);
    saveMutation.mutate({
      pricing: settings?.pricing ?? {},
      discount_toggles: settings?.discount_toggles ?? {},
    });
  };

  if (loading || settingsLoading) return <div className="p-6">Loading...</div>;
  if (!user)
    return (
      <div className="p-6">
        Please sign in
        <div className="mt-3">
          <a
            href="/account/signin"
            className="px-3 py-2 rounded text-white"
            style={{ backgroundColor: "#5B3BAF" }}
          >
            Sign in
          </a>
        </div>
      </div>
    );
  if (user?.role !== "admin") return <div className="p-6">Admins only</div>;

  if (!settings) {
    return <div className="p-6">{error || "Loading settings..."}</div>;
  }

  const tiers = settings.pricing?.tiers || {};
  const onTierChange = (tier, field, value) => {
    // optimistic local update via query cache
    queryClient.setQueryData(["admin-settings"], (prev) => {
      const prevSettings = prev?.settings || {};
      const prevTiers = prevSettings?.pricing?.tiers || {};
      return {
        ...(prev || {}),
        settings: {
          ...prevSettings,
          pricing: {
            ...(prevSettings.pricing || {}),
            tiers: {
              ...prevTiers,
              [tier]: { ...(prevTiers[tier] || {}), [field]: Number(value) },
            },
          },
        },
      };
    });
  };

  const onSecondDateChange = (value) => {
    queryClient.setQueryData(["admin-settings"], (prev) => {
      const prevSettings = prev?.settings || {};
      return {
        ...(prev || {}),
        settings: {
          ...prevSettings,
          pricing: {
            ...(prevSettings.pricing || {}),
            second_date_cents: Number(value),
          },
        },
      };
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Settings</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Subscription Tiers (price in cents)
        </h2>
        {Object.keys({ casual: 1, dating: 1, business: 1 }).map((tier) => (
          <div
            key={tier}
            className="grid grid-cols-3 gap-4 items-center border rounded p-4"
          >
            <div className="capitalize font-medium">{tier}</div>
            <label className="text-sm">
              Minutes
              <input
                className="w-full border rounded px-2 py-1 ml-2"
                type="number"
                value={tiers?.[tier]?.minutes ?? 0}
                onChange={(e) => onTierChange(tier, "minutes", e.target.value)}
              />
            </label>
            <label className="text-sm">
              Price (cents)
              <input
                className="w-full border rounded px-2 py-1 ml-2"
                type="number"
                value={tiers?.[tier]?.price_cents ?? 0}
                onChange={(e) =>
                  onTierChange(tier, "price_cents", e.target.value)
                }
              />
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Second Date Fee (cents)</h2>
        <input
          className="w-48 border rounded px-2 py-1"
          type="number"
          value={settings.pricing?.second_date_cents ?? 1000}
          onChange={(e) => onSecondDateChange(e.target.value)}
        />
      </section>

      <div className="flex gap-3 items-center">
        <button
          onClick={handleSave}
          disabled={saveMutation.isLoading}
          className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
        >
          {saveMutation.isLoading ? "Saving..." : "Save Settings"}
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
        {saveMutation.isError && !error && (
          <span className="text-red-600 text-sm">Failed to save settings</span>
        )}
        {saveMutation.isSuccess && (
          <span className="text-green-700 text-sm">Saved</span>
        )}
      </div>

      <div className="mt-8 p-4 border rounded bg-gray-50 text-sm">
        <p>
          Seed first admin user (only once) by calling POST /api/admin/seed with
          email/password if you want different than defaults.
        </p>
      </div>
    </div>
  );
}
