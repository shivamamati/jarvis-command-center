"""
J.A.R.V.I.S. v8.1 — Email Triage Engine (Production-Hardened)

Two-layer architecture + 7 signal boosters + 8 reliability fixes

SIGNAL BOOSTERS:
  1. Dave-replied auto-boost (+3/+4)
  2. CC/Recipient VIP analysis (+2)
  3. Thread depth detection (+2/+4)
  4. Attachment + deal keyword (+1/+2)
  5. Outlook importance flag (+2)
  6. Urgency language detection (+1)
  7. Auto-learning contacts from sent items

RELIABILITY FIXES:
  R1. Auto token refresh (re-auth before expiry)
  R2. Retry with exponential backoff on API failures
  R3. AI fallback default (surface email if AI fails)
  R4. Deduplication (skip already-processed emails)
  R5. Health monitoring (alert if scans fail)
  R6. Process supervisor (auto-restart on crash)
  R7. File logging (persistent debug trail)
  R8. Incremental writes (no lost work on crash)

Usage:
  python jarvis_scan.py                    # Scan last 24 hours
  python jarvis_scan.py --hours 48         # Scan last 48 hours
  python jarvis_scan.py --teams            # Post results to Teams
  python jarvis_scan.py --continuous 60    # Run every 60 minutes
"""
import os, sys, json, re, time, argparse, logging, traceback
from datetime import datetime, timedelta, timezone
from collections import Counter
from pathlib import Path

try:
    import requests
except ImportError:
    print("pip install requests"); sys.exit(1)

# ═══════════════════════════════════════════════════════════════
# R7: FILE LOGGING — Persistent debug trail
# ═══════════════════════════════════════════════════════════════
SCRIPT_DIR = Path(__file__).parent.resolve()
LOG_FILE = SCRIPT_DIR / "jarvis.log"
RESULTS_FILE = SCRIPT_DIR / "jarvis_results.json"
PARTIAL_FILE = SCRIPT_DIR / "jarvis_results_partial.json"
SEEN_FILE = SCRIPT_DIR / "jarvis_seen.json"
HEALTH_FILE = SCRIPT_DIR / "jarvis_health.json"

log = logging.getLogger("jarvis")
log.setLevel(logging.INFO)
fmt = logging.Formatter("%(asctime)s [JARVIS] %(message)s", datefmt="%H:%M:%S")
# Console handler
ch = logging.StreamHandler()
ch.setFormatter(fmt)
log.addHandler(ch)
# File handler (R7)
fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
log.addHandler(fh)

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════
MS_GRAPH_CLIENT_ID = os.environ.get("MS_GRAPH_CLIENT_ID", "")
MS_GRAPH_CLIENT_SECRET = os.environ.get("MS_GRAPH_CLIENT_SECRET", "")
MS_GRAPH_TENANT_ID = os.environ.get("MS_GRAPH_TENANT_ID", "")
DAVE_EMAIL = os.environ.get("DAVE_EMAIL", "dave@galaxydatacenters.com")
DAVE_EMAILS = {"dave@galaxydatacenters.com","dave@galaxycapitalpartners.com","dave.misra@galaxydatacenters.com"}
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
TEAMS_WEBHOOK_URL = os.environ.get("TEAMS_WEBHOOK_URL", "")

