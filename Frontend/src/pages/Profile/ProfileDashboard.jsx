import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from "../../context/UserContext";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import "./ProfileDashboard.css";

/* ── API paths ───────────────────────────────────────────────── */
const API = {
  PROFILE:            "/profile",
  DASHBOARD_STATS:    "/dashboard/stats",
  DASHBOARD_SESSIONS: "/dashboard/sessions",
};

/* ── Helpers ──────────────────────────────────────────────────── */
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

const fluencyHex = (score) => {
  if (score == null) return "#888";
  if (score >= 0.7)  return "#16a34a";
  if (score >= 0.4)  return "#d97706";
  return "#dc2626";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const formatTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
};

const formatDuration = (secs) => {
  if (secs == null || secs === 0) return null;
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const SESSION_META = {
  stutter: { icon: "🎤", label: "Stutter Help",  color: "#4f46e5" },
  therapy: { icon: "📖", label: "Therapy Mode",  color: "#7c3aed" },
  default: { icon: "💬", label: "Session",       color: "#4f46e5" },
};
const getSessionMeta = (type) => SESSION_META[type] ?? SESSION_META.default;

/* ── Component ────────────────────────────────────────────────── */
const ProfileDashboard = () => {
  const { user, updateUser, clearUser } = useUser();
  const navigate = useNavigate();

  const [tab, setTab] = useState("profile");

  /* Profile state */
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm]           = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);

  /* Dashboard state */
  const [stats,    setStats]    = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(null);
  const [filter,   setFilter]   = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const [profileRes, statsRes, sessionsRes] = await Promise.allSettled([
        axiosInstance.get(API.PROFILE),
        axiosInstance.get(API.DASHBOARD_STATS),
        axiosInstance.get(API.DASHBOARD_SESSIONS),
      ]);
      if (profileRes.status === "fulfilled") {
        updateUser({ ...user, ...profileRes.value.data });
        setForm({
          name:  profileRes.value.data.name  ?? user?.name  ?? "",
          email: profileRes.value.data.email ?? user?.email ?? "",
        });
      }
      if (statsRes.status    === "fulfilled") setStats(statsRes.value.data);
      if (sessionsRes.status === "fulfilled") setSessions(sessionsRes.value.data ?? []);
    } catch {
      setFetchErr("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setForm({ name: user?.name ?? "", email: user?.email ?? "" });
  }, [user]);

  /* ── Profile handlers ── */
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setAlert({ type: "error", msg: "Name and email are required." });
      return;
    }
    setSaving(true);
    setAlert(null);
    try {
      const res = await axiosInstance.put(API.PROFILE, form);
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
    setIsEditing(false);
    setAlert(null);
  };

  const handleLogout = () => { clearUser(); navigate("/"); };

  /* ── Derived values ── */
  const totalSessions       = stats?.totalSessions       ?? 0;
  const totalReadings       = stats?.totalReadings       ?? 0;
  const avgFluency          = stats?.avgFluency          ?? null;
  const bestFluency         = stats?.bestFluency         ?? null;
  const avgTherapyFluency   = stats?.avgTherapyFluency   ?? null;
  const bestTherapyFluency  = stats?.bestTherapyFluency  ?? null;
  const avgWpm              = stats?.avgWpm              ?? null;
  const therapyMinutes      = stats?.therapyMinutes      ?? 0;
  const totalMinutes        = stats?.totalMinutes        ?? 0;
  const streak              = stats?.streak              ?? 0;
  const stutterBreakdown    = stats?.stutterBreakdown    ?? [];
  const passageBreakdown    = stats?.passageBreakdown    ?? [];

  const filteredSessions =
    filter === "all" ? sessions : sessions.filter((s) => s.type === filter);

  const displayName  = user?.name  || "—";
  const displayEmail = user?.email || "—";
  const joinedDate   = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

  /* ── Render ── */
  return (
    <div className="profile-page">

      {/* HERO */}
      <motion.section
        className="pd-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="pd-avatar-wrap">
          <div className="pd-avatar">{getInitials(user)}</div>
        </div>
        <h1 className="pd-hero-name">{displayName}</h1>
        <p className="pd-hero-email">{displayEmail}</p>
        <div className="pd-hero-wave">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path fill="#ffffff" fillOpacity="1"
              d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z"/>
          </svg>
        </div>
      </motion.section>

      {/* TAB BAR */}
      <div className="pd-tab-bar">
        <div className="pd-tabs">
          {[
            { key: "profile",   label: "👤 Profile"   },
            { key: "dashboard", label: "📊 Dashboard" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`pd-tab ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {tab === key && (
                <motion.div className="pd-tab-indicator" layoutId="tab-indicator" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <AnimatePresence mode="wait">

        {/* ════════ PROFILE TAB ════════ */}
        {tab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            <section className="pd-section">
              <motion.h2
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }} viewport={{ once: true }}
              >
                Account Details
              </motion.h2>

              <div className="pd-grid">
                {/* Personal info card */}
                <motion.div
                  className="pd-card"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }} viewport={{ once: true }}
                >
                  <div className="pd-card-head">
                    <span className="pd-card-head-icon">👤</span>
                    <h3>Personal Info</h3>
                    {!isEditing && (
                      <button
                        className="pd-btn ghost pd-edit-btn"
                        onClick={() => { setIsEditing(true); setAlert(null); }}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>

                  {alert && (
                    <div className={`pd-alert ${alert.type}`}>
                      <span>{alert.type === "success" ? "✅" : "⚠️"}</span> {alert.msg}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="pd-field-row">
                      <div className="pd-field"><label>Full Name</label><div className="pd-field-value">{displayName}</div></div>
                      <div className="pd-field"><label>Email Address</label><div className="pd-field-value">{displayEmail}</div></div>
                      <div className="pd-field"><label>Member Since</label><div className="pd-field-value">{joinedDate}</div></div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="pd-field-row">
                      <div className="pd-field">
                        <label>Full Name</label>
                        <input className="pd-input" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" autoFocus />
                      </div>
                      <div className="pd-field">
                        <label>Email Address</label>
                        <input className="pd-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
                      </div>
                      <div className="pd-field"><label>Member Since</label><div className="pd-field-value">{joinedDate}</div></div>
                      <div className="pd-btn-row" style={{ gridColumn: "1 / -1" }}>
                        <button className="pd-btn primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "💾 Save Changes"}</button>
                        <button className="pd-btn ghost" onClick={handleCancel}>Cancel</button>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Account card */}
                <motion.div
                  className="pd-card purple"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }} viewport={{ once: true }}
                >
                  <div className="pd-card-head">
                    <span className="pd-card-head-icon">⚙️</span>
                    <h3>Account</h3>
                  </div>
                  <div className="pd-field-row">
                    <div className="pd-field"><label>Status</label><div className="pd-field-value" style={{ color: "#16a34a", fontWeight: 700 }}>● Active</div></div>
                    <div className="pd-field"><label>Plan</label><div className="pd-field-value">Free</div></div>
                  </div>
                  <div className="pd-btn-row">
                    <button className="pd-btn primary" onClick={() => setTab("dashboard")}>📊 View Dashboard</button>
                    <button className="pd-btn danger"  onClick={handleLogout}>🚪 Log Out</button>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Milestones */}
            <section className="pd-section tint">
              <motion.h2
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }} viewport={{ once: true }}
              >
                Your Journey
              </motion.h2>
              <div className="pd-grid centered">
                <motion.div
                  className="pd-card full"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }} viewport={{ once: true }}
                >
                  <div className="pd-card-head">
                    <span className="pd-card-head-icon">🏆</span>
                    <h3>Milestones</h3>
                  </div>
                  <div className="pd-tiles">
                    <div className="pd-tile">
                      <div className="pd-tile-icon">🎤</div>
                      <div className="pd-tile-value">{totalSessions}</div>
                      <div className="pd-tile-label">Stutter Sessions</div>
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
                    <button className="pd-btn primary" onClick={() => navigate("/stutter-help")}>🎤 Start Session</button>
                    <button className="pd-btn ghost"   onClick={() => navigate("/therapy")}>📖 Therapy Mode</button>
                  </div>
                </motion.div>
              </div>
            </section>

            <section className="pd-tips-section">
              <motion.div
                className="pd-tips-inner"
                initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }} viewport={{ once: true }}
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

        {/* ════════ DASHBOARD TAB ════════ */}
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
                {/* ── Overview tiles ── */}
                <section className="pd-section">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }} viewport={{ once: true }}
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
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }} viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">📊</span>
                        <h3>All-Time Stats</h3>
                      </div>
                      <div className="pd-tiles">
                        {[
                          { icon: "🎤", value: totalSessions,         label: "Stutter Sessions" },
                          { icon: "📖", value: totalReadings,         label: "Readings",         cls: "purple" },
                          { icon: "✨", value: pct(avgFluency),       label: "Avg Fluency",      cls: "green"  },
                          { icon: "🏅", value: pct(bestFluency),      label: "Best Fluency"      },
                          { icon: "📖", value: pct(avgTherapyFluency),label: "Therapy Fluency",  cls: "purple" },
                          { icon: "⚡", value: avgWpm ?? "—",         label: "Avg WPM",          cls: "green"  },
                          { icon: "⏱️", value: `${therapyMinutes}m`,  label: "Therapy Time"      },
                          { icon: "🔥", value: streak,                label: "Day Streak",       cls: "purple" },
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

                {/* ── Fluency breakdown + Stutter types ── */}
                <section className="pd-section tint">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }} viewport={{ once: true }}
                  >
                    Fluency Breakdown
                  </motion.h2>

                  <div className="pd-grid">
                    {/* Stutter fluency */}
                    <motion.div
                      className="pd-card"
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }} viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">🎤</span>
                        <h3>Stutter Help Fluency</h3>
                      </div>
                      {[
                        { label: "Average Fluency", value: avgFluency },
                        { label: "Best Fluency",    value: bestFluency },
                        { label: "Last Session",    value: stats?.lastFluency ?? sessions.find(s => s.type === "stutter")?.fluencyScore ?? null },
                      ].map(({ label, value }) => (
                        <div className="pd-bar-wrap" key={label}>
                          <div className="pd-bar-top">
                            <span className="pd-bar-label">{label}</span>
                            <span className="pd-bar-pct" style={{ color: fluencyHex(value) }}>{pct(value)}</span>
                          </div>
                          <div className="pd-bar">
                            <div className={`pd-bar-fill ${fluencyColor(value)}`} style={{ width: value != null ? `${value * 100}%` : "0%" }} />
                          </div>
                        </div>
                      ))}
                    </motion.div>

                    {/* Therapy fluency */}
                    <motion.div
                      className="pd-card purple"
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.5 }} viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">📖</span>
                        <h3>Therapy Reading Fluency</h3>
                      </div>
                      {[
                        { label: "Average Fluency", value: avgTherapyFluency },
                        { label: "Best Fluency",    value: bestTherapyFluency },
                        { label: "Last Reading",    value: sessions.find(s => s.type === "therapy")?.fluencyScore ?? null },
                      ].map(({ label, value }) => (
                        <div className="pd-bar-wrap" key={label}>
                          <div className="pd-bar-top">
                            <span className="pd-bar-label">{label}</span>
                            <span className="pd-bar-pct" style={{ color: fluencyHex(value) }}>{pct(value)}</span>
                          </div>
                          <div className="pd-bar">
                            <div className={`pd-bar-fill ${fluencyColor(value)}`} style={{ width: value != null ? `${value * 100}%` : "0%" }} />
                          </div>
                        </div>
                      ))}
                      <div className="pd-btn-row" style={{ marginTop: "1.5rem" }}>
                        <button className="pd-btn primary" onClick={() => navigate("/therapy")}>📖 Go to Therapy</button>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* ── Passage breakdown + Stutter types ── */}
                <section className="pd-section">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }} viewport={{ once: true }}
                  >
                    Detailed Analysis
                  </motion.h2>

                  <div className="pd-grid">
                    {/* Passage breakdown */}
                    <motion.div
                      className="pd-card"
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }} viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">📚</span>
                        <h3>Passages Practised</h3>
                      </div>
                      {passageBreakdown.length > 0 ? (
                        <div className="pd-passage-breakdown">
                          {passageBreakdown.map((p) => (
                            <div className="pd-passage-row" key={p.title}>
                              <div className="pd-passage-row-info">
                                <span className="pd-passage-row-title">{p.title}</span>
                                <span className="pd-passage-row-meta">
                                  {p.count}× practised
                                  {p.bestWpm && ` · Best ${p.bestWpm} WPM`}
                                </span>
                              </div>
                              <div style={{ textAlign: "right", minWidth: 56 }}>
                                <span style={{ color: fluencyHex(p.bestFluency), fontWeight: 700, fontSize: "0.9rem" }}>
                                  {pct(p.bestFluency)}
                                </span>
                                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>best</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pd-empty">
                          <span className="pd-empty-icon">📚</span>
                          No therapy readings yet. Try a passage to see progress here.
                        </div>
                      )}
                      <div className="pd-btn-row" style={{ marginTop: "1.5rem" }}>
                        <button className="pd-btn ghost" onClick={() => navigate("/therapy")}>📖 Start Reading</button>
                      </div>
                    </motion.div>

                    {/* Stutter types */}
                    <motion.div
                      className="pd-card purple"
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.5 }} viewport={{ once: true }}
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
                              {count != null && <span style={{ opacity: 0.6, fontWeight: 400 }}>&nbsp;· {count}×</span>}
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
                        <button className="pd-btn primary" onClick={() => navigate("/stutter-help")}>🎤 Start Stutter Help</button>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* ── Session History ── */}
                <section className="pd-section tint">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }} viewport={{ once: true }}
                  >
                    Session History
                  </motion.h2>

                  <div className="pd-grid centered">
                    <motion.div
                      className="pd-card full"
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }} viewport={{ once: true }}
                    >
                      <div className="pd-card-head">
                        <span className="pd-card-head-icon">🗂️</span>
                        <h3>Recent Sessions</h3>
                        <div className="pd-filter-row">
                          {["all", "stutter", "therapy"].map((f) => (
                            <button
                              key={f}
                              className={`pd-filter-btn ${filter === f ? "active" : ""}`}
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
                            const meta        = getSessionMeta(session.type);
                            const isTherapy   = session.type === "therapy";
                            const hasStutter  = !isTherapy && session.stutterType && session.stutterType !== "None";
                            const stutterList = hasStutter ? session.stutterType.split(", ") : [];

                            return (
                              <motion.div
                                className="pd-session-item"
                                key={session._id ?? i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                              >
                                <div className="pd-session-icon-wrap" style={{ background: `${meta.color}18` }}>
                                  <span className="pd-session-icon">{meta.icon}</span>
                                </div>

                                <div className="pd-session-info">
                                  <div className="pd-session-title">
                                    {isTherapy ? (session.passageTitle || "Therapy Reading") : meta.label}
                                  </div>

                                  <div className="pd-session-meta">
                                    {session.createdAt && (
                                      <>
                                        <span className="pd-session-date">{formatDate(session.createdAt)}</span>
                                        <span className="pd-session-sep">·</span>
                                        <span className="pd-session-time">{formatTime(session.createdAt)}</span>
                                      </>
                                    )}
                                    {session.duration != null && session.duration > 0 && (
                                      <><span className="pd-session-sep">·</span>{formatDuration(session.duration)}</>
                                    )}
                                    {session.wpm != null && session.wpm > 0 && (
                                      <><span className="pd-session-sep">·</span>{session.wpm} WPM</>
                                    )}
                                    {isTherapy && session.wordsRead != null && (
                                      <><span className="pd-session-sep">·</span>{session.wordsRead}/{session.totalWords} words</>
                                    )}
                                    {isTherapy && session.accuracy != null && (
                                      <><span className="pd-session-sep">·</span>{session.accuracy}% accuracy</>
                                    )}
                                  </div>

                                  {stutterList.length > 0 && (
                                    <div className="pd-session-stutter-tags">
                                      {stutterList.map((t) => <span key={t} className="pd-stutter-tag">{t}</span>)}
                                    </div>
                                  )}
                                  {!isTherapy && session.stutterType === "None" && (
                                    <span className="pd-no-stutter-tag">✅ No stutters detected</span>
                                  )}
                                </div>

                                <div className="pd-session-score" style={{ color: fluencyHex(session.fluencyScore) }}>
                                  <div className="pd-session-score-pct">{pct(session.fluencyScore)}</div>
                                  <div className="pd-session-score-label">fluency</div>
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
                    initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }} viewport={{ once: true }}
                  >
                    <h3>📈 Reading Your Results</h3>
                    <ul>
                      <li>Fluency score reflects how smoothly you speak relative to total words.</li>
                      <li>WPM tracks your reading speed in therapy mode — aim to improve each session.</li>
                      <li>Stutter types help identify your most common patterns to work on.</li>
                      <li>A daily streak keeps you consistent — even a short session counts.</li>
                      <li>Try harder passages as your fluency improves across the levels.</li>
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