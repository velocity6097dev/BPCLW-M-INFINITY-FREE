/* ══════════════════════════════════════════════
   LOGO — applies BPCL_LOGO_URL to the header badge; falls back to the
   default flame + wordmark mark if the URL is empty or fails to load.
   ══════════════════════════════════════════════ */
function applyTopbarLogo(){
  const url = BPCL_LOGO_URL.trim();
  const img = $('topbarLogoImg');
  const icon = $('topbarFallbackIcon');
  const word = $('topbarFallbackWordmark');
  if(!img) return;
  if(!url){ img.style.display = 'none'; return; }
  img.onload = ()=>{
    img.style.display = 'block';
    if(icon) icon.style.display = 'none';
    if(word) word.style.display = 'none';
  };
  img.onerror = ()=>{
    img.style.display = 'none';
    if(icon) icon.style.display = '';
    if(word) word.style.display = '';
  };
  img.src = url;
}

/* ── Header stays static: "BPCL W&M Reimbursement" / "Stamping Fee Invoice Generator" ── */
function updateHeaderInfo(){ /* intentionally static — header no longer mirrors form fields */ }

/* ── Invoice number: DD + Mon (e.g. "Aug") + YY + dealer code + a
   per-day sequence number, max 16 chars ── e.g. 04Aug2611993401
   Budget: date 7 + dealer 6 + seq 2(+) = 15-16. No room left for the machine
   serial once dealer code takes its full 6 chars — it stays a required
   field and still prints on the invoice, just isn't part of the number.

   The sequence is a "01, 02, 03…" counter that resets to 01 automatically
   whenever the Invoice Date changes to a day that hasn't been used yet.
   It only ever ADVANCES when a PDF is actually generated (doGeneratePDF
   in actions.js calls commitInvoiceNo()) — opening the page, refreshing,
   previewing, or editing other fields only PEEKS at what the next number
   would be, it never reserves it. So refreshing the page, or walking away
   and coming back, never burns a number; only a real "Download & Share"
   does. If cloud sync is reachable (cloud-sync.js), the reservation is
   made against the shared DB counter for that dealer+date instead of this
   device's local one, so two phones generating invoices for the same
   dealer on the same day still never collide. ── */
function cleanAlnum(s){ return (s||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* Read-only — what the next sequence number WOULD be for this date. Never
   writes to storage, so it's safe to call on every keystroke/page load. */
function peekInvSeqLocal(dateKey){
  let stored = null;
  try{ stored = JSON.parse(localStorage.getItem(INV_SEQ_KEY) || 'null'); }catch(e){ stored = null; }
  return (stored && stored.date === dateKey) ? stored.seq + 1 : 1;
}
/* Actually advances and persists the local counter. Only called from
   commitInvoiceNo() below, i.e. only once a PDF is really being made. */
function commitInvSeqLocal(dateKey){
  const seq = peekInvSeqLocal(dateKey);
  localStorage.setItem(INV_SEQ_KEY, JSON.stringify({ date: dateKey, seq }));
  return seq;
}

let currentInvSeq = null;          // the number reserved for THIS invoice, once committed
let currentInvSeqCommitted = false;

function buildInvoiceNoString(seq){
  const dateVal = $('invoiceDate').value;
  if(!dateVal) return '';
  const [y,m,d] = dateVal.split('-');
  const mon = MONTH_ABBR[parseInt(m,10)-1] || '';
  const dateStr = `${d}${mon}${y.slice(-2)}`;               // e.g. 04Aug26 — 7 chars
  const dealerPart = cleanAlnum($('dealerCode').value).slice(0,6);
  return `${dateStr}${dealerPart}${String(seq).padStart(2,'0')}`.slice(0,16);
}

function onInvoiceNoManualEdit(){ $('invoiceNo')._userEdited = true; }

/* Display-only preview of the invoice number — called on page load and
   whenever Dealer Code / Invoice Date change. Does not reserve anything. */
function updateInvoiceNo(){
  const inv = $('invoiceNo');
  if(inv._userEdited) return;
  const dateVal = $('invoiceDate').value;
  if(!dateVal) return;
  const seq = currentInvSeqCommitted ? currentInvSeq : peekInvSeqLocal(dateVal);
  inv.value = buildInvoiceNoString(seq);
}

/* Reserves the number for real. Only called once, right when a PDF is
   actually being generated (see doGeneratePDF). Stays reserved for the
   rest of this editing session — clicking Download again re-uses the
   same number instead of burning a new one; Reset clears it so the next
   invoice gets a fresh reservation. Always resolves (never rejects): if
   cloud sync is off, unreachable, or not deployed yet, it falls back to
   the local counter so invoice generation never breaks. */
async function commitInvoiceNo(){
  if(currentInvSeqCommitted) return currentInvSeq;
  const dateVal = $('invoiceDate').value || todayISO();
  const dealerCode = $('dealerCode').value.trim();
  let seq = null;
  if(typeof cloudReserveInvoiceSeq === 'function'){
    seq = await cloudReserveInvoiceSeq(dealerCode, dateVal);
  }
  if(seq === null) seq = commitInvSeqLocal(dateVal);
  currentInvSeq = seq;
  currentInvSeqCommitted = true;
  updateInvoiceNo();
  return seq;
}

function onGstinInput(){
  const el = $('gstin');
  el.value = el.value.toUpperCase();
  const v = el.value;
  $('panNo').value = v.length>=12 ? v.substring(2,12) : '';
  saveLocal();
}

/* ── Nozzle-based pricing — summed across every MPD row (mpd-rows.js) ── */
let lastTotal = 0;
function recalc(){
  const nozzles = getMpdRows().reduce((sum,row)=> sum + row.nozzles, 0);
  const rate = parseFloat($('mpdRate').value) || 0;
  const base = nozzles * rate;
  const addl = parseFloat($('addlAmt').value) || 0;
  const total = base + addl;
  $('sbNozzles').textContent = nozzles;
  $('sbRate').textContent = rate;
  $('sbBase').textContent = rsPlain(base);
  $('sbAddl').textContent = rsPlain(addl);
  $('sbTotal').textContent = rsPlain(total);
  const liveEl = $('liveTotal');
  liveEl.textContent = rsPlain(total).replace('.00','');
  if(Math.round(total) !== Math.round(lastTotal)){
    liveEl.classList.remove('tick'); void liveEl.offsetWidth; liveEl.classList.add('tick');
  }
  lastTotal = total;
}