# ═══════════════════════════════════════════════════════════════
# CONTACT DATABASE
# ═══════════════════════════════════════════════════════════════
TIER1_DOMAINS = {"travelers.com","virginmedia.com","virginmediao2.co.uk","cdw.com","uk.cdw.com","arm.com","nomura.com","navisite.com","castleforge.com","pwc.com","smbcgroup.com","gb.smbcgroup.com","tcs.com","colt.net","lumen.com","zayo.com","cogentco.com","fluidone.com","netprotocol.net","ids-indata.co.uk","sas.co.uk","telent.com","transitnetworks.co.uk","bt.com","openreach.co.uk","cloud2me.co.uk","ntrustsystems.co.uk","redhilldatacentre.com","digitalrealty.com","accenture.com"}
TIER2_DOMAINS = {"abb.com","drt.co.uk","techreconsulting.com","qudatacentres.com","stakater.com","polanddc.pl","assago.com","innogate.at","astracapitalmgmt.com","malhangroup.com","adaptive-mdc.com","solarisstrategiesinc.com","bcsconsultancy.com","gotcolo.com","demandfactor.com","directglobal.com","2020-4.com","evermere.com"}
VIP_FIRMS = {"jsa.net","simmons-simmons.com","cbre.com","savills.com","jll.com","knightfrank.com","cushmanwakefield.com","datacenternation.com","baxtel.com"}
INTERNAL_DOMAINS = {"galaxydatacenters.com","galaxycapitalpartners.com","redhilldatacentre.com"}
INTERNAL_VIP_EMAILS = {"tj@galaxydatacenters.com","paul@galaxydatacenters.com","paul@galaxycapitalpartners.com","ash@galaxydatacenters.com","ash@galaxycapitalpartners.com","ashley@galaxydatacenters.com","france@galaxydatacenters.com","rodrigo@galaxydatacenters.com","sai@galaxydatacenters.com","colin.bell@galaxydatacenters.com","animesh@galaxydatacenters.com"}
REDHILL_OPS = {"colin.bell@redhilldatacentre.com","paul.tester@redhilldatacentre.com","luke.gray@redhilldatacentre.com","benjamin.tyson@redhilldatacentre.com","finance@redhilldatacentre.com"}
ALL_VIP_EMAILS = INTERNAL_VIP_EMAILS | REDHILL_OPS | DAVE_EMAILS
PIPELINE_NAMES = ["richard lukaj","tj ciccone","john ghirardelli","nigel bayliff","ivo ivanov","ben edmond","diego teot","aidan walker","peter almond","sarah kurtz","matthew ahearn","drew barrett","jade batstone","rishi malhan","victoria skrbensky","paolo lupini","venu gudipati","fiona leon","osie ukwuoma","marcus bartolini","john hall","candace sipos","barry gross","tom babbington","colette cooper","mark vecchiarelli","paul cranfield","tony rossiter","mitch lenzi","dean skinner","phil pearson","michael kim","paul evans","tushar gupta","abdul aziz","arthur rembes","shivam amati"]
KEYWORDS = ["nda","proposal","site visit","rfp","mw ","kw ","rack","investment","capital","introducer","commission","lease","loi","refinancing","board","fund","substation","power","capacity","contract","renewal","tenant","gpu","data cent","merger","bills","billing","audit","data room","teaser","stuttgart","austria","vienna","fortum","referral","introduce","introduction","connect you with","lp ","limited partner","capital raise","fundrais","fund formation"]
URGENCY_LANGUAGE = ["asap","urgent","time sensitive","time-sensitive","deadline","by end of day","by eod","by cob","immediately","critical","as soon as possible","needs immediate","action required","please respond","awaiting your","overdue","past due","expiring","expires today","expires tomorrow","last chance","final notice"]
NOISE_SENDERS = ["noreply","no-reply","no_reply","notifications@","newsletter","marketing@","team@use.mail","editors-noreply","quarantine@messaging","sparkpost","@ccsend.com","@mcdlv.net","@beehiiv.com","substack.com","connect.media","mail.monday.com","learn.mail.monday.com","mail.granola","datacenterdynamics.com","alpha-sense.com","crystalknows.com","armanino.com","linkedin.com","facebookmail.com","twitter.com","calendly.com","fireflies.ai","minuteslink.com","hubspot.com","hubspotemail.net","mailchimp","sendgrid.net","bmwtoronto.ca","owasco.com","telus.com","clearscore.com","borrowell.com","h5.hilton.com","agoda-emails.com","riipen.com","lyftmail.com","saltlending.com","link.com","eventbrite.com","sharepointonline.com","dcsmi.com","colossusdc.com","thegpu.ai","mail.raises.com","salute.com","kiwi.com","nordpass.com","law360.com","privateequitybro.com","news.vntr.vc","iddidesign.com","td.com","aircanada.com","mail.aircanada.com","amazon.com","aws-marketing","@144772270.mailchimpapp.com","newsroomreplies@","weekender@","weekendbriefing@","opening-bell@","estate-elegance@","teamphlote@","oldmennewmoney@","advalorem@"]
NOISE_SUBJECTS = ["accepted:","declined:","tentative:","canceled:","your teams meeting recording","messages in quarantine","build your first","free trial","earn a free night","verify a new device","security information has been updated","new login from","your ride with","merci d'avoir","your trial ends","complete your","reminder: complete","take off for less","don't wait","every second counts","weekly round-up","weekend briefing","flight prices","pack your bags","upgrade to premium","last chance:","featured project","voting is now open","tell us more about","this stock is up","programming era","grid fragility","just killed","just requested to connect","posted new notes","smoother pickups","100+ ai use cases","see you next week at","your microsoft invoice"]
SUPPRESSED_SENDERS = ["jay schiesser","henry mileham","tess lindsay","ben palmer","william dyer"]
CUSTOMER_NAMES = ["travelers","nomura","fluidone","cdw","arm ","smbc","colt","lumen","zayo","cogent","virgin media","tcs","cloud2me","ntrust","accenture","navisite","redhill"]

def extract_domain(email):
    if not email or "@" not in email: return ""
    return email.split("@")[-1].lower().strip()

def is_known_domain(domain):
    return domain in TIER1_DOMAINS or domain in TIER2_DOMAINS or domain in VIP_FIRMS or domain in INTERNAL_DOMAINS

DEAL_RESCUE_KEYWORDS = ["nda","mnda","proposal","loi","letter of intent","term sheet","contract","agreement","investment","capital raise","site visit","rfp","lease","renewal","board","fund","investor","partnership","acquisition","due diligence","data room","teaser","equity","private equity","real estate","fundrais","resume","executive"]

def is_noise(se, sn, subj):
    se, sn, subj = se.lower(), sn.lower(), subj.lower()
    for s in SUPPRESSED_SENDERS:
        if all(p in sn for p in s.split()): return True
    # Check if subject contains deal-critical keywords — never filter these
    body_text = f"{subj} {sn}"
    for dk in DEAL_RESCUE_KEYWORDS:
        if dk in body_text: return False
    for ns in NOISE_SENDERS:
        if ns in se: return True
    for ns in NOISE_SUBJECTS:
        if ns in subj: return True
    return False

