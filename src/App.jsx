import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const C = {
  bg: "#0b0e14",
  surface: "#111620",
  surface2: "#161d2a",
  surface3: "#1c2536",
  border: "#1e2a3a",
  borderLight: "#2a3a50",
  accent: "#3b9eff",
  accentDim: "#1a3a5a",
  text: "#d4dce8",
  textDim: "#6b7e96",
  textMuted: "#3a4e66",
  red: "#ef5350",
  orange: "#ff9800",
  yellow: "#e6c84a",
  teal: "#26c6da",
  green: "#66bb6a",
  purple: "#ab47bc",
};
const URGENCY = {
  CRITICAL: { color: C.red, bg: "#1a0c0c", border: "#3a1515", rank: 0 },
  URGENT: { color: C.orange, bg: "#1a1208", border: "#3a2a12", rank: 1 },
  IMPORTANT: { color: C.yellow, bg: "#1a1a0a", border: "#3a3a15", rank: 2 },
  NOTABLE: { color: C.teal, bg: "#0a1a1a", border: "#123a3a", rank: 3 },
};
const STAGES = [
  { id: "inbox", label: "Inbox", color: C.red, icon: "\u25C9" },
  { id: "france", label: "France", color: C.orange, icon: "\u270E" },
  { id: "external", label: "External", color: C.yellow, icon: "\u23F3" },
  { id: "dave", label: "Dave", color: C.accent, icon: "\u2605" },
  { id: "scheduled", label: "Scheduled", color: C.teal, icon: "\u25CE" },
  { id: "complete", label: "Complete", color: C.green, icon: "\u2713" },
];
const PATTERNS = {
  A: "Inbound Lead",
  B: "Introduction",
  C: "Lead-Gen Vendor",
  D: "Customer Follow-Up",
  E: "Legal/NDA",
  F: "Investor/Capital",
  G: "Internal Ops",
  H: "PR/Awards",
  I: "Scheduling",
  J: "Admin",
};

