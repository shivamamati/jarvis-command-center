import { useState, useMemo, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════
const T = {
  bg: "#fafaf9",
  surface: "#fff",
  border: "#e7e5e4",
  borderLight: "#f5f5f4",
  text: "#1c1917",
  textMid: "#57534e",
  textDim: "#a8a29e",
  accent: "#6366f1",
  accentLight: "#f5f3ff",
  accentBorder: "#ddd6fe",
  accentText: "#4338ca",
  red: "#ef4444",
  redBg: "#fef2f2",
  redText: "#b91c1c",
  orange: "#f97316",
  orangeBg: "#fff7ed",
  orangeText: "#c2410c",
  yellow: "#eab308",
  yellowBg: "#fefce8",
  yellowText: "#92400e",
  green: "#10b981",
  greenBg: "#f0fdf4",
  greenText: "#166534",
  teal: "#0ea5e9",
  tealBg: "#f0f9ff",
  tealText: "#0369a1",
  muted: "#94a3b8",
  mutedBg: "#f8fafc",
  mutedText: "#475569",
};
const URG = {
  CRITICAL: { bar: T.red, badge: T.redBg, text: T.redText, label: "Act today" },
  URGENT: {
    bar: T.orange,
    badge: T.orangeBg,
    text: T.orangeText,
    label: "Act this week",
  },
  IMPORTANT: {
    bar: T.yellow,
    badge: T.yellowBg,
    text: T.yellowText,
    label: "Review",
  },
  NOTABLE: { bar: T.muted, badge: T.mutedBg, text: T.mutedText, label: "FYI" },
};
const STAGES = [
  { id: "inbox", label: "Inbox", desc: "Not yet triaged", c: T.muted },
  { id: "france", label: "France", desc: "Internal processing", c: T.green },
  { id: "external", label: "External", desc: "Waiting on others", c: T.yellow },
  { id: "dave", label: "Dave", desc: "Executive action", c: T.accent },
  { id: "scheduled", label: "Scheduled", desc: "In calendar", c: T.teal },
  { id: "complete", label: "Done", desc: "Completed", c: T.green },
];
const PAT = {
  A: "Inbound Lead",
  B: "Introduction",
  C: "Lead-Gen",
  D: "Customer Follow-Up",
  E: "Legal/NDA",
  F: "Investor/Capital",
  G: "Internal Ops",
  H: "PR/Awards",
  I: "Scheduling",
  J: "Admin",
};

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function useIsMobile(bp = 768) {
  const [m, s] = useState(
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const h = () => s(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateLabel(ds) {
  const t = getToday();
  if (ds === t) return "Today";
  const diff = Math.round(
    (new Date(t + "T12:00:00") - new Date(ds + "T12:00:00")) / 864e5
  );
  if (diff === 1) return "Yesterday";
  if (diff < 7 && diff > 0) return `${diff}d ago`;
  const d = new Date(ds + "T12:00:00");
  return `${
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][d.getMonth()]
  } ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtTime(iso) {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    return `${
      [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][d.getMonth()]
    } ${d.getDate()}, ${h % 12 || 12}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  } catch {
    return iso;
  }
}
function getDateLocal(iso) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════
// NLP CATEGORIZATION ENGINE (Full Implementation)
// ═══════════════════════════════════════════════════════════
const STAGE_PATTERNS = {
  dave: {
    keywords: [
      "urgent",
      "critical",
      "priority",
      "immediate",
      "asap",
      "top priority",
      "vip",
      "decision",
      "board",
      "investor",
      "strategic",
      "capital",
      "redhill",
      "substation",
      "power",
      "capacity",
      "MW",
      "pipeline",
      "prospect",
      "sign",
      "approve",
      "loi",
    ],
    domains: [
      "castleforge.com",
      "smbcgroup.com",
      "travelers.com",
      "nomura.com",
      "arm.com",
      "cbre.com",
    ],
    patterns: [
      "dave",
      "ceo",
      "executive",
      "board meeting",
      "investor call",
      "top priority",
      "critical path",
      "action required",
    ],
    tiers: ["TIER 1", "PIPELINE", "DAVE FLAGGED", "PIPELINE VIP", "CRITICAL"],
    priority: 5,
  },
  france: {
    keywords: [
      "follow up",
      "forward",
      "delegate",
      "handle",
      "process",
      "review",
      "schedule",
      "coordinate",
      "confirm",
      "arrange",
      "booking",
      "admin",
      "awards",
      "submission",
      "pr",
      "marketing",
    ],
    domains: ["jsa.net", "fellow.app", "galaxydatacenters.com"],
    patterns: [
      "france",
      "team",
      "internal ops",
      "admin",
      "scheduling",
      "forward to",
      "please handle",
      "awards submission",
    ],
    tiers: ["INTERNAL", "VIP FIRM", "INTERNAL VIP"],
    priority: 3,
  },
  external: {
    keywords: [
      "waiting",
      "pending",
      "hold",
      "awaiting",
      "standby",
      "external",
      "nda",
      "contract",
      "agreement",
      "legal",
      "signed",
      "countersigned",
    ],
    domains: ["simmons-simmons.com"],
    patterns: [
      "waiting for response",
      "pending approval",
      "external review",
      "nda sent",
      "contract sent",
      "awaiting signature",
      "ball in their court",
    ],
    tiers: [],
    priority: 2,
  },
  scheduled: {
    keywords: [
      "scheduled",
      "calendar",
      "meeting",
      "appointment",
      "booked",
      "confirmed",
      "call",
      "sync",
      "demo",
      "tour",
      "site visit",
    ],
    domains: [],
    patterns: [
      "scheduled for",
      "meeting on",
      "appointment at",
      "calendar invite",
      "site visit confirmed",
      "tour booked",
    ],
    tiers: [],
    priority: 2,
  },
  inbox: {
    keywords: [
      "new",
      "notification",
      "fyi",
      "newsletter",
      "update",
      "digest",
      "weekly",
      "monthly report",
    ],
    domains: [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "newsletter",
      "mailchimp",
      "agoda",
      "borrowell",
    ],
    patterns: [],
    tiers: ["UNKNOWN", "NOTABLE"],
    priority: 1,
  },
  complete: {
    keywords: [
      "done",
      "completed",
      "finished",
      "resolved",
      "closed",
      "archived",
      "sorted",
      "approved",
      "confirmed and done",
    ],
    domains: [],
    patterns: [
      "task complete",
      "issue resolved",
      "all done",
      "confirmed and booked",
    ],
    tiers: [],
    priority: 1,
  },
};

const URGENCY_KEYWORDS = {
  critical: [
    "critical",
    "urgent",
    "emergency",
    "asap",
    "immediately",
    "now",
    "crisis",
    "top priority",
    "action required",
    "time-critical",
  ],
  urgent: [
    "important",
    "priority",
    "high priority",
    "time sensitive",
    "deadline",
    "today",
    "eod",
    "by eod",
    "this week",
  ],
  important: [
    "soon",
    "this week",
    "next week",
    "moderate",
    "standard",
    "review",
    "follow up",
  ],
  notable: [
    "whenever",
    "no rush",
    "fyi",
    "informational",
    "low priority",
    "newsletter",
  ],
};

const CONTACT_PATTERNS = {
  vip: [
    "castleforge",
    "smbc",
    "travelers",
    "nomura",
    "arm",
    "google",
    "cbre",
    "savills",
    "jll",
    "knight frank",
    "zayo",
    "colt",
    "lumen",
    "cdw",
  ],
  internal: [
    "galaxy",
    "galaxydatacenters",
    "galaxycapitalpartners",
    "redhilldatacentre",
  ],
  broker: ["techre", "gotcolo", "adaptive-mdc", "innogate", "bitooda", "bcs"],
  vendor: ["marketjoy", "demandfactor", "schbang", "hubspot", "contactantpro"],
};

function analyzeEmail(email) {
  const text = `${email.from || ""} ${email.subject || ""} ${
    email.jarvis || ""
  } ${email.action || ""} ${email.label || ""} ${email.tier || ""} ${
    email.company || ""
  }`.toLowerCase();
  const emailDomain = (email.email || "").split("@")[1] || "";
  const scores = {};
  const allReasons = {};
  const allKeywords = {};

  for (const [stageId, config] of Object.entries(STAGE_PATTERNS)) {
    let score = 0;
    const reasons = [];
    const kws = [];

    config.keywords.forEach((kw) => {
      if (text.includes(kw.toLowerCase())) {
        score += 2;
        kws.push(kw);
        reasons.push(`Keyword: "${kw}"`);
      }
    });
    config.patterns.forEach((p) => {
      if (text.includes(p.toLowerCase())) {
        score += 3;
        reasons.push(`Pattern: "${p}"`);
      }
    });
    config.domains.forEach((d) => {
      if (emailDomain.includes(d)) {
        score += 4;
        reasons.push(`Domain: ${d}`);
      }
    });
    config.tiers.forEach((t) => {
      if ((email.tier || "").toUpperCase().includes(t)) {
        score += 3;
        reasons.push(`Tier match: ${t}`);
      }
    });

    // Contact type boosts
    if (stageId === "dave") {
      if (email.label === "CRITICAL" || email.label === "URGENT") {
        score += 2;
        reasons.push("High urgency label");
      }
      if (CONTACT_PATTERNS.vip.some((v) => text.includes(v))) {
        score += 3;
        reasons.push("VIP contact detected");
      }
    }
    if (stageId === "france") {
      if (
        CONTACT_PATTERNS.internal.some((v) => emailDomain.includes(v)) &&
        email.label !== "CRITICAL"
      ) {
        score += 2;
        reasons.push("Internal sender");
      }
    }
    if (stageId === "external") {
      if (CONTACT_PATTERNS.broker.some((v) => text.includes(v))) {
        score += 1;
        reasons.push("Broker/partner contact");
      }
    }

    scores[stageId] = score * config.priority;
    allReasons[stageId] = reasons;
    allKeywords[stageId] = kws;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topStage = sorted[0][0];
  const topScore = sorted[0][1];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence =
    totalScore > 0
      ? Math.min(Math.round((topScore / totalScore) * 100), 98)
      : 20;

  // Urgency calculation
  let urgencyScore = 0;
  Object.entries(URGENCY_KEYWORDS).forEach(([level, kws]) => {
    const weight =
      level === "critical"
        ? 0.15
        : level === "urgent"
        ? 0.1
        : level === "important"
        ? 0.06
        : 0.03;
    kws.forEach((kw) => {
      if (text.includes(kw)) urgencyScore += weight;
    });
  });
  urgencyScore = Math.min(urgencyScore, 1);

  // Category detection
  let category = "General";
  if (
    text.includes("nda") ||
    text.includes("contract") ||
    text.includes("agreement") ||
    text.includes("legal")
  )
    category = "Legal/Contract";
  else if (
    text.includes("proposal") ||
    text.includes("rfp") ||
    text.includes("quote") ||
    text.includes("loi")
  )
    category = "Proposal/LOI";
  else if (
    text.includes("meeting") ||
    text.includes("call") ||
    text.includes("calendar") ||
    text.includes("tour")
  )
    category = "Scheduling";
  else if (
    text.includes("invoice") ||
    text.includes("payment") ||
    text.includes("capital") ||
    text.includes("fund")
  )
    category = "Financial";
  else if (
    text.includes("board") ||
    text.includes("deck") ||
    text.includes("report") ||
    text.includes("review")
  )
    category = "Board/Reporting";
  else if (
    text.includes("award") ||
    text.includes("pr") ||
    text.includes("press") ||
    text.includes("marketing")
  )
    category = "PR/Marketing";
  else if (
    text.includes("prospect") ||
    text.includes("lead") ||
    text.includes("pipeline") ||
    text.includes("mw")
  )
    category = "Pipeline/Sales";
  else if (
    text.includes("redhill") ||
    text.includes("site") ||
    text.includes("ops") ||
    text.includes("substation")
  )
    category = "Operations";
  else if (
    text.includes("newsletter") ||
    text.includes("fyi") ||
    text.includes("digest")
  )
    category = "Newsletter/FYI";

  // Contact type
  let contactType = "Unknown";
  if (CONTACT_PATTERNS.vip.some((v) => text.includes(v))) contactType = "VIP";
  else if (
    CONTACT_PATTERNS.internal.some(
      (v) => text.includes(v) || emailDomain.includes(v)
    )
  )
    contactType = "Internal";
  else if (CONTACT_PATTERNS.broker.some((v) => text.includes(v)))
    contactType = "Broker/Partner";
  else if (CONTACT_PATTERNS.vendor.some((v) => text.includes(v)))
    contactType = "Vendor";

  const alternatives = sorted
    .slice(1, 4)
    .filter(([, s]) => s > 0)
    .map(([stage, s]) => ({
      stage,
      confidence: totalScore > 0 ? Math.round((s / totalScore) * 100) : 10,
    }));

  return {
    suggestedStage: topStage,
    confidence,
    category,
    contactType,
    reasoning: allReasons[topStage] || [],
    urgencyScore: Math.round(urgencyScore * 100),
    keywords: allKeywords[topStage] || [],
    alternatives,
  };
}

// ═══════════════════════════════════════════════════════════
// NLP SUGGESTION WIDGET (Full expandable UI)
// ═══════════════════════════════════════════════════════════
function NlpWidget({ email, onApply }) {
  const [expanded, setExpanded] = useState(false);
  const analysis = useMemo(() => analyzeEmail(email), [email.id, email.stage]);
  const stg = STAGES.find((s) => s.id === analysis.suggestedStage);
  const isSame = email.stage === analysis.suggestedStage;
  const isLowConf = analysis.confidence < 55;

  if (isSame && !isLowConf) return null;

  return (
    <div
      style={{
        marginBottom: 14,
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${T.accentBorder}`,
        background: T.accentLight,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>{"\u2728"}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.accent,
            letterSpacing: 0.5,
          }}
        >
          NLP SUGGESTION
        </span>
        <span
          style={{
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 5,
            fontWeight: 700,
            fontFamily: "monospace",
            background:
              analysis.confidence >= 75
                ? T.greenBg
                : analysis.confidence >= 50
                ? T.yellowBg
                : T.orangeBg,
            color:
              analysis.confidence >= 75
                ? T.greenText
                : analysis.confidence >= 50
                ? T.yellowText
                : T.orangeText,
          }}
        >
          {analysis.confidence}% confident
        </span>
        <span
          style={{
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 5,
            background: T.bg,
            color: T.textMid,
          }}
        >
          {analysis.category}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 5,
            background: T.bg,
            color: T.textDim,
          }}
        >
          {analysis.contactType}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{
            fontSize: 10,
            padding: "4px 10px",
            background: T.surface,
            border: `1px solid ${T.accentBorder}`,
            color: T.accent,
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
          }}
        >
          {expanded ? "Collapse" : "Details"}
        </button>
      </div>

      {/* Suggestion row */}
      <div
        style={{
          padding: "4px 16px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: T.textDim }}>Move to:</span>
        {stg && (
          <span
            style={{
              fontSize: 11,
              padding: "4px 12px",
              borderRadius: 6,
              background: `${stg.c}15`,
              border: `1px solid ${stg.c}30`,
              color: stg.c,
              fontWeight: 600,
            }}
          >
            {stg.label}
          </span>
        )}
        {analysis.reasoning.length > 0 && (
          <span style={{ fontSize: 10, color: T.textDim, fontStyle: "italic" }}>
            {analysis.reasoning[0]}
          </span>
        )}
        {!isSame && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(analysis.suggestedStage);
            }}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              padding: "6px 18px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              color: "#fff",
              borderRadius: 7,
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "inherit",
              boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
            }}
          >
            Apply
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            padding: "0 16px 14px",
            borderTop: `1px solid ${T.accentBorder}`,
          }}
        >
          {/* Analysis grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              margin: "12px 0",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                background: T.surface,
                borderRadius: 8,
                border: `1px solid ${T.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: T.textDim,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Category
              </div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                {analysis.category}
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                background: T.surface,
                borderRadius: 8,
                border: `1px solid ${T.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: T.textDim,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Urgency Score
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: T.borderLight,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${analysis.urgencyScore}%`,
                      height: "100%",
                      borderRadius: 3,
                      background:
                        analysis.urgencyScore >= 70
                          ? T.red
                          : analysis.urgencyScore >= 40
                          ? T.orange
                          : T.teal,
                      transition: "width 500ms ease",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: T.textMid,
                    fontFamily: "monospace",
                    fontWeight: 700,
                  }}
                >
                  {analysis.urgencyScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Reasoning */}
          {analysis.reasoning.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 9,
                  color: T.textDim,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Reasoning
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {analysis.reasoning.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: T.textMid,
                      paddingLeft: 12,
                      borderLeft: `2px solid ${T.accentBorder}`,
                      lineHeight: 1.5,
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {analysis.keywords.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 9,
                  color: T.textDim,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Keywords Detected
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {analysis.keywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 5,
                      background: `${T.accent}10`,
                      border: `1px solid ${T.accentBorder}`,
                      color: T.accent,
                      fontWeight: 500,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {analysis.alternatives.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: T.textDim,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Alternative Suggestions
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {analysis.alternatives.map((alt, i) => {
                  const as = STAGES.find((s) => s.id === alt.stage);
                  return as ? (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onApply(alt.stage);
                      }}
                      style={{
                        fontSize: 11,
                        padding: "6px 14px",
                        background: T.surface,
                        border: `1px solid ${as.c}30`,
                        color: as.c,
                        borderRadius: 7,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {as.label}
                      <span
                        style={{
                          fontSize: 9,
                          opacity: 0.7,
                          fontFamily: "monospace",
                        }}
                      >
                        {alt.confidence}%
                      </span>
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LIVE DATA TRANSFORM
// ═══════════════════════════════════════════════════════════
function transformScan(sd) {
  if (!sd?.items?.length) return null;
  return sd.items.map((it, i) => ({
    id: `live_${i}_${(it.sender_email || "").slice(0, 10)}`,
    score: it.final_score || 3,
    label: it.final_label || "NOTABLE",
    tier: it.rules_tier || "UNKNOWN",
    pattern: it.ai_pattern || "G",
    stage: "inbox",
    from: it.sender_name || it.sender_email || "Unknown",
    company: "",
    email: it.sender_email || "",
    subject: it.subject || "(no subject)",
    time: fmtTime(it.received),
    date: getDateLocal(it.received),
    link: it.web_link || "",
    jarvis: it.ai_summary || it.body_preview || "",
    action: it.ai_action || "",
    reply: "",
    deal: "",
    dealValue: "",
    actions: ["Open in Outlook", "Delegate to France", "Mark Done"],
    primaryAction: "Open in Outlook",
    reasons: it.rules_reasons || [],
    att: it.has_attachments || false,
    ai: it.ai_reviewed || false,
    read: it.is_read || false,
    threads: 1,
    avatar: (it.sender_name || "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    color: "#6366f1",
  }));
}

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
const SK = "jarvis_v9_state";
function loadS() {
  try {
    return JSON.parse(localStorage.getItem(SK)) || {};
  } catch {
    return {};
  }
}
function saveS(d) {
  try {
    const s = {};
    d.forEach((e) => {
      if (e.stage !== "inbox") s[e.id] = e.stage;
    });
    localStorage.setItem(SK, JSON.stringify(s));
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
const PW = "Galaxy2026!",
  AK = "jarvis_auth_v9";
function hp(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) {
    h = (h << 5) - h + p.charCodeAt(i);
    h |= 0;
  }
  return "j9_" + Math.abs(h).toString(36);
}
function isA() {
  try {
    const s = JSON.parse(localStorage.getItem(AK));
    return s && Date.now() < s.ex && s.tk === hp(PW);
  } catch {
    return false;
  }
}
function setAu() {
  localStorage.setItem(
    AK,
    JSON.stringify({ tk: hp(PW), ex: Date.now() + 864e5 })
  );
}

function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const m = useIsMobile();
  const go = () => {
    if (pw === PW) {
      setAu();
      onLogin();
    } else {
      setErr(true);
      setPw("");
    }
  };
  return (
    <div
      style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        background: T.bg,
        color: T.text,
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: m ? 20 : 0,
      }}
    >
      <div style={{ width: m ? "100%" : 380, textAlign: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>
            J
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          JARVIS
        </div>
        <div style={{ fontSize: 13, color: T.textDim, marginBottom: 28 }}>
          Command Center v9
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Enter access password"
          autoFocus
          style={{
            width: "100%",
            padding: "14px 16px",
            background: T.surface,
            border: `1px solid ${err ? T.red : T.border}`,
            color: T.text,
            borderRadius: 10,
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {err && (
          <div style={{ fontSize: 13, color: T.red, marginTop: 8 }}>
            Incorrect password
          </div>
        )}
        <button
          onClick={go}
          style={{
            width: "100%",
            padding: "14px 0",
            marginTop: 12,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Access Command Center
        </button>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 24 }}>
          Galaxy Data Centers {"\u2014"} Confidential
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HISTORICAL + DEMO DATA
// ═══════════════════════════════════════════════════════════
const HIST = [
  {
    id: "h0",
    score: 10,
    label: "CRITICAL",
    tier: "PIPELINE [18MW]",
    pattern: "A",
    stage: "dave",
    from: "John Hall",
    company: "TechRE Consulting",
    email: "john.hall@techreconsulting.com",
    subject: "TechRE Introducer \u2014 18MW AI Prospect for Redhill",
    time: "Mar 4",
    date: "2026-03-04",
    link: "#",
    jarvis:
      "18MW IT load, 144 racks at 120kW, AAA client, GPUs on order. Q2 2027 deadline. TechRE introducer at 10% commission.",
    action: "Confirm 18MW feasibility. Connect substation contractors.",
    reply: "John,\n\nEngineering team accelerating assessment.\n\nBest,\nDave",
    deal: "Redhill 18MW",
    dealValue: "\u00A342M",
    actions: [
      "Call John",
      "Forward to Ash",
      "Request Feasibility",
      "Defer 48h",
    ],
    primaryAction: "Call John",
    reasons: ["Pipeline: john hall", "KW: MW, rack"],
    att: false,
    ai: false,
    read: true,
    threads: 8,
    avatar: "JH",
    color: "#6366f1",
  },
  {
    id: "d1",
    score: 9,
    label: "CRITICAL",
    tier: "TIER 1",
    pattern: "G",
    stage: "dave",
    from: "Jamie Thirlwall",
    company: "Castleforge Partners",
    email: "jamie.thirlwall@castleforge.com",
    subject: "Monthly Deck for March Business Review",
    time: "Mar 17, 8:25 PM",
    date: "2026-03-17",
    link: "#",
    jarvis:
      "Final monthly report for board meeting. Full leadership on thread.",
    action: "Review deck TONIGHT.",
    reply: "Jamie,\n\nReceived, reviewing tonight.\n\nBest,\nDave",
    deal: "Castleforge JV",
    dealValue: "Board",
    actions: ["Review Now", "Delegate to France", "Request Changes"],
    primaryAction: "Review Now",
    reasons: ["Tier 1: castleforge.com", "KW: board"],
    att: true,
    ai: false,
    read: true,
    threads: 5,
    avatar: "JT",
    color: "#0ea5e9",
  },
  {
    id: "d2",
    score: 9,
    label: "CRITICAL",
    tier: "PIPELINE VIP",
    pattern: "D",
    stage: "dave",
    from: "John Hall",
    company: "TechRE Consulting",
    email: "john.hall@techreconsulting.com",
    subject: "Re: Redhill Unit 1&2 optionality",
    time: "Mar 17, 4:41 PM",
    date: "2026-03-17",
    link: "#",
    jarvis:
      "John reviewing high-density positioning for Redhill Units 1&2. 18MW prospect thread.",
    action: "Follow up Friday if no response.",
    reply: "",
    deal: "Redhill 18MW",
    dealValue: "\u00A342M",
    actions: ["Follow Up", "Call John", "Forward to Ashley"],
    primaryAction: "Follow Up",
    reasons: ["Pipeline: john hall", "KW: redhill"],
    att: false,
    ai: false,
    read: true,
    threads: 12,
    avatar: "JH",
    color: "#6366f1",
  },
  {
    id: "h12",
    score: 9,
    label: "CRITICAL",
    tier: "DAVE FLAGGED",
    pattern: "A",
    stage: "dave",
    from: "Fiona Leon",
    company: "Digital Realty",
    email: "fiona.leon@drt.co.uk",
    subject: "Galaxy / DRT Partnership & Cloud House \u2014 TOP PRIORITY",
    time: "Jan 13",
    date: "2026-01-13",
    link: "",
    jarvis:
      "DRT Partnership for Cloud House. Dave: 'TOP PRIORITY.' Zayo connectivity in progress.",
    action: "Re-engage. Still TOP PRIORITY.",
    reply: "",
    deal: "DRT Cloud House",
    dealValue: "Strategic",
    actions: ["Call Fiona", "Email Louise", "Delegate"],
    primaryAction: "Call Fiona",
    reasons: ["Tier 2: drt.co.uk", "Dave flagged"],
    att: false,
    ai: false,
    read: true,
    threads: 6,
    avatar: "FL",
    color: "#8b5cf6",
  },
  {
    id: "d4",
    score: 8,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "D",
    stage: "dave",
    from: "Ashley Roberts",
    company: "Galaxy Data Centers",
    email: "ashley@galaxydatacenters.com",
    subject: "Redhill High Density Strategy for Castleforge",
    time: "Mar 17, 5:14 PM",
    date: "2026-03-17",
    link: "#",
    jarvis: "High-density strategy commentary to Pelle Jorgen at Castleforge.",
    action: "Review before board meeting.",
    reply: "",
    deal: "Castleforge JV",
    dealValue: "",
    actions: ["Review & Approve", "Request Changes", "Forward to Paul"],
    primaryAction: "Review & Approve",
    reasons: ["Internal VIP", "8 VIPs on thread"],
    att: false,
    ai: false,
    read: false,
    threads: 4,
    avatar: "AR",
    color: "#14b8a6",
  },
  {
    id: "d6",
    score: 7,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "dave",
    from: "Paul Leong",
    company: "Galaxy Data Centers",
    email: "paul@galaxydatacenters.com",
    subject: "High Density Commentary \u2014 run by Pelle",
    time: "Mar 17, 4:00 PM",
    date: "2026-03-17",
    link: "#",
    jarvis:
      "Paul suggests adding comparison table before sending to Castleforge.",
    action: "Add high vs low density table.",
    reply: "",
    deal: "Castleforge JV",
    dealValue: "",
    actions: ["Add Table", "Approve As-Is", "Discuss"],
    primaryAction: "Add Table",
    reasons: ["Internal VIP", "Dave in thread"],
    att: false,
    ai: false,
    read: false,
    threads: 3,
    avatar: "PL",
    color: "#f59e0b",
  },
  {
    id: "d3",
    score: 8,
    label: "URGENT",
    tier: "TIER 1",
    pattern: "G",
    stage: "france",
    from: "Jamie Thirlwall",
    company: "Castleforge Partners",
    email: "jamie.thirlwall@castleforge.com",
    subject: "Board Deck slides received",
    time: "Mar 17, 8:09 PM",
    date: "2026-03-17",
    link: "#",
    jarvis: "All slides received. Finalizing pack tonight.",
    action: "FYI \u2014 being finalized.",
    reply: "",
    deal: "Castleforge JV",
    dealValue: "",
    actions: ["Acknowledge", "Follow Up"],
    primaryAction: "Acknowledge",
    reasons: ["Tier 1: castleforge.com"],
    att: false,
    ai: false,
    read: true,
    threads: 2,
    avatar: "JT",
    color: "#0ea5e9",
  },
  {
    id: "d9",
    score: 6,
    label: "IMPORTANT",
    tier: "INTERNAL VIP",
    pattern: "E",
    stage: "france",
    from: "Ashley Roberts",
    company: "Galaxy Data Centers",
    email: "ashley@galaxydatacenters.com",
    subject: "Partner Agreement sent to Mark",
    time: "Mar 17, 6:33 PM",
    date: "2026-03-17",
    link: "#",
    jarvis: "Partner agreement forwarded to Mark Vecchiarelli.",
    action: "Monitor for Mark's response.",
    reply: "",
    deal: "Partner Agreement",
    dealValue: "",
    actions: ["Monitor", "Follow Up"],
    primaryAction: "Monitor",
    reasons: ["Internal VIP", "KW: contract"],
    att: true,
    ai: false,
    read: true,
    threads: 2,
    avatar: "AR",
    color: "#14b8a6",
  },
  {
    id: "d10",
    score: 6,
    label: "IMPORTANT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "france",
    from: "Sai Raman",
    company: "Galaxy Data Centers",
    email: "sai@galaxydatacenters.com",
    subject: "246 London BFSI prospects",
    time: "Mar 17, 6:58 PM",
    date: "2026-03-17",
    link: "#",
    jarvis: "246 London financial services prospect list.",
    action: "Review list quality.",
    reply: "",
    deal: "Lead Gen",
    dealValue: "246 prospects",
    actions: ["Review List", "Forward to Paul", "Archive"],
    primaryAction: "Review List",
    reasons: ["Internal VIP", "Attachments"],
    att: true,
    ai: false,
    read: true,
    threads: 1,
    avatar: "SR",
    color: "#6366f1",
  },
  {
    id: "d7",
    score: 7,
    label: "URGENT",
    tier: "REDHILL OPS",
    pattern: "I",
    stage: "complete",
    from: "Benjamin Tyson",
    company: "Redhill Data Centre",
    email: "benjamin.tyson@redhilldatacentre.com",
    subject: "Rivington Energy Tour confirmed",
    time: "Mar 17, 2:44 PM",
    date: "2026-03-17",
    link: "#",
    jarvis: "Tour booked. Colin Bell confirmed.",
    action: "Done.",
    reply: "",
    deal: "Redhill Ops",
    dealValue: "",
    actions: [],
    primaryAction: "",
    reasons: ["Redhill ops"],
    att: false,
    ai: false,
    read: true,
    threads: 1,
    avatar: "BT",
    color: "#10b981",
  },
];

const DEALS = [
  {
    name: "Redhill 18MW",
    value: "\u00A342M",
    stage: "Feasibility",
    progress: 40,
    color: "#6366f1",
  },
  {
    name: "DRT Cloud House",
    value: "Strategic",
    stage: "TOP PRIORITY",
    progress: 25,
    color: "#8b5cf6",
  },
  {
    name: "Castleforge JV",
    value: "Board Review",
    stage: "Active",
    progress: 70,
    color: "#0ea5e9",
  },
];

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [au, setAu] = useState(isA);
  if (!au) return <Login onLogin={() => setAu(true)} />;
  return <Dashboard />;
}

function Dashboard() {
  const mob = useIsMobile();
  const [data, setData] = useState(() => {
    const s = loadS();
    return HIST.map((e) => ({ ...e, stage: s[e.id] || e.stage }));
  });
  const [expandedId, setExpandedId] = useState(HIST[0]?.id);
  const [completed, setCompleted] = useState([]);
  const [role, setRole] = useState("dave");
  const [live, setLive] = useState("demo");
  const [meta, setMeta] = useState(null);

  // Live data fetching
  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/data/jarvis_results.json?" + Date.now());
      if (!r.ok) throw 0;
      const sd = await r.json();
      if (!sd.items?.length) return;
      const tr = transformScan(sd);
      if (!tr) return;
      setData((prev) => {
        const saved = loadS();
        const li = tr.map((e) => ({ ...e, stage: saved[e.id] || "inbox" }));
        const liSet = new Set(li.map((e) => e.email + e.subject));
        const hist = HIST.filter((h) => !liSet.has(h.email + h.subject)).map(
          (h) => ({ ...h, stage: saved[h.id] || h.stage })
        );
        return [...li, ...hist];
      });
      setMeta({ total: sd.total, noise: sd.noise, ai: sd.ai });
      setLive("live");
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);
  useEffect(() => {
    saveS(data);
  }, [data]);

  const upd = useCallback(
    (id, stage) =>
      setData((p) => p.map((e) => (e.id === id ? { ...e, stage } : e))),
    []
  );
  const markDone = (id) => {
    setCompleted((p) => [...p, id]);
    upd(id, "complete");
    const next = filtered.find((q) => !completed.includes(q.id) && q.id !== id);
    if (next) setExpandedId(next.id);
  };

  const filtered = useMemo(() => {
    let r = data.filter(
      (e) => e.stage !== "complete" && !completed.includes(e.id)
    );
    if (role === "dave")
      r = r.filter((e) => e.stage === "dave" || e.stage === "inbox");
    if (role === "france")
      r = r.filter(
        (e) =>
          e.stage === "france" ||
          e.stage === "external" ||
          e.stage === "scheduled"
      );
    return r.sort((a, b) => b.score - a.score);
  }, [data, role, completed]);

  const doneItems = data.filter(
    (e) => e.stage === "complete" || completed.includes(e.id)
  );
  const critCount = filtered.filter((e) => e.label === "CRITICAL").length;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: T.bg,
        fontFamily: "'Inter',system-ui,sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          padding: "0 28px",
          height: 56,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            J
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
            JARVIS
          </span>
          <span style={{ fontSize: 13, color: T.textDim }}>
            /{" "}
            {role === "dave"
              ? "Dave's Queue"
              : role === "france"
              ? "France's Queue"
              : "All Items"}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "dave", label: "\u2605 Dave" },
            { id: "france", label: "\u270E France" },
            { id: "all", label: "All" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                padding: "5px 14px",
                borderRadius: 7,
                border: `1px solid ${role === r.id ? T.accent : T.border}`,
                background: role === r.id ? T.accentLight : T.surface,
                color: role === r.id ? T.accent : T.textMid,
                fontSize: 12,
                fontWeight: role === r.id ? 600 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 12,
              fontWeight: 600,
              background: live === "live" ? T.greenBg : T.yellowBg,
              color: live === "live" ? T.greenText : T.yellowText,
              border: `1px solid ${live === "live" ? "#bbf7d0" : "#fef08a"}`,
            }}
          >
            {live === "live" ? "\u25CF LIVE" : "DEMO"}
          </span>
          <div
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              background: filtered.length > 0 ? T.redBg : T.greenBg,
              fontSize: 12,
              fontWeight: 600,
              color: filtered.length > 0 ? T.redText : T.greenText,
              border: `1px solid ${
                filtered.length > 0 ? "#fecaca" : "#bbf7d0"
              }`,
            }}
          >
            {filtered.length > 0
              ? `${filtered.length} pending`
              : "\u2713 Clear"}
          </div>
        </div>
        {!mob && meta && (
          <span style={{ fontSize: 10, color: T.textDim }}>
            {meta.total} scanned
          </span>
        )}
        <button
          onClick={() => {
            localStorage.removeItem(AK);
            window.location.reload();
          }}
          style={{
            padding: "5px 12px",
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.textDim,
            borderRadius: 7,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sign Out
        </button>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* FEED */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: mob ? "20px 16px" : "28px 32px",
          }}
        >
          <div style={{ maxWidth: 740 }}>
            {/* Greeting */}
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.text,
                  margin: "0 0 6px",
                }}
              >
                {greeting}, Dave.
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: T.textMid,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Jarvis has triaged your inbox. {filtered.length} item
                {filtered.length !== 1 ? "s" : ""} need
                {filtered.length === 1 ? "s" : ""} your decision
                {critCount > 0
                  ? ` \u2014 ${critCount} ${
                      critCount === 1 ? "is" : "are"
                    } time-critical`
                  : ""}
                .
              </p>
            </div>

            {/* CARDS */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {filtered.map((item, index) => {
                const isExp = expandedId === item.id;
                const ug = URG[item.label] || URG.NOTABLE;
                return (
                  <div
                    key={item.id}
                    onClick={() => setExpandedId(isExp ? null : item.id)}
                    style={{
                      background: T.surface,
                      borderRadius: 14,
                      border: `1px solid ${isExp ? T.accent + "40" : T.border}`,
                      overflow: "hidden",
                      cursor: "pointer",
                      boxShadow: isExp
                        ? "0 4px 24px rgba(99,102,241,0.08)"
                        : "none",
                      transition: "all 200ms",
                    }}
                  >
                    <div
                      style={{
                        height: 3,
                        background: `linear-gradient(90deg,${ug.bar},${ug.bar}80)`,
                      }}
                    />
                    <div
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: ug.badge,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: ug.text,
                          flexShrink: 0,
                        }}
                      >
                        #{index + 1}
                      </div>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: item.color + "18",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: item.color,
                          border: `1.5px solid ${item.color}30`,
                          flexShrink: 0,
                        }}
                      >
                        {item.avatar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 650,
                              color: T.text,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.subject}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: ug.text,
                              background: ug.badge,
                              padding: "2px 8px",
                              borderRadius: 4,
                              letterSpacing: 0.4,
                              flexShrink: 0,
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: T.textDim }}>
                          {item.from}{" "}
                          {item.company ? `\u00B7 ${item.company}` : ""} \u00B7{" "}
                          {item.time}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        {item.deal && (
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: T.bg,
                              fontSize: 11,
                              color: T.textMid,
                            }}
                          >
                            {item.deal}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 12,
                            color: T.textDim,
                            transition: "transform 200ms",
                            transform: isExp ? "rotate(180deg)" : "none",
                          }}
                        >
                          {"\u25BE"}
                        </div>
                      </div>
                    </div>

                    {isExp && (
                      <div
                        style={{
                          padding: "0 20px 20px",
                          borderTop: `1px solid ${T.borderLight}`,
                        }}
                      >
                        {/* JARVIS brief */}
                        <div
                          style={{
                            margin: "16px 0 14px",
                            padding: "14px 16px",
                            background: T.accentLight,
                            borderRadius: 10,
                            border: `1px solid ${T.accentBorder}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.accent,
                              marginBottom: 7,
                              letterSpacing: 0.5,
                            }}
                          >
                            JARVIS SAYS
                          </div>
                          <p
                            style={{
                              fontSize: 13.5,
                              color: T.accentText,
                              lineHeight: 1.65,
                              margin: 0,
                            }}
                          >
                            {item.jarvis}
                          </p>
                        </div>
                        {/* Suggested action */}
                        {item.action && (
                          <div
                            style={{
                              fontSize: 12.5,
                              color: T.textMid,
                              marginBottom: 12,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ color: T.green, fontSize: 14 }}>
                              {"\u2192"}
                            </span>
                            <span>
                              <strong>Suggested:</strong> {item.action}
                            </span>
                          </div>
                        )}
                        {/* NLP Widget */}
                        <NlpWidget
                          email={item}
                          onApply={(stage) => upd(item.id, stage)}
                        />
                        {/* Actions */}
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          {(item.actions || []).map((act) => {
                            const isPri = act === item.primaryAction;
                            return (
                              <button
                                key={act}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (isPri) markDone(item.id);
                                }}
                                style={{
                                  padding: isPri ? "10px 22px" : "10px 18px",
                                  borderRadius: 9,
                                  border: isPri
                                    ? "none"
                                    : `1px solid ${T.border}`,
                                  background: isPri
                                    ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                                    : T.surface,
                                  color: isPri ? "#fff" : T.textMid,
                                  fontSize: 13,
                                  fontWeight: isPri ? 600 : 500,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  boxShadow: isPri
                                    ? "0 2px 12px rgba(99,102,241,0.3)"
                                    : "none",
                                  transition: "all 150ms",
                                }}
                              >
                                {act}
                              </button>
                            );
                          })}
                        </div>
                        {/* Reply */}
                        {item.reply && (
                          <div
                            style={{
                              marginTop: 14,
                              padding: "12px 14px",
                              background: T.bg,
                              borderRadius: 8,
                              border: `1px solid ${T.border}`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: T.textDim,
                                marginBottom: 6,
                                letterSpacing: 0.5,
                              }}
                            >
                              DRAFT REPLY
                            </div>
                            <pre
                              style={{
                                fontSize: 12,
                                color: T.textMid,
                                lineHeight: 1.6,
                                margin: 0,
                                whiteSpace: "pre-wrap",
                                fontFamily: "inherit",
                              }}
                            >
                              {item.reply}
                            </pre>
                            <div
                              style={{ display: "flex", gap: 6, marginTop: 8 }}
                            >
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  navigator.clipboard?.writeText(item.reply);
                                }}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: 6,
                                  border: `1px solid ${T.border}`,
                                  background: T.surface,
                                  color: T.accent,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                Copy as Dave
                              </button>
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  navigator.clipboard?.writeText(
                                    `Hi ${
                                      (item.from || "").split(" ")[0]
                                    },\n\nDave asked me to follow up.\n\n${item.reply
                                      .split("\n")
                                      .slice(1)
                                      .join("\n")}\n\nBest regards,\nFrance`
                                  );
                                }}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: 6,
                                  border: `1px solid ${T.border}`,
                                  background: T.surface,
                                  color: T.orange,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                Copy as France
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DONE */}
            {doneItems.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.textDim,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Completed
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {doneItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        background: T.surface,
                        borderRadius: 10,
                        border: `1px solid ${T.border}`,
                        opacity: 0.6,
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: T.greenBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          color: T.green,
                        }}
                      >
                        {"\u2713"}
                      </div>
                      <span style={{ fontSize: 13, color: T.textMid, flex: 1 }}>
                        {item.subject}
                      </span>
                      <span style={{ fontSize: 11, color: T.textDim }}>
                        {item.from}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        {!mob && (
          <div
            style={{
              width: 280,
              flexShrink: 0,
              overflowY: "auto",
              padding: "24px 20px",
              background: T.surface,
              borderLeft: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.textDim,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Deal Overview
            </div>
            {DEALS.map((deal) => (
              <div
                key={deal.name}
                style={{
                  padding: "12px 14px",
                  background: T.bg,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                  >
                    {deal.name}
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: deal.color }}
                  >
                    {deal.value}
                  </span>
                </div>
                <div
                  style={{ fontSize: 11, color: T.textDim, marginBottom: 8 }}
                >
                  {deal.stage}
                </div>
                <div
                  style={{
                    height: 4,
                    background: T.border,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${deal.progress}%`,
                      background: deal.color,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}
            <div
              style={{
                marginTop: 20,
                padding: 14,
                background: T.accentLight,
                borderRadius: 10,
                border: `1px solid ${T.accentBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.accent,
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }}
              >
                PIPELINE TOTAL
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.accentText,
                  marginBottom: 2,
                }}
              >
                {"\u00A3"}42M+
              </div>
              <div style={{ fontSize: 11, color: T.accent }}>
                {DEALS.length} active deals {"\u00B7"} {critCount} critical
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