# ═══════════════════════════════════════════════════════════════
# R1: AUTO TOKEN REFRESH — Re-auth before expiry
# ═══════════════════════════════════════════════════════════════
class TokenManager:
    """Manages Graph API tokens with automatic refresh before expiry."""
    def __init__(self):
        self.token = None
        self.obtained_at = None
        self.expires_in = 3600  # default 1 hour

    def get_token(self):
        """Return a valid token, refreshing if expired or about to expire."""
        now = time.time()
        # Refresh if no token, or within 5 minutes of expiry
        if self.token is None or (now - self.obtained_at) > (self.expires_in - 300):
            self._refresh()
        return self.token

    def _refresh(self):
        if not all([MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID]):
            raise RuntimeError("Missing Graph API credentials")
        url = f"https://login.microsoftonline.com/{MS_GRAPH_TENANT_ID}/oauth2/v2.0/token"
        r = api_request_with_retry("POST", url, data={
            "grant_type": "client_credentials",
            "client_id": MS_GRAPH_CLIENT_ID,
            "client_secret": MS_GRAPH_CLIENT_SECRET,
            "scope": "https://graph.microsoft.com/.default",
        })
        self.token = r.json()["access_token"]
        self.expires_in = r.json().get("expires_in", 3600)
        self.obtained_at = time.time()
        log.info(f"  Token refreshed (expires in {self.expires_in}s)")

token_mgr = TokenManager()

# ═══════════════════════════════════════════════════════════════
# R2: RETRY WITH EXPONENTIAL BACKOFF
# ═══════════════════════════════════════════════════════════════
def api_request_with_retry(method, url, max_retries=3, **kwargs):
    """Make an HTTP request with automatic retry on failure."""
    kwargs.setdefault("timeout", 30)
    for attempt in range(max_retries + 1):
        try:
            r = requests.request(method, url, **kwargs)
            if r.status_code == 429:  # Rate limited
                wait = int(r.headers.get("Retry-After", 30))
                log.warning(f"  Rate limited. Waiting {wait}s (attempt {attempt+1}/{max_retries+1})")
                time.sleep(wait)
                continue
            if r.status_code == 401 and attempt < max_retries:
                log.warning("  Token expired mid-scan. Refreshing...")
                token_mgr.token = None  # Force refresh
                if "headers" in kwargs and "Authorization" in kwargs["headers"]:
                    kwargs["headers"]["Authorization"] = f"Bearer {token_mgr.get_token()}"
                continue
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as e:
            if attempt < max_retries:
                wait = 2 ** attempt * 5  # 5s, 10s, 20s
                log.warning(f"  Request failed: {e}. Retry in {wait}s ({attempt+1}/{max_retries+1})")
                time.sleep(wait)
            else:
                log.error(f"  Request failed after {max_retries+1} attempts: {e}")
                raise

# ═══════════════════════════════════════════════════════════════
# R4: DEDUPLICATION — Skip already-processed emails
# ═══════════════════════════════════════════════════════════════
def load_seen_ids():
    """Load set of already-processed email IDs."""
    try:
        if SEEN_FILE.exists():
            data = json.loads(SEEN_FILE.read_text())
            # Keep only last 7 days of IDs to prevent file growing forever
            cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            return {k: v for k, v in data.items() if v > cutoff}
    except Exception:
        pass
    return {}

def save_seen_ids(seen):
    """Save processed email IDs."""
    try:
        SEEN_FILE.write_text(json.dumps(seen, indent=2))
    except Exception as e:
        log.warning(f"  Failed to save seen IDs: {e}")

# ═══════════════════════════════════════════════════════════════
# R5: HEALTH MONITORING — Alert if scans fail
# ═══════════════════════════════════════════════════════════════
def update_health(status, scanned=0, actionable=0, error=None):
    """Track scan health for monitoring."""
    health = {
        "last_scan": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "scanned": scanned,
        "actionable": actionable,
        "error": str(error) if error else None,
        "consecutive_failures": 0,
    }
    # Track consecutive failures
    try:
        if HEALTH_FILE.exists():
            prev = json.loads(HEALTH_FILE.read_text())
            if status == "error":
                health["consecutive_failures"] = prev.get("consecutive_failures", 0) + 1
    except Exception:
        pass
    try:
        HEALTH_FILE.write_text(json.dumps(health, indent=2))
    except Exception:
        pass
    # Alert if 2+ consecutive failures
    if health["consecutive_failures"] >= 2 and TEAMS_WEBHOOK_URL:
        try:
            requests.post(TEAMS_WEBHOOK_URL, json={
                "text": f"⚠️ **JARVIS ALERT** — {health['consecutive_failures']} consecutive scan failures.\nLast error: {health.get('error', 'unknown')}\nCheck jarvis.log for details."
            }, timeout=10)
        except Exception:
            pass
    return health

# ═══════════════════════════════════════════════════════════════
# R8: INCREMENTAL WRITES — No lost work on crash
# ═══════════════════════════════════════════════════════════════
def save_partial_result(result):
    """Append a single result to the partial file immediately after classification."""
    try:
        existing = []
        if PARTIAL_FILE.exists():
            existing = json.loads(PARTIAL_FILE.read_text())
        existing.append(result)
        PARTIAL_FILE.write_text(json.dumps(existing, indent=2))
    except Exception:
        pass

