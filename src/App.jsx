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
  CRITICAL: { color: C.red, bg: "#1a0c0c", border: "#3a1515" },
  URGENT: { color: C.orange, bg: "#1a1208", border: "#3a2a12" },
  IMPORTANT: { color: C.yellow, bg: "#1a1a0a", border: "#3a3a15" },
  NOTABLE: { color: C.teal, bg: "#0a1a1a", border: "#123a3a" },
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
// MOBILE DETECTION
// ═══════════════════════════════════════════════════════════
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════
// LIVE DATA TRANSFORM
// ═══════════════════════════════════════════════════════════
function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    const mon = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    return `${mon} ${day}, ${h % 12 || 12}:${m} ${ampm}`;
  } catch {
    return isoStr;
  }
}
function getDateStr(isoStr) {
  try {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}
function transformScanResults(scanData) {
  if (!scanData?.items?.length) return null;
  return scanData.items.map((item, i) => ({
    id: `live_${i}_${(item.sender_email || "").slice(0, 10)}`,
    score: item.final_score || item.rules_score || 3,
    label: item.final_label || "NOTABLE",
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
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = "jarvis_pipeline_state";
function loadPipelineState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function savePipelineState(data) {
  try {
    const s = {};
    data.forEach((e) => {
      if (e.stage !== "inbox") s[e.id] = e.stage;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}
function mergeWithPipelineState(items) {
  const s = loadPipelineState();
  return items.map((e) => ({ ...e, stage: s[e.id] || e.stage }));
}

// ═══════════════════════════════════════════════════════════
// HISTORICAL DATA (v5/v6 classified items — Nov 2025 to Mar 2026)
// ═══════════════════════════════════════════════════════════
const HISTORICAL_DATA = [
  // NOV 2025
  {
    id: "h15",
    score: 9,
    label: "CRITICAL",
    tier: "DAVE FLAGGED",
    pattern: "G",
    stage: "complete",
    from: "TJ Karklins \u2014 Galaxy",
    email: "tj@galaxydatacenters.com",
    subject: "ARM Market Presentation \u2014 TOP PRIORITY",
    time: "Nov 29, 2025",
    date: "2025-11-29",
    link: "",
    jarvis: "Dave: 'ARM is a key target \u2014 THIS A TOP PRIORITY.'",
    action: "ARM = priority target.",
    reply: "",
    quip: "ARM \u2014 the architecture powering half the planet.",
    reasons: ["Internal VIP", "Dave flagged TOP PRIORITY"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Customer",
    read: true,
  },
  {
    id: "h16",
    score: 8,
    label: "URGENT",
    tier: "VIP FIRM",
    pattern: "A",
    stage: "complete",
    from: "Henry Gray \u2014 CBRE",
    email: "",
    subject: "CBRE / Galaxy \u2014 Amsterdam Opportunity",
    time: "Nov 3, 2025",
    date: "2025-11-03",
    link: "",
    jarvis: "CBRE bringing Amsterdam DC opportunity.",
    action: "Evaluate Amsterdam site.",
    reply: "",
    quip: "Amsterdam \u2014 tulips meet terabytes.",
    reasons: ["VIP: cbre.com", "KW: data cent"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Broker",
    read: true,
  },
  // DEC 2025
  {
    id: "h25",
    score: 8,
    label: "URGENT",
    tier: "PIPELINE",
    pattern: "A",
    stage: "complete",
    from: "John Hall \u2014 TechRE",
    email: "john.hall@techreconsulting.com",
    subject: "TechRE / Galaxy Working Together",
    time: "Dec 8, 2025",
    date: "2025-12-08",
    link: "",
    jarvis:
      "First TechRE partnership thread. Early stages of the 18MW pipeline.",
    action: "Reply and evaluate. This became the 18MW deal.",
    reply: "",
    quip: "The seed that grew into 18 megawatts.",
    reasons: ["Pipeline: john hall"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Broker",
    read: true,
  },
  {
    id: "h26",
    score: 8,
    label: "URGENT",
    tier: "DAVE FLAGGED",
    pattern: "D",
    stage: "complete",
    from: "CDW \u2014 Chris Lillie",
    email: "chris.lillie@uk.cdw.com",
    subject: "CDW Merger Bills",
    time: "Dec 8, 2025",
    date: "2025-12-08",
    link: "",
    jarvis: "CDW merger bills flagged important.",
    action: "Address CDW billing.",
    reply: "",
    quip: "Merger bills. Unglamorous but necessary.",
    reasons: ["Tier 1: uk.cdw.com", "Dave flagged"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Customer",
    read: true,
  },
  // JAN 2026
  {
    id: "h12",
    score: 9,
    label: "CRITICAL",
    tier: "DAVE FLAGGED",
    pattern: "A",
    stage: "dave",
    from: "Fiona Leon \u2014 DRT",
    email: "fiona.leon@drt.co.uk",
    subject: "Galaxy / DRT Partnership & Cloud House \u2014 TOP PRIORITY",
    time: "Jan 13, 2026",
    date: "2026-01-13",
    link: "",
    jarvis:
      "DRT Partnership for Cloud House. Dave: 'TOP PRIORITY.' Zayo connectivity quotes in progress.",
    action: "RE-OPENED: This is still TOP PRIORITY.",
    reply: "",
    quip: "When the boss writes in caps, it's not a suggestion.",
    reasons: ["Tier 2: drt.co.uk", "Dave flagged TOP PRIORITY"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Strategic Partner",
    read: true,
  },
  {
    id: "h13",
    score: 9,
    label: "CRITICAL",
    tier: "DAVE FLAGGED",
    pattern: "F",
    stage: "complete",
    from: "Rishi Malhan",
    email: "rishi@malhangroup.com",
    subject: "80MW Poland \u2014 NDA Required",
    time: "Jan 17, 2026",
    date: "2026-01-17",
    link: "",
    jarvis: "80MW Poland opportunity. Site visit needed with TJ.",
    action: "Arrange site visit + NDA.",
    reply: "",
    quip: "80 megawatts.",
    reasons: ["Pipeline: rishi malhan", "KW: MW, nda"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Strategic Partner",
    read: true,
  },
  {
    id: "h14",
    score: 9,
    label: "CRITICAL",
    tier: "DAVE FLAGGED",
    pattern: "A",
    stage: "complete",
    from: "Victoria Skrbensky \u2014 Poland DC",
    email: "victoria@polanddc.pl",
    subject: "80MW + 180MW Poland DC Opportunity",
    time: "Jan 17, 2026",
    date: "2026-01-17",
    link: "",
    jarvis: "260MW total. Dave: 'important partner.'",
    action: "Coordinate with Rishi. 260MW combined.",
    reply: "",
    quip: "260 megawatts in Poland.",
    reasons: ["Pipeline: victoria skrbensky", "KW: MW"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Broker",
    read: true,
  },
  {
    id: "h17",
    score: 8,
    label: "URGENT",
    tier: "DAVE FLAGGED",
    pattern: "D",
    stage: "complete",
    from: "Colin Bell \u2014 Redhill",
    email: "colin.bell@galaxydatacenters.com",
    subject: "FluidOne Relocation",
    time: "Jan 14, 2026",
    date: "2026-01-14",
    link: "",
    jarvis: "Dave: 'CUSTOMER V imp should have been a task on monday.'",
    action: "Create Monday task immediately.",
    reply: "",
    quip: "'Should have been a task' means yesterday.",
    reasons: ["Redhill ops", "KW: customer"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Customer",
    read: true,
  },
  {
    id: "h18",
    score: 8,
    label: "URGENT",
    tier: "DAVE FLAGGED",
    pattern: "E",
    stage: "complete",
    from: "Ashley Roberts",
    email: "ashley@galaxydatacenters.com",
    subject: "Google NDA \u2014 Electronic Acceptance",
    time: "Jan 13, 2026",
    date: "2026-01-13",
    link: "",
    jarvis: "Google NDA. Hyperscaler opportunity.",
    action: "Execute NDA. Google is a hyperscaler target.",
    reply: "",
    quip: "Google knocking.",
    reasons: ["Internal VIP", "KW: nda", "Hyperscaler"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Customer",
    read: true,
  },
  // MAR 2026 — v5/v6 items
  {
    id: "h0",
    score: 10,
    label: "CRITICAL",
    tier: "PIPELINE VIP [18MW]",
    pattern: "A",
    stage: "dave",
    from: "John Hall \u2014 TechRE",
    email: "john.hall@techreconsulting.com",
    subject: "TechRE Introducer \u2014 18MW AI Prospect for Redhill",
    time: "Mar 4, 2026",
    date: "2026-03-04",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "18MW IT load, 144 racks at 120kW, AAA client, GPUs on order. Q2 2027 deadline. TechRE introducer agreement at 10% commission.",
    action:
      "Confirm 18MW feasibility. Connect substation contractors + fibre routes.",
    reply:
      "John,\n\nEngineering team is accelerating the 18MW feasibility assessment.\n\nBest,\nDave",
    quip: "This is the deal you've been building Redhill for.",
    reasons: ["Pipeline: john hall", "KW: MW, rack", "18MW prospect"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Broker",
    read: true,
  },
  {
    id: "h1",
    score: 9,
    label: "CRITICAL",
    tier: "TIER 1 CUSTOMER",
    pattern: "D",
    stage: "dave",
    from: "David McNeish \u2014 Travelers",
    email: "DMCNEISH@travelers.com",
    subject: "Travelers Lease Renewal \u2014 Pushback on Assumptions",
    time: "Mar 5, 2026",
    date: "2026-03-05",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "VP questioning who authorized renewal assumption. Remote Hands service formalized.",
    action: "Personal reassuring message to McNeish.",
    reply:
      "Hi David,\n\nNo assumptions \u2014 we're prepared to support whatever direction you decide.\n\nBest,\nDave",
    quip: "Your team RSVP'd to a party the host hasn't thrown.",
    reasons: ["Tier 1: travelers.com", "KW: lease, renewal"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Customer",
    read: true,
  },
  {
    id: "h4",
    score: 8,
    label: "URGENT",
    tier: "TIER 2",
    pattern: "G",
    stage: "complete",
    from: "Tom Babbington \u2014 Adaptive MDC",
    email: "tom.babbington@adaptive-mdc.com",
    subject: "Substation D&B Contractors \u2014 Pre-briefed",
    time: "Mar 5, 2026",
    date: "2026-03-05",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "5 substation D&B contractors shared. All pre-briefed on urgency. Ties to 18MW TechRE deal.",
    action: "Forward to Ash. Schedule calls with 2-3 contractors.",
    reply: "",
    quip: "Five contractors, pre-briefed.",
    reasons: ["Tier 2: adaptive-mdc.com", "KW: substation"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Strategic Partner",
    read: true,
  },
  {
    id: "h6",
    score: 7,
    label: "URGENT",
    tier: "TIER 1",
    pattern: "D",
    stage: "complete",
    from: "Max Ellery \u2014 SMBC",
    email: "max_ellery@gb.smbcgroup.com",
    subject: "Redhill Build Room \u2014 Follow-up Questions",
    time: "Mar 5, 2026",
    date: "2026-03-05",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "SMBC lender requesting follow-up call with Paul re: storage agreement.",
    action: "Ensure Paul schedules promptly.",
    reply: "",
    quip: "When your lender calls, one does not let it ring.",
    reasons: ["Tier 1: smbcgroup.com", "KW: redhill"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Investor",
    read: true,
  },
  {
    id: "h9",
    score: 8,
    label: "URGENT",
    tier: "TIER 1",
    pattern: "D",
    stage: "complete",
    from: "Charlie Byrne \u2014 Zayo Europe",
    email: "charlie.byrne@zayo.com",
    subject: "Unit3 Foxboro_Redhill \u2014 Cross Connect Quote",
    time: "Mar 6, 2026",
    date: "2026-03-06",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Zayo customer requesting cross connect modification at Redhill. Billable service request.",
    action: "Ensure TJ provides quote with lead time.",
    reply: "",
    quip: "Customer asks for a quote. Deliver before they ask twice.",
    reasons: ["Tier 1: zayo.com", "KW: redhill, rack"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Customer",
    read: true,
  },
  {
    id: "h10",
    score: 8,
    label: "URGENT",
    tier: "TIER 2",
    pattern: "D",
    stage: "complete",
    from: "Fiona Leon \u2014 Digital Realty",
    email: "fional@digitalrealty.com",
    subject: "Galaxy / DRT Partnership \u2014 Fiona on Leave",
    time: "Mar 6, 2026",
    date: "2026-03-06",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Fiona on leave next week. Backup: Louise Boland. Cloud House still in progress. TOP PRIORITY.",
    action: "Reply before she leaves. Contact Louise next week.",
    reply:
      "Hi Fiona,\n\nI'll reach out to Louise if anything comes up.\n\nBest,\nDave",
    quip: "TOP PRIORITY partner leaving for a week.",
    reasons: ["Tier 2: digitalrealty.com", "Dave flagged TOP PRIORITY"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Strategic Partner",
    read: true,
  },
  {
    id: "h11",
    score: 8,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "complete",
    from: "TJ Karklins \u2014 Galaxy",
    email: "tj@galaxydatacenters.com",
    subject: "SOC 2 Audit \u2014 Lock-in by Mar 20",
    time: "Mar 6, 2026",
    date: "2026-03-06",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "SOC 2 audit coordination. 40% late penalty if not locked by March 20.",
    action: "Decide on audit date before Mar 20.",
    reply: "",
    quip: "40% penalty for procrastination.",
    reasons: ["Internal VIP", "KW: audit"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
  // MAR 2026 — Recent demo items (Mar 17)
  {
    id: "d1",
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
      "Jamie sending the final monthly report for tomorrow's board meeting.",
    action: "Review the attached monthly deck TONIGHT.",
    reply: "Jamie,\n\nReceived, reviewing tonight.\n\nBest,\nDave",
    quip: "Board deck for tomorrow.",
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
    id: "d2",
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
      "THE pipeline deal. John Hall reviewing high-density positioning. 18MW prospect.",
    action: "Monitor. Follow up Friday if no response.",
    reply: "",
    quip: "The deal you built Redhill for.",
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
    id: "d3",
    score: 8,
    label: "URGENT",
    tier: "TIER 1",
    pattern: "G",
    stage: "france",
    from: "Jamie Thirlwall \u2014 Castleforge",
    email: "jamie.thirlwall@castleforge.com",
    subject: "Re: Board Deck slides received",
    time: "Mar 17, 8:09 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis: "Jamie confirming all slides received. Finalizing pack tonight.",
    action: "FYI \u2014 board pack being finalized.",
    reply: "",
    quip: "",
    reasons: ["Tier 1: castleforge.com", "KW: board"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Investor/JV",
    read: true,
  },
  {
    id: "d4",
    score: 8,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "D",
    stage: "dave",
    from: "Ashley Roberts \u2014 Galaxy",
    email: "ashley@galaxydatacenters.com",
    subject: "Redhill High Density Strategy for Castleforge",
    time: "Mar 17, 5:14 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Ashley sending high-density commentary to Pelle Jorgen at Castleforge.",
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
    id: "d5",
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
    jarvis: "Savills moving to monthly catch-ups. Onboarding settled.",
    action: "FYI \u2014 good sign.",
    reply: "",
    quip: "",
    reasons: ["VIP: savills.com", "KW: redhill", "Attachments"],
    hasAttachment: true,
    aiReviewed: false,
    contactType: "Strategic Partner",
    read: true,
  },
  {
    id: "d6",
    score: 7,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "dave",
    from: "Paul Leong \u2014 Galaxy",
    email: "paul@galaxydatacenters.com",
    subject: "High Density Commentary \u2014 run by Pelle",
    time: "Mar 17, 4:00 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Paul says commentary reads fine. Suggests running by Pelle. Add comparison table.",
    action: "Add high vs low density table.",
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
    id: "d7",
    score: 7,
    label: "URGENT",
    tier: "REDHILL OPS",
    pattern: "I",
    stage: "complete",
    from: "Benjamin Tyson \u2014 Redhill DC",
    email: "benjamin.tyson@redhilldatacentre.com",
    subject: "Rivington Energy Tour \u2014 confirmed",
    time: "Mar 17, 2:44 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis: "Tour booked and confirmed by Colin Bell.",
    action: "Done.",
    reply: "",
    quip: "",
    reasons: ["Redhill ops", "KW: site visit"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
  {
    id: "d8",
    score: 7,
    label: "URGENT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "dave",
    from: "Ash Gupta \u2014 Galaxy",
    email: "ash@galaxycapitalpartners.com",
    subject: "CHW System Resilience \u2014 remedial costs",
    time: "Mar 17, 2:36 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis:
      "Ash asking for ROM on CHW resilience remedials for funding request.",
    action: "Review ROM estimate when Rhys provides it.",
    reply: "",
    quip: "",
    reasons: ["Internal VIP", "KW: redhill, capacity"],
    hasAttachment: false,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
  {
    id: "d9",
    score: 6,
    label: "IMPORTANT",
    tier: "INTERNAL VIP",
    pattern: "E",
    stage: "france",
    from: "Ashley Roberts \u2014 Galaxy",
    email: "ashley@galaxydatacenters.com",
    subject: "Partner Agreement \u2014 sent to Mark",
    time: "Mar 17, 6:33 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis: "Partner agreement forwarded to Mark Vecchiarelli.",
    action: "Monitor for Mark's response.",
    reply: "",
    quip: "",
    reasons: ["Internal VIP", "KW: contract"],
    hasAttachment: true,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
  {
    id: "d10",
    score: 6,
    label: "IMPORTANT",
    tier: "INTERNAL VIP",
    pattern: "G",
    stage: "france",
    from: "Sai Raman \u2014 Galaxy",
    email: "sai@galaxydatacenters.com",
    subject: "246 London BFSI prospects",
    time: "Mar 17, 6:58 PM",
    date: "2026-03-17",
    link: "https://outlook.office365.com/mail/",
    jarvis: "246 London financial services prospect list via Apollo + Clay.",
    action: "Review list quality.",
    reply: "",
    quip: "",
    reasons: ["Internal VIP", "Attachments"],
    hasAttachment: true,
    aiReviewed: false,
    contactType: "Internal",
    read: true,
  },
];

// Combine as default view
const DEMO_DATA = HISTORICAL_DATA;

// ═══════════════════════════════════════════════════════════
// SORTING & HELPERS
// ═══════════════════════════════════════════════════════════
function sortEmails(emails) {
  return [...emails].sort((a, b) => {
    const aA = a.stage !== "complete",
      bA = b.stage !== "complete";
    if (aA && !bA) return -1;
    if (!aA && bA) return 1;
    if (aA && bA) {
      if (a.score !== b.score) return b.score - a.score;
      return a.date > b.date ? -1 : 1;
    }
    return a.date > b.date ? -1 : 1;
  });
}
// Use LOCAL date, not UTC — fixes the "today showing as yesterday" bug
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysLabel(dateStr) {
  const today = getToday();
  if (dateStr === today) return "Today";
  const t = new Date(today + "T12:00:00");
  const d = new Date(dateStr + "T12:00:00");
  const diff = Math.round((t - d) / 86400000);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  // Show friendly month format for older dates
  const months = [
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
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ═══════════════════════════════════════════════════════════
// PASSWORD GATE
// ═══════════════════════════════════════════════════════════
const ACCESS_PASSWORD = "Galaxy2026!";
const AUTH_KEY = "jarvis_auth_token";
function hashPw(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (h << 5) - h + pw.charCodeAt(i);
    h |= 0;
  }
  return "j_" + Math.abs(h).toString(36);
}
function isAuth() {
  try {
    const s = JSON.parse(localStorage.getItem(AUTH_KEY));
    if (!s || Date.now() > s.expiry) return false;
    return s.token === hashPw(ACCESS_PASSWORD);
  } catch {
    return false;
  }
}
function setAuth() {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      token: hashPw(ACCESS_PASSWORD),
      expiry: Date.now() + 86400000,
    })
  );
}

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const isMobile = useIsMobile();
  const go = () => {
    if (pw === ACCESS_PASSWORD) {
      setAuth();
      onLogin();
    } else {
      setErr(true);
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
        padding: isMobile ? 20 : 0,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`}</style>
      <div
        style={{
          width: isMobile ? "100%" : 360,
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
              setErr(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="Enter access password"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              background: C.surface,
              border: `1px solid ${err ? C.red : C.border}`,
              color: C.text,
              borderRadius: 10,
              fontSize: 16,
              fontFamily: "'DM Sans',sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        {err && (
          <div style={{ fontSize: 13, color: C.red, marginTop: 8 }}>
            Incorrect password
          </div>
        )}
        <button
          onClick={go}
          style={{
            width: "100%",
            padding: "14px 0",
            marginTop: 12,
            background: C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Access Command Center
        </button>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 24 }}>
          Galaxy Data Centers \u2014 Confidential
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed] = useState(isAuth);
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <JarvisCC />;
}

function JarvisCC() {
  const isMobile = useIsMobile();
  const [data, setData] = useState(() => mergeWithPipelineState(DEMO_DATA));
  const [selId, setSelId] = useState(null);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [liveStatus, setLiveStatus] = useState("demo");
  const [scanMeta, setScanMeta] = useState(null);
  const [mobileDetail, setMobileDetail] = useState(false); // mobile: show detail view

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch("/data/jarvis_results.json?" + Date.now());
      if (!res.ok) throw new Error("No data");
      const sd = await res.json();
      if (!sd.items?.length) return;
      const tr = transformScanResults(sd);
      if (!tr) return;
      setData((prev) => {
        const saved = loadPipelineState();
        const liveItems = tr.map((e) => ({
          ...e,
          stage: saved[e.id] || "inbox",
        }));
        // Merge: historical items that aren't duplicated by live data + all live items
        const liveEmails = new Set(liveItems.map((e) => e.email + e.subject));
        const historicalKeep = HISTORICAL_DATA.filter(
          (h) => !liveEmails.has(h.email + h.subject)
        ).map((h) => ({ ...h, stage: saved[h.id] || h.stage }));
        return [...liveItems, ...historicalKeep];
      });
      setScanMeta({ total: sd.total, noise: sd.noise, ai: sd.ai });
      setLiveStatus("live");
    } catch {}
  }, []);

  useEffect(() => {
    fetchLiveData();
    const iv = setInterval(fetchLiveData, 30000);
    return () => clearInterval(iv);
  }, [fetchLiveData]);
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

  const sel = selId ? data.find((e) => e.id === selId) : null;
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

  const selectEmail = (id) => {
    setSelId(id);
    if (isMobile) setMobileDetail(true);
  };
  const backToList = () => setMobileDetail(false);

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
        @keyframes slideL{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        meta[name=viewport]{content:"width=device-width,initial-scale=1,maximum-scale=1"}
      `}</style>

      {/* HEADER */}
      <div
        style={{
          padding: isMobile ? "10px 12px" : "10px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          flexShrink: 0,
          background: C.surface,
        }}
      >
        {isMobile && mobileDetail ? (
          <button
            onClick={backToList}
            style={{
              padding: "6px 12px",
              background: C.surface2,
              border: `1px solid ${C.border}`,
              color: C.accent,
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontWeight: 600,
            }}
          >
            {"\u2190"} Back
          </button>
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
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
        )}
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700 }}>
            J.A.R.V.I.S.
          </span>
          {!isMobile && (
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
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            gap: isMobile ? 4 : 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              padding: "3px 6px",
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
              padding: "3px 6px",
              borderRadius: 4,
              background: `${C.red}18`,
              color: C.red,
              fontFamily: "'JetBrains Mono',monospace",
              fontWeight: 600,
            }}
          >
            {activeCount}
          </span>
          {!isMobile && (
            <>
              <span
                style={{
                  fontSize: 10,
                  padding: "3px 6px",
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
                    padding: "3px 6px",
                    borderRadius: 4,
                    background: `${C.orange}18`,
                    color: C.orange,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {carryOver} carry
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
                  {scanMeta.total} scanned
                </span>
              )}
            </>
          )}
        </div>
        {!isMobile && (
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
        )}
        <button
          onClick={() => {
            localStorage.removeItem(AUTH_KEY);
            window.location.reload();
          }}
          style={{
            padding: "5px 8px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 6,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Out
        </button>
      </div>

      {/* MOBILE SEARCH */}
      {isMobile && !mobileDetail && (
        <div
          style={{
            padding: "8px 12px",
            borderBottom: `1px solid ${C.border}`,
            background: C.bg,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emails..."
            style={{
              width: "100%",
              padding: "10px 12px",
              background: C.surface2,
              border: `1px solid ${C.border}`,
              color: C.text,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "'DM Sans',sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* FILTERS — scrollable on mobile */}
      {!(isMobile && mobileDetail) && (
        <div
          style={{
            padding: isMobile ? "8px 12px" : "8px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            gap: 4,
            flexShrink: 0,
            background: C.bg,
            alignItems: "center",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Pill
            c={C.accent}
            active={stageFilter === "ALL"}
            onClick={() => setStageFilter("ALL")}
            n={activeCount}
            m={isMobile}
          >
            Active
          </Pill>
          {STAGES.filter((s) => !isMobile || stgCounts[s.id] > 0).map((s) => (
            <Pill
              key={s.id}
              c={s.color}
              active={stageFilter === s.id}
              onClick={() => setStageFilter(s.id)}
              n={stgCounts[s.id]}
              m={isMobile}
            >
              {s.icon} {s.label}
            </Pill>
          ))}
          {!isMobile && (
            <div
              style={{
                width: 1,
                height: 20,
                background: C.border,
                margin: "0 4px",
                flexShrink: 0,
              }}
            />
          )}
          {["CRITICAL", "URGENT", "IMPORTANT"].map((f) => (
            <Pill
              key={f}
              c={URGENCY[f].color}
              active={filter === f}
              onClick={() => setFilter(filter === f ? "ALL" : f)}
              m={isMobile}
            >
              {isMobile ? f.slice(0, 4) : f}
            </Pill>
          ))}
          {!isMobile && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button
                onClick={() => setShowComplete(!showComplete)}
                style={{
                  fontSize: 10,
                  padding: "3px 10px",
                  background: showComplete ? `${C.green}18` : "transparent",
                  border: `1px solid ${
                    showComplete ? C.green + "40" : C.border
                  }`,
                  color: showComplete ? C.green : C.textMuted,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  whiteSpace: "nowrap",
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
          )}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* EMAIL LIST — hidden on mobile when detail is shown */}
        {!(isMobile && mobileDetail) && (
          <div
            style={{
              width: isMobile ? "100%" : 380,
              borderRight: isMobile ? "none" : `1px solid ${C.border}`,
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
                  fontSize: 13,
                }}
              >
                No items match filters
              </div>
            )}
            {filtered.map((e, i) => {
              const eu = URGENCY[e.label] || URGENCY.NOTABLE;
              const isSel = sel?.id === e.id;
              const stg = STAGES.find((s) => s.id === e.stage);
              const isToday = e.date === getToday();
              const prev = i > 0 ? filtered[i - 1] : null;
              const showDateSep =
                e.stage !== "complete" &&
                (i === 0 ||
                  (prev?.stage !== "complete" && e.date !== prev?.date));
              const showCompSep =
                e.stage === "complete" &&
                (i === 0 || prev?.stage !== "complete");
              return (
                <div key={e.id}>
                  {showDateSep && (
                    <div
                      style={{
                        padding: isMobile ? "6px 12px" : "6px 16px",
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
                          : `${daysLabel(e.date)} \u2014 Still Active`}
                      </span>
                      {!isToday && (
                        <span style={{ fontWeight: 400, opacity: 0.6 }}>
                          Needs action
                        </span>
                      )}
                    </div>
                  )}
                  {showCompSep && (
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
                    onClick={() => selectEmail(e.id)}
                    style={{
                      padding: isMobile ? "14px 12px" : "12px 16px",
                      borderBottom: `1px solid ${C.border}08`,
                      borderLeft: isMobile
                        ? "none"
                        : `3px solid ${
                            isSel && !isMobile ? eu.color : "transparent"
                          }`,
                      background:
                        isSel && !isMobile
                          ? C.surface
                          : e.stage === "complete"
                          ? `${C.bg}80`
                          : "transparent",
                      cursor: "pointer",
                      transition: "all .1s",
                      opacity: e.stage === "complete" ? 0.5 : 1,
                      animation: `slideR .2s ease ${Math.min(
                        i * 0.02,
                        0.3
                      )}s both`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: isMobile ? 14 : 12,
                          fontWeight: 600,
                          color: C.text,
                          maxWidth: "60%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.from?.split("\u2014")[0]?.trim()}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        {!e.read && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
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
                            fontSize: isMobile ? 11 : 10,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono',monospace",
                            color: "#fff",
                            background: eu.color,
                            padding: "2px 7px",
                            borderRadius: 4,
                          }}
                        >
                          {e.score}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: isMobile ? 13 : 11,
                        color: C.textDim,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 5,
                      }}
                    >
                      {e.subject}
                    </div>
                    <div
                      style={{ display: "flex", gap: 4, alignItems: "center" }}
                    >
                      <span
                        style={{
                          fontSize: isMobile ? 10 : 9,
                          color: eu.color,
                          background: eu.bg,
                          border: `1px solid ${eu.border}`,
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {e.label}
                      </span>
                      {stg && (
                        <span
                          style={{
                            fontSize: isMobile ? 10 : 9,
                            color: stg.color,
                          }}
                        >
                          {stg.icon} {stg.label}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: isMobile ? 10 : 9,
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
        )}

        {/* DETAIL PANEL — full screen on mobile, right panel on desktop */}
        {(isMobile ? mobileDetail : true) && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              background: C.surface,
              animation: isMobile ? "slideL .2s ease" : "none",
            }}
          >
            {sel ? (
              (() => {
                const dl = daysLabel(sel.date);
                return (
                  <div
                    style={{
                      padding: isMobile ? 16 : 20,
                      animation: "fadeIn .2s ease",
                    }}
                  >
                    {/* Score + sender */}
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
                          width: isMobile ? 48 : 44,
                          height: isMobile ? 48 : 44,
                          borderRadius: 10,
                          background: u.bg,
                          border: `2px solid ${u.color}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: isMobile ? 18 : 16,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono',monospace",
                            color: u.color,
                          }}
                        >
                          {sel.score}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: isMobile ? 16 : 15,
                            fontWeight: 700,
                          }}
                        >
                          {sel.from}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.textDim,
                            fontFamily: "'JetBrains Mono',monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sel.email} \u2014 {dl}
                        </div>
                      </div>
                    </div>

                    {/* Outlook link */}
                    {sel.link && (
                      <a
                        href={sel.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          padding: isMobile ? "12px 0" : "8px 0",
                          marginBottom: 12,
                          background: C.accent,
                          color: "#fff",
                          borderRadius: 8,
                          fontSize: isMobile ? 14 : 12,
                          fontWeight: 600,
                          textDecoration: "none",
                          textAlign: "center",
                        }}
                      >
                        Open in Outlook {"\u2197"}
                      </a>
                    )}

                    {/* Subject */}
                    <div
                      style={{
                        fontSize: isMobile ? 16 : 14,
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      {sel.subject}
                    </div>

                    {/* Tags */}
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
                          padding: "3px 8px",
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
                          padding: "3px 8px",
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
                          padding: "3px 8px",
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
                            padding: "3px 8px",
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
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: `${C.purple}15`,
                            color: C.purple,
                          }}
                        >
                          AI Reviewed
                        </span>
                      )}
                    </div>

                    {/* Reasons */}
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

                    {/* Pipeline mover */}
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: C.textMuted,
                          fontWeight: 600,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: ".5px",
                        }}
                      >
                        Move to
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "repeat(3, 1fr)"
                            : "repeat(6, auto)",
                          gap: 6,
                        }}
                      >
                        {STAGES.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              update(sel.id, "stage", s.id);
                              if (s.id === "complete" && isMobile)
                                setTimeout(backToList, 300);
                            }}
                            style={{
                              padding: isMobile ? "10px 0" : "5px 10px",
                              background:
                                sel.stage === s.id
                                  ? `${s.color}18`
                                  : "transparent",
                              border: `1px solid ${
                                sel.stage === s.id ? s.color + "50" : C.border
                              }`,
                              color: sel.stage === s.id ? s.color : C.textMuted,
                              borderRadius: 6,
                              fontSize: isMobile ? 12 : 10,
                              fontWeight: 500,
                              cursor: "pointer",
                              fontFamily: "'DM Sans',sans-serif",
                              textAlign: "center",
                            }}
                          >
                            {s.icon} {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quip */}
                    {sel.quip && (
                      <div
                        style={{
                          padding: "10px 12px",
                          marginBottom: 12,
                          background: `${C.accent}08`,
                          borderLeft: `3px solid ${C.accent}40`,
                          borderRadius: "0 8px 8px 0",
                          fontSize: 13,
                          color: C.accent,
                          fontStyle: "italic",
                        }}
                      >
                        "{sel.quip}"
                      </div>
                    )}

                    {/* Jarvis Briefing */}
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
                            fontSize: isMobile ? 13 : 12,
                            color: C.textDim,
                            lineHeight: 1.6,
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          {sel.jarvis}
                        </div>
                      </div>
                    )}

                    {/* Recommended Action */}
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
                            fontSize: isMobile ? 13 : 12,
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

                    {/* Draft Reply */}
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
                              flex: 1,
                              padding: isMobile ? "10px 0" : "5px 12px",
                              background: C.surface2,
                              border: `1px solid ${C.border}`,
                              color: C.accent,
                              borderRadius: 6,
                              fontSize: isMobile ? 12 : 10,
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
                                  .join("\n")}\n\nBest regards,\nFrance`
                              )
                            }
                            style={{
                              flex: 1,
                              padding: isMobile ? "10px 0" : "5px 12px",
                              background: C.surface2,
                              border: `1px solid ${C.border}`,
                              color: C.orange,
                              borderRadius: 6,
                              fontSize: isMobile ? 12 : 10,
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
                  </div>
                );
              })()
            ) : (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: C.textMuted,
                  fontSize: 13,
                }}
              >
                {isMobile ? "" : "Select an email"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ c, active, onClick, n, m, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: m ? "5px 10px" : "3px 10px",
        fontSize: m ? 11 : 10,
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
        whiteSpace: "nowrap",
        flexShrink: 0,
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
