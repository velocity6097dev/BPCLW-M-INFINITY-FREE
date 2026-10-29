/* ══════════════════════════════════════════════
   CLOUD SYNC — talks to the PHP + MySQL backend in /api (see README.md
   "Cloud backend setup" for the InfinityFree steps). Every call here is
   best-effort: if
   ENABLE_CLOUD_SYNC is off (config.js), the backend isn't deployed yet,
   or the device is offline, calls fail silently and the app behaves
   exactly as it did before this feature existed — nothing here is
   required for the app to work.
   ══════════════════════════════════════════════ */

function showCloudLoader(msg){
  const el = $('cloudLoader');
  if(!el) return;
  const m = $('cloudLoaderMsg');
  if(m) m.textContent = msg || 'Working…';
  el.classList.add('on');
}
function hideCloudLoader(){
  const el = $('cloudLoader');
  if(el) el.classList.remove('on');
}

/* Thin fetch wrapper — always resolves, never throws. Returns the parsed
   JSON body on success, or null for literally any failure (offline, CORS,
   404 because api/ hasn't been deployed yet, 500, bad JSON, etc). */
async function cloudApi(path, opts){
  if(typeof ENABLE_CLOUD_SYNC !== 'undefined' && !ENABLE_CLOUD_SYNC) return null;
  try{
    const res = await fetch(API_BASE + path, opts);
    if(!res.ok) return null;
    return await res.json();
  }catch(e){ return null; }
}

/* Dealer Code → auto-fill Station Name / Vendor Code / GSTIN from the
   cloud cache. Only fills fields that are currently EMPTY, so it never
   overwrites something already typed or restored from this device's own
   local storage. Wired to the Dealer Code field's onchange (fires once
   the dealer finishes typing/leaves the field), not every keystroke. */
async function cloudLookupDealer(){
  const code = $('dealerCode').value.trim();
  if(!code) return;
  showCloudLoader('Looking up dealer…');
  const data = await cloudApi(`lookup.php?dealer_code=${encodeURIComponent(code)}`);
  hideCloudLoader();
  if(!data || !data.found) return;
  const fillIfEmpty = (id, val)=>{ const el = $(id); if(el && !el.value.trim() && val) el.value = val; };
  fillIfEmpty('stationName', data.station_name);
  fillIfEmpty('vendorCode', data.vendor_code);
  fillIfEmpty('gstin', data.gstin);
  if($('gstin').value) onGstinInput(); // keeps the auto-derived PAN field in sync
  updateHeaderInfo();
  saveLocal();
  toast('Dealer details auto-filled from cloud');
}

/* Reserves the next invoice number from the shared DB counter for this
   dealer + date (see api/invoice-number.php and invoice-number.js).
   Returns null on any failure so commitInvoiceNo() always has a safe
   local fallback. */
async function cloudReserveInvoiceSeq(dealerCode, dateVal){
  if(!dealerCode) return null;
  const data = await cloudApi(`invoice-number.php?action=reserve&dealer_code=${encodeURIComponent(dealerCode)}&date=${encodeURIComponent(dateVal)}`);
  return (data && typeof data.seq === 'number') ? data.seq : null;
}

/* Called once a PDF has actually been generated (end of doGeneratePDF) —
   caches this dealer's details for next time. If the backend finds the
   details have changed from what's already cached, it won't silently
   overwrite its record: it queues the change for your approval and pings
   Discord (see api/save-customer.php), and this device just gets a
   heads-up toast either way. Fire-and-forget — never blocks the PDF
   that was just saved, and failures are silent. */
function cloudSaveCustomer(){
  if(typeof ENABLE_CLOUD_SYNC !== 'undefined' && !ENABLE_CLOUD_SYNC) return;
  const payload = {
    dealer_code: $('dealerCode').value.trim(),
    station_name: $('stationName').value.trim(),
    vendor_code: $('vendorCode').value.trim(),
    gstin: $('gstin').value.trim().toUpperCase(),
    pan_no: $('panNo').value.trim(),
  };
  if(!payload.dealer_code) return;
  cloudApi('save-customer.php', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload),
  }).then(data=>{
    if(data && data.status === 'pending_approval'){
      toast('Details changed — sent for your approval before the cloud record updates.');
    }
  });
}
