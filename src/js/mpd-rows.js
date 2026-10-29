/* ══════════════════════════════════════════════
   MULTIPLE MPDs — up to MAX_MACHINES_PER_INVOICE rows (config.js).
   A handwritten W&M certificate can list more than one machine, so the
   Equipment & Pricing section supports adding extra MPD rows instead of
   being locked to a single machine. Rate per Nozzle and Additional
   Charges stay global (shared across every machine on the invoice) —
   only Model / Serial No. / Nozzle count are per row.

   Rows are only ever added at the end and removed from the end, so a
   row's id (mpdRow-1, mpdRow-2…) never needs to be renumbered — this
   keeps add/remove simple and avoids losing a mid-list row's values.
   ══════════════════════════════════════════════ */
let mpdRowCount = 0;

function mpdRowTemplate(i){
  return `
  <div class="mpd-row" id="mpdRow-${i}" data-mpd-index="${i}">
    <div class="mpd-row-head"><span>Machine ${i}</span></div>
    <div class="grid-2">
      <div class="input-group">
        <label>MPD Make / Model</label>
        <select id="mpdModel-${i}">
          <option>MIDCO</option><option>GILBARCO</option><option>WAYNE</option><option>TOKHEIM</option><option>TATSUNO</option><option>OTHER</option>
        </select>
      </div>
      <div class="input-group" id="fc-serial-${i}">
        <label>Machine Serial No. <em>*</em></label>
        <input type="text" id="machineSerial-${i}" placeholder="e.g. TS2024K118" autocapitalize="characters" autocomplete="off">
        <span class="errmsg">Required</span>
      </div>
    </div>
    <div class="input-group" id="fc-nozzles-${i}" style="margin-bottom:0;">
      <label>No. of Nozzles <em>*</em></label>
      <input type="number" id="mpdNozzles-${i}" class="mono" placeholder="0" min="0" step="1" inputmode="numeric" oninput="recalc()">
      <span class="errmsg">Required</span>
    </div>
  </div>`;
}

function addMpdRow(){
  if(mpdRowCount >= MAX_MACHINES_PER_INVOICE) return;
  mpdRowCount++;
  $('mpdRows').insertAdjacentHTML('beforeend', mpdRowTemplate(mpdRowCount));
  refreshMpdChrome();
  reIcons();
  recalc();
}

function removeLastMpdRow(){
  if(mpdRowCount <= 1) return; // always keep at least one machine row
  const row = $('mpdRow-'+mpdRowCount);
  if(row) row.remove();
  mpdRowCount--;
  refreshMpdChrome();
  recalc();
}

/* The remove (×) button only ever shows on the last row, and only once
   there's more than one — row 1 can never be removed. Also hides the
   "+ Add MPD" button once the configured max is reached. */
function refreshMpdChrome(){
  document.querySelectorAll('.mpd-remove').forEach(b=> b.remove());
  if(mpdRowCount > 1){
    const lastHead = document.querySelector(`#mpdRow-${mpdRowCount} .mpd-row-head`);
    if(lastHead) lastHead.insertAdjacentHTML('beforeend', `<button type="button" class="mpd-remove" onclick="removeLastMpdRow()" aria-label="Remove this machine"><i data-lucide="x"></i></button>`);
  }
  const addBtn = $('addMpdBtn');
  if(addBtn) addBtn.style.display = mpdRowCount >= MAX_MACHINES_PER_INVOICE ? 'none' : '';
  reIcons();
}

/* Called on load and on Reset — collapses back to a single empty row. */
function resetMpdRows(){
  const host = $('mpdRows');
  if(host) host.innerHTML = '';
  mpdRowCount = 0;
  addMpdRow();
}

/* Shared read used by recalc(), the invoice template, and validation —
   the single source of truth for "what MPD rows exist right now". */
function getMpdRows(){
  const rows = [];
  for(let i=1;i<=mpdRowCount;i++){
    rows.push({
      index: i,
      model: ($('mpdModel-'+i)?.value || '').trim(),
      serial: ($('machineSerial-'+i)?.value || '').trim().toUpperCase(),
      nozzles: parseInt($('mpdNozzles-'+i)?.value) || 0,
    });
  }
  return rows;
}
