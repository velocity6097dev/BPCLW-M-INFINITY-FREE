/* ══════════════════════════════════════════════
   CONFIG — constants used across the app
   ══════════════════════════════════════════════ */

/* LOGO — set a hosted image URL (or data: URI) here to use a custom logo
   on both the on-screen header badge and the invoice letterhead. Leave it
   as an empty string '' to use the default BPCL mark everywhere. If the
   URL ever breaks or fails to load, both places automatically fall back
   to the default mark — no broken-image icon, no manual fix needed.
   e.g. const BPCL_LOGO_URL = 'https://yourdomain.com/bpcl-logo.png'; */
const BPCL_LOGO_URL = 'assets/bpcl.jpg';

const BPCL_PAN = 'AAACB2902M';
const BPCL_GSTN = '19AAACB2902M1ZQ';

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const INV_SEQ_KEY = 'bss_invoice_seq_v2';

/* Floor on how long the upload-loading card stays visible (ms). Reading a
   local file is near-instant, so without this the animation would just
   flash for a frame — this makes it read as a deliberate upload step. */
const UPLOAD_MIN_MS = 650;

const ATT_META = {
  cert:    { label:'W&M Cert',    sub:'Camera or gallery', icon:'file-text', badge:'#DCE9FF', badgeIco:'#2563EB' },
  receipt: { label:'Receipt',     sub:'Camera or gallery', icon:'receipt',   badge:'#DFF5EA', badgeIco:'#178A63' },
  extra:   { label:'Extra Doc',   sub:'Optional',          icon:'paperclip', badge:'#EDE4FF', badgeIco:'#7C3AED' },
};

/* fields mirrored into localStorage so a dealer doesn't retype their
   station details on every visit */
const PERSIST_FIELDS = ['stationName','dealerCode','vendorCode','gstin','panNo'];

/* ── Multiple MPDs per invoice ──
   A handwritten W&M certificate can list more than one machine (usually
   up to 2). This caps how many MPD rows the "+ Add MPD" button can add.
   Raise it any time — the UI and invoice layout both just follow this
   number, nothing else needs to change. */
const MAX_MACHINES_PER_INVOICE = 2;

/* ── Cloud sync (InfinityFree + MySQL backend, see /api) ──
   ENABLE_CLOUD_SYNC turns the whole feature on/off in one place. While
   api/config.php isn't filled in yet (or the site is opened with no
   internet), every cloud call fails silently and the app behaves exactly
   as it did before — nothing here is required for the app to work.
   API_BASE is relative, so it keeps working whatever folder/domain this
   is deployed under. */
const ENABLE_CLOUD_SYNC = true;
const API_BASE = 'api/';

/* Default BPCL mark used on the invoice letterhead when no custom logo is
   set, or if the custom logo URL fails to load. */
const DEFAULT_LOGO_MARK_HTML = '<div style="width:100%;height:100%;border-radius:13px;background:linear-gradient(135deg,#17325B,#10233F);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(16,35,63,0.28);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E2790E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg><div style="font-size:8px;font-weight:800;letter-spacing:.5px;color:#fff;margin-top:3px;">BPCL</div></div>';
