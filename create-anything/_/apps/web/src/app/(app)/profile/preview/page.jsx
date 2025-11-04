import React from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { getAbsoluteUrl } from "@/utils/urlHelpers";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

const TIER_DISPLAY_NAMES = {
  free: "Free",
  casual: "Casual",
  dating: "Dating",
  business: "Business",
};

export default function ProfilePreview() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile-preview"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const media = data?.media || [];
  const user = data?.user || {};
  const photos = media.filter((m) => m.type === "photo");
  const video = media.find((m) => m.type === "video");
  const interests = Array.isArray(user?.interests) ? user.interests : [];

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.primary }}></div>
        </div>
      </div>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p style={{ color: COLORS.error }}>Session expired. Please sign in.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p style={{ color: COLORS.error }}>Could not load profile</p>
        </div>
      </div>
    );
  }

  const tierDisplay = TIER_DISPLAY_NAMES[user?.membership_tier] || "Free";

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <AppHeader />
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Back button */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: COLORS.primary }}
        >
          <ArrowLeft size={20} />
          <span className="font-semibold">Back to Edit Profile</span>
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Preview Header */}
          <div className="px-6 py-4 border-b" style={{ backgroundColor: "#EDE9FE" }}>
            <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
              Profile Preview
            </h2>
            <p className="text-sm mt-1" style={{ color: COLORS.text }}>
              This is how other users see your profile
            </p>
          </div>

          <div className="p-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: COLORS.cardBg }}
                >
                  {user.primary_photo_url ? (
                    <img
                      src={getAbsoluteUrl(user.primary_photo_url)}
                      alt={user.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span style={{ color: COLORS.text, fontSize: "32px" }}>
                      {user.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                    {user.name || "No name"}
                  </h1>
                  {user.immediate_available && !user.availability_override && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS.secondary }}
                      title="Online"
                    ></span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: "#EDE9FE", color: COLORS.primary }}
                  >
                    {tierDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>
                  About
                </h3>
                <p style={{ color: COLORS.text }}>{user.bio}</p>
              </div>
            )}

            {/* Video */}
            {video && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Video size={20} style={{ color: COLORS.primary }} />
                  <h3 className="font-semibold" style={{ color: COLORS.text }}>
                    Video Introduction
                  </h3>
                </div>
                <video
                  src={getAbsoluteUrl(video.url)}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: "300px" }}
                />
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>
                  Photos ({photos.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={getAbsoluteUrl(photo.url)}
                      alt={`Photo ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: "#EDE9FE", color: COLORS.primary }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Details */}
            {(user.gender || user.sexual_orientation || user.looking_for || user.relationship_goals || user.height_range || user.body_type || user.education) && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: COLORS.text }}>
                  Personal Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {user.gender && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Gender</div>
                      <div style={{ color: COLORS.text }}>{user.gender}</div>
                    </div>
                  )}
                  {user.sexual_orientation && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Orientation</div>
                      <div style={{ color: COLORS.text }}>{user.sexual_orientation}</div>
                    </div>
                  )}
                  {user.looking_for && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Looking For</div>
                      <div style={{ color: COLORS.text }}>{user.looking_for}</div>
                    </div>
                  )}
                  {user.relationship_goals && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Relationship Goals</div>
                      <div style={{ color: COLORS.text }}>{user.relationship_goals}</div>
                    </div>
                  )}
                  {user.height_range && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Height</div>
                      <div style={{ color: COLORS.text }}>{user.height_range}</div>
                    </div>
                  )}
                  {user.body_type && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Body Type</div>
                      <div style={{ color: COLORS.text }}>{user.body_type}</div>
                    </div>
                  )}
                  {user.education && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Education</div>
                      <div style={{ color: COLORS.text }}>{user.education}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lifestyle */}
            {(user.drinking || user.smoking || user.exercise || user.religion || user.children_preference || user.pets) && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: COLORS.text }}>
                  Lifestyle
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {user.drinking && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Drinking</div>
                      <div style={{ color: COLORS.text }}>{user.drinking}</div>
                    </div>
                  )}
                  {user.smoking && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Smoking</div>
                      <div style={{ color: COLORS.text }}>{user.smoking}</div>
                    </div>
                  )}
                  {user.exercise && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Exercise</div>
                      <div style={{ color: COLORS.text }}>{user.exercise}</div>
                    </div>
                  )}
                  {user.religion && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Religion</div>
                      <div style={{ color: COLORS.text }}>{user.religion}</div>
                    </div>
                  )}
                  {user.children_preference && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Children</div>
                      <div style={{ color: COLORS.text }}>{user.children_preference}</div>
                    </div>
                  )}
                  {user.pets && (
                    <div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>Pets</div>
                      <div style={{ color: COLORS.text }}>{user.pets}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
