import { useState, useMemo, useCallback } from "react";

const C = {
  bg: "#0b0e14", surface: "#111620", surface2: "#161d2a", surface3: "#1c2536",
  border: "#1e2a3a", borderLight: "#2a3a50", accent: "#3b9eff", accentDim: "#1a3a5a",
  text: "#d4dce8", textDim: "#6b7e96", textMuted: "#3a4e66",
  red: "#ef5350", orange: "#ff9800", yellow: "#e6c84a", teal: "#26c6da", green: "#66bb6a", purple: "#ab47bc",
};
const URGENCY = {
  CRITICAL: { color: C.red, bg: "#1a0c0c", border: "#3a1515", rank: 0 },
  URGENT: { color: C.orange, bg: "#1a1208", border: "#3a2a12", rank: 1 },
  IMPORTANT: { color: C.yellow, bg: "#1a1a0a", border: "#3a3a15", rank: 2 },
  NOTABLE: { color: C.teal, bg: "#0a1a1a", border: "#123a3a", rank: 3 },
};
const STAGES = [
  { id: "inbox", label: "Inbox", color: C.red, icon: "◉" },
  { id: "france", label: "France", color: C.orange, icon: "✎" },
  { id: "external", label: "External", color: C.yellow, icon: "⏳" },
  { id: "dave", label: "Dave", color: C.accent, icon: "★" },
  { id: "scheduled", label: "Scheduled", color: C.teal, icon: "◎" },
  { id: "complete", label: "Complete", color: C.green, icon: "✓" },
];
const PATTERNS = { A: "Inbound Lead", B: "Introduction", C: "Lead-Gen Vendor", D: "Customer Follow-Up", E: "Legal/NDA", F: "Investor/Capital", G: "Internal Ops", H: "PR/Awards", I: "Scheduling", J: "Admin" };

const TODAY = "2026-03-17";
const YESTERDAY = "2026-03-16";