// ═══════════════════════════════════════════════════════════
// LIVE DATA: Transform scan results → dashboard format
// ═══════════════════════════════════════════════════════════
function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    const mon = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${mon} ${day}, ${h12}:${m} ${ampm}`;
  } catch {
    return isoStr;
  }
}

function getDateStr(isoStr) {
  try {
    return new Date(isoStr).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function transformScanResults(scanData) {
  if (!scanData || !scanData.items || scanData.items.length === 0) return null;
  return scanData.items.map((item, i) => ({
    id: `live_${i}_${(item.sender_email || "").slice(0, 10)}`,
    score: item.final_score || item.rules_score || 3,
    label: item.final_label || item.rules_label || "NOTABLE",
    tier: item.rules_tier || "UNKNOWN",
    pattern: item.ai_pattern || "G",
    stage: "inbox",
    from: item.sender_name || item.sender_email || "Unknown",
    email: item.sender_email || "",
    subject: item.subject || "(no subject)",
    time: formatTime(item.received),
    date: getDateStr(item.received),
    link: item.web_link || "",
    jarvis: item.ai_summary || item.body_preview || "",
    action: item.ai_action || "",
    reply: "",
    quip: "",
    reasons: item.rules_reasons || [],
    hasAttachment: item.has_attachments || false,
    aiReviewed: item.ai_reviewed || false,
    contactType: item.contact_type || "",
    read: item.is_read || false,
  }));
}

// ═══════════════════════════════════════════════════════════
// PERSISTENCE: Save/load pipeline stages from localStorage
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = "jarvis_pipeline_state";

function loadPipelineState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePipelineState(data) {
  try {
    const state = {};
    data.forEach((e) => {
      if (e.stage !== "inbox") state[e.id] = e.stage;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function mergeWithPipelineState(items) {
  const saved = loadPipelineState();
  return items.map((e) => ({
    ...e,
    stage: saved[e.id] || e.stage,
  }));
}

// ═══════════════════════════════════════════════════════════
// DEMO DATA (shown when no live data available)
// ═══════════════════════════════════════════════════════════
const DEMO_DATA = [
  {
    id: "demo_1",
    score: 9,
    label: "CRITICAL",
    tier: "TIER 1",
    pattern: "G",
    stage: "dave",
    from: "Jamie Thirlwall \u2014 Castleforge",
    email: "jamie.thirlwall@castleforge.com",
    subject: "Monthly Deck for the March Business Review",
    time: "Mar 17, 8:25 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Jamie sending the final monthly report for tomorrow's board meeting. Attachments included. Full Galaxy + Castleforge leadership on thread.",
    action:
      "Review the attached monthly deck TONIGHT. Meeting is tomorrow afternoon.",
    reply: "Jamie,\n\nReceived, thank you. Reviewing tonight.\n\nBest,\nDave",
    quip: "Board deck for tomorrow. Review tonight, not tomorrow morning.",
    reasons: [
      "Tier 1: castleforge.com",
      "KW: board",
      "Attachments + deal KW (+2)",
    ],
    hasAttachment: true,
    aiReviewed: false,
    contactType: "Investor/JV",
    read: true,
  },
  {
    id: "demo_2",
    score: 9,
    label: "CRITICAL",
    tier: "PIPELINE VIP",
    pattern: "D",
    stage: "dave",
    from: "John Hall \u2014 TechRE",
    email: "john.hall@techreconsulting.com",
    subject: "Re: Redhill Unit 1&2 optionality",
    time: "Mar 17, 4:41 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "THE pipeline deal. John Hall reviewing Ashley's high-density positioning for Redhill Unit 1&2. 18MW prospect thread.",
    action: "Monitor closely. Follow up if no response by Friday.",
    reply: "",
    quip: "This is the deal you built Redhill for.",
    reasons: [
      "Pipeline: john hall",
      "Tier 2: techreconsulting.com",
      "KW: redhill",
    ],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Broker",
    read: true,
  },
  {
    id: "demo_3",
    score: 8,
    label: "URGENT",
    tier: "TIER 1",
    pattern: "G",
    stage: "france",
    from: "Jamie Thirlwall \u2014 Castleforge",
    email: "jamie.thirlwall@castleforge.com",
    subject: "Re: Sales and Marketing Update for Board Deck (18 March)",
    time: "Mar 17, 8:09 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Jamie confirming all slides received. Pulling final board pack together tonight.",
    action: "FYI \u2014 board pack being finalized tonight.",
    reply: "",
    quip: "",
    reasons: ["Tier 1: castleforge.com", "KW: board"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Investor/JV",
    read: true,
  },
  {
    id: "demo_4",
    score: 8,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "D",
    stage: "dave",
    from: "Ashley Roberts \u2014 Galaxy",
    email: "ashley@galaxydatacenters.com",
    subject: "Re: Redhill High Density Strategy for Castleforge",
    time: "Mar 17, 5:14 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Ashley sending high-density strategy commentary to Pelle Jorgen at Castleforge. Full leadership on thread.",
    action: "Review before tomorrow's board meeting.",
    reply: "",
    quip: "",
    reasons: ["Internal VIP", "Re customer: castleforge", "8 VIPs on thread"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Internal",
    read: false,
  },
  {
    id: "demo_5",
    score: 7,
    label: "URGENT",
    tier: "VIP FIRM",
    pattern: "D",
    stage: "dave",
    from: "Holly Winch \u2014 Savills",
    email: "holly.winch@savills.com",
    subject: "Redhill Data Centre \u2014 Catch up",
    time: "Mar 17, 5:56 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Savills moving to monthly catch-ups. Onboarding settled, portfolio embedded.",
    action: "FYI \u2014 Savills transitioning to monthly rhythm.",
    reply: "",
    quip: "",
    reasons: ["VIP: savills.com", "KW: redhill", "Attachments"],
    hasAttachment: true,
    aiReviewed: false,
    contactType: "Strategic Partner",
    read: true,
  },
  {
    id: "demo_6",
    score: 7,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "dave",
    from: "Paul Leong \u2014 Galaxy",
    email: "paul@galaxydatacenters.com",
    subject: "Re: High Density Commentary \u2014 run it by Pelle",
    time: "Mar 17, 4:00 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Paul says commentary reads fine. Suggests running by Pelle. Recommends adding comparison table.",
    action: "Consider Paul's suggestion: add high vs low density table.",
    reply: "",
    quip: "",
    reasons: [
      "Internal VIP",
      "Re customer: castleforge",
      "Dave in thread (+2)",
    ],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Internal",
    read: false,
  },
  {
    id: "demo_7",
    score: 7,
    label: "URGENT",
    tier: "REDHILL OPS",
    pattern: "I",
    stage: "complete",
    from: "Benjamin Tyson \u2014 Redhill DC",
    email: "benjamin.tyson@redhilldatacentre.com",
    subject: "Re: Rivington Energy Tour \u2014 booked and confirmed",
    time: "Mar 17, 2:44 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis: "Benjamin confirming access booked and Colin Bell approved.",
    action: "Done. Tour confirmed.",
    reply: "",
    quip: "",
    reasons: ["Redhill ops", "KW: site visit"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
  {
    id: "demo_8",
    score: 7,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "dave",
    from: "Ash Gupta \u2014 Galaxy",
    email: "ash@galaxycapitalpartners.com",
    subject: "Re: S160 \u2014 CHW System Resilience remedials",
    time: "Mar 17, 2:36 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Ash asking Rhys Jones for ROM cost on CHW resilience remedials. Wants to add to funding request.",
    action: "Review when Rhys provides ROM estimate.",
    reply: "",
    quip: "",
    reasons: ["Internal VIP", "KW: redhill, capacity", "Funding request"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
  {
    id: "demo_9",
    score: 6,
    label: "IMPORTANT",
    tier: "INTERNAL VIP",
    pattern: "E",
    stage: "france",
    from: "Ashley Roberts \u2014 Galaxy",
    email: "ashley@galaxydatacenters.com",
    subject: "FW: Partner Agreement \u2014 sent to Mark",
    time: "Mar 17, 6:33 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis: "Ashley forwarding partner agreement to Mark Vecchiarelli.",
    action: "Monitor for Mark's response.",
    reply: "",
    quip: "",
    reasons: ["Internal VIP", "KW: contract", "Pipeline: mark vecchiarelli"],
    hasAttachment: true,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
  {
    id: "demo_10",
    score: 6,
    label: "IMPORTANT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "france",
    from: "Sai Raman \u2014 Galaxy",
    email: "sai@galaxydatacenters.com",
    subject: "Sarthak's list \u2014 246 London BFSI prospects",
    time: "Mar 17, 6:58 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis: "246 London financial services prospect list via Apollo + Clay.",
    action: "Review list quality.",
    reply: "",
    quip: "",
    reasons: ["Internal VIP", "Attachments", "Prospect list"],
    hasAttachment: true,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
];

// ═══════════════════════════════════════════════════════════
// SORTING: Active items on top, by score, then by date
// ═══════════════════════════════════════════════════════════
function sortEmails(emails) {
  return [...emails].sort((a, b) => {
    const aActive = a.stage !== "complete";
    const bActive = b.stage !== "complete";
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (aActive && bActive) {
      if (a.score !== b.score) return b.score - a.score;
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return 0;
    }
    return a.date > b.date ? -1 : 1;
  });
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function daysLabel(dateStr) {
  const today = getToday();
  if (dateStr === today) return "Today";
  const d = new Date(dateStr);
  const t = new Date(today);
  const diff = Math.floor((t - d) / 86400000);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return dateStr;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// PASSWORD GATE — Nobody sees emails without authentication
// ═══════════════════════════════════════════════════════════
// Change this password. Shared between Dave, France, and Shivam.
const ACCESS_PASSWORD = "Galaxy2026!";
const AUTH_KEY = "jarvis_auth_token";
const AUTH_EXPIRY_HOURS = 24; // Re-authenticate after 24 hours

function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (h << 5) - h + pw.charCodeAt(i);
    h |= 0;
  }
  return "jarvis_" + Math.abs(h).toString(36);
}

function isAuthenticated() {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return false;
    const { token, expiry } = JSON.parse(stored);
    if (Date.now() > expiry) {
      localStorage.removeItem(AUTH_KEY);
      return false;
    }
    return token === hashPassword(ACCESS_PASSWORD);
  } catch {
    return false;
  }
}

function setAuthenticated() {
  const token = hashPassword(ACCESS_PASSWORD);
  const expiry = Date.now() + AUTH_EXPIRY_HOURS * 60 * 60 * 1000;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token, expiry }));
}

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (pw === ACCESS_PASSWORD) {
      setAuthenticated();
      onLogin();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPw("");
    }
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans',sans-serif",
        background: C.bg,
        color: C.text,
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      `}</style>
      <div
        style={{
          width: 360,
          animation: "fadeUp .4s ease",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            J
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          J.A.R.V.I.S.
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.textMuted,
            marginBottom: 32,
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          v8.1 Command Center
        </div>
        <div style={{ animation: shake ? "shake .4s ease" : "none" }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Enter access password"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              background: C.surface,
              border: `1px solid ${error ? C.red : C.border}`,
              color: C.text,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "'DM Sans',sans-serif",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color .2s",
            }}
          />
        </div>
        {error && (
          <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>
            Incorrect password. Try again.
          </div>
        )}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "12px 0",
            marginTop: 12,
            background: C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
            transition: "opacity .15s",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.target.style.opacity = "1")}
        >
          Access Command Center
        </button>
        <div
          style={{
            fontSize: 10,
            color: C.textMuted,
            marginTop: 24,
            lineHeight: 1.6,
          }}
        >
          Galaxy Data Centers — Confidential
          <br />
          Authorized personnel only
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated);
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <JarvisCC />;
}