def finalize_results(results, metadata):
    """Move partial results to final file on successful completion."""
    try:
        output = {**metadata, "items": results}
        RESULTS_FILE.write_text(json.dumps(output, indent=2))
        # Clean up partial file
        if PARTIAL_FILE.exists():
            PARTIAL_FILE.unlink()
    except Exception as e:
        log.error(f"  Failed to write results: {e}")

# ═══════════════════════════════════════════════════════════════
# SIGNAL BOOSTERS #1 & #7: Dave-Replied + Auto-Learning
# ═══════════════════════════════════════════════════════════════
def get_dave_sent_contacts(days=7):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    token = token_mgr.get_token()
    url = f"https://graph.microsoft.com/v1.0/users/{DAVE_EMAIL}/messages"
    contacts = Counter()
    try:
        r = api_request_with_retry("GET", url,
            headers={"Authorization": f"Bearer {token}"},
            params={"$filter": f"sentDateTime ge {since} and from/emailAddress/address eq '{DAVE_EMAIL}'",
                    "$top": 200, "$select": "toRecipients,ccRecipients", "$orderby": "sentDateTime desc"})
        for msg in r.json().get("value", []):
            for recip in msg.get("toRecipients", []) + msg.get("ccRecipients", []):
                addr = recip.get("emailAddress", {}).get("address", "").lower()
                if addr and addr not in DAVE_EMAILS: contacts[addr] += 1
        log.info(f"  Dave replied to {len(contacts)} people (last {days}d)")
    except Exception as e:
        log.warning(f"  Sent items fetch failed: {e}")
    return contacts

# SIGNAL BOOSTER #3: Thread Depth
def build_conversation_map(emails):
    convos = {}
    for e in emails:
        cid = e.get("conversationId", "")
        if not cid: continue
        if cid not in convos: convos[cid] = {"count": 0, "has_dave": False}
        convos[cid]["count"] += 1
        sender = e.get("from", {}).get("emailAddress", {}).get("address", "").lower()
        if sender in DAVE_EMAILS: convos[cid]["has_dave"] = True
    return convos

# ═══════════════════════════════════════════════════════════════
# CLASSIFICATION ENGINE (all 7 boosters)
# ═══════════════════════════════════════════════════════════════
def classify_email(email_data, cal_contacts=None, dave_replied=None, convo_map=None):
    cal_contacts = cal_contacts or set()
    dave_replied = dave_replied or Counter()
    convo_map = convo_map or {}

    sender = email_data.get("from", {}).get("emailAddress", {})
    se = sender.get("address", "").lower().strip()
    sn = sender.get("name", "").lower().strip()
    domain = extract_domain(se)
    subject = email_data.get("subject", "")
    body = email_data.get("bodyPreview", "")
    combined = f"{subject} {body}".lower()
    reasons = []
    score = 3; tier = "UNKNOWN"; label = "NOTABLE"

    # Calendar boost
    if se in cal_contacts: score += 2; reasons.append("Calendar match (+2)")

    # #1: Dave replied
    drc = dave_replied.get(se, 0)
    if drc >= 2: score += 4; reasons.append(f"Dave replied {drc}x (+4)")
    elif drc == 1: score += 3; reasons.append("Dave replied (+3)")

    # #5: Importance flag
    if email_data.get("importance", "").lower() == "high":
        score += 2; reasons.append("HIGH importance (+2)")

    # #4: Attachments
    has_att = email_data.get("hasAttachments", False)
    if has_att:
        att_kw = ["nda","proposal","contract","agreement","lease","loi","quote"]
        if any(k in combined for k in att_kw): score += 2; reasons.append("Attachments + deal KW (+2)")
        elif is_known_domain(domain) or se in INTERNAL_VIP_EMAILS: score += 1; reasons.append("Attachments from known (+1)")

    # Tier classification
    if se in REDHILL_OPS: score = max(score, 7); tier = "REDHILL OPS"; label = "URGENT"; reasons.append("Redhill ops")
    elif se in INTERNAL_VIP_EMAILS:
        score = max(score, 6); tier = "INTERNAL VIP"; label = "IMPORTANT"; reasons.append("Internal VIP")
        for cn in CUSTOMER_NAMES:
            if cn in combined: score = max(score, 7); label = "URGENT"; reasons.append(f"Re customer: {cn}"); break
    elif domain in TIER1_DOMAINS: score = max(score, 7); tier = "TIER 1"; label = "URGENT"; reasons.append(f"Tier 1: {domain}")
    elif domain in TIER2_DOMAINS: score = max(score, 6); tier = "TIER 2"; label = "IMPORTANT"; reasons.append(f"Tier 2: {domain}")
    elif domain in VIP_FIRMS: score = max(score, 6); tier = "VIP FIRM"; label = "IMPORTANT"; reasons.append(f"VIP: {domain}")
    elif domain in INTERNAL_DOMAINS:
        score = max(score, 4); tier = "INTERNAL"; label = "NOTABLE"; reasons.append("Internal")
        for cn in CUSTOMER_NAMES:
            if cn in combined: score = max(score, 6); label = "IMPORTANT"; reasons.append(f"Re customer: {cn}"); break

    # Pipeline name
    for pn in PIPELINE_NAMES:
        parts = pn.split()
        if len(parts) >= 2 and parts[0] in sn and parts[1] in sn:
            score = max(score, 7); tier = f"PIPELINE [{pn.title()}]"; label = "URGENT"; reasons.append(f"Pipeline: {pn}"); break

    # Keywords
    kw_hits = [k.strip() for k in KEYWORDS if k in combined]
    if kw_hits: score = max(score, 6); reasons.append(f"KW: {', '.join(kw_hits[:3])}")

    # #6: Urgency language
    urg = [u for u in URGENCY_LANGUAGE if u in combined]
    if urg: score += 1; reasons.append(f"Urgency: {urg[0]} (+1)")

    # High-value signals
    mw = re.search(r"(\d+)\s*mw", combined, re.I)
    if mw and int(mw.group(1)) >= 10: score = max(score, 9); label = "CRITICAL"; reasons.append(f"High MW: {mw.group(0)}")
    if re.search(r"(lease|renewal|contract).*(travelers|nomura|smbc|cdw|accenture)", combined, re.I):
        score = max(score, 9); label = "CRITICAL"; reasons.append("Lease + customer")
    if re.search(r"(substation|power|capacity).*(redhill)", combined, re.I):
        score = max(score, 8); label = "URGENT"; reasons.append("Redhill power")
    if re.search(r"(introducer|commission|broker)", combined, re.I):
        score = max(score, 7); reasons.append("Broker signal")

    # #2: CC/Recipient VIP analysis
    all_recip = email_data.get("toRecipients", []) + email_data.get("ccRecipients", [])
    vip_count = 0; has_ext = False; has_int = False
    for recip in all_recip:
        addr = recip.get("emailAddress", {}).get("address", "").lower()
        rd = extract_domain(addr)
        if addr in ALL_VIP_EMAILS: vip_count += 1; has_int = True
        if rd in TIER1_DOMAINS or rd in TIER2_DOMAINS: has_ext = True; vip_count += 1
    if vip_count >= 3: score += 2; reasons.append(f"{vip_count} VIPs on thread (+2)")
    elif has_int and has_ext: score += 1; reasons.append("Internal + customer (+1)")

    # #3: Thread depth
    cid = email_data.get("conversationId", "")
    convo = convo_map.get(cid)
    if convo:
        if convo["count"] >= 3: score += 2; reasons.append(f"Thread: {convo['count']} msgs (+2)")
        if convo["has_dave"]: score += 2; reasons.append("Dave in thread (+2)")

    # Final label
    score = min(10, score)
    if score >= 9: label = "CRITICAL"
    elif score >= 7: label = "URGENT"
    elif score >= 5: label = "IMPORTANT"
    elif score >= 4: label = "NOTABLE"

    return {"score": score, "label": label, "tier": tier, "reasons": reasons,
            "cal_match": se in cal_contacts, "has_attachments": has_att,
            "needs_ai_review": score < 5 and tier == "UNKNOWN" and drc == 0}

