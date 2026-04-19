import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import "./ProfileDashboard.css";

// ── Helpers ────────────────────────────────────────────────────
const getInitials = (user) => {
  if (!user) return "?";
  if (user.name)
    return user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (user.email?.[0] ?? "?").toUpperCase();
};

const pct = (val) =>
  val != null ? `${Math.round(Number(val) * 100)}%` : "—";

const fluencyColor = (score) => {
  if (score == null) return "";
  if (score >= 0.7)  return "green";
  if (score >= 0.4)  return "orange";
  return "red";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const formatDuration = (secs) => {
  if (secs == null) return null;
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const SESSION_META = {
  stutter: { icon: "🎤", label: "Stutter Help", color: "#4f46e5" },
  therapy: { icon: "📖", label: "Therapy Mode", color: "#7c3aed" },
  default: { icon: "💬", label: "Session",      color: "#4f46e5" },
};
const getSessionMeta = (type) => SESSION_META[type] ?? SESSION_META.default;

// ── Component ──────────────────────────────────────────────────
const ProfileDashboard = () => {
  const { user, updateUser, clearUser } = useUser();
  const navigate = useNavigate();

  const [tab, setTab] = useState("profile"); // "profile" | "dashboard"

  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm]           = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);

  // Dashboard state
  const [stats,    setStats]    = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(null);
  const [filter,   setFilter]   = useState("all");

  // Fetch dashboard data once on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const [statsRes, sessionsRes] = await Promise.allSettled([
        axiosInstance.get(API_PATHS.DASHBOARD?.STATS    ?? "/dashboard/stats"),
        axiosInstance.get(API_PATHS.DASHBOARD?.SESSIONS ?? "/dashboard/sessions"),
      ]);
      if (statsRes.status    === "fulfilled") setStats(statsRes.value.data);
      if (sessionsRes.status === "fulfilled") setSessions(sessionsRes.value.data ?? []);
    } catch {
      setFetchErr("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Profile handlers
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setAlert(null);
    try {
      const res = await axiosInstance.put(API_PATHS.AUTH.PROFILE, form);
      updateUser({ ...user, ...res.data });
      setAlert({ type: "success", msg: "Profile updated successfully!" });
      setIsEditing(false);
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.error || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: user?.name ?? "", email: user?.email ?? "" });
    setIsEditing(false); setAlert(null);
  };

  const handleLogout = () => { clearUser(); navigate("/"); };

  // Derived dashboard values
  const totalSessions = stats?.totalSessions ?? user?.sessionsCount ?? 0;
  const totalReadings = stats?.totalReadings ?? user?.therapyCount  ?? 0;
  const avgFluency    = stats?.avgFluency    ?? user?.avgFluency    ?? null;
  const bestFluency   = stats?.bestFluency   ?? user?.bestFluency   ?? null;
  const avgWpm        = stats?.avgWpm        ?? user?.avgWpm        ?? null;
  const totalMinutes  = stats?.totalMinutes  ?? user?.totalMinutes  ?? 0;
  const streak        = stats?.streak        ?? user?.streak        ?? 0;
  const stutterBreakdown = stats?.stutterBreakdown ?? [];
  const filteredSessions = filter === "all" ? sessions : sessions.filter((s) => s.type === filter);

  const displayName  = user?.name  || "—";
  const displayEmail = user?.email || "—";
  const joinedDate   = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="profile-page">

      {/* ── HERO ── */}
      <motion.section
        className="pd-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="pd-avatar-wrap">
          <div className="pd-avatar">{getInitials(user)}</div>
        </div>
        <h1>{displayName}</h1>
        <p>{displayEmail}</p>

        <div className="pd-hero-wave">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path fill="#ffffff" fillOpacity="1"
              d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z"/>
          </svg>
        </div>
      </motion.section>

      {/* ── TAB BAR ── */}
      <div className="pd-tab-bar">
        <div className="pd-tabs">
          {[
            { key: "profile",   label: "👤 Profile" },
            { key: "dashboard", label: "📊 Dashboard" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`pd-tab ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {tab === key && <motion.div className="pd-tab-indicator" layoutId="tab-indicator" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">

        {/* ════════════ PROFILE TAB ════════════ */}
        {tab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >

            {/* Account details */}
            <section className="pd-section">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                Account Details
              </motion.h2>

              <div className="pd-grid">

                {/* Personal info card */}
                <motion.div
                  className="pd-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <div className="pd-card-head">
                    <span className="pd-card-head-icon">👤</span>
                    <h3>Personal Info</h3>
                  </div>

                  <div className="pd-field-row">
                    <div className="pd-field">
                      <label>Full Name</label>
                      {isEditing ? (
                        <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
                      ) : (
                        <div className="pd-field-value">{displayName}</div>
                      )}
                    </div>
                    <div className="pd-field">
                      <label>Email Address</label>
                      {isEditing ? (
                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
                      ) : (
                        <div className="pd-field-value">{displayEmail}</div>
                      )}
                    </div>
                    <div className="pd-field">
                      <label>Member Since</label>
                      <div className="pd-field-value">{joinedDate}</div>
                    </div>
                  </div>

                  {alert && (
                    <div className={`pd-alert ${alert.type}`}>
                      <span>{alert.type === "success" ? "✅" : "⚠️"}</span>
                      {alert.msg}
                    </div>
                  )}

                  <div className="pd-btn-row">
                    {isEditing ? (
                      <>
                        <button className="pd-btn primary" onClick={handleSave} disabled={saving}>
                          {saving ? "Saving…" : "💾 Save Changes"}
                        </button>
                        <button className="pd-btn ghost" onClick={handleCancel}>Cancel</button>
                      </>
                    ) : (
                      <button className="pd-btn ghost" onClick={() => { setIsEditing(true); setAlert(null); }}>
                        ✏️ Edit Profile
                      </button>
                    )}
                  </div>
                </motion.div>

                {/* Account card */}
                <motion.div
                  className="pd-card purple"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <div className="pd-card-head">
                    <span className="pd-card-head-icon">⚙️</span>
                    <h3>Account</h3>
                  </div>

                  <div className="pd-field-row">
                    <div className="pd-field">
                      <label>Status</label>
                      <div className="pd-field-value">
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>● Active</span>
                      </div>
                    </div>
                    <div className="pd-field">
                      <label>Plan</label>
                      <div className="pd-field-value">Free</div>
                    </div>
                  </div>

                  <div className="pd-btn-row">
                    <button className="pd-btn primary" onClick={() => setTab("dashboard")}>
                      📊 View Dashboard
                    </button>
                    <button className="pd-btn danger" onClick={handleLogout}>
                      🚪 Log Out
                    </button>
                  </div>
                </motion.div>

              </div>
            </section>

            {/* Journey milestones */}
            <section className="pd-section tint">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                Your Journey
              </motion.h2>

              <div className="pd-grid centered">
                <motion.div
                  className="pd-card full"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <div className="pd-card-head">
                    <span className="pd-card-head-icon">🏆</span>
                    <h3>Milestones</h3>
                  </div>

                  <div className="pd-tiles">
                    <div className="pd-tile">
                      <div className="pd-tile-icon">🎤</div>
                      <div className="pd-tile-value">{totalSessions}</div>
                      <div className="pd-tile-label">Sessions</div>
                    </div>
                    <div className="pd-tile purple">
                      <div className="pd-tile-icon">📖</div>
                      <div className="pd-tile-value">{totalReadings}</div>
                      <div className="pd-tile-label">Readings</div>
                    </div>
                    <div className="pd-tile green">
                      <div className="pd-tile-icon">✨</div>
                      <div className="pd-tile-value">{pct(avgFluency)}</div>
                      <div className="pd-tile-label">Avg Fluency</div>
                    </div>
                    <div className="pd-tile">
                      <div className="pd-tile-icon">🔥</div>
                      <div className="pd-tile-value">{streak}</div>
                      <div className="pd-tile-label">Day Streak</div>
                    </div>
                  </div>

                  <div className="pd-btn-row" style={{ justifyContent: "center" }}>
                    <button className="pd-btn primary" onClick={() => navigate("/stutter-help")}>
                      🎤 Start Session
                    </button>
                    <button className="pd-btn ghost" onClick={() => navigate("/therapy")}>
                      📖 Therapy Mode
                    </button>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Tips */}
            <section className="pd-tips-section">
              <motion.div
                className="pd-tips-inner"
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h3>💡 Make the Most of SPEAKEASE</h3>
                <ul>
                  <li>Practise daily — even 5 minutes makes a measurable difference.</li>
                  <li>Use Therapy Mode to work on specific passages at a controlled pace.</li>
                  <li>Check your Dashboard after each session to track fluency trends.</li>
                  <li>Keep your streak alive for the best long-term results.</li>
                </ul>
              </motion.div>
            </section>

          </motion.div>
        )}

        {/* ════════════ DASHBOARD TAB ════════════ */}
        {tab === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            {loading ? (
              <section className="pd-section" style={{ textAlign: "center", color: "#999" }}>
                <p style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⏳</p>
                <p>Loading your data…</p>
              </section>
            ) : (
              <>

                {/* Overview tiles */}
                <section className="pd-section">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    Overview
                  </motion.h2>

                  {fetchErr && (
                    <div className="pd-alert error" style={{ maxWidth: 700, margin: "0 auto 2rem" }}>
                      <span>⚠️</span> {fetchErr}
                    </div>
                  )}

                  <div className="pd-grid centered">
                    <motion.div
                      className="pd-card full"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">📊</span>
                        <h3>All-Time Stats</h3>
                      </div>

                      <div className="pd-tiles">
                        {[
                          { icon: "🎤", value: totalSessions,      label: "Sessions" },
                          { icon: "📖", value: totalReadings,      label: "Readings",    cls: "purple" },
                          { icon: "✨", value: pct(avgFluency),    label: "Avg Fluency", cls: "green"  },
                          { icon: "🏅", value: pct(bestFluency),   label: "Best Fluency" },
                          { icon: "⚡", value: avgWpm ?? "—",      label: "Avg WPM",     cls: "purple" },
                          { icon: "⏱️", value: totalMinutes,       label: "Minutes",     cls: "green"  },
                          { icon: "🔥", value: streak,             label: "Day Streak"   },
                        ].map(({ icon, value, label, cls }) => (
                          <div className={`pd-tile ${cls ?? ""}`} key={label}>
                            <div className="pd-tile-icon">{icon}</div>
                            <div className="pd-tile-value">{value}</div>
                            <div className="pd-tile-label">{label}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Fluency breakdown */}
                <section className="pd-section tint">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    Fluency Breakdown
                  </motion.h2>

                  <div className="pd-grid">

                    {/* Bars */}
                    <motion.div
                      className="pd-card"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">📈</span>
                        <h3>Fluency Scores</h3>
                      </div>

                      {[
                        { label: "Average Fluency", value: avgFluency },
                        { label: "Best Fluency",    value: bestFluency },
                        { label: "Last Session",    value: stats?.lastFluency ?? sessions[0]?.fluencyScore ?? null },
                      ].map(({ label, value }) => (
                        <div className="pd-bar-wrap" key={label}>
                          <div className="pd-bar-top">
                            <span className="pd-bar-label">{label}</span>
                            <span className="pd-bar-pct">{pct(value)}</span>
                          </div>
                          <div className="pd-bar">
                            <div
                              className={`pd-bar-fill ${fluencyColor(value)}`}
                              style={{ width: value != null ? `${value * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      ))}
                    </motion.div>

                    {/* Stutter types */}
                    <motion.div
                      className="pd-card purple"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.5 }}
                      viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">🧩</span>
                        <h3>Stutter Types Detected</h3>
                      </div>

                      {stutterBreakdown.length > 0 ? (
                        <div className="pd-badges">
                          {stutterBreakdown.map(({ type, count }) => (
                            <div className="pd-badge purple" key={type}>
                              {type}
                              {count != null && (
                                <span style={{ opacity: 0.6, fontWeight: 400 }}>&nbsp;· {count}×</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pd-empty">
                          <span className="pd-empty-icon">🧩</span>
                          No stutter data yet. Complete a Stutter Help session first.
                        </div>
                      )}

                      <div className="pd-btn-row" style={{ marginTop: "1.5rem" }}>
                        <button className="pd-btn primary" onClick={() => navigate("/stutter-help")}>
                          🎤 Start Stutter Help
                        </button>
                      </div>
                    </motion.div>

                  </div>
                </section>

                {/* Session history */}
                <section className="pd-section">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    Session History
                  </motion.h2>

                  <div className="pd-grid centered">
                    <motion.div
                      className="pd-card full"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">🗂️</span>
                        <h3>Recent Sessions</h3>
                        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {["all", "stutter", "therapy"].map((f) => (
                            <button
                              key={f}
                              className={`pd-btn ${filter === f ? "primary" : "ghost"}`}
                              style={{ padding: "0.35rem 0.9rem", fontSize: "0.8rem" }}
                              onClick={() => setFilter(f)}
                            >
                              {f === "all" ? "All" : f === "stutter" ? "🎤 Stutter" : "📖 Therapy"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredSessions.length > 0 ? (
                        <div className="pd-session-list">
                          {filteredSessions.map((session, i) => {
                            const meta = getSessionMeta(session.type);
                            return (
                              <motion.div
                                className="pd-session-item"
                                key={session._id ?? session.id ?? i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                              >
                                <span className="pd-session-icon">{meta.icon}</span>
                                <div className="pd-session-info">
                                  <div className="pd-session-title">{meta.label}</div>
                                  <div className="pd-session-meta">
                                    {formatDate(session.createdAt)}
                                    {session.duration  != null && ` · ${formatDuration(session.duration)}`}
                                    {session.wpm       != null && ` · ${session.wpm} WPM`}
                                    {session.stutterType && ` · ${session.stutterType}`}
                                  </div>
                                </div>
                                <div className="pd-session-score" style={{ color: meta.color }}>
                                  {pct(session.fluencyScore)}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pd-empty">
                          <span className="pd-empty-icon">
                            {filter === "therapy" ? "📖" : filter === "stutter" ? "🎤" : "📋"}
                          </span>
                          {filter === "all"
                            ? "No sessions yet. Start speaking to see your history here."
                            : `No ${filter === "therapy" ? "therapy" : "stutter help"} sessions yet.`}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </section>

                {/* Tips */}
                <section className="pd-tips-section">
                  <motion.div
                    className="pd-tips-inner"
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <h3>📈 Reading Your Results</h3>
                    <ul>
                      <li>Fluency score reflects how smoothly you read relative to total passage length.</li>
                      <li>WPM tracks your reading speed — aim to improve it session by session.</li>
                      <li>Stutter types help identify your most common patterns to work on.</li>
                      <li>A daily streak keeps you consistent — even a short session counts.</li>
                    </ul>
                  </motion.div>
                </section>

              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default ProfileDashboard;