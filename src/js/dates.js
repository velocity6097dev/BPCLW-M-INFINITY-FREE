/* ══════════════════════════════════════════════
   DATES — shadow-picker sync between the visible DD/MM/YYYY text field
   and the hidden native <input type="date">
   nativeId  = id of the hidden <input type="date"> (keeps YYYY-MM-DD,
               used by every existing $('...').value reference)
   displayId = id of the visible readonly text field (shows DD/MM/YYYY)
   ══════════════════════════════════════════════ */
function syncDateDisplay(nativeId, displayId){
  const nativeEl = $(nativeId), displayEl = $(displayId);
  if(!nativeEl || !displayEl) return;
  displayEl.value = fmtDMY(nativeEl.value);
}
function openDatePicker(nativeId){
  const el = $(nativeId);
  if(!el) return;
  try{
    if(typeof el.showPicker === 'function'){ el.showPicker(); return; }
  }catch(e){}
  try{ el.focus({preventScroll:true}); }catch(e){}
  try{ el.click(); }catch(e){}
}
function setDefaultDates(){
  const today = new Date().toISOString().slice(0,10);
  $('invoiceDate').value = today;
  syncDateDisplay('invoiceDate','invoiceDateDisplay');
}