function JarvisCC() {
  const [data, setData] = useState(() => mergeWithPipelineState(DEMO_DATA));
  const [selId, setSelId] = useState(DEMO_DATA[0]?.id);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [liveStatus, setLiveStatus] = useState("demo"); // "demo" | "live" | "error"
  const [lastUpdate, setLastUpdate] = useState(null);
  const [scanMeta, setScanMeta] = useState(null);
  const intervalRef = useRef(null);

  // ─── LIVE DATA FETCHING ───
  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch("/data/jarvis_results.json?" + Date.now());
      if (!res.ok) throw new Error("No data");
      const scanData = await res.json();
      if (
        scanData.status === "waiting_for_first_scan" ||
        !scanData.items?.length
      ) {
        setLiveStatus("demo");
        return;
      }
      const transformed = transformScanResults(scanData);
      if (!transformed) return;

      setData((prev) => {
        // Merge: keep pipeline stage for existing emails, new emails start as "inbox"
        const savedState = loadPipelineState();
        const merged = transformed.map((e) => ({
          ...e,
          stage: savedState[e.id] || "inbox",
        }));
        return merged;
      });

      setScanMeta({
        total: scanData.total,
        noise: scanData.noise,
        ai: scanData.ai,
        timestamp: scanData.timestamp,
      });
      setLiveStatus("live");
      setLastUpdate(new Date());
    } catch {
      // No live data available — stay on demo data
      if (liveStatus !== "live") setLiveStatus("demo");
    }
  }, [liveStatus]);

  useEffect(() => {
    fetchLiveData();
    intervalRef.current = setInterval(fetchLiveData, 30000); // Poll every 30 seconds
    return () => clearInterval(intervalRef.current);
  }, [fetchLiveData]);

  // ─── PERSISTENCE ───
  useEffect(() => {
    savePipelineState(data);
  }, [data]);

  const filtered = useMemo(() => {
    let r = data;
    if (stageFilter !== "ALL") r = r.filter((e) => e.stage === stageFilter);
    if (filter !== "ALL") r = r.filter((e) => e.label === filter);
    if (!showComplete) r = r.filter((e) => e.stage !== "complete");
    if (search)
      r = r.filter((e) =>
        `${e.from} ${e.subject} ${e.email}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    return sortEmails(r);
  }, [data, stageFilter, filter, search, showComplete]);

  const sel = data.find((e) => e.id === selId);
  const u = sel ? URGENCY[sel.label] || URGENCY.NOTABLE : URGENCY.NOTABLE;

  const stgCounts = useMemo(() => {
    const c = {};
    STAGES.forEach(
      (s) => (c[s.id] = data.filter((e) => e.stage === s.id).length)
    );
    return c;
  }, [data]);

  const activeCount = data.filter((e) => e.stage !== "complete").length;
  const todayCount = data.filter(
    (e) => e.date === getToday() && e.stage !== "complete"
  ).length;
  const carryOver = data.filter(
    (e) => e.date !== getToday() && e.stage !== "complete"
  ).length;

  const update = useCallback(
    (id, key, val) =>
      setData((p) => p.map((e) => (e.id === id ? { ...e, [key]: val } : e))),
    []
  );

  return (
    <div
      style={{
        fontFamily: "'DM Sans',sans-serif",
        background: C.bg,
        color: C.text,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        @keyframes slideR{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      {/* HEADER */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          background: C.surface,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            J
          </span>
        </div>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>J.A.R.V.I.S.</span>
          <span
            style={{
              fontSize: 11,
              color: C.textMuted,
              marginLeft: 8,
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            v8.1 Command Center
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Live/Demo indicator */}
          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 4,
              fontFamily: "'JetBrains Mono',monospace",
              fontWeight: 600,
              background:
                liveStatus === "live" ? `${C.green}18` : `${C.yellow}18`,
              color: liveStatus === "live" ? C.green : C.yellow,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: liveStatus === "live" ? C.green : C.yellow,
                animation: liveStatus === "live" ? "pulse 2s infinite" : "none",
              }}
            />
            {liveStatus === "live" ? "LIVE" : "DEMO"}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 4,
              background: `${C.red}18`,
              color: C.red,
              fontFamily: "'JetBrains Mono',monospace",
              fontWeight: 600,
            }}
          >
            {activeCount} active
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 4,
              background: `${C.accent}18`,
              color: C.accent,
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            {todayCount} today
          </span>
          {carryOver > 0 && (
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: `${C.orange}18`,
                color: C.orange,
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              {carryOver} carry-over
            </span>
          )}
          {scanMeta && (
            <span
              style={{
                fontSize: 10,
                color: C.textMuted,
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              {scanMeta.total} scanned | {scanMeta.noise} noise | {scanMeta.ai}{" "}
              AI
            </span>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: 150,
              padding: "5px 10px 5px 24px",
              background: C.surface2,
              border: `1px solid ${C.border}`,
              color: C.text,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "'DM Sans',sans-serif",
              outline: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              color: C.textMuted,
            }}
          >
            {"\u2315"}
          </span>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem(AUTH_KEY);
            window.location.reload();
          }}
          style={{
            padding: "5px 10px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 6,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}
          title="Sign out"
        >
          Sign Out
        </button>
      </div>

      {/* FILTERS */}
      <div
        style={{
          padding: "8px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          flexShrink: 0,
          background: C.bg,
          alignItems: "center",
        }}
      >
        <Pill
          c={C.accent}
          active={stageFilter === "ALL"}
          onClick={() => setStageFilter("ALL")}
          n={activeCount}
        >
          Active
        </Pill>
        {STAGES.map((s) => (
          <Pill
            key={s.id}
            c={s.color}
            active={stageFilter === s.id}
            onClick={() => setStageFilter(s.id)}
            n={stgCounts[s.id]}
          >
            {s.icon} {s.label}
          </Pill>
        ))}
        <div
          style={{
            width: 1,
            height: 20,
            background: C.border,
            margin: "0 4px",
          }}
        />
        {["ALL", "CRITICAL", "URGENT", "IMPORTANT"].map((f) => (
          <Pill
            key={f}
            c={f === "ALL" ? C.accent : URGENCY[f].color}
            active={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All" : f}
          </Pill>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowComplete(!showComplete)}
            style={{
              fontSize: 10,
              padding: "3px 10px",
              background: showComplete ? `${C.green}18` : "transparent",
              border: `1px solid ${showComplete ? C.green + "40" : C.border}`,
              color: showComplete ? C.green : C.textMuted,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {showComplete ? "Hide" : "Show"} Done ({stgCounts.complete})
          </button>
          <button
            onClick={fetchLiveData}
            style={{
              fontSize: 10,
              padding: "3px 10px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.textMuted,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT LIST */}
        <div
          style={{
            width: 380,
            borderRight: `1px solid ${C.border}`,
            overflowY: "auto",
            flexShrink: 0,
            background: C.bg,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: C.textMuted,
                fontSize: 12,
              }}
            >
              No items match filters
            </div>
          )}
          {filtered.map((e, i) => {
            const eu = URGENCY[e.label] || URGENCY.NOTABLE;
            const isSel = sel?.id === e.id;
            const stg = STAGES.find((s) => s.id === e.stage);
            const dayLabel = daysLabel(e.date);
            const isToday = e.date === getToday();
            const prevItem = i > 0 ? filtered[i - 1] : null;
            const showDateSep =
              e.stage !== "complete" &&
              (i === 0 ||
                (prevItem?.stage !== "complete" && e.date !== prevItem?.date));
            const showCompleteSep =
              e.stage === "complete" &&
              (i === 0 || prevItem?.stage !== "complete");
            return (
              <div key={e.id}>
                {showDateSep && (
                  <div
                    style={{
                      padding: "6px 16px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: isToday ? C.accent : C.orange,
                      background: isToday ? `${C.accent}08` : `${C.orange}08`,
                      borderBottom: `1px solid ${C.border}`,
                      letterSpacing: ".5px",
                      textTransform: "uppercase",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {isToday
                        ? "Today \u2014 New"
                        : `${dayLabel} \u2014 Still Active`}
                    </span>
                    {!isToday && (
                      <span style={{ fontWeight: 400, opacity: 0.6 }}>
                        Needs action
                      </span>
                    )}
                  </div>
                )}
                {showCompleteSep && (
                  <div
                    style={{
                      padding: "6px 16px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: C.green,
                      background: `${C.green}08`,
                      borderBottom: `1px solid ${C.border}`,
                      letterSpacing: ".5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Completed
                  </div>
                )}
                <div
                  onClick={() => setSelId(e.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${C.border}08`,
                    borderLeft: `3px solid ${isSel ? eu.color : "transparent"}`,
                    background: isSel
                      ? C.surface
                      : e.stage === "complete"
                      ? `${C.bg}80`
                      : "transparent",
                    cursor: "pointer",
                    transition: "all .1s",
                    opacity: e.stage === "complete" ? 0.5 : 1,
                    animation: `slideR .2s ease ${i * 0.02}s both`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isSel ? C.text : C.textDim,
                        maxWidth: "55%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.from?.split("\u2014")[0]?.trim()}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      {!e.read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: C.accent,
                          }}
                        />
                      )}
                      {!isToday && e.stage !== "complete" && (
                        <span
                          style={{
                            fontSize: 8,
                            color: C.orange,
                            background: `${C.orange}18`,
                            padding: "0 4px",
                            borderRadius: 3,
                            fontFamily: "'JetBrains Mono',monospace",
                          }}
                        >
                          CARRY
                        </span>
                      )}
                      {e.aiReviewed && (
                        <span
                          style={{
                            fontSize: 8,
                            color: C.purple,
                            background: `${C.purple}18`,
                            padding: "0 4px",
                            borderRadius: 3,
                            fontFamily: "'JetBrains Mono',monospace",
                            fontWeight: 700,
                          }}
                        >
                          AI
                        </span>
                      )}
                      {e.hasAttachment && (
                        <span
                          style={{
                            fontSize: 8,
                            color: C.teal,
                            background: `${C.teal}18`,
                            padding: "0 4px",
                            borderRadius: 3,
                            fontFamily: "'JetBrains Mono',monospace",
                          }}
                        >
                          ATT
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono',monospace",
                          color: "#fff",
                          background: eu.color,
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {e.score}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textDim,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: 4,
                    }}
                  >
                    {e.subject}
                  </div>
                  <div
                    style={{ display: "flex", gap: 4, alignItems: "center" }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: eu.color,
                        background: eu.bg,
                        border: `1px solid ${eu.border}`,
                        padding: "0 5px",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {e.label}
                    </span>
                    {stg && (
                      <span
                        style={{
                          fontSize: 9,
                          color: stg.color,
                          padding: "0 5px",
                        }}
                      >
                        {stg.icon} {stg.label}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 9,
                        color: C.textMuted,
                        marginLeft: "auto",
                      }}
                    >
                      {e.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT DETAIL */}
        <div style={{ flex: 1, overflowY: "auto", background: C.surface }}>
          {sel ? (
            (() => {
              const dayLabel = daysLabel(sel.date);
              return (
                <div style={{ padding: 20, animation: "fadeIn .2s ease" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: u.bg,
                        border: `2px solid ${u.color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono',monospace",
                          color: u.color,
                        }}
                      >
                        {sel.score}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {sel.from}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.textDim,
                          fontFamily: "'JetBrains Mono',monospace",
                        }}
                      >
                        {sel.email} \u2014 {dayLabel}
                      </div>
                    </div>
                    {sel.link && (
                      <a
                        href={sel.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "6px 12px",
                          background: C.accent,
                          color: "#fff",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Open in Outlook {"\u2197"}
                      </a>
                    )}
                  </div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}
                  >
                    {sel.subject}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: u.bg,
                        border: `1px solid ${u.border}`,
                        color: u.color,
                        fontWeight: 600,
                      }}
                    >
                      {sel.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: C.surface2,
                        border: `1px solid ${C.border}`,
                        color: C.textDim,
                      }}
                    >
                      {PATTERNS[sel.pattern] || sel.pattern}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: C.surface2,
                        border: `1px solid ${C.border}`,
                        color: C.textDim,
                      }}
                    >
                      {sel.tier}
                    </span>
                    {sel.hasAttachment && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: `${C.teal}15`,
                          color: C.teal,
                        }}
                      >
                        Attachment
                      </span>
                    )}
                    {sel.aiReviewed && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: `${C.purple}15`,
                          color: C.purple,
                        }}
                      >
                        AI Reviewed
                      </span>
                    )}
                    {sel.date !== getToday() && sel.stage !== "complete" && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: `${C.orange}15`,
                          color: C.orange,
                        }}
                      >
                        Carry-over from {dayLabel}
                      </span>
                    )}
                  </div>
                  {sel.reasons.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginBottom: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      {sel.reasons.map((r, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: C.surface2,
                            color: C.textDim,
                            fontFamily: "'JetBrains Mono',monospace",
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      marginBottom: 14,
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        fontWeight: 600,
                        marginRight: 4,
                      }}
                    >
                      MOVE TO:
                    </span>
                    {STAGES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => update(sel.id, "stage", s.id)}
                        style={{
                          padding: "4px 10px",
                          background:
                            sel.stage === s.id ? `${s.color}18` : "transparent",
                          border: `1px solid ${
                            sel.stage === s.id ? s.color + "50" : C.border
                          }`,
                          color: sel.stage === s.id ? s.color : C.textMuted,
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                  {sel.quip && (
                    <div
                      style={{
                        padding: "10px 12px",
                        marginBottom: 12,
                        background: `${C.accent}08`,
                        borderLeft: `3px solid ${C.accent}40`,
                        borderRadius: "0 8px 8px 0",
                        fontSize: 12,
                        color: C.accent,
                        fontStyle: "italic",
                      }}
                    >
                      "{sel.quip}"
                    </div>
                  )}
                  {sel.jarvis && (
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: C.accent,
                          letterSpacing: ".5px",
                          marginBottom: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Jarvis Briefing
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          background: C.bg,
                          borderRadius: 8,
                          fontSize: 12,
                          color: C.textDim,
                          lineHeight: 1.6,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {sel.jarvis}
                      </div>
                    </div>
                  )}
                  {sel.action && (
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: u.color,
                          letterSpacing: ".5px",
                          marginBottom: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Recommended Action
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          background: u.bg,
                          borderRadius: 8,
                          fontSize: 12,
                          color: u.color,
                          lineHeight: 1.6,
                          border: `1px solid ${u.border}`,
                          fontWeight: 500,
                        }}
                      >
                        {sel.action}
                      </div>
                    </div>
                  )}
                  {sel.reply && (
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: C.textDim,
                          letterSpacing: ".5px",
                          marginBottom: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Draft Reply
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          background: C.bg,
                          borderRadius: 8,
                          fontSize: 12,
                          fontFamily: "'JetBrains Mono',monospace",
                          color: C.textDim,
                          lineHeight: 1.7,
                          border: `1px solid ${C.border}`,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {sel.reply}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button
                          onClick={() =>
                            navigator.clipboard?.writeText(sel.reply)
                          }
                          style={{
                            padding: "5px 12px",
                            background: C.surface2,
                            border: `1px solid ${C.border}`,
                            color: C.accent,
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif",
                          }}
                        >
                          Copy as Dave
                        </button>
                        <button
                          onClick={() =>
                            navigator.clipboard?.writeText(
                              `Hi ${sel.from
                                ?.split("\u2014")[0]
                                ?.split(" ")[0]
                                ?.trim()},\n\nDave asked me to follow up.\n\n${sel.reply
                                .split("\n")
                                .slice(1)
                                .join(
                                  "\n"
                                )}\n\nBest regards,\nFrance\nExecutive Assistant to Dave Misra`
                            )
                          }
                          style={{
                            padding: "5px 12px",
                            background: C.surface2,
                            border: `1px solid ${C.border}`,
                            color: C.orange,
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif",
                          }}
                        >
                          Copy as France
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    {[
                      {
                        l: "\u2192 France",
                        fn: () => update(sel.id, "stage", "france"),
                      },
                      {
                        l: "\u2192 External",
                        fn: () => update(sel.id, "stage", "external"),
                      },
                      {
                        l: "\u2192 Dave",
                        fn: () => update(sel.id, "stage", "dave"),
                      },
                      {
                        l: "\u2192 Scheduled",
                        fn: () => update(sel.id, "stage", "scheduled"),
                      },
                      {
                        l: "\u2713 Done",
                        fn: () => update(sel.id, "stage", "complete"),
                      },
                    ].map((a) => (
                      <button
                        key={a.l}
                        onClick={a.fn}
                        style={{
                          padding: "5px 12px",
                          background: a.l.includes("Done")
                            ? `${C.green}18`
                            : C.surface2,
                          border: `1px solid ${
                            a.l.includes("Done") ? C.green + "40" : C.border
                          }`,
                          color: a.l.includes("Done") ? C.green : C.textDim,
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        {a.l}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            <div
              style={{ padding: 40, textAlign: "center", color: C.textMuted }}
            >
              Select an email
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ c, active, onClick, n, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        fontSize: 10,
        fontWeight: active ? 600 : 400,
        fontFamily: "'DM Sans',sans-serif",
        background: active ? `${c}18` : "transparent",
        border: `1px solid ${active ? c + "40" : C.border}`,
        color: active ? c : C.textMuted,
        borderRadius: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
      {n !== undefined && (
        <span
          style={{
            fontSize: 9,
            fontFamily: "'JetBrains Mono',monospace",
            opacity: 0.7,
          }}
        >
          {n}
        </span>
      )}
    </button>
  );
}
