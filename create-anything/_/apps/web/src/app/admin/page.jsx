import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import useUser from "@/utils/useUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const { data: user, loading } = useUser();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  // Check if user has admin access (email contains 'staff' OR specific email)
  const isAdmin = user?.email?.toLowerCase().includes('staff') || 
                 user?.email?.toLowerCase() === 'trelmore.staff@gmail.com';

  // Fetch admin settings
  const { data: settingsResp, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });
  const settings = settingsResp?.settings || null;

  // Fetch flagged users
  const { data: flaggedUsersResp, isLoading: flaggedLoading } = useQuery({
    queryKey: ["admin-flagged-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flagged-users");
      if (!res.ok) throw new Error("Failed to load flagged users");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });
  const flaggedUsers = flaggedUsersResp?.users || [];

  // Fetch revenue stats
  const { data: revenueResp, isLoading: revenueLoading } = useQuery({
    queryKey: ["admin-revenue-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/revenue-stats");
      if (!res.ok) throw new Error("Failed to load revenue stats");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });
  const stats = revenueResp?.stats || null;

  // Mutation to clear flag
  const clearFlagMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch("/api/admin/clear-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to clear flag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-users"] });
    },
  });

  // Mutation to save settings
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

  const handleClearFlag = (userId) => {
    if (window.confirm("Are you sure you want to clear the flag for this user?")) {
      clearFlagMutation.mutate(userId);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/account/signin" replace />;
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/account/signin" replace />;
  }

  const onTierChange = (tier, field, value) => {
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Logged in as: <span className="font-medium">{user.email}</span>
          </p>
        </div>

        {/* Safety Management Section */}
        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Safety Management</h2>
            <p className="mt-1 text-sm text-gray-600">
              Flagged members with 3 or more blocks requiring review
            </p>
          </div>
          <div className="p-6">
            {flaggedLoading ? (
              <div className="text-center py-8 text-gray-500">Loading flagged users...</div>
            ) : flaggedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No flagged users at this time
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Blocks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {flaggedUsers.map((flaggedUser) => (
                      <tr key={flaggedUser.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {flaggedUser.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {flaggedUser.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {flaggedUser.block_count || 0} blocks
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            flaggedUser.account_status === 'active' ? 'bg-green-100 text-green-800' :
                            flaggedUser.account_status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {flaggedUser.account_status || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleClearFlag(flaggedUser.id)}
                            disabled={clearFlagMutation.isLoading}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            Clear Flag
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Revenue Overview Section */}
        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Revenue Overview</h2>
            <p className="mt-1 text-sm text-gray-600">
              Key metrics and subscription statistics
            </p>
          </div>
          <div className="p-6">
            {revenueLoading ? (
              <div className="text-center py-8 text-gray-500">Loading stats...</div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="text-sm font-medium text-blue-600 uppercase tracking-wider">
                    Total Users
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.totalUsers?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="text-sm font-medium text-green-600 uppercase tracking-wider">
                    Casual Subscribers
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.paidSubscribers?.casual?.toLocaleString() || 0}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">$9.99/month</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="text-sm font-medium text-purple-600 uppercase tracking-wider">
                    Dating Subscribers
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.paidSubscribers?.dating?.toLocaleString() || 0}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">$29.99/month</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-6">
                  <div className="text-sm font-medium text-indigo-600 uppercase tracking-wider">
                    Business Subscribers
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.paidSubscribers?.business?.toLocaleString() || 0}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">$49.99/month</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-6">
                  <div className="text-sm font-medium text-yellow-600 uppercase tracking-wider">
                    Total Paid Subscribers
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.paidSubscribers?.total?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-6">
                  <div className="text-sm font-medium text-red-600 uppercase tracking-wider">
                    Scheduled Downgrades
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.scheduledDowngrades?.toLocaleString() || 0}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">Revenue at risk</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Failed to load stats</div>
            )}
          </div>
        </section>

        {/* Settings Control Section */}
        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Pricing Settings</h2>
            <p className="mt-1 text-sm text-gray-600">
              Adjust subscription tier pricing and video call durations
            </p>
          </div>
          <div className="p-6">
            {settingsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading settings...</div>
            ) : !settings ? (
              <div className="text-center py-8 text-gray-500">
                {error || "Failed to load settings"}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Subscription Tiers (price in cents)
                  </h3>
                  {Object.keys({ casual: 1, dating: 1, business: 1 }).map((tier) => {
                    const tiers = settings.pricing?.tiers || {};
                    return (
                      <div
                        key={tier}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border rounded-lg p-4 bg-gray-50"
                      >
                        <div className="capitalize font-medium text-gray-900">{tier}</div>
                        <label className="text-sm">
                          <span className="block text-gray-700 mb-1">Minutes</span>
                          <input
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            value={tiers?.[tier]?.minutes ?? 0}
                            onChange={(e) => onTierChange(tier, "minutes", e.target.value)}
                          />
                        </label>
                        <label className="text-sm">
                          <span className="block text-gray-700 mb-1">Price (cents)</span>
                          <input
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            value={tiers?.[tier]?.price_cents ?? 0}
                            onChange={(e) =>
                              onTierChange(tier, "price_cents", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Second Date Fee</h3>
                  <label className="text-sm">
                    <span className="block text-gray-700 mb-1">Price (cents)</span>
                    <input
                      className="w-full max-w-xs border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      type="number"
                      value={settings.pricing?.second_date_cents ?? 1000}
                      onChange={(e) => onSecondDateChange(e.target.value)}
                    />
                  </label>
                </div>

                <div className="flex gap-3 items-center pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isLoading}
                    className="rounded-lg bg-blue-600 text-white px-6 py-2.5 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveMutation.isLoading ? "Saving..." : "Save Settings"}
                  </button>
                  {error && <span className="text-red-600 text-sm">{error}</span>}
                  {saveMutation.isError && !error && (
                    <span className="text-red-600 text-sm">Failed to save settings</span>
                  )}
                  {saveMutation.isSuccess && (
                    <span className="text-green-700 text-sm font-medium">✓ Saved successfully</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