# ═══════════════════════════════════════════════════════════════
# LAYER 2: CLAUDE AI (with R3 fallback)
# ═══════════════════════════════════════════════════════════════
JARVIS_PROMPT = """You are JARVIS, AI email triage for Dave Misra (Galaxy Data Centers, Redhill DC UK).
Classify unknown-sender emails. Return ONLY JSON:
{"score":<1-10>,"label":"<CRITICAL|URGENT|IMPORTANT|NOTABLE|NOISE>","pattern":"<A-J or N>","summary":"<1-2 sentences>","action":"<next step>","contact_type":"<type>","reasoning":"<why>"}
9-10=act today, 7-8=24-48hr, 5-6=this week, 3-4=monitor, 1-2=noise.
Score HIGHER when in doubt — missing important email is worse than false positive."""

def ai_classify(se, sn, subj, body):
    """R3: If AI fails, return a safe default instead of None (never silently drop)."""
    if not ANTHROPIC_API_KEY:
        return {"score": 4, "label": "NOTABLE", "summary": "AI unavailable — no API key", "action": "Manual review needed"}
    try:
        r = api_request_with_retry("POST", "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
            json={"model": "claude-haiku-4-5-20251001", "max_tokens": 500, "system": JARVIS_PROMPT,
                  "messages": [{"role": "user", "content": f"From: {sn} <{se}>\nSubject: {subj}\nBody: {body[:500]}\n\nJSON only:"}]})
        text = "".join(b.get("text", "") for b in r.json()["content"] if b["type"] == "text")
        return json.loads(text.strip().replace("```json", "").replace("```", "").strip())
    except Exception as e:
        log.error(f"  AI failed: {e}")
        # R3: NEVER silently drop — surface as NOTABLE for manual review
        return {"score": 4, "label": "NOTABLE", "summary": f"AI unavailable — {str(e)[:50]}", "action": "Manual review needed", "ai_failed": True}

# ═══════════════════════════════════════════════════════════════
# GRAPH API (uses TokenManager + retry)
# ═══════════════════════════════════════════════════════════════
def get_emails(hours=24):
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
    token = token_mgr.get_token()
    try:
        r = api_request_with_retry("GET", f"https://graph.microsoft.com/v1.0/users/{DAVE_EMAIL}/messages",
            headers={"Authorization": f"Bearer {token}"},
            params={"$filter": f"receivedDateTime ge {since}", "$top": 100,
                    "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,webLink,importance,isRead,hasAttachments,conversationId",
                    "$orderby": "receivedDateTime desc"})
        return r.json().get("value", [])
    except Exception as e:
        log.error(f"  Email fetch failed: {e}"); return []

