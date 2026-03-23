import { useState, useMemo, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════
const T = {
  bg: "#fafaf9", surface: "#fff", border: "#e7e5e4", borderLight: "#f5f5f4",
  text: "#1c1917", textMid: "#57534e", textDim: "#a8a29e",
  accent: "#6366f1", accentLight: "#f5f3ff", accentBorder: "#ddd6fe", accentText: "#4338ca",
  red: "#ef4444", redBg: "#fef2f2", redText: "#b91c1c",
  orange: "#f97316", orangeBg: "#fff7ed", orangeText: "#c2410c",
  yellow: "#eab308", yellowBg: "#fefce8", yellowText: "#92400e",
  green: "#10b981", greenBg: "#f0fdf4", greenText: "#166534",
  teal: "#0ea5e9", tealBg: "#f0f9ff", tealText: "#0369a1",
  muted: "#94a3b8", mutedBg: "#f8fafc", mutedText: "#475569",
};
const URG = {
  CRITICAL: { bar: T.red, badge: T.redBg, text: T.redText, label: "Act today" },
  URGENT: { bar: T.orange, badge: T.orangeBg, text: T.orangeText, label: "Act this week" },
  IMPORTANT: { bar: T.yellow, badge: T.yellowBg, text: T.yellowText, label: "Review" },
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
const PAT = { A: "Inbound Lead", B: "Introduction", C: "Lead-Gen", D: "Customer Follow-Up", E: "Legal/NDA", F: "Investor/Capital", G: "Internal Ops", H: "PR/Awards", I: "Scheduling", J: "Admin" };

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function useIsMobile(bp = 768) {
  const [m, s] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => { const h = () => s(window.innerWidth < bp); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [bp]);
  return m;
}
function getToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function dateLabel(ds) {
  const t = getToday(); if (ds === t) return "Today";
  const diff = Math.round((new Date(t + "T12:00:00") - new Date(ds + "T12:00:00")) / 864e5);
  if (diff === 1) return "Yesterday"; if (diff < 7 && diff > 0) return `${diff}d ago`;
  const d = new Date(ds + "T12:00:00");
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtTime(iso) {
  try { const d = new Date(iso); const h = d.getHours(); return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}, ${h % 12 || 12}:${d.getMinutes().toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; }
  catch { return iso; }
}
function getDateLocal(iso) {
  try { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  catch { return ""; }
}

// ═══════════════════════════════════════════════════════════
// NLP CATEGORIZATION ENGINE (Full Implementation)
// ═══════════════════════════════════════════════════════════
const STAGE_PATTERNS = {
  dave: {
    keywords: ["urgent", "critical", "priority", "immediate", "asap", "top priority", "vip", "decision", "board", "investor", "strategic", "capital", "redhill", "substation", "power", "capacity", "MW", "pipeline", "prospect", "sign", "approve", "loi"],
    domains: ["castleforge.com", "smbcgroup.com", "travelers.com", "nomura.com", "arm.com", "cbre.com"],
    patterns: ["dave", "ceo", "executive", "board meeting", "investor call", "top priority", "critical path", "action required"],
    tiers: ["TIER 1", "PIPELINE", "DAVE FLAGGED", "PIPELINE VIP", "CRITICAL"],
    priority: 5,
  },
  france: {
    keywords: ["follow up", "forward", "delegate", "handle", "process", "review", "schedule", "coordinate", "confirm", "arrange", "booking", "admin", "awards", "submission", "pr", "marketing"],
    domains: ["jsa.net", "fellow.app", "galaxydatacenters.com"],
    patterns: ["france", "team", "internal ops", "admin", "scheduling", "forward to", "please handle", "awards submission"],
    tiers: ["INTERNAL", "VIP FIRM", "INTERNAL VIP"],
    priority: 3,
  },
  external: {
    keywords: ["waiting", "pending", "hold", "awaiting", "standby", "external", "nda", "contract", "agreement", "legal", "signed", "countersigned"],
    domains: ["simmons-simmons.com"],
    patterns: ["waiting for response", "pending approval", "external review", "nda sent", "contract sent", "awaiting signature", "ball in their court"],
    tiers: [],
    priority: 2,
  },
  scheduled: {
    keywords: ["scheduled", "calendar", "meeting", "appointment", "booked", "confirmed", "call", "sync", "demo", "tour", "site visit"],
    domains: [],
    patterns: ["scheduled for", "meeting on", "appointment at", "calendar invite", "site visit confirmed", "tour booked"],
    tiers: [],
    priority: 2,
  },
  inbox: {
    keywords: ["new", "notification", "fyi", "newsletter", "update", "digest", "weekly", "monthly report"],
    domains: ["gmail.com", "yahoo.com", "outlook.com", "newsletter", "mailchimp", "agoda", "borrowell"],
    patterns: [],
    tiers: ["UNKNOWN", "NOTABLE"],
    priority: 1,
  },
  complete: {
    keywords: ["done", "completed", "finished", "resolved", "closed", "archived", "sorted", "approved", "confirmed and done"],
    domains: [],
    patterns: ["task complete", "issue resolved", "all done", "confirmed and booked"],
    tiers: [],
    priority: 1,
  },
};

const URGENCY_KEYWORDS = {
  critical: ["critical", "urgent", "emergency", "asap", "immediately", "now", "crisis", "top priority", "action required", "time-critical"],
  urgent: ["important", "priority", "high priority", "time sensitive", "deadline", "today", "eod", "by eod", "this week"],
  important: ["soon", "this week", "next week", "moderate", "standard", "review", "follow up"],
  notable: ["whenever", "no rush", "fyi", "informational", "low priority", "newsletter"],
};

const CONTACT_PATTERNS = {
  vip: ["castleforge", "smbc", "travelers", "nomura", "arm", "google", "cbre", "savills", "jll", "knight frank", "zayo", "colt", "lumen", "cdw"],
  internal: ["galaxy", "galaxydatacenters", "galaxycapitalpartners", "redhilldatacentre"],
  broker: ["techre", "gotcolo", "adaptive-mdc", "innogate", "bitooda", "bcs"],
  vendor: ["marketjoy", "demandfactor", "schbang", "hubspot", "contactantpro"],
};

function analyzeEmail(email) {
  const text = `${email.from || ""} ${email.subject || ""} ${email.jarvis || ""} ${email.action || ""} ${email.label || ""} ${email.tier || ""} ${email.company || ""}`.toLowerCase();
  const emailDomain = (email.email || "").split("@")[1] || "";
  const scores = {};
  const allReasons = {};
  const allKeywords = {};

  for (const [stageId, config] of Object.entries(STAGE_PATTERNS)) {
    let score = 0;
    const reasons = [];
    const kws = [];

    config.keywords.forEach(kw => {
      if (text.includes(kw.toLowerCase())) { score += 2; kws.push(kw); reasons.push(`Keyword: "${kw}"`); }
    });
    config.patterns.forEach(p => {
      if (text.includes(p.toLowerCase())) { score += 3; reasons.push(`Pattern: "${p}"`); }
    });
    config.domains.forEach(d => {
      if (emailDomain.includes(d)) { score += 4; reasons.push(`Domain: ${d}`); }
    });
    config.tiers.forEach(t => {
      if ((email.tier || "").toUpperCase().includes(t)) { score += 3; reasons.push(`Tier match: ${t}`); }
    });

    // Contact type boosts
    if (stageId === "dave") {
      if (email.label === "CRITICAL" || email.label === "URGENT") { score += 2; reasons.push("High urgency label"); }
      if (CONTACT_PATTERNS.vip.some(v => text.includes(v))) { score += 3; reasons.push("VIP contact detected"); }
    }
    if (stageId === "france") {
      if (CONTACT_PATTERNS.internal.some(v => emailDomain.includes(v)) && email.label !== "CRITICAL") { score += 2; reasons.push("Internal sender"); }
    }
    if (stageId === "external") {
      if (CONTACT_PATTERNS.broker.some(v => text.includes(v))) { score += 1; reasons.push("Broker/partner contact"); }
    }

    scores[stageId] = score * config.priority;
    allReasons[stageId] = reasons;
    allKeywords[stageId] = kws;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topStage = sorted[0][0];
  const topScore = sorted[0][1];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(Math.round((topScore / totalScore) * 100), 98) : 20;

  // Urgency calculation
  let urgencyScore = 0;
  Object.entries(URGENCY_KEYWORDS).forEach(([level, kws]) => {
    const weight = level === "critical" ? 0.15 : level === "urgent" ? 0.1 : level === "important" ? 0.06 : 0.03;
    kws.forEach(kw => { if (text.includes(kw)) urgencyScore += weight; });
  });
  urgencyScore = Math.min(urgencyScore, 1);

  // Category detection
  let category = "General";
  if (text.includes("nda") || text.includes("contract") || text.includes("agreement") || text.includes("legal")) category = "Legal/Contract";
  else if (text.includes("proposal") || text.includes("rfp") || text.includes("quote") || text.includes("loi")) category = "Proposal/LOI";
  else if (text.includes("meeting") || text.includes("call") || text.includes("calendar") || text.includes("tour")) category = "Scheduling";
  else if (text.includes("invoice") || text.includes("payment") || text.includes("capital") || text.includes("fund")) category = "Financial";
  else if (text.includes("board") || text.includes("deck") || text.includes("report") || text.includes("review")) category = "Board/Reporting";
  else if (text.includes("award") || text.includes("pr") || text.includes("press") || text.includes("marketing")) category = "PR/Marketing";
  else if (text.includes("prospect") || text.includes("lead") || text.includes("pipeline") || text.includes("mw")) category = "Pipeline/Sales";
  else if (text.includes("redhill") || text.includes("site") || text.includes("ops") || text.includes("substation")) category = "Operations";
  else if (text.includes("newsletter") || text.includes("fyi") || text.includes("digest")) category = "Newsletter/FYI";

  // Contact type
  let contactType = "Unknown";
  if (CONTACT_PATTERNS.vip.some(v => text.includes(v))) contactType = "VIP";
  else if (CONTACT_PATTERNS.internal.some(v => text.includes(v) || emailDomain.includes(v))) contactType = "Internal";
  else if (CONTACT_PATTERNS.broker.some(v => text.includes(v))) contactType = "Broker/Partner";
  else if (CONTACT_PATTERNS.vendor.some(v => text.includes(v))) contactType = "Vendor";

  const alternatives = sorted.slice(1, 4).filter(([, s]) => s > 0).map(([stage, s]) => ({
    stage, confidence: totalScore > 0 ? Math.round((s / totalScore) * 100) : 10,
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
  const stg = STAGES.find(s => s.id === analysis.suggestedStage);
  const isSame = email.stage === analysis.suggestedStage;
  const isLowConf = analysis.confidence < 55;

  if (isSame && !isLowConf) return null;

  return (
    <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.accentBorder}`, background: T.accentLight }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>{"\u2728"}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: .5 }}>NLP SUGGESTION</span>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 700, fontFamily: "monospace",
          background: analysis.confidence >= 75 ? T.greenBg : analysis.confidence >= 50 ? T.yellowBg : T.orangeBg,
          color: analysis.confidence >= 75 ? T.greenText : analysis.confidence >= 50 ? T.yellowText : T.orangeText,
        }}>{analysis.confidence}% confident</span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: T.bg, color: T.textMid }}>{analysis.category}</span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: T.bg, color: T.textDim }}>{analysis.contactType}</span>
        <div style={{ flex: 1 }} />
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ fontSize: 10, padding: "4px 10px", background: T.surface, border: `1px solid ${T.accentBorder}`, color: T.accent, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          {expanded ? "Collapse" : "Details"}
        </button>
      </div>

      {/* Suggestion row */}
      <div style={{ padding: "4px 16px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T.textDim }}>Move to:</span>
        {stg && <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, background: `${stg.c}15`, border: `1px solid ${stg.c}30`, color: stg.c, fontWeight: 600 }}>{stg.label}</span>}
        {analysis.reasoning.length > 0 && <span style={{ fontSize: 10, color: T.textDim, fontStyle: "italic" }}>{analysis.reasoning[0]}</span>}
        {!isSame && <button onClick={(e) => { e.stopPropagation(); onApply(analysis.suggestedStage); }} style={{
          marginLeft: "auto", fontSize: 11, padding: "6px 18px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", color: "#fff",
          borderRadius: 7, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
          boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
        }}>Apply</button>}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${T.accentBorder}` }}>
          {/* Analysis grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 0" }}>
            <div style={{ padding: "10px 12px", background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Category</div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{analysis.category}</div>
            </div>
            <div style={{ padding: "10px 12px", background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Urgency Score</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: T.borderLight, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${analysis.urgencyScore}%`, height: "100%", borderRadius: 3, background: analysis.urgencyScore >= 70 ? T.red : analysis.urgencyScore >= 40 ? T.orange : T.teal, transition: "width 500ms ease" }} />
                </div>
                <span style={{ fontSize: 12, color: T.textMid, fontFamily: "monospace", fontWeight: 700 }}>{analysis.urgencyScore}%</span>
              </div>
            </div>
          </div>

          {/* Reasoning */}
          {analysis.reasoning.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Reasoning</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {analysis.reasoning.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.textMid, paddingLeft: 12, borderLeft: `2px solid ${T.accentBorder}`, lineHeight: 1.5 }}>{r}</div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {analysis.keywords.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Keywords Detected</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {analysis.keywords.map((kw, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: `${T.accent}10`, border: `1px solid ${T.accentBorder}`, color: T.accent, fontWeight: 500 }}>{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {analysis.alternatives.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Alternative Suggestions</div>
              <div style={{ display: "flex", gap: 8 }}>
                {analysis.alternatives.map((alt, i) => {
                  const as = STAGES.find(s => s.id === alt.stage);
                  return as ? (
                    <button key={i} onClick={(e) => { e.stopPropagation(); onApply(alt.stage); }} style={{
                      fontSize: 11, padding: "6px 14px", background: T.surface,
                      border: `1px solid ${as.c}30`, color: as.c, borderRadius: 7,
                      cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {as.label}
                      <span style={{ fontSize: 9, opacity: 0.7, fontFamily: "monospace" }}>{alt.confidence}%</span>
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
    id: `live_${i}_${(it.sender_email || "").slice(0, 10)}`, score: it.final_score || 3, label: it.final_label || "NOTABLE",
    tier: it.rules_tier || "UNKNOWN", pattern: it.ai_pattern || "G", stage: "inbox",
    from: it.sender_name || it.sender_email || "Unknown", company: "", email: it.sender_email || "",
    subject: it.subject || "(no subject)", time: fmtTime(it.received), date: getDateLocal(it.received),
    link: it.web_link || "", jarvis: it.ai_summary || it.body_preview || "",
    action: it.ai_action || "", reply: "", deal: "", dealValue: "",
    actions: ["Delegate to France", "Mark Done"],
    primaryAction: "Mark Done",
    reasons: it.rules_reasons || [], att: it.has_attachments || false, ai: it.ai_reviewed || false,
    read: it.is_read || false, threads: 1, avatar: (it.sender_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    color: "#6366f1",
  }));
}

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
const SK = "jarvis_v9_state";
function loadS() { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } }
function saveS(d) { try { const s = {}; d.forEach(e => { if (e.stage !== "inbox") s[e.id] = e.stage; }); localStorage.setItem(SK, JSON.stringify(s)); } catch {} }

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
const PW = "Galaxy2026!", AK = "jarvis_auth_v9";
function hp(p) { let h = 0; for (let i = 0; i < p.length; i++) { h = ((h << 5) - h) + p.charCodeAt(i); h |= 0; } return "j9_" + Math.abs(h).toString(36); }
function isA() { try { const s = JSON.parse(localStorage.getItem(AK)); return s && Date.now() < s.ex && s.tk === hp(PW); } catch { return false; } }
function setAu() { localStorage.setItem(AK, JSON.stringify({ tk: hp(PW), ex: Date.now() + 864e5 })); }

function Login({ onLogin }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(false); const m = useIsMobile();
  const go = () => { if (pw === PW) { setAu(); onLogin(); } else { setErr(true); setPw(""); } };
  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: T.bg, color: T.text, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: m ? 20 : 0 }}>
      <div style={{ width: m ? "100%" : 380, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>J</span></div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>JARVIS</div>
        <div style={{ fontSize: 13, color: T.textDim, marginBottom: 28 }}>Command Center v9</div>
        <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && go()} placeholder="Enter access password" autoFocus
          style={{ width: "100%", padding: "14px 16px", background: T.surface, border: `1px solid ${err ? T.red : T.border}`, color: T.text, borderRadius: 10, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        {err && <div style={{ fontSize: 13, color: T.red, marginTop: 8 }}>Incorrect password</div>}
        <button onClick={go} style={{ width: "100%", padding: "14px 0", marginTop: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Access Command Center</button>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 24 }}>Galaxy Data Centers {"\u2014"} Confidential</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HISTORICAL + DEMO DATA
// ═══════════════════════════════════════════════════════════
const HIST = [
  // NOV 2025
  {id:"v27",score:9,label:"CRITICAL",tier:"DAVE FLAGGED",pattern:"G",stage:"complete",from:"TJ Karklins",company:"Galaxy",email:"tj@galaxydatacenters.com",subject:"ARM Market Presentation \u2014 TOP PRIORITY",time:"Nov 29",date:"2025-11-29",link:"",jarvis:"Dave: 'ARM is a key target \u2014 THIS A TOP PRIORITY.'",action:"ARM = priority target.",reply:"",deal:"ARM Target",dealValue:"Strategic",actions:["Create Monday Task"],primaryAction:"Create Monday Task",reasons:["Internal VIP","Dave flagged TOP PRIORITY"],att:false,ai:false,read:true,threads:1,avatar:"TK",color:"#6366f1"},
  {id:"v28",score:8,label:"URGENT",tier:"VIP FIRM",pattern:"A",stage:"complete",from:"Henry Gray",company:"CBRE",email:"henry.gray@cbre.com",subject:"CBRE / Galaxy \u2014 Amsterdam Opportunity",time:"Nov 3",date:"2025-11-03",link:"",jarvis:"CBRE bringing Amsterdam DC opportunity.",action:"Evaluate Amsterdam site.",reply:"",deal:"CBRE Amsterdam",dealValue:"",actions:["Evaluate"],primaryAction:"Evaluate",reasons:["VIP: cbre.com"],att:false,ai:false,read:true,threads:1,avatar:"HG",color:"#f59e0b"},
  {id:"v29",score:7,label:"URGENT",tier:"PIPELINE",pattern:"B",stage:"complete",from:"Drew Barrett",company:"Zendo Energy",email:"drew@zendoenergy.com",subject:"Opportunity with Zendo",time:"Nov 5",date:"2025-11-05",link:"",jarvis:"Zendo Energy opportunity.",action:"Follow up.",reply:"",deal:"Zendo Energy",dealValue:"",actions:["Follow Up"],primaryAction:"Follow Up",reasons:["Pipeline: drew barrett"],att:false,ai:false,read:true,threads:1,avatar:"DB",color:"#10b981"},
  {id:"v30",score:7,label:"URGENT",tier:"INTERNAL VIP",pattern:"G",stage:"complete",from:"Rodrigo Matos",company:"Galaxy IT",email:"rodrigo@galaxydatacenters.com",subject:"M365 Deep Dive: Critical Findings",time:"Nov 26",date:"2025-11-26",link:"",jarvis:"Dave: 'We need to setup a call with him.'",action:"Schedule call with Rodrigo.",reply:"",deal:"IT Ops",dealValue:"",actions:["Schedule Call"],primaryAction:"Schedule Call",reasons:["Internal VIP","Dave flagged"],att:false,ai:false,read:true,threads:1,avatar:"RM",color:"#8b5cf6"},
  // DEC 2025
  {id:"v25",score:8,label:"URGENT",tier:"PIPELINE",pattern:"A",stage:"complete",from:"John Hall",company:"TechRE",email:"john.hall@techreconsulting.com",subject:"TechRE / Galaxy Working Together",time:"Dec 8",date:"2025-12-08",link:"",jarvis:"First TechRE partnership thread. This became the 18MW deal.",action:"Reply and evaluate.",reply:"",deal:"Redhill 18MW",dealValue:"£42M",actions:["Evaluate"],primaryAction:"Evaluate",reasons:["Pipeline: john hall"],att:false,ai:false,read:true,threads:1,avatar:"JH",color:"#6366f1"},
  {id:"v26",score:8,label:"URGENT",tier:"DAVE FLAGGED",pattern:"D",stage:"complete",from:"Chris Lillie",company:"CDW",email:"chris.lillie@uk.cdw.com",subject:"CDW Merger Bills",time:"Dec 8",date:"2025-12-08",link:"",jarvis:"CDW merger bills flagged important.",action:"Address billing.",reply:"",deal:"CDW Customer",dealValue:"",actions:["Address"],primaryAction:"Address",reasons:["Tier 1: uk.cdw.com"],att:false,ai:false,read:true,threads:1,avatar:"CL",color:"#0ea5e9"},
  // JAN 2026
  {id:"v20",score:9,label:"CRITICAL",tier:"DAVE FLAGGED",pattern:"A",stage:"dave",from:"Fiona Leon",company:"Digital Realty (DRT)",email:"fiona.leon@drt.co.uk",subject:"Galaxy / DRT Partnership & Cloud House \u2014 TOP PRIORITY",time:"Jan 13",date:"2026-01-13",link:"",jarvis:"DRT Partnership for Cloud House. Dave: 'TOP PRIORITY.' Zayo connectivity in progress.",action:"This is still TOP PRIORITY.",reply:"",deal:"DRT Cloud House",dealValue:"Strategic",actions:["Call Fiona","Email Louise","Delegate"],primaryAction:"Call Fiona",reasons:["Tier 2: drt.co.uk","Dave flagged TOP PRIORITY"],att:false,ai:false,read:true,threads:6,avatar:"FL",color:"#8b5cf6"},
  {id:"v21",score:9,label:"CRITICAL",tier:"DAVE FLAGGED",pattern:"F",stage:"complete",from:"Rishi Malhan",company:"Malhan Group",email:"rishi@malhangroup.com",subject:"80MW Poland \u2014 NDA Required",time:"Jan 17",date:"2026-01-17",link:"",jarvis:"80MW Poland opportunity.",action:"Arrange site visit + NDA.",reply:"",deal:"Poland 80MW",dealValue:"80MW",actions:["Arrange Visit"],primaryAction:"Arrange Visit",reasons:["Pipeline: rishi malhan","KW: MW"],att:false,ai:false,read:true,threads:1,avatar:"RM",color:"#14b8a6"},
  {id:"v22",score:9,label:"CRITICAL",tier:"DAVE FLAGGED",pattern:"A",stage:"complete",from:"Victoria Skrbensky",company:"Poland DC",email:"victoria@polanddc.pl",subject:"80MW + 180MW Poland DC Opportunity",time:"Jan 17",date:"2026-01-17",link:"",jarvis:"260MW total. Dave: 'important partner.'",action:"Coordinate with Rishi.",reply:"",deal:"Poland 260MW",dealValue:"260MW",actions:["Coordinate"],primaryAction:"Coordinate",reasons:["Pipeline: victoria skrbensky","KW: MW"],att:false,ai:false,read:true,threads:1,avatar:"VS",color:"#ec4899"},
  {id:"v23",score:8,label:"URGENT",tier:"DAVE FLAGGED",pattern:"D",stage:"complete",from:"Colin Bell",company:"Redhill DC",email:"colin.bell@galaxydatacenters.com",subject:"FluidOne Relocation",time:"Jan 14",date:"2026-01-14",link:"",jarvis:"Dave: 'CUSTOMER V imp should have been a task.'",action:"Create Monday task.",reply:"",deal:"FluidOne",dealValue:"Customer",actions:["Create Task"],primaryAction:"Create Task",reasons:["Redhill ops","Dave flagged"],att:false,ai:false,read:true,threads:1,avatar:"CB",color:"#10b981"},
  {id:"v24",score:8,label:"URGENT",tier:"DAVE FLAGGED",pattern:"E",stage:"complete",from:"Ashley Roberts",company:"Galaxy",email:"ashley@galaxydatacenters.com",subject:"Google NDA \u2014 Electronic Acceptance",time:"Jan 13",date:"2026-01-13",link:"",jarvis:"Google NDA. Hyperscaler opportunity.",action:"Execute NDA.",reply:"",deal:"Google NDA",dealValue:"Hyperscaler",actions:["Execute NDA"],primaryAction:"Execute NDA",reasons:["Internal VIP","KW: nda"],att:false,ai:false,read:true,threads:1,avatar:"AR",color:"#14b8a6"},
  // MAR 4-5 2026
  {id:"v0",score:10,label:"CRITICAL",tier:"PIPELINE VIP [18MW]",pattern:"A",stage:"dave",from:"John Hall",company:"TechRE Consulting",email:"john.hall@techreconsulting.com",subject:"TechRE Introducer \u2014 18MW AI Prospect for Redhill",time:"Mar 4",date:"2026-03-04",link:"https://outlook.office365.com/mail/",jarvis:"18MW IT load, 144 racks at 120kW, AAA client, GPUs on order. Q2 2027 deadline.",action:"Confirm 18MW feasibility.",reply:"John,\n\nEngineering team accelerating.\n\nBest,\nDave",deal:"Redhill 18MW",dealValue:"£42M",actions:["Call John","Forward to Ash","Request Feasibility","Defer 48h"],primaryAction:"Call John",reasons:["Pipeline: john hall","KW: MW, rack","18MW prospect"],att:false,ai:false,read:true,threads:8,avatar:"JH",color:"#6366f1"},
  {id:"v1",score:9,label:"CRITICAL",tier:"TIER 1 CUSTOMER",pattern:"D",stage:"dave",from:"David McNeish",company:"Travelers",email:"DMCNEISH@travelers.com",subject:"Travelers Lease Renewal \u2014 Pushback",time:"Mar 5",date:"2026-03-05",link:"https://outlook.office365.com/mail/",jarvis:"VP questioning renewal assumption. Remote Hands formalized.",action:"Reassure McNeish.",reply:"Hi David,\n\nNo assumptions.\n\nBest,\nDave",deal:"Travelers Renewal",dealValue:"Customer",actions:["Reassure","Call"],primaryAction:"Reassure",reasons:["Tier 1: travelers.com","KW: lease"],att:false,ai:false,read:true,threads:4,avatar:"DM",color:"#0ea5e9"},
  {id:"v2",score:8,label:"URGENT",tier:"VIP FIRM",pattern:"H",stage:"complete",from:"Candace Sipos",company:"JSA",email:"candace@jsa.net",subject:"Dataclouds Award \u2014 Deadline Today",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"Datacloud Awards deadline. JSA submitting.",action:"Confirm Sai provided everything.",reply:"",deal:"Awards",dealValue:"",actions:["Confirm"],primaryAction:"Confirm",reasons:["VIP: jsa.net"],att:false,ai:false,read:true,threads:3,avatar:"CS",color:"#ec4899"},
  {id:"v3",score:8,label:"URGENT",tier:"TIER 1",pattern:"I",stage:"complete",from:"Pelle Jorgen",company:"Castleforge",email:"pelle.jorgen@castleforge.com",subject:"Redhill Ops Call \u2014 Reschedule Monday",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"Rescheduled to Monday.",action:"Confirm calendar.",reply:"",deal:"Castleforge JV",dealValue:"",actions:["Confirm"],primaryAction:"Confirm",reasons:["Tier 1: castleforge.com"],att:false,ai:false,read:true,threads:2,avatar:"PJ",color:"#0ea5e9"},
  {id:"v4",score:8,label:"URGENT",tier:"TIER 2",pattern:"G",stage:"complete",from:"Tom Babbington",company:"Adaptive MDC",email:"tom.babbington@adaptive-mdc.com",subject:"Substation D&B Contractors \u2014 Pre-briefed",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"5 substation contractors pre-briefed. Ties to 18MW deal.",action:"Forward to Ash.",reply:"",deal:"Redhill 18MW",dealValue:"",actions:["Forward"],primaryAction:"Forward",reasons:["Tier 2: adaptive-mdc.com"],att:false,ai:false,read:true,threads:2,avatar:"TB",color:"#f59e0b"},
  {id:"v6",score:7,label:"URGENT",tier:"TIER 1",pattern:"D",stage:"complete",from:"Max Ellery",company:"SMBC",email:"max_ellery@gb.smbcgroup.com",subject:"Redhill Build Room \u2014 Follow-up",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"SMBC lender requesting follow-up with Paul.",action:"Ensure Paul schedules.",reply:"",deal:"SMBC Lender",dealValue:"",actions:["Schedule"],primaryAction:"Schedule",reasons:["Tier 1: smbcgroup.com"],att:false,ai:false,read:true,threads:2,avatar:"ME",color:"#0ea5e9"},
  {id:"v8",score:7,label:"URGENT",tier:"TIER 2",pattern:"A",stage:"complete",from:"Oberholzner",company:"Innogate",email:"oberholzner@innogate.at",subject:"Milano \u2014 Giga-scale, Move Quickly",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"Milan DC project. Bloomberg pricing forwarded.",action:"Respond within 48h.",reply:"",deal:"Innogate Milan",dealValue:"Giga-scale",actions:["Respond"],primaryAction:"Respond",reasons:["Tier 2: innogate.at"],att:false,ai:false,read:true,threads:2,avatar:"OB",color:"#8b5cf6"},
  {id:"v9",score:7,label:"URGENT",tier:"SPEAKING",pattern:"H",stage:"complete",from:"Matthew Welch",company:"DCN",email:"Matthew.Welch@datacenternation.com",subject:"DCN Toronto \u2014 Speaker June 9",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"Speaking invite for DCN Toronto.",action:"Confirm.",reply:"",deal:"Speaking",dealValue:"",actions:["Confirm"],primaryAction:"Confirm",reasons:["PR/Awards"],att:false,ai:false,read:true,threads:1,avatar:"MW",color:"#10b981"},
  {id:"v11",score:6,label:"IMPORTANT",tier:"VIRGIN MEDIA",pattern:"G",stage:"complete",from:"Christopher Pooley",company:"VMO2",email:"christopher.pooley@virginmediao2.co.uk",subject:"Fibre Routes \u2014 Redhill Latency Data",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"Sub-ms latency for Redhill validated.",action:"Forward to Ashley.",reply:"",deal:"Connectivity",dealValue:"",actions:["Forward"],primaryAction:"Forward",reasons:["Tier 1: virginmedia"],att:false,ai:false,read:true,threads:1,avatar:"CP",color:"#0ea5e9"},
  {id:"v13",score:6,label:"IMPORTANT",tier:"JSA",pattern:"H",stage:"complete",from:"Candace Sipos",company:"JSA",email:"candace@jsa.net",subject:"Galaxy SHORTLISTED \u2014 Energy Deal of the Year",time:"Mar 5",date:"2026-03-05",link:"",jarvis:"Shortlisted out of 172 entries.",action:"Approve LinkedIn post.",reply:"",deal:"Awards",dealValue:"",actions:["Approve"],primaryAction:"Approve",reasons:["VIP: jsa.net"],att:false,ai:false,read:true,threads:1,avatar:"CS",color:"#ec4899"},
  // MAR 6 2026
  {id:"v37",score:8,label:"URGENT",tier:"TIER 1",pattern:"D",stage:"complete",from:"Charlie Byrne",company:"Zayo Europe",email:"charlie.byrne@zayo.com",subject:"Redhill Cross Connect Modification Quote",time:"Mar 6",date:"2026-03-06",link:"",jarvis:"Zayo requesting cross connect mod. Billable.",action:"TJ to provide quote.",reply:"",deal:"Zayo Customer",dealValue:"Billable",actions:["Provide Quote"],primaryAction:"Provide Quote",reasons:["Tier 1: zayo.com","KW: redhill"],att:false,ai:false,read:true,threads:2,avatar:"CB",color:"#0ea5e9"},
  {id:"v38",score:8,label:"URGENT",tier:"TIER 2",pattern:"D",stage:"complete",from:"Fiona Leon",company:"Digital Realty",email:"fional@digitalrealty.com",subject:"DRT Partnership \u2014 Fiona on Leave",time:"Mar 6",date:"2026-03-06",link:"",jarvis:"Fiona on leave. Backup: Louise Boland.",action:"Reply before she leaves.",reply:"",deal:"DRT Cloud House",dealValue:"Strategic",actions:["Reply"],primaryAction:"Reply",reasons:["Tier 2: digitalrealty.com"],att:false,ai:false,read:true,threads:4,avatar:"FL",color:"#8b5cf6"},
  {id:"v31",score:8,label:"URGENT",tier:"INTERNAL VIP",pattern:"G",stage:"complete",from:"TJ Karklins",company:"Galaxy",email:"tj@galaxydatacenters.com",subject:"SOC 2 Audit \u2014 Lock-in by Mar 20",time:"Mar 6",date:"2026-03-06",link:"",jarvis:"40% late penalty if not locked by March 20.",action:"Decide audit date.",reply:"",deal:"Compliance",dealValue:"",actions:["Decide"],primaryAction:"Decide",reasons:["Internal VIP","KW: audit"],att:false,ai:false,read:true,threads:3,avatar:"TK",color:"#6366f1"},
  {id:"v36",score:7,label:"URGENT",tier:"ADMIN",pattern:"J",stage:"complete",from:"Microsoft",company:"Microsoft",email:"microsoft-noreply@microsoft.com",subject:"Credit Card Declined \u2014 Invoice",time:"Mar 6",date:"2026-03-06",link:"",jarvis:"M365 credit card declined.",action:"Update payment method.",reply:"",deal:"IT Ops",dealValue:"",actions:["Update Payment"],primaryAction:"Update Payment",reasons:["Admin"],att:false,ai:false,read:true,threads:1,avatar:"MS",color:"#ef4444"},
  {id:"v32",score:6,label:"IMPORTANT",tier:"LEAD-GEN",pattern:"C",stage:"complete",from:"Animesh Raha",company:"Galaxy",email:"animesh@galaxydatacenters.com",subject:"DemandFactor Follow Up + ICP Targets",time:"Mar 6",date:"2026-03-06",link:"",jarvis:"DemandFactor ICP target request.",action:"Review ICP targets.",reply:"",deal:"Lead Gen",dealValue:"",actions:["Review"],primaryAction:"Review",reasons:["Internal"],att:true,ai:false,read:true,threads:1,avatar:"AR2",color:"#14b8a6"},
  {id:"v33",score:6,label:"IMPORTANT",tier:"INVESTOR",pattern:"F",stage:"complete",from:"Daniel Ben-Ami",company:"Astra Capital",email:"ben-ami@astracapitalmgmt.com",subject:"NVIDIA GTC? \u2014 Astra Capital",time:"Mar 6",date:"2026-03-06",link:"",jarvis:"Investor relationship. Keep warm.",action:"Follow up.",reply:"",deal:"Investor Relations",dealValue:"",actions:["Follow Up"],primaryAction:"Follow Up",reasons:["Investor/Capital"],att:false,ai:false,read:true,threads:1,avatar:"DB",color:"#f59e0b"},
  {id:"v34",score:5,label:"IMPORTANT",tier:"MARKET INTEL",pattern:"A",stage:"complete",from:"Marcus Bartolini",company:"2020 Capital",email:"marcus.bartolini@gmail.com",subject:"Bloomberg DC Sale Price",time:"Mar 6",date:"2026-03-06",link:"",jarvis:"Bloomberg DC sale price data.",action:"Cross-reference with Milan.",reply:"",deal:"Market Intel",dealValue:"",actions:["Review"],primaryAction:"Review",reasons:["KW: data cent"],att:false,ai:false,read:true,threads:1,avatar:"MB",color:"#8b5cf6"},
  // MAR 17 2026 (v8 live scan)
  {id:"d1",score:9,label:"CRITICAL",tier:"TIER 1",pattern:"G",stage:"dave",from:"Jamie Thirlwall",company:"Castleforge",email:"jamie.thirlwall@castleforge.com",subject:"Monthly Deck for March Business Review",time:"Mar 17, 8:25 PM",date:"2026-03-17",link:"#",jarvis:"Final monthly report for board meeting.",action:"Review deck TONIGHT.",reply:"Jamie,\n\nReceived, reviewing tonight.\n\nBest,\nDave",deal:"Castleforge JV",dealValue:"Board",actions:["Review Now","Delegate to France"],primaryAction:"Review Now",reasons:["Tier 1: castleforge.com","KW: board"],att:true,ai:false,read:true,threads:5,avatar:"JT",color:"#0ea5e9"},
  {id:"d2",score:9,label:"CRITICAL",tier:"PIPELINE VIP",pattern:"D",stage:"dave",from:"John Hall",company:"TechRE",email:"john.hall@techreconsulting.com",subject:"Re: Redhill Unit 1&2 optionality",time:"Mar 17, 4:41 PM",date:"2026-03-17",link:"#",jarvis:"John reviewing high-density positioning. 18MW thread.",action:"Follow up Friday.",reply:"",deal:"Redhill 18MW",dealValue:"£42M",actions:["Follow Up","Call John"],primaryAction:"Follow Up",reasons:["Pipeline: john hall","KW: redhill"],att:false,ai:false,read:true,threads:12,avatar:"JH",color:"#6366f1"},
  {id:"d4",score:8,label:"URGENT",tier:"INTERNAL VIP",pattern:"D",stage:"dave",from:"Ashley Roberts",company:"Galaxy",email:"ashley@galaxydatacenters.com",subject:"Redhill High Density Strategy for Castleforge",time:"Mar 17, 5:14 PM",date:"2026-03-17",link:"#",jarvis:"High-density commentary to Pelle Jorgen.",action:"Review before board meeting.",reply:"",deal:"Castleforge JV",dealValue:"",actions:["Review & Approve","Request Changes"],primaryAction:"Review & Approve",reasons:["Internal VIP","8 VIPs on thread"],att:false,ai:false,read:false,threads:4,avatar:"AR",color:"#14b8a6"},
  {id:"d5",score:7,label:"URGENT",tier:"VIP FIRM",pattern:"D",stage:"dave",from:"Holly Winch",company:"Savills",email:"holly.winch@savills.com",subject:"Redhill Data Centre \u2014 Catch up",time:"Mar 17, 5:56 PM",date:"2026-03-17",link:"#",jarvis:"Savills moving to monthly catch-ups.",action:"FYI.",reply:"",deal:"Savills Advisory",dealValue:"",actions:["Acknowledge"],primaryAction:"Acknowledge",reasons:["VIP: savills.com"],att:true,ai:false,read:true,threads:3,avatar:"HW",color:"#ec4899"},
  {id:"d6",score:7,label:"URGENT",tier:"INTERNAL VIP",pattern:"G",stage:"dave",from:"Paul Leong",company:"Galaxy",email:"paul@galaxydatacenters.com",subject:"High Density Commentary \u2014 run by Pelle",time:"Mar 17, 4:00 PM",date:"2026-03-17",link:"#",jarvis:"Paul suggests adding comparison table.",action:"Add table.",reply:"",deal:"Castleforge JV",dealValue:"",actions:["Add Table","Approve As-Is"],primaryAction:"Add Table",reasons:["Internal VIP","Dave in thread"],att:false,ai:false,read:false,threads:3,avatar:"PL",color:"#f59e0b"},
  {id:"d8",score:7,label:"URGENT",tier:"INTERNAL VIP",pattern:"G",stage:"dave",from:"Ash Gupta",company:"Galaxy Capital",email:"ash@galaxycapitalpartners.com",subject:"CHW System Resilience \u2014 remedial costs",time:"Mar 17, 2:36 PM",date:"2026-03-17",link:"#",jarvis:"ROM request for CHW resilience.",action:"Review ROM when available.",reply:"",deal:"Redhill Ops",dealValue:"",actions:["Review"],primaryAction:"Review",reasons:["Internal VIP","KW: redhill"],att:false,ai:false,read:true,threads:2,avatar:"AG",color:"#6366f1"},
  {id:"d3",score:8,label:"URGENT",tier:"TIER 1",pattern:"G",stage:"france",from:"Jamie Thirlwall",company:"Castleforge",email:"jamie.thirlwall@castleforge.com",subject:"Board Deck slides received",time:"Mar 17, 8:09 PM",date:"2026-03-17",link:"#",jarvis:"All slides received. Finalizing.",action:"FYI.",reply:"",deal:"Castleforge JV",dealValue:"",actions:["Acknowledge"],primaryAction:"Acknowledge",reasons:["Tier 1: castleforge.com"],att:false,ai:false,read:true,threads:2,avatar:"JT",color:"#0ea5e9"},
  {id:"d9",score:6,label:"IMPORTANT",tier:"INTERNAL VIP",pattern:"E",stage:"france",from:"Ashley Roberts",company:"Galaxy",email:"ashley@galaxydatacenters.com",subject:"Partner Agreement sent to Mark",time:"Mar 17, 6:33 PM",date:"2026-03-17",link:"#",jarvis:"Partner agreement forwarded to Mark Vecchiarelli.",action:"Monitor.",reply:"",deal:"Partner Agreement",dealValue:"",actions:["Monitor"],primaryAction:"Monitor",reasons:["Internal VIP","KW: contract"],att:true,ai:false,read:true,threads:2,avatar:"AR",color:"#14b8a6"},
  {id:"d10",score:6,label:"IMPORTANT",tier:"INTERNAL VIP",pattern:"G",stage:"france",from:"Sai Raman",company:"Galaxy",email:"sai@galaxydatacenters.com",subject:"246 London BFSI prospects",time:"Mar 17, 6:58 PM",date:"2026-03-17",link:"#",jarvis:"246 London financial services prospect list.",action:"Review list quality.",reply:"",deal:"Lead Gen",dealValue:"246 prospects",actions:["Review List"],primaryAction:"Review List",reasons:["Internal VIP","Attachments"],att:true,ai:false,read:true,threads:1,avatar:"SR",color:"#6366f1"},
  {id:"d7",score:7,label:"URGENT",tier:"REDHILL OPS",pattern:"I",stage:"complete",from:"Benjamin Tyson",company:"Redhill DC",email:"benjamin.tyson@redhilldatacentre.com",subject:"Rivington Energy Tour confirmed",time:"Mar 17, 2:44 PM",date:"2026-03-17",link:"#",jarvis:"Tour booked. Colin Bell confirmed.",action:"Done.",reply:"",deal:"Redhill Ops",dealValue:"",actions:[],primaryAction:"",reasons:["Redhill ops"],att:false,ai:false,read:true,threads:1,avatar:"BT",color:"#10b981"},
];

const DEALS = [
  { name: "Redhill 18MW", value: "£42M", stage: "Feasibility", progress: 40, color: "#6366f1" },
  { name: "DRT Cloud House", value: "Strategic", stage: "TOP PRIORITY", progress: 25, color: "#8b5cf6" },
  { name: "Castleforge JV", value: "Board Review", stage: "Active", progress: 70, color: "#0ea5e9" },
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
  const [page, setPage] = useState("queue"); // "queue" | "emails"
  const [data, setData] = useState(() => { const s = loadS(); return HIST.map(e => ({ ...e, stage: s[e.id] || e.stage })); });
  const [expandedId, setExpandedId] = useState(HIST[0]?.id);
  const [completed, setCompleted] = useState(() => { try { return JSON.parse(localStorage.getItem("jarvis_completed") || "[]"); } catch { return []; } });
  useEffect(() => { try { localStorage.setItem("jarvis_completed", JSON.stringify(completed)); } catch {} }, [completed]);
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
      setData(prev => {
        const saved = loadS();
        const li = tr.map(e => ({ ...e, stage: saved[e.id] || "inbox" }));
        const liSet = new Set(li.map(e => e.email + e.subject));
        const hist = HIST.filter(h => !liSet.has(h.email + h.subject)).map(h => ({ ...h, stage: saved[h.id] || h.stage }));
        return [...li, ...hist];
      });
      setMeta({ total: sd.total, noise: sd.noise, ai: sd.ai });
      setLive("live");
    } catch { }
  }, []);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 30000); return () => clearInterval(iv); }, [fetchData]);
  useEffect(() => { saveS(data); }, [data]);

  const upd = useCallback((id, stage) => setData(p => p.map(e => e.id === id ? { ...e, stage } : e)), []);
  const markDone = (id) => {
    setCompleted(p => [...p, id]);
    upd(id, "complete");
    const next = filtered.find(q => !completed.includes(q.id) && q.id !== id);
    if (next) setExpandedId(next.id);
  };
  const undoDone = (id) => {
    setCompleted(p => p.filter(x => x !== id));
    upd(id, "dave");
  };

  const filtered = useMemo(() => {
    let r = data.filter(e => e.stage !== "complete" && !completed.includes(e.id));
    if (role === "dave") r = r.filter(e => e.stage === "dave" || e.stage === "inbox");
    if (role === "france") r = r.filter(e => e.stage === "france" || e.stage === "external" || e.stage === "scheduled");
    return r.sort((a, b) => b.score - a.score);
  }, [data, role, completed]);

  const doneItems = data.filter(e => e.stage === "complete" || completed.includes(e.id));
  const critCount = filtered.filter(e => e.label === "CRITICAL").length;
  const today = getToday();
  const todayItems = filtered.filter(e => e.date === today);
  const previousItems = filtered.filter(e => e.date !== today);
  const todayCrit = todayItems.filter(e => e.label === "CRITICAL").length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ height: "100vh", width: "100vw", background: T.bg, fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* HEADER */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 28px", height: 56, display: "flex", alignItems: "center", flexShrink: 0, gap: 16 }}>
        {/* Galaxy Capital Partners Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
            <path d="M4 26L0 22V8L4 4V26Z" fill="#1a2140"/>
            <path d="M10 22L6 18V4L10 0V22Z" fill="#2a3a6a"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#1a2140", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>Galaxy Capital Partners</span>
          <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>J</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>JARVIS</span>
          <span style={{ fontSize: 12, color: T.textDim }}>/ {page === "queue" ? (role === "dave" ? "Dave's Queue" : role === "france" ? "France's Queue" : "All Items") : "All Emails"}</span>
        </div>
        {/* Page tabs */}
        <div style={{ display: "flex", gap: 2, background: T.bg, borderRadius: 8, padding: 2, border: `1px solid ${T.border}` }}>
          <button onClick={() => setPage("queue")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: page === "queue" ? T.surface : "transparent", color: page === "queue" ? T.text : T.textDim, fontSize: 12, fontWeight: page === "queue" ? 600 : 400, cursor: "pointer", fontFamily: "inherit", boxShadow: page === "queue" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>Decision Queue</button>
          <button onClick={() => setPage("emails")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: page === "emails" ? T.surface : "transparent", color: page === "emails" ? T.text : T.textDim, fontSize: 12, fontWeight: page === "emails" ? 600 : 400, cursor: "pointer", fontFamily: "inherit", boxShadow: page === "emails" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>All Emails</button>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "dave", label: "\u2605 Dave" }, { id: "france", label: "\u270E France" }, { id: "all", label: "All" }].map(r => (
            <button key={r.id} onClick={() => setRole(r.id)} style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${role === r.id ? T.accent : T.border}`, background: role === r.id ? T.accentLight : T.surface, color: role === r.id ? T.accent : T.textMid, fontSize: 12, fontWeight: role === r.id ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>{r.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, fontWeight: 600, background: live === "live" ? T.greenBg : T.yellowBg, color: live === "live" ? T.greenText : T.yellowText, border: `1px solid ${live === "live" ? "#bbf7d0" : "#fef08a"}` }}>
            {live === "live" ? "\u25CF LIVE" : "DEMO"}
          </span>
          <div style={{ padding: "5px 14px", borderRadius: 20, background: filtered.length > 0 ? T.redBg : T.greenBg, fontSize: 12, fontWeight: 600, color: filtered.length > 0 ? T.redText : T.greenText, border: `1px solid ${filtered.length > 0 ? "#fecaca" : "#bbf7d0"}` }}>
            {filtered.length > 0 ? `${filtered.length} pending` : "\u2713 Clear"}
          </div>
        </div>
        {!mob && meta && <span style={{ fontSize: 10, color: T.textDim }}>{meta.total} scanned</span>}
        <button onClick={() => { localStorage.removeItem(AK); window.location.reload(); }} style={{ padding: "5px 12px", border: `1px solid ${T.border}`, background: T.surface, color: T.textDim, borderRadius: 7, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
      </div>

      {/* BODY */}
      {page === "queue" ? (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* FEED */}
        <div style={{ flex: 1, overflowY: "auto", padding: mob ? "20px 16px" : "28px 32px" }}>
          <div style={{ maxWidth: 740 }}>
            {/* Greeting */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>{greeting}, {role === "france" ? "France" : "Dave"}.</h1>
              <p style={{ fontSize: 14, color: T.textMid, margin: 0, lineHeight: 1.6 }}>
                {todayItems.length > 0
                  ? `${todayItems.length} new item${todayItems.length !== 1 ? "s" : ""} today${todayCrit > 0 ? ` \u2014 ${todayCrit} time-critical` : ""}. ${previousItems.length > 0 ? `${previousItems.length} carry-over from previous days.` : ""}`
                  : previousItems.length > 0
                    ? `No new items today. ${previousItems.length} carry-over item${previousItems.length !== 1 ? "s" : ""} still need attention.`
                    : "Your queue is clear. Nice work."}
              </p>
            </div>

            {/* TODAY'S ITEMS */}
            {todayItems.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: .8, textTransform: "uppercase" }}>Today's Items</div>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                  <span style={{ fontSize: 11, color: T.textDim }}>{todayItems.length} item{todayItems.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {todayItems.map((item, index) => <DecisionCard key={item.id} item={item} index={index} expandedId={expandedId} setExpandedId={setExpandedId} markDone={markDone} upd={upd} mob={mob} />)}
                </div>
              </div>
            )}

            {/* PREVIOUS ITEMS */}
            {previousItems.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, letterSpacing: .8, textTransform: "uppercase" }}>Previous</div>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                  <span style={{ fontSize: 11, color: T.textDim }}>{previousItems.length} carry-over</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {previousItems.map((item, index) => <DecisionCard key={item.id} item={item} index={todayItems.length + index} expandedId={expandedId} setExpandedId={setExpandedId} markDone={markDone} upd={upd} mob={mob} />)}
                </div>
              </div>
            )}

            {/* DONE */}
            {doneItems.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textDim, letterSpacing: .6, textTransform: "uppercase", marginBottom: 12 }}>Completed</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {doneItems.slice(0, 10).map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, opacity: .6, transition: "opacity 150ms" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.green }}>{"\u2713"}</div>
                      <span style={{ fontSize: 13, color: T.textMid, flex: 1 }}>{item.subject}</span>
                      <span style={{ fontSize: 11, color: T.textDim }}>{item.from}</span>
                      <button onClick={() => undoDone(item.id)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, color: T.accent, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 150ms" }}>Undo</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        {!mob && (
          <div style={{ width: 280, flexShrink: 0, overflowY: "auto", padding: "24px 20px", background: T.surface, borderLeft: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textDim, letterSpacing: .6, textTransform: "uppercase", marginBottom: 16 }}>Deal Overview</div>
            {DEALS.map(deal => (
              <div key={deal.name} style={{ padding: "12px 14px", background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{deal.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: deal.color }}>{deal.value}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8 }}>{deal.stage}</div>
                <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${deal.progress}%`, background: deal.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 14, background: T.accentLight, borderRadius: 10, border: `1px solid ${T.accentBorder}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, marginBottom: 8, letterSpacing: .5 }}>PIPELINE TOTAL</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.accentText, marginBottom: 2 }}>{"£"}42M+</div>
              <div style={{ fontSize: 11, color: T.accent }}>{DEALS.length} active deals {"·"} {critCount} critical</div>
            </div>
          </div>
        )}
      </div>
      ) : (
        /* ═══ ALL EMAILS PAGE ═══ */
        <AllEmailsPage data={data} upd={upd} mob={mob} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ALL EMAILS PAGE — Polished Superhuman-inspired design
// ═══════════════════════════════════════════════════════════
function AllEmailsPage({ data, upd, mob }) {
  const U = {
    CRITICAL: { c: "#dc2626", bg: "#fef2f2", bd: "#fecaca", dot: "#dc2626" },
    URGENT: { c: "#ea580c", bg: "#fff7ed", bd: "#fed7aa", dot: "#ea580c" },
    IMPORTANT: { c: "#ca8a04", bg: "#fefce8", bd: "#fef08a", dot: "#ca8a04" },
    NOTABLE: { c: "#64748b", bg: "#f8fafc", bd: "#e2e8f0", dot: "#94a3b8" },
  };

  const [selId, setSelId] = useState(null);
  const [search, setSearch] = useState("");
  const [urgFilter, setUrgFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [showDone, setShowDone] = useState(false);
  const [mobDetail, setMobDetail] = useState(false);
  const [hovId, setHovId] = useState(null);

  const filtered = useMemo(() => {
    let r = [...data];
    if (!showDone) r = r.filter(e => e.stage !== "complete");
    if (urgFilter !== "ALL") r = r.filter(e => e.label === urgFilter);
    if (stageFilter !== "ALL") r = r.filter(e => e.stage === stageFilter);
    if (search) r = r.filter(e => `${e.from} ${e.subject} ${e.email || ""} ${e.company || ""}`.toLowerCase().includes(search.toLowerCase()));
    return r.sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
      return b.score - a.score;
    });
  }, [data, urgFilter, stageFilter, search, showDone]);

  const sel = selId ? data.find(e => e.id === selId) : null;
  const u = sel ? (U[sel.label] || U.NOTABLE) : U.NOTABLE;
  const doneCount = data.filter(e => e.stage === "complete").length;
  const critCount = data.filter(e => e.label === "CRITICAL" && e.stage !== "complete").length;
  const urgCount = data.filter(e => e.label === "URGENT" && e.stage !== "complete").length;

  // Group emails by date for section headers
  const grouped = useMemo(() => {
    const groups = [];
    let lastDate = "";
    filtered.forEach(e => {
      const d = e.date || "";
      if (d !== lastDate) { groups.push({ type: "header", date: d }); lastDate = d; }
      groups.push({ type: "email", data: e });
    });
    return groups;
  }, [filtered]);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* LEFT PANEL — Email List */}
      {!(mob && mobDetail) && (
        <div style={{ width: mob ? "100%" : 440, display: "flex", flexDirection: "column", background: "#ffffff", borderRight: mob ? "none" : "1px solid #f0f0f0" }}>
          {/* Toolbar */}
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f0f0f0" }}>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <svg style={{ position: "absolute", left: 12, top: 10, opacity: 0.3 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails, contacts, deals..." style={{
                width: "100%", padding: "10px 14px 10px 36px", background: "#fafafa", border: "1px solid #ebebeb",
                borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',system-ui,sans-serif", color: "#1a1a2e",
                outline: "none", boxSizing: "border-box", transition: "border 200ms, box-shadow 200ms",
              }} onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)"; }}
                onBlur={e => { e.target.style.borderColor = "#ebebeb"; e.target.style.boxShadow = "none"; }} />
            </div>
            {/* Urgency pills */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[
                { id: "ALL", label: "All", count: filtered.length, c: "#6366f1" },
                { id: "CRITICAL", label: "Critical", count: critCount, c: "#dc2626" },
                { id: "URGENT", label: "Urgent", count: urgCount, c: "#ea580c" },
                { id: "IMPORTANT", label: "Important", count: data.filter(e => e.label === "IMPORTANT" && e.stage !== "complete").length, c: "#ca8a04" },
              ].map(f => (
                <button key={f.id} onClick={() => setUrgFilter(urgFilter === f.id ? "ALL" : f.id)} style={{
                  padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: 11, fontWeight: 500,
                  background: urgFilter === f.id ? f.c : "#f5f5f5",
                  color: urgFilter === f.id ? "#fff" : "#71717a",
                  transition: "all 200ms",
                }}>{f.label}{f.count > 0 ? ` ${f.count}` : ""}</button>
              ))}
              <button onClick={() => setShowDone(!showDone)} style={{
                marginLeft: "auto", padding: "5px 12px", borderRadius: 20, border: "none",
                background: showDone ? "#10b981" : "#f5f5f5", color: showDone ? "#fff" : "#71717a",
                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif",
              }}>Done {doneCount}</button>
            </div>
            {/* Stage filters */}
            <div style={{ display: "flex", gap: 4 }}>
              {STAGES.filter(s => s.id !== "complete").map(s => {
                const cnt = data.filter(e => e.stage === s.id).length;
                const active = stageFilter === s.id;
                return (
                  <button key={s.id} onClick={() => setStageFilter(active ? "ALL" : s.id)} style={{
                    padding: "4px 10px", borderRadius: 6, border: `1px solid ${active ? s.c + "40" : "#ebebeb"}`,
                    background: active ? `${s.c}08` : "transparent", color: active ? s.c : "#a1a1aa",
                    fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif",
                    transition: "all 150ms",
                  }}>{s.label} {cnt > 0 && <span style={{ fontWeight: 700 }}>{cnt}</span>}</button>
                );
              })}
            </div>
          </div>

          {/* Email list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {grouped.map((item, idx) => {
              if (item.type === "header") {
                return (
                  <div key={`h-${item.date}-${idx}`} style={{
                    padding: "10px 20px 6px", fontSize: 11, fontWeight: 600, color: "#a1a1aa",
                    letterSpacing: 0.5, background: "#fafafa", borderBottom: "1px solid #f0f0f0",
                    position: "sticky", top: 0, zIndex: 2,
                    fontFamily: "'DM Sans',system-ui,sans-serif",
                  }}>{dateLabel(item.date)}</div>
                );
              }
              const e = item.data;
              const eu = U[e.label] || U.NOTABLE;
              const isSel = sel?.id === e.id;
              const isHov = hovId === e.id;
              const stg = STAGES.find(s => s.id === e.stage);
              return (
                <div key={e.id}
                  onClick={() => { setSelId(e.id); if (mob) setMobDetail(true); }}
                  onMouseEnter={() => setHovId(e.id)}
                  onMouseLeave={() => setHovId(null)}
                  style={{
                    padding: "14px 20px", cursor: "pointer",
                    borderBottom: "1px solid #f8f8f8",
                    background: isSel ? "#f8f7ff" : isHov ? "#fafafa" : "#fff",
                    borderLeft: `3px solid ${isSel ? eu.c : "transparent"}`,
                    opacity: e.stage === "complete" ? 0.4 : 1,
                    transition: "all 120ms ease",
                  }}>
                  {/* Row 1: Avatar + Sender + Score + Time */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, ${e.color || "#6366f1"}20, ${e.color || "#6366f1"}08)`,
                      border: `1px solid ${e.color || "#6366f1"}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: e.color || "#6366f1", flexShrink: 0,
                      fontFamily: "'DM Sans',system-ui,sans-serif",
                    }}>{e.avatar || "?"}</div>
                    {/* Name + Company */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans',system-ui,sans-serif" }}>{e.from}</span>
                        {!e.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />}
                      </div>
                      {e.company && <div style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "'DM Sans',system-ui,sans-serif" }}>{e.company}</div>}
                    </div>
                    {/* Score + Urgency */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: eu.bg, border: `1px solid ${eu.bd}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: eu.c,
                        fontFamily: "'DM Mono','JetBrains Mono',monospace",
                      }}>{e.score}</div>
                    </div>
                  </div>
                  {/* Row 2: Subject */}
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: "#3f3f46",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginLeft: 48, marginBottom: 6,
                    fontFamily: "'DM Sans',system-ui,sans-serif",
                  }}>{e.subject}</div>
                  {/* Row 3: Tags */}
                  <div style={{ display: "flex", gap: 5, alignItems: "center", marginLeft: 48 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: eu.c, background: eu.bg,
                      padding: "2px 8px", borderRadius: 10, letterSpacing: 0.3,
                      fontFamily: "'DM Sans',system-ui,sans-serif",
                    }}>{e.label}</span>
                    {stg && <span style={{ fontSize: 9, color: stg.c, background: `${stg.c}08`, padding: "2px 7px", borderRadius: 10, border: `1px solid ${stg.c}15`, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{stg.label}</span>}
                    {e.deal && <span style={{ fontSize: 9, color: "#6366f1", background: "#f5f3ff", padding: "2px 7px", borderRadius: 10, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{e.deal}</span>}
                    {e.att && <span style={{ fontSize: 9, color: "#0ea5e9", background: "#f0f9ff", padding: "2px 6px", borderRadius: 10 }}>ATT</span>}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#d4d4d8", fontFamily: "'DM Sans',system-ui,sans-serif" }}>{e.time}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.15 }}>{"\u2709"}</div>
                <div style={{ fontSize: 14, color: "#a1a1aa", fontFamily: "'DM Sans',system-ui,sans-serif" }}>No emails match your filters</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RIGHT PANEL — Detail View */}
      {(mob ? mobDetail : true) && (
        <div style={{ flex: 1, overflowY: "auto", background: "#fafafa" }}>
          {sel ? (
            <div style={{ padding: mob ? 20 : 32, maxWidth: 700 }}>
              {mob && <button onClick={() => setMobDetail(false)} style={{
                marginBottom: 16, padding: "8px 16px", background: "#fff", border: "1px solid #ebebeb",
                color: "#6366f1", borderRadius: 8, fontSize: 12, cursor: "pointer",
                fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 600,
              }}>{"\u2190"} Back to list</button>}

              {/* Score + Sender Header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
                padding: 20, background: "#fff", borderRadius: 14,
                border: "1px solid #f0f0f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `linear-gradient(135deg, ${u.c}15, ${u.c}05)`,
                  border: `2px solid ${u.c}30`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: u.c, fontFamily: "'DM Mono','JetBrains Mono',monospace" }}>{sel.score}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.from}</div>
                  <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.email || ""} {sel.company ? `\u00B7 ${sel.company}` : ""} {"\u00B7"} {dateLabel(sel.date)}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: u.c, background: u.bg,
                  padding: "4px 12px", borderRadius: 10, letterSpacing: 0.5,
                  fontFamily: "'DM Sans',system-ui,sans-serif",
                }}>{sel.label}</span>
              </div>

              {/* Open in Outlook */}
              {sel.link && sel.link !== "#" && sel.link !== "" && (
                <a href={sel.link} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 0", marginBottom: 16,
                  background: "#6366f1", color: "#fff", borderRadius: 10,
                  fontSize: 13, fontWeight: 600, textDecoration: "none",
                  fontFamily: "'DM Sans',system-ui,sans-serif",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
                  transition: "transform 150ms, box-shadow 150ms",
                }}>Open in Outlook {"\u2197"}</a>
              )}

              {/* Subject */}
              <h2 style={{
                fontSize: 20, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.35,
                margin: "0 0 14px", fontFamily: "'DM Sans',system-ui,sans-serif",
              }}>{sel.subject}</h2>

              {/* Tags */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {sel.pattern && <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "#f5f5f5", color: "#71717a", fontFamily: "'DM Sans',system-ui,sans-serif" }}>{PAT[sel.pattern] || sel.pattern}</span>}
                <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "#f5f5f5", color: "#71717a", fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.tier}</span>
                {sel.att && <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "#f0f9ff", color: "#0ea5e9", fontFamily: "'DM Sans',system-ui,sans-serif" }}>Attachment</span>}
                {sel.ai && <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "#f5f3ff", color: "#6366f1", fontFamily: "'DM Sans',system-ui,sans-serif" }}>AI Reviewed</span>}
                {sel.deal && <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "#f5f3ff", color: "#6366f1", fontWeight: 600, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.deal}</span>}
                {sel.dealValue && <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", fontWeight: 600, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.dealValue}</span>}
              </div>

              {/* Scoring reasons */}
              {(sel.reasons || []).length > 0 && (
                <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
                  {sel.reasons.map((r, i) => (
                    <span key={i} style={{
                      fontSize: 9, padding: "3px 8px", borderRadius: 6,
                      background: "#fafafa", color: "#a1a1aa", border: "1px solid #f0f0f0",
                      fontFamily: "'DM Mono','JetBrains Mono',monospace",
                    }}>{r}</span>
                  ))}
                </div>
              )}

              {/* NLP Widget */}
              <NlpWidget email={sel} onApply={(stage) => upd(sel.id, stage)} />

              {/* Pipeline stages */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Sans',system-ui,sans-serif" }}>Assign to</div>
                <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 6 }}>
                  {STAGES.map(s => {
                    const active = sel.stage === s.id;
                    return (
                      <button key={s.id} onClick={() => upd(sel.id, s.id)} style={{
                        padding: "9px 0", background: active ? `${s.c}10` : "#fff",
                        border: `1px solid ${active ? s.c + "40" : "#f0f0f0"}`,
                        color: active ? s.c : "#a1a1aa", borderRadius: 8,
                        fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer",
                        fontFamily: "'DM Sans',system-ui,sans-serif", textAlign: "center",
                        transition: "all 150ms", boxShadow: active ? `0 0 8px ${s.c}15` : "none",
                      }}>{s.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* JARVIS Briefing */}
              {sel.jarvis && (
                <div style={{
                  marginBottom: 16, padding: 18, background: "#fff",
                  borderRadius: 12, border: "1px solid #ede9fe",
                  boxShadow: "0 1px 3px rgba(99,102,241,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#fff" }}>J</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", letterSpacing: 0.8, fontFamily: "'DM Sans',system-ui,sans-serif" }}>JARVIS BRIEFING</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: "#4338ca", lineHeight: 1.7, margin: 0, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.jarvis}</p>
                </div>
              )}

              {/* Recommended Action */}
              {sel.action && (
                <div style={{
                  marginBottom: 16, padding: 16, background: u.bg,
                  borderRadius: 12, border: `1px solid ${u.bd}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: u.c, marginBottom: 6, letterSpacing: 0.8, fontFamily: "'DM Sans',system-ui,sans-serif" }}>RECOMMENDED ACTION</div>
                  <div style={{ fontSize: 13, color: u.c, fontWeight: 500, lineHeight: 1.6, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.action}</div>
                </div>
              )}

              {/* Draft Reply */}
              {sel.reply && (
                <div style={{
                  marginBottom: 16, padding: 16, background: "#fff",
                  borderRadius: 12, border: "1px solid #f0f0f0",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", marginBottom: 8, letterSpacing: 0.8, fontFamily: "'DM Sans',system-ui,sans-serif" }}>DRAFT REPLY</div>
                  <pre style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", fontFamily: "'DM Sans',system-ui,sans-serif" }}>{sel.reply}</pre>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => navigator.clipboard?.writeText(sel.reply)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #ebebeb",
                      background: "#fff", color: "#6366f1", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif",
                      transition: "all 150ms",
                    }}>Copy as Dave</button>
                    <button onClick={() => navigator.clipboard?.writeText(`Hi ${(sel.from || "").split(" ")[0]},\n\nDave asked me to follow up.\n\n${sel.reply.split("\n").slice(1).join("\n")}\n\nBest regards,\nFrance`)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #ebebeb",
                      background: "#fff", color: "#ea580c", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif",
                      transition: "all 150ms",
                    }}>Copy as France</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 40 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4, fontFamily: "'DM Sans',system-ui,sans-serif" }}>Select an email</div>
              <div style={{ fontSize: 13, color: "#a1a1aa", fontFamily: "'DM Sans',system-ui,sans-serif" }}>Click any email to view details and take action</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══ DECISION CARD COMPONENT ═══
function DecisionCard({ item, index, expandedId, setExpandedId, markDone, upd, mob }) {
  const isExp = expandedId === item.id;
  const ug = URG[item.label] || URG.NOTABLE;
  return (
    <div onClick={() => setExpandedId(isExp ? null : item.id)} style={{
      background: T.surface, borderRadius: 14, border: `1px solid ${isExp ? T.accent + "40" : T.border}`,
      overflow: "hidden", cursor: "pointer", boxShadow: isExp ? "0 4px 24px rgba(99,102,241,0.08)" : "none", transition: "all 200ms",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${ug.bar},${ug.bar}80)` }} />
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: ug.badge, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: ug.text, flexShrink: 0 }}>#{index + 1}</div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: item.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: item.color, border: `1.5px solid ${item.color}30`, flexShrink: 0 }}>{item.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 650, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subject}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: ug.text, background: ug.badge, padding: "2px 8px", borderRadius: 4, letterSpacing: .4, flexShrink: 0 }}>{item.label}</span>
          </div>
          <div style={{ fontSize: 12, color: T.textDim }}>{item.from} {item.company ? `· ${item.company}` : ""} · {item.time}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {item.deal && <div style={{ padding: "4px 10px", borderRadius: 6, background: T.bg, fontSize: 11, color: T.textMid }}>{item.deal}</div>}
          <div style={{ fontSize: 12, color: T.textDim, transition: "transform 200ms", transform: isExp ? "rotate(180deg)" : "none" }}>{"\u25BE"}</div>
        </div>
      </div>
      {isExp && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${T.borderLight}` }}>
          <div style={{ margin: "16px 0 14px", padding: "14px 16px", background: T.accentLight, borderRadius: 10, border: `1px solid ${T.accentBorder}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, marginBottom: 7, letterSpacing: .5 }}>JARVIS SAYS</div>
            <p style={{ fontSize: 13.5, color: T.accentText, lineHeight: 1.65, margin: 0 }}>{item.jarvis}</p>
          </div>
          {item.action && <div style={{ fontSize: 12.5, color: T.textMid, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: T.green, fontSize: 14 }}>{"\u2192"}</span>
            <span><strong>Suggested:</strong> {item.action}</span>
          </div>}
          <NlpWidget email={item} onApply={(stage) => upd(item.id, stage)} />
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Open in Outlook — always first, opens link */}
            {item.link && item.link !== "#" && item.link !== "" && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={ev => ev.stopPropagation()} style={{
                padding: "10px 22px", borderRadius: 9, textDecoration: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                boxShadow: "0 2px 12px rgba(99,102,241,0.3)", transition: "all 150ms",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>Open in Outlook {"\u2197"}</a>
            )}
            {/* Other action buttons (Delegate, etc.) */}
            {(item.actions || []).filter(a => a !== "Mark Done").map(act => (
              <button key={act} onClick={ev => { ev.stopPropagation(); if (act === "Delegate to France") upd(item.id, "france"); }} style={{
                padding: "10px 18px", borderRadius: 9, border: `1px solid ${T.border}`,
                background: T.surface, color: T.textMid, fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", transition: "all 150ms",
              }}>{act}</button>
            ))}
            {/* Mark Done — always last */}
            <button onClick={ev => { ev.stopPropagation(); markDone(item.id); }} style={{
              padding: "10px 18px", borderRadius: 9, border: `1px solid ${T.green}40`,
              background: T.greenBg, color: T.green, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "all 150ms",
            }}>{"\u2713"} Done</button>
          </div>
          {item.reply && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, marginBottom: 6, letterSpacing: .5 }}>DRAFT REPLY</div>
              <pre style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{item.reply}</pre>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={ev => { ev.stopPropagation(); navigator.clipboard?.writeText(item.reply); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Copy as Dave</button>
                <button onClick={ev => { ev.stopPropagation(); navigator.clipboard?.writeText(`Hi ${(item.from || "").split(" ")[0]},\n\nDave asked me to follow up.\n\n${item.reply.split("\n").slice(1).join("\n")}\n\nBest regards,\nFrance`); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.orange, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Copy as France</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