const DATA = [
  // ══════ TODAY — March 17 ══════
  { id:101, score:9, label:"CRITICAL", tier:"TIER 1", pattern:"G", stage:"dave", from:"Jamie Thirlwall — Castleforge", email:"jamie.thirlwall@castleforge.com", subject:"Monthly Deck for the March Business Review", time:"Mar 17, 8:25 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYfAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Jamie sending the final monthly report for TOMORROW's board meeting. Attachments included. Full Galaxy + Castleforge leadership on thread.", action:"Review the attached monthly deck TONIGHT. Meeting is tomorrow afternoon.", reply:"Jamie,\n\nReceived, thank you. Reviewing tonight and will flag anything before the meeting.\n\nBest,\nDave", quip:"Board deck for tomorrow. Review tonight, not tomorrow morning.", reasons:["Tier 1: castleforge.com","KW: board","Attachments + deal KW (+2)"], hasAttachment:true, aiReviewed:false, contactType:"Investor/JV", read:true },
  { id:102, score:9, label:"CRITICAL", tier:"PIPELINE VIP", pattern:"D", stage:"dave", from:"John Hall — TechRE", email:"john.hall@techreconsulting.com", subject:"Re: Redhill Unit 1&2 optionality", time:"Mar 17, 4:41 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYHAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"THE pipeline deal. John Hall acknowledging Ashley's high-density positioning for Redhill Unit 1&2. Roger Weir and John Craig (TechRE) also reviewing. This is the 18MW prospect thread.", action:"Monitor closely. TechRE reviewing. Follow up if no response by Friday.", reply:"", quip:"This is the deal you built Redhill for. They're reviewing.", reasons:["Pipeline: john hall","Tier 2: techreconsulting.com","KW: redhill","Active deal thread"], hasAttachment:false, aiReviewed:false, contactType:"Broker", read:true },
  { id:103, score:8, label:"URGENT", tier:"TIER 1", pattern:"G", stage:"france", from:"Jamie Thirlwall — Castleforge", email:"jamie.thirlwall@castleforge.com", subject:"Re: Sales and Marketing Update for Board Deck (18 March)", time:"Mar 17, 8:09 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYeAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Jamie confirming all slides received. Pulling final board pack together tonight.", action:"FYI — board pack being finalized tonight. No action unless Jamie flags issues.", reply:"", quip:"", reasons:["Tier 1: castleforge.com","KW: board"], hasAttachment:false, aiReviewed:false, contactType:"Investor/JV", read:true },
  { id:104, score:8, label:"URGENT", tier:"INTERNAL VIP", pattern:"D", stage:"dave", from:"Ashley Roberts — Galaxy", email:"ashley@galaxydatacenters.com", subject:"Re: Redhill High Density Strategy — Colour Commentary for Castleforge", time:"Mar 17, 5:14 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYOAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Ashley sending high-density strategy commentary to Pelle Jorgen at Castleforge. Covers AI/GPU demand shift and why Redhill should pivot. Full leadership on thread.", action:"Review Ashley's narrative before tomorrow's board meeting. This is the positioning Castleforge will see.", reply:"", quip:"", reasons:["Internal VIP","Re customer: castleforge","8 VIPs on thread"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:false },
  { id:105, score:7, label:"URGENT", tier:"VIP FIRM", pattern:"D", stage:"dave", from:"Holly Winch — Savills", email:"holly.winch@savills.com", subject:"Redhill Data Centre — Catch up", time:"Mar 17, 5:56 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYQAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Savills moving to monthly catch-ups. Onboarding phase settled, portfolio firmly embedded. Wayne Farnell also on thread. Attachments included.", action:"FYI — Savills transitioning to monthly rhythm. Good sign.", reply:"", quip:"", reasons:["VIP: savills.com","KW: redhill","Attachments"], hasAttachment:true, aiReviewed:false, contactType:"Strategic Partner", read:true },
  { id:106, score:7, label:"URGENT", tier:"INTERNAL VIP", pattern:"G", stage:"dave", from:"Paul Leong — Galaxy", email:"paul@galaxydatacenters.com", subject:"Re: High Density Commentary — run it by Pelle", time:"Mar 17, 4:00 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYBAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Paul says commentary reads fine. Suggests running by Pelle at CF offices. 50/50 too big-picture. Recommends adding high vs low density comparison table.", action:"Consider Paul's suggestion: add comparison table before sending to Castleforge.", reply:"", quip:"", reasons:["Internal VIP","Re customer: castleforge","Dave in thread (+2)"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:false },
  { id:107, score:7, label:"URGENT", tier:"REDHILL OPS", pattern:"I", stage:"complete", from:"Benjamin Tyson — Redhill DC", email:"benjamin.tyson@redhilldatacentre.com", subject:"Re: Rivington Energy Tour — booked and confirmed", time:"Mar 17, 2:44 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorX5AAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Benjamin confirming access booked and Colin Bell approved the Rivington Energy site tour.", action:"Done. Tour confirmed.", reply:"", quip:"", reasons:["Redhill ops","KW: site visit"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:true },
  { id:108, score:7, label:"URGENT", tier:"INTERNAL VIP", pattern:"G", stage:"dave", from:"Ash Gupta — Galaxy", email:"ash@galaxycapitalpartners.com", subject:"Re: S160 — CHW System Resilience — remedial costs", time:"Mar 17, 2:36 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorX3AAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Ash asking Rhys Jones for ROM cost on CHW resilience remedials at Redhill. Wants to add to funding request. Critical infrastructure.", action:"Review when Rhys provides ROM estimate. Include in next funding round.", reply:"", quip:"Resilience gaps need numbers. ROM is step one to budget.", reasons:["Internal VIP","KW: redhill, capacity","Funding request"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:true },
  { id:109, score:6, label:"IMPORTANT", tier:"INTERNAL VIP", pattern:"E", stage:"france", from:"Ashley Roberts — Galaxy", email:"ashley@galaxydatacenters.com", subject:"FW: Partner Agreement — sent to Mark", time:"Mar 17, 6:33 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYYAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Ashley forwarding partner agreement to Mark Vecchiarelli. Attachments included.", action:"Monitor for Mark's response.", reply:"", quip:"", reasons:["Internal VIP","KW: contract","Pipeline: mark vecchiarelli"], hasAttachment:true, aiReviewed:false, contactType:"Internal", read:true },
  { id:110, score:6, label:"IMPORTANT", tier:"INTERNAL VIP", pattern:"I", stage:"complete", from:"Rodrigo — Galaxy", email:"rodrigo@galaxydatacenters.com", subject:"DM, AG & RM Catch-Up — 7pm UK today", time:"Mar 17, 5:47 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYPAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Rodrigo scheduling meeting with Dave and Ash at 7pm UK today.", action:"Join Teams call at 7pm UK.", reply:"", quip:"", reasons:["Internal VIP","Scheduling"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:true },
  { id:111, score:6, label:"IMPORTANT", tier:"INTERNAL VIP", pattern:"G", stage:"france", from:"Sai Raman — Galaxy", email:"sai@galaxydatacenters.com", subject:"Sarthak's list — 246 London BFSI prospects", time:"Mar 17, 6:58 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYZAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Sai forwarding prospect list of 246 London financial services firms. Generated via Apollo + Clay.", action:"Review list quality. Ensure alignment with Paul's methodology.", reply:"", quip:"", reasons:["Internal VIP","Attachments","Prospect list"], hasAttachment:true, aiReviewed:false, contactType:"Internal", read:true },
  { id:112, score:6, label:"IMPORTANT", tier:"UNKNOWN", pattern:"G", stage:"france", from:"Rhys Jones — Kiwi MCF", email:"rj@kiwimcf.com", subject:"S160 — CHW — System Resilience report", time:"Mar 17, 2:34 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorX2AAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Engineering consultant sending CHW system resilience report. Flagging lack of true concurrent maintainability at Redhill S160.", action:"Technical report. Ash following up on remedial costs.", reply:"", quip:"", reasons:["KW: resilience","Redhill infrastructure","AI reviewed"], hasAttachment:false, aiReviewed:true, contactType:"Strategic Partner", read:true },
  { id:113, score:6, label:"IMPORTANT", tier:"UNKNOWN", pattern:"D", stage:"france", from:"Itay Bohbot — Torpedo Data Centers", email:"itay@torpedodatacenters.com", subject:"Re: Itay and Dave — call follow-up", time:"Mar 17, 2:06 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorXxAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Itay asking if Dave joined the Calendly call. France CC'd.", action:"Confirm if Dave joined. If missed, reschedule.", reply:"", quip:"", reasons:["KW: data cent","Dave-replied (+3)","AI reviewed"], hasAttachment:false, aiReviewed:true, contactType:"Strategic Partner", read:true },
  { id:114, score:5, label:"IMPORTANT", tier:"UNKNOWN", pattern:"C", stage:"france", from:"Chris Bowles — MarketJoy", email:"chris@marketjoy.com", subject:"Re: MarketJoy — 3 month proposal + agreement", time:"Mar 17, 5:07 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYMAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"MarketJoy sending 3-month SQL proposal and PDF agreement. Animesh requested shorter term.", action:"Sai/Animesh to review. Dave FYI only.", reply:"", quip:"", reasons:["KW: proposal, contract","Attachments + deal KW (+2)","AI reviewed"], hasAttachment:true, aiReviewed:true, contactType:"Vendor/PR", read:true },
  { id:115, score:5, label:"IMPORTANT", tier:"INTERNAL", pattern:"G", stage:"france", from:"Animesh — Galaxy", email:"animesh@galaxydatacenters.com", subject:"Re: DemandFactor — qualification model shift", time:"Mar 17, 2:14 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorXzAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Animesh flagging DemandFactor no longer willing to commit to SQM/BANT model. Proposing different qualification approach.", action:"Sai to review. Flag to Dave if terms unacceptable.", reply:"", quip:"", reasons:["Internal","KW: proposal"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:true },
  { id:116, score:5, label:"IMPORTANT", tier:"UNKNOWN", pattern:"A", stage:"france", from:"BitOoda — tkelly", email:"tkelly@bitooda.io", subject:"Site for Sale: Grid-Connected DC Assets (Oklahoma)", time:"Mar 17, 3:17 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorX8AAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Two grid-connected DC sites in Oklahoma SPP region, adjacent to Google. AI/HPC positioning. Bulk email.", action:"Market intel. Likely not relevant (UK-focused) but notable.", reply:"", quip:"", reasons:["KW: data cent, site","AI reviewed"], hasAttachment:false, aiReviewed:true, contactType:"Lead", read:true },
  { id:117, score:4, label:"NOTABLE", tier:"INTERNAL", pattern:"J", stage:"complete", from:"IT — Galaxy", email:"it@galaxydatacenters.com", subject:"Re: Access Revoked — 1Password reactivated", time:"Mar 17, 5:09 PM", date:TODAY, link:"", jarvis:"IT confirming 1Password access reactivated per Dave's request.", action:"Done.", reply:"", quip:"", reasons:["Internal"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:false },
  { id:118, score:4, label:"NOTABLE", tier:"UNKNOWN", pattern:"H", stage:"france", from:"Calvin — ContactAntPro", email:"calvin@contactantpro.co", subject:"Podcast invitation for Dave", time:"Mar 17, 11:57 PM", date:TODAY, link:"https://outlook.office365.com/owa/?ItemID=AAMkADYwYjNmMGE4LTM4ZjYtNGI0NC1iNGJiLTk4ZWI1NmFiNzc1ZABGAAAAAACWTOM3q30fQ6AqXfuOKVI5BwAuilH2jaEmTaBeWRekOs%2B0AAAAAAEMAAAuilH2jaEmTaBeWRekOs%2B0AAXqorYpAAA%3D&exvsurl=1&viewmodel=ReadMessageItem", jarvis:"Cold podcast invitation. Claims referral from 'Dustin.' IT/software focus.", action:"Evaluate with Candace/JSA if worth doing.", reply:"", quip:"", reasons:["AI reviewed"], hasAttachment:false, aiReviewed:true, contactType:"External", read:false },
  // ══════ YESTERDAY — March 16 (still active, not completed) ══════
  { id:201, score:10, label:"CRITICAL", tier:"TIER 1", pattern:"D", stage:"external", from:"Jamie Thirlwall — Castleforge", email:"jamie.thirlwall@castleforge.com", subject:"Re: Tenant Leases Expiring in 2026", time:"Mar 16, 10:14 AM", date:YESTERDAY, link:"https://outlook.office365.com/mail/", jarvis:"Six major tenants expiring in 2026: Lumen, CDW, TCS, FluidOne, Accenture, IDS-Indata. Auto-renewal and pricing decisions at stake.", action:"Review lease expiry tracker. CDW call Thursday. Confirm auto-renewals for Lumen and TCS.", reply:"Jamie,\n\nPaul has shared status on each expiring tenant. Full picture by Wednesday.\n\nBest,\nDave", quip:"Six major tenants, one year. Revenue protection playbook.", reasons:["Tier 1: castleforge.com","KW: lease, tenant","Lease + customer"], hasAttachment:false, aiReviewed:false, contactType:"Investor/JV", read:true },
  { id:202, score:8, label:"URGENT", tier:"TIER 1", pattern:"F", stage:"scheduled", from:"Pelle Jorgen — Castleforge", email:"pelle.jorgen@castleforge.com", subject:"Redhill — Call with ICG (Lender) March 18th", time:"Mar 16, 11:04 AM", date:YESTERDAY, link:"https://outlook.office365.com/mail/", jarvis:"ICG lender call tomorrow March 18. Paul joining from China at midnight. Dave, TJ, Ash confirmed.", action:"JOIN TOMORROW. March 18, 4:00 PM UK. ICG monthly lender call.", reply:"", quip:"When the lender asks you to join, you join.", reasons:["Tier 1: castleforge.com","KW: redhill","6 VIPs on thread"], hasAttachment:false, aiReviewed:false, contactType:"Investor/JV", read:true },
  { id:203, score:7, label:"URGENT", tier:"INTERNAL VIP", pattern:"E", stage:"external", from:"Paul Leong — Galaxy", email:"paul@galaxydatacenters.com", subject:"BPT Direct Partnership — commission structure", time:"Mar 16, 6:09 AM", date:YESTERDAY, link:"https://outlook.office365.com/mail/", jarvis:"Paul flagging CapEx concern on commission calculation. Needs clarity before signing.", action:"Align with Ashley on CapEx exclusions before signing.", reply:"", quip:"Commission structures need airtight definitions.", reasons:["Internal VIP","KW: commission","Broker signal"], hasAttachment:false, aiReviewed:false, contactType:"Internal", read:false },
  { id:204, score:6, label:"IMPORTANT", tier:"TIER 2", pattern:"E", stage:"external", from:"Chris Wright — GotColo", email:"chris@gotcolo.com", subject:"Re: NDA — approved direct outreach", time:"Mar 16, 10:12 AM", date:YESTERDAY, link:"https://outlook.office365.com/mail/", jarvis:"GotColo NDA progressing. Chris confirmed Ashley can reach out to prospect directly.", action:"Ashley to reach out to GotColo prospect. Copy Chris.", reply:"", quip:"NDA signed, intro approved. Momentum.", reasons:["Tier 2: gotcolo.com","KW: nda"], hasAttachment:false, aiReviewed:false, contactType:"Strategic Partner", read:true },
];

// ═══════════════════════════════════════
// SORTING LOGIC — Active items on top
// ═══════════════════════════════════════
function sortEmails(emails) {
  return [...emails].sort((a, b) => {
    const aActive = a.stage !== "complete";
    const bActive = b.stage !== "complete";
    // Active items always above completed
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    // Within active: sort by score descending
    if (aActive && bActive) {
      if (a.score !== b.score) return b.score - a.score;
      // Same score: today before yesterday
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return 0;
    }
    // Within completed: most recent first
    return a.date > b.date ? -1 : 1;
  });
}

function daysAgo(dateStr) {
  if (dateStr === TODAY) return "Today";
  if (dateStr === YESTERDAY) return "Yesterday";
  return dateStr;
}

export default function JarvisCC() {
  const [data, setData] = useState(DATA);
  const [selId, setSelId] = useState(101);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  const filtered = useMemo(() => {
    let r = data;
    if (stageFilter !== "ALL") r = r.filter(e => e.stage === stageFilter);
    if (filter !== "ALL") r = r.filter(e => e.label === filter);
    if (!showComplete) r = r.filter(e => e.stage !== "complete");
    if (search) r = r.filter(e => `${e.from} ${e.subject} ${e.email}`.toLowerCase().includes(search.toLowerCase()));
    return sortEmails(r);
  }, [data, stageFilter, filter, search, showComplete]);

  const sel = data.find(e => e.id === selId);
  const u = sel ? (URGENCY[sel.label] || URGENCY.NOTABLE) : URGENCY.NOTABLE;

  const stgCounts = useMemo(() => {
    const c = {};
    STAGES.forEach(s => c[s.id] = data.filter(e => e.stage === s.id).length);
    return c;
  }, [data]);

  const activeCount = data.filter(e => e.stage !== "complete").length;
  const todayCount = data.filter(e => e.date === TODAY && e.stage !== "complete").length;
  const carryOver = data.filter(e => e.date !== TODAY && e.stage !== "complete").length;

  const update = useCallback((id, key, val) => setData(p => p.map(e => e.id === id ? { ...e, [key]: val } : e)), []);

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: C.bg, color: C.text, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        @keyframes slideR{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: C.surface }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>J</span>
        </div>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>J.A.R.V.I.S.</span>
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>v8.1 Command Center</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${C.red}18`, color: C.red, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{activeCount} active</span>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${C.accent}18`, color: C.accent, fontFamily: "'JetBrains Mono',monospace" }}>{todayCount} today</span>
          {carryOver > 0 && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${C.orange}18`, color: C.orange, fontFamily: "'JetBrains Mono',monospace" }}>{carryOver} carry-over</span>}
          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>Mar 17, 2026</span>
        </div>
        <div style={{ position: "relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: 150, padding: "5px 10px 5px 24px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textMuted }}>&#x2315;</span>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 4, flexWrap: "wrap", flexShrink: 0, background: C.bg, alignItems: "center" }}>
        <Pill c={C.accent} active={stageFilter === "ALL"} onClick={() => setStageFilter("ALL")} n={activeCount}>Active</Pill>
        {STAGES.map(s => <Pill key={s.id} c={s.color} active={stageFilter === s.id} onClick={() => setStageFilter(s.id)} n={stgCounts[s.id]}>{s.icon} {s.label}</Pill>)}
        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />
        {["ALL","CRITICAL","URGENT","IMPORTANT"].map(f => <Pill key={f} c={f === "ALL" ? C.accent : URGENCY[f].color} active={filter === f} onClick={() => setFilter(f)}>{f === "ALL" ? "All" : f}</Pill>)}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setShowComplete(!showComplete)} style={{ fontSize: 10, padding: "3px 10px", background: showComplete ? `${C.green}18` : "transparent", border: `1px solid ${showComplete ? C.green + "40" : C.border}`, color: showComplete ? C.green : C.textMuted, borderRadius: 6, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            {showComplete ? "Hide" : "Show"} Done ({stgCounts.complete})
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT LIST */}
        <div style={{ width: 380, borderRight: `1px solid ${C.border}`, overflowY: "auto", flexShrink: 0, background: C.bg }}>
          {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: C.textMuted, fontSize: 12 }}>No items match filters</div>}
          {filtered.map((e, i) => {
            const eu = URGENCY[e.label] || URGENCY.NOTABLE;
            const isSel = sel?.id === e.id;
            const stg = STAGES.find(s => s.id === e.stage);
            const dayLabel = daysAgo(e.date);
            const prevDate = i > 0 ? filtered[i - 1].date : null;
            const showDateSep = i === 0 || (e.stage !== "complete" && filtered[i-1]?.stage !== "complete" && e.date !== prevDate);
            return (
              <div key={e.id}>
                {showDateSep && (
                  <div style={{ padding: "6px 16px", fontSize: 10, fontWeight: 600, color: e.date === TODAY ? C.accent : C.orange, background: e.date === TODAY ? `${C.accent}08` : `${C.orange}08`, borderBottom: `1px solid ${C.border}`, letterSpacing: ".5px", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
                    <span>{dayLabel === "Today" ? "Today — New" : `${dayLabel} — Still Active`}</span>
                    {dayLabel !== "Today" && <span style={{ fontWeight: 400, opacity: 0.6 }}>Needs action</span>}
                  </div>
                )}
                {e.stage === "complete" && i > 0 && filtered[i-1]?.stage !== "complete" && (
                  <div style={{ padding: "6px 16px", fontSize: 10, fontWeight: 600, color: C.green, background: `${C.green}08`, borderBottom: `1px solid ${C.border}`, letterSpacing: ".5px", textTransform: "uppercase" }}>Completed</div>
                )}
                <div onClick={() => setSelId(e.id)} style={{
                  padding: "12px 16px", borderBottom: `1px solid ${C.border}08`, borderLeft: `3px solid ${isSel ? eu.color : "transparent"}`,
                  background: isSel ? C.surface : e.stage === "complete" ? `${C.bg}80` : "transparent",
                  cursor: "pointer", transition: "all .1s", opacity: e.stage === "complete" ? 0.5 : 1,
                  animation: `slideR .2s ease ${i * .02}s both`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isSel ? C.text : C.textDim, maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.from?.split("—")[0]?.trim()}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {!e.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />}
                      {e.date !== TODAY && e.stage !== "complete" && <span style={{ fontSize: 8, color: C.orange, background: `${C.orange}18`, padding: "0 4px", borderRadius: 3, fontFamily: "'JetBrains Mono',monospace" }}>CARRY</span>}
                      {e.aiReviewed && <span style={{ fontSize: 8, color: C.purple, background: `${C.purple}18`, padding: "0 4px", borderRadius: 3, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>AI</span>}
                      {e.hasAttachment && <span style={{ fontSize: 8, color: C.teal, background: `${C.teal}18`, padding: "0 4px", borderRadius: 3, fontFamily: "'JetBrains Mono',monospace" }}>ATT</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#fff", background: eu.color, padding: "1px 6px", borderRadius: 4 }}>{e.score}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{e.subject}</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: eu.color, background: eu.bg, border: `1px solid ${eu.border}`, padding: "0 5px", borderRadius: 4, fontWeight: 600 }}>{e.label}</span>
                    {stg && <span style={{ fontSize: 9, color: stg.color, padding: "0 5px" }}>{stg.icon} {stg.label}</span>}
                    <span style={{ fontSize: 9, color: C.textMuted, marginLeft: "auto" }}>{e.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT DETAIL */}
        <div style={{ flex: 1, overflowY: "auto", background: C.surface }}>
          {sel ? (() => {
            const dayLabel = daysAgo(sel.date);
            return (
              <div style={{ padding: 20, animation: "fadeIn .2s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: u.bg, border: `2px solid ${u.color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: u.color }}>{sel.score}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{sel.from}</div>
                    <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{sel.email} — {dayLabel}</div>
                  </div>
                  {sel.link && <a href={sel.link} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", background: C.accent, color: "#fff", borderRadius: 6, fontSize: 10, fontWeight: 600, textDecoration: "none" }}>Open in Outlook &#x2197;</a>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{sel.subject}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: u.bg, border: `1px solid ${u.border}`, color: u.color, fontWeight: 600 }}>{sel.label}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: C.surface2, border: `1px solid ${C.border}`, color: C.textDim }}>{PATTERNS[sel.pattern]}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: C.surface2, border: `1px solid ${C.border}`, color: C.textDim }}>{sel.tier}</span>
                  {sel.hasAttachment && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${C.teal}15`, color: C.teal }}>Attachment</span>}
                  {sel.aiReviewed && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${C.purple}15`, color: C.purple }}>AI Reviewed</span>}
                  {sel.date !== TODAY && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${C.orange}15`, color: C.orange }}>Carry-over from {dayLabel}</span>}
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                  {sel.reasons.map((r, i) => <span key={i} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.surface2, color: C.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{r}</span>)}
                </div>
                <div style={{ marginBottom: 14, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginRight: 4 }}>MOVE TO:</span>
                  {STAGES.map(s => (
                    <button key={s.id} onClick={() => update(sel.id, "stage", s.id)} style={{
                      padding: "4px 10px", background: sel.stage === s.id ? `${s.color}18` : "transparent",
                      border: `1px solid ${sel.stage === s.id ? s.color + "50" : C.border}`, color: sel.stage === s.id ? s.color : C.textMuted,
                      borderRadius: 6, fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                    }}>{s.icon} {s.label}</button>
                  ))}
                </div>
                {sel.quip && <div style={{ padding: "10px 12px", marginBottom: 12, background: `${C.accent}08`, borderLeft: `3px solid ${C.accent}40`, borderRadius: "0 8px 8px 0", fontSize: 12, color: C.accent, fontStyle: "italic" }}>"{sel.quip}"</div>}
                {sel.jarvis && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.accent, letterSpacing: ".5px", marginBottom: 4, textTransform: "uppercase" }}>Jarvis Briefing</div>
                    <div style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, fontSize: 12, color: C.textDim, lineHeight: 1.6, border: `1px solid ${C.border}` }}>{sel.jarvis}</div>
                  </div>
                )}
                {sel.action && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: u.color, letterSpacing: ".5px", marginBottom: 4, textTransform: "uppercase" }}>Recommended Action</div>
                    <div style={{ padding: "10px 12px", background: u.bg, borderRadius: 8, fontSize: 12, color: u.color, lineHeight: 1.6, border: `1px solid ${u.border}`, fontWeight: 500 }}>{sel.action}</div>
                  </div>
                )}
                {sel.reply && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: ".5px", marginBottom: 4, textTransform: "uppercase" }}>Draft Reply</div>
                    <div style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: C.textDim, lineHeight: 1.7, border: `1px solid ${C.border}`, whiteSpace: "pre-wrap" }}>{sel.reply}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button onClick={() => navigator.clipboard?.writeText(sel.reply)} style={{ padding: "5px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.accent, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Copy as Dave</button>
                      <button onClick={() => navigator.clipboard?.writeText(`Hi ${sel.from?.split("—")[0]?.split(" ")[0]?.trim()},\n\nDave asked me to follow up.\n\n${sel.reply.split("\n").slice(1).join("\n")}\n\nBest regards,\nFrance\nExecutive Assistant to Dave Misra`)} style={{ padding: "5px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.orange, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Copy as France</button>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  {[
                    { l: "\u2192 France", fn: () => update(sel.id, "stage", "france") },
                    { l: "\u2192 External", fn: () => update(sel.id, "stage", "external") },
                    { l: "\u2192 Dave", fn: () => update(sel.id, "stage", "dave") },
                    { l: "\u2192 Scheduled", fn: () => update(sel.id, "stage", "scheduled") },
                    { l: "\u2713 Done", fn: () => update(sel.id, "stage", "complete") },
                  ].map(a => (
                    <button key={a.l} onClick={a.fn} style={{ padding: "5px 12px", background: a.l.includes("Done") ? `${C.green}18` : C.surface2, border: `1px solid ${a.l.includes("Done") ? C.green + "40" : C.border}`, color: a.l.includes("Done") ? C.green : C.textDim, borderRadius: 6, fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>{a.l}</button>
                  ))}
                </div>
              </div>
            );
          })() : <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Select an email</div>}
        </div>
      </div>
    </div>
  );
}

function Pill({ c, active, onClick, n, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "3px 10px", fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans',sans-serif",
      background: active ? `${c}18` : "transparent", border: `1px solid ${active ? c + "40" : C.border}`,
      color: active ? c : C.textMuted, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
    }}>
      {children}
      {n !== undefined && <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", opacity: 0.7 }}>{n}</span>}
    </button>
  );
}