def get_calendar_contacts():
    now = datetime.now(timezone.utc)
    token = token_mgr.get_token()
    try:
        r = api_request_with_retry("GET", f"https://graph.microsoft.com/v1.0/users/{DAVE_EMAIL}/calendarView",
            headers={"Authorization": f"Bearer {token}", "Prefer": 'outlook.timezone="UTC"'},
            params={"startDateTime": now.strftime("%Y-%m-%dT00:00:00Z"),
                    "endDateTime": (now + timedelta(days=7)).strftime("%Y-%m-%dT23:59:59Z"),
                    "$top": 100, "$select": "attendees"})
        return {att.get("emailAddress",{}).get("address","").lower()
                for ev in r.json().get("value",[]) for att in ev.get("attendees",[])
                if att.get("emailAddress",{}).get("address","")}
    except Exception as e:
        log.warning(f"  Calendar failed: {e}"); return set()

# ═══════════════════════════════════════════════════════════════
# TEAMS NOTIFICATION — Rich Adaptive Card with Outlook links
# ═══════════════════════════════════════════════════════════════
def format_time_ampm(iso_str):
    """Convert ISO datetime to 'Mar 16, 2:15 PM' format."""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %-I:%M %p")
    except Exception:
        return iso_str[:16] if iso_str else ""

def build_email_row(r):
    """Build an Adaptive Card row for a single email."""
    icons = {"CRITICAL": "🔴", "URGENT": "🟠", "IMPORTANT": "🟡", "NOTABLE": "🔵"}
    icon = icons.get(r["final_label"], "⚪")
    time_str = format_time_ampm(r.get("received", ""))
    ai_tag = " 🤖" if r.get("ai_reviewed") else ""
    att_tag = " 📎" if r.get("has_attachments") else ""

    row = {
        "type": "Container",
        "spacing": "Small",
        "items": [
            {
                "type": "ColumnSet",
                "columns": [
                    {"type": "Column", "width": "auto", "items": [
                        {"type": "TextBlock", "text": f"{icon} **[{r['final_score']}]**", "size": "Default", "weight": "Bolder"}
                    ]},
                    {"type": "Column", "width": "stretch", "items": [
                        {"type": "TextBlock", "text": f"**{r['sender_name']}**{ai_tag}{att_tag}", "size": "Default", "wrap": True},
                        {"type": "TextBlock", "text": r["subject"][:65], "size": "Small", "color": "Default", "isSubtle": True, "wrap": True, "spacing": "None"},
                    ]},
                    {"type": "Column", "width": "auto", "items": [
                        {"type": "TextBlock", "text": time_str, "size": "Small", "isSubtle": True, "horizontalAlignment": "Right"}
                    ]},
                ],
            },
        ],
    }

    # Add AI briefing if available
    if r.get("ai_summary"):
        row["items"].append({"type": "TextBlock", "text": f"🤖 _{r['ai_summary'][:100]}_", "size": "Small", "color": "Accent", "wrap": True, "spacing": "None"})

    # Add recommended action
    if r.get("action") and r["final_score"] >= 7:
        row["items"].append({"type": "TextBlock", "text": f"→ {r.get('action', '')[:100]}", "size": "Small", "color": "Warning", "wrap": True, "spacing": "None"})

    # Add "Open in Outlook" button for high-priority items
    if r.get("web_link") and r["final_score"] >= 7:
        row["items"].append({
            "type": "ActionSet",
            "actions": [{"type": "Action.OpenUrl", "title": "Open in Outlook ↗", "url": r["web_link"], "style": "positive"}],
        })

    return row

