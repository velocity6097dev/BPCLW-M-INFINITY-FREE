/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', ()=>{
  reIcons();
  applyTopbarLogo();
  setDefaultDates();
  resetMpdRows();   // seeds the first MPD row (mpd-rows.js)
  loadLocal();
  updateHeaderInfo();
  ['cert','receipt','extra'].forEach(renderSlot);
  updateInvoiceNo();
  recalc();
});
