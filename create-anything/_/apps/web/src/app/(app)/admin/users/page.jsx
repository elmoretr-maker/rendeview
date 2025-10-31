import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users-with-photos");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Admin access required");
        }
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      const normalizedUsers = (data.users || []).map(user => ({
        ...user,
        membership_tier: user.membership_tier || 'free'
      }));
      setUsers(normalizedUsers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const tier = user.membership_tier || 'free';
    const matchesTier = filterTier === "all" || tier === filterTier;
    return matchesSearch && matchesTier;
  });

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.25rem", color: "#666" }}>Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            padding: "1rem",
            color: "#c00",
          }}
        >
          Error: {error}
        </div>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "#5B3BAF",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          User Management
        </h1>
        <p style={{ color: "#666" }}>View all users and their uploaded photos</p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: "1",
            minWidth: "250px",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "1rem",
          }}
        />
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="casual">Casual</option>
          <option value="active">Active</option>
          <option value="dating">Dating</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#5B3BAF" }}>
            {users.length}
          </div>
          <div style={{ color: "#666" }}>Total Users</div>
        </div>
        <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#00BFA6" }}>
            {users.filter((u) => u.media?.length > 0).length}
          </div>
          <div style={{ color: "#666" }}>With Photos</div>
        </div>
        <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#FFB800" }}>
            {users.filter((u) => {
              const tier = u.membership_tier || 'free';
              return tier !== "free";
            }).length}
          </div>
          <div style={{ color: "#666" }}>Paid Members</div>
        </div>
      </div>

      {/* User List */}
      <div style={{ color: "#666", marginBottom: "1rem" }}>
        Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              {/* User Info */}
              <div style={{ flex: "1", minWidth: "300px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: user.primary_photo_url
                        ? `url(${user.primary_photo_url}) center/cover`
                        : "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#666",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {!user.primary_photo_url && (user.name?.[0] || "?")}
                  </div>
                  <div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                      {user.name || "No name"}
                    </div>
                    <div style={{ color: "#666", fontSize: "0.875rem" }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>User ID:</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {user.id}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Membership:</span>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "999px",
                        background:
                          user.membership_tier === "business"
                            ? "#FFB800"
                            : user.membership_tier === "dating"
                              ? "#5B3BAF"
                              : user.membership_tier === "active"
                                ? "#10B981"
                                : user.membership_tier === "casual"
                                  ? "#00BFA6"
                                  : "#e5e7eb",
                        color: user.membership_tier === "free" ? "#666" : "white",
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {user.membership_tier || "free"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Video Calls:</span>
                    <span>{user.video_meetings_count || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Blocks:</span>
                    <span>{user.block_count || 0}</span>
                  </div>
                  {user.moderation_status && user.moderation_status !== "active" && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#666" }}>Status:</span>
                      <span
                        style={{
                          color: user.moderation_status === "flagged" ? "#FFB800" : "#E74C3C",
                          fontWeight: "600",
                        }}
                      >
                        {user.moderation_status}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Joined:</span>
                    <span>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div style={{ flex: "1", minWidth: "300px" }}>
                <div style={{ fontWeight: "600", marginBottom: "0.75rem" }}>
                  Profile Media ({user.media?.length || 0})
                </div>
                {user.media && user.media.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                      gap: "0.5rem",
                    }}
                  >
                    {user.media.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          position: "relative",
                          paddingBottom: "100%",
                          borderRadius: "8px",
                          overflow: "hidden",
                          background: "#f3f4f6",
                        }}
                      >
                        {item.type === "photo" ? (
                          <img
                            src={item.url}
                            alt={`Photo ${item.sort_order}`}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#5B3BAF",
                              color: "white",
                              fontSize: "0.75rem",
                            }}
                          >
                            VIDEO
                          </div>
                        )}
                        <div
                          style={{
                            position: "absolute",
                            top: "4px",
                            left: "4px",
                            background: "rgba(0,0,0,0.6)",
                            color: "white",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "0.75rem",
                          }}
                        >
                          #{item.sort_order + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#999",
                      background: "#f9f9f9",
                      borderRadius: "8px",
                    }}
                  >
                    No photos uploaded yet
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "#999",
              background: "#f9f9f9",
              borderRadius: "12px",
            }}
          >
            No users found matching your filters
          </div>
        )}
      </div>
    </div>
  );
}