def post_to_teams(results, total, noise):
    """Send a rich Adaptive Card to Teams with full triage briefing."""
    if not TEAMS_WEBHOOK_URL: return

    crit = [r for r in results if r["final_label"] == "CRITICAL"]
    urg = [r for r in results if r["final_label"] == "URGENT"]
    imp = [r for r in results if r["final_label"] == "IMPORTANT"]
    ai_items = [r for r in results if r.get("ai_reviewed")]
    now = datetime.now(timezone.utc).strftime("%B %d, %Y %-I:%M %p UTC")

    # Build the Adaptive Card
    card_body = [
        # Header
        {"type": "TextBlock", "text": "J.A.R.V.I.S. v8.1 — Triage Briefing", "size": "Large", "weight": "Bolder", "color": "Accent"},
        {"type": "TextBlock", "text": now, "size": "Small", "isSubtle": True, "spacing": "None"},
        # Stats bar
        {"type": "ColumnSet", "spacing": "Medium", "columns": [
            {"type": "Column", "width": "1", "items": [{"type": "TextBlock", "text": f"**{total}** scanned", "size": "Small", "horizontalAlignment": "Center"}]},
            {"type": "Column", "width": "1", "items": [{"type": "TextBlock", "text": f"**{len(results)}** actionable", "size": "Small", "horizontalAlignment": "Center", "color": "Good"}]},
            {"type": "Column", "width": "1", "items": [{"type": "TextBlock", "text": f"**{noise}** noise", "size": "Small", "horizontalAlignment": "Center", "color": "Attention"}]},
            {"type": "Column", "width": "1", "items": [{"type": "TextBlock", "text": f"**{len(ai_items)}** AI reviewed", "size": "Small", "horizontalAlignment": "Center", "color": "Accent"}]},
        ]},
    ]

    # CRITICAL section
    if crit:
        card_body.append({"type": "TextBlock", "text": "🔴 CRITICAL — Act today", "size": "Medium", "weight": "Bolder", "color": "Attention", "spacing": "Large"})
        for r in crit:
            card_body.append(build_email_row(r))

    # URGENT section
    if urg:
        card_body.append({"type": "TextBlock", "text": "🟠 URGENT — 24-48 hours", "size": "Medium", "weight": "Bolder", "color": "Warning", "spacing": "Large"})
        for r in urg[:8]:
            card_body.append(build_email_row(r))

    # IMPORTANT section (condensed)
    if imp:
        card_body.append({"type": "TextBlock", "text": "🟡 IMPORTANT — This week", "size": "Medium", "weight": "Bolder", "spacing": "Large"})
        imp_lines = "\n".join([f"• [{r['final_score']}] **{r['sender_name']}** — {r['subject'][:55]}" for r in imp[:6]])
        card_body.append({"type": "TextBlock", "text": imp_lines, "size": "Small", "wrap": True})

    # Adaptive Card payload
    payload = {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "contentUrl": None,
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": card_body,
            }
        }]
    }

    try:
        r = requests.post(TEAMS_WEBHOOK_URL, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        r.raise_for_status()
        log.info("  ✅ Teams Adaptive Card sent")
    except Exception as e:
        log.warning(f"  Adaptive Card failed, falling back to plain text: {e}")
        # Fallback: plain text message
        try:
            lines = [f"🔴 **JARVIS v8.1** — {now}", f"📊 {total} scanned | {len(results)} actionable | {noise} noise", ""]
            if crit:
                lines.append("**CRITICAL**")
                for r in crit: lines.append(f"• [{r['final_score']}] {r['sender_name']} — {r['subject'][:55]}")
                lines.append("")
            if urg:
                lines.append("**URGENT**")
                for r in urg[:8]: lines.append(f"• [{r['final_score']}] {r['sender_name']} — {r['subject'][:55]}")
                lines.append("")
            if imp:
                lines.append("**IMPORTANT**")
                for r in imp[:5]: lines.append(f"• [{r['final_score']}] {r['sender_name']} — {r['subject'][:55]}")
            requests.post(TEAMS_WEBHOOK_URL, json={"text": "\n".join(lines)}, timeout=10)
            log.info("  ✅ Teams plain text sent (fallback)")
        except Exception as e2:
            log.error(f"  Teams failed completely: {e2}")

# ═══════════════════════════════════════════════════════════════
# MAIN SCAN (production-hardened)
# ═══════════════════════════════════════════════════════════════
def run_scan(hours=24, post_teams=False):
    log.info(f"═══ JARVIS v8.1 — Last {hours}h ═══")

    try:
        # Authenticate (R1: auto-refresh)
        token_mgr.get_token()
    except Exception as e:
        log.error(f"Auth failed: {e}")
        update_health("error", error=e)
        return []

    # Gather signals
    cal = get_calendar_contacts(); log.info(f"  Calendar: {len(cal)}")
    replied = get_dave_sent_contacts(7)
    emails = get_emails(hours); log.info(f"  Inbox: {len(emails)}")

    if not emails:
        log.info("  No emails found")
        update_health("ok", scanned=0)
        return []

    convos = build_conversation_map(emails); log.info(f"  Threads: {len(convos)}")
    log.info(f"  Auto-learned: {len(replied)} contacts")

    # R4: Load deduplication state
    seen = load_seen_ids()
    log.info(f"  Previously seen: {len(seen)} IDs")

    # R8: Clear partial file for this scan
    if PARTIAL_FILE.exists(): PARTIAL_FILE.unlink()

    results, noise_n, ai_n, skipped = [], 0, 0, 0

    for email in emails:
        eid = email.get("id", "")
        # R4: Skip already-processed emails
        if eid in seen:
            skipped += 1
            continue

        s = email.get("from", {}).get("emailAddress", {})
        se = s.get("address", "").lower()
        sn = s.get("name", "")
        subj = email.get("subject", "")
        body = email.get("bodyPreview", "")

        if is_noise(se, sn, subj):
            noise_n += 1
            seen[eid] = datetime.now(timezone.utc).isoformat()
            continue

        c = classify_email(email, cal, replied, convos)
        result = {
            "sender_email": se, "sender_name": sn, "subject": subj,
            "body_preview": body[:200],
            "received": email.get("receivedDateTime", ""),
            "web_link": email.get("webLink", ""),
            "is_read": email.get("isRead", False),
            "has_attachments": c["has_attachments"],
            "rules_score": c["score"], "rules_label": c["label"],
            "rules_tier": c["tier"], "rules_reasons": c["reasons"],
            "ai_reviewed": False, "ai_score": None, "ai_label": None,
            "ai_summary": None, "ai_action": None, "ai_failed": False,
            "final_score": c["score"], "final_label": c["label"],
        }

        # Layer 2: AI for unknowns (R3: safe fallback on failure)
        if c["needs_ai_review"]:
            log.info(f"  🤖 {sn} — {subj[:40]}")
            ai = ai_classify(se, sn, subj, body)
            ai_n += 1
            result["ai_reviewed"] = True
            result["ai_score"] = ai.get("score", 4)
            result["ai_label"] = ai.get("label", "NOTABLE")
            result["ai_summary"] = ai.get("summary", "")
            result["ai_action"] = ai.get("action", "")
            result["ai_failed"] = ai.get("ai_failed", False)
            result["final_score"] = max(c["score"], result["ai_score"])
            result["final_label"] = result["ai_label"] if result["ai_score"] > c["score"] else c["label"]

        if result["final_score"] >= 4:
            results.append(result)
            save_partial_result(result)  # R8: Write immediately

        # R4: Mark as processed
        seen[eid] = datetime.now(timezone.utc).isoformat()

    results.sort(key=lambda x: x["final_score"], reverse=True)

    # R4: Save deduplication state
    save_seen_ids(seen)

    # Output
    new_emails = len(emails) - skipped
    log.info(f"\n{'='*60}")
    log.info(f"Scan: {len(emails)} total | {skipped} already seen | {new_emails} new | {noise_n} noise | {len(results)} actionable | {ai_n} AI")
    log.info(f"{'='*60}\n")

    icons = {"CRITICAL": "🔴", "URGENT": "🟠", "IMPORTANT": "🟡", "NOTABLE": "🔵"}
    for r in results:
        ai_tag = " [AI FAILED]" if r.get("ai_failed") else (" [AI]" if r["ai_reviewed"] else "")
        print(f"{icons.get(r['final_label'], '⚪')} [{r['final_score']:>2}/10] {r['final_label']:<10} — {r['sender_name'] or r['sender_email']}{ai_tag}")
        print(f"         {r['subject'][:70]}")
        print(f"         {r['rules_tier']} | {', '.join(r['rules_reasons'][:4])}")
        if r.get("ai_summary"): print(f"         🤖 {r['ai_summary'][:80]}")
        print()

    if post_teams and results:
        post_to_teams(results, new_emails, noise_n)

    # R8: Finalize results
    finalize_results(results, {
        "version": "8.1", "timestamp": datetime.now(timezone.utc).isoformat(),
        "total": len(emails), "new": new_emails, "noise": noise_n,
        "ai": ai_n, "skipped": skipped, "auto_learned": len(replied),
    })

    # R5: Update health
    update_health("ok", scanned=new_emails, actionable=len(results))
    log.info(f"→ {RESULTS_FILE}")
    return results

# ═══════════════════════════════════════════════════════════════
# R6: PROCESS SUPERVISOR — Auto-restart on crash
# ═══════════════════════════════════════════════════════════════
def run_continuous(interval_min, hours, post_teams):
    """Run scans in a loop with crash recovery."""
    log.info(f"Continuous mode: every {interval_min}min. Ctrl+C to stop.")
    scan_hours = max(hours, interval_min / 60 * 2)
    consecutive_errors = 0

    while True:
        try:
            run_scan(scan_hours, post_teams)
            consecutive_errors = 0  # Reset on success
        except KeyboardInterrupt:
            log.info("Stopped by user.")
            break
        except Exception as e:
            consecutive_errors += 1
            log.error(f"Scan crashed: {e}\n{traceback.format_exc()}")
            update_health("error", error=e)

            if consecutive_errors >= 5:
                log.error("5 consecutive failures. Waiting 30 min before retry.")
                time.sleep(1800)
                consecutive_errors = 0  # Reset and try again
            else:
                wait = min(60 * consecutive_errors, 300)  # 1-5 min backoff
                log.info(f"Retrying in {wait}s...")
                time.sleep(wait)
                continue

        log.info(f"Next scan in {interval_min}min...")
        try:
            time.sleep(interval_min * 60)
        except KeyboardInterrupt:
            log.info("Stopped by user.")
            break

# ═══════════════════════════════════════════════════════════════
# AUTO-DEPLOY: Push results to GitHub → Vercel auto-deploys
# ═══════════════════════════════════════════════════════════════
def deploy_to_dashboard(repo_path):
    """Copy jarvis_results.json to the dashboard repo and push to GitHub."""
    import subprocess
    repo = Path(repo_path).expanduser().resolve()
    if not (repo / ".git").exists():
        log.error(f"  Git repo not found: {repo}")
        return False
    data_dir = repo / "public" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    try:
        import shutil
        shutil.copy2(RESULTS_FILE, data_dir / "jarvis_results.json")
        subprocess.run(["git", "add", "public/data/jarvis_results.json"], cwd=repo, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-m", f"JARVIS scan {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
                        "--allow-empty"], cwd=repo, check=True, capture_output=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=repo, check=True, capture_output=True)
        log.info("  ✅ Dashboard deployed (pushed to GitHub → Vercel)")
        return True
    except Exception as e:
        log.error(f"  Deploy failed: {e}")
        return False

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="JARVIS v8.1 — Production Email Triage")
    p.add_argument("--hours", type=int, default=24, help="Scan window (default: 24)")
    p.add_argument("--teams", action="store_true", help="Post to Teams")
    p.add_argument("--continuous", type=int, metavar="MIN", help="Run every N minutes")
    p.add_argument("--deploy", metavar="REPO_PATH", help="Auto-push results to dashboard GitHub repo")
    a = p.parse_args()

    if a.continuous:
        run_continuous(a.continuous, a.hours, a.teams)
    else:
        results = run_scan(a.hours, a.teams)
        if a.deploy and results:
            deploy_to_dashboard(a.deploy)
