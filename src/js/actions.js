/* ══════════════════════════════════════════════
   VALIDATION — every field is required except Extra Doc and
   Additional Charges / Conveyance.
   ══════════════════════════════════════════════ */
function validate(){
  const req = [
    ['fc-station','stationName'], ['fc-gstin','gstin'], ['fc-cc','dealerCode'], ['fc-vc','vendorCode'],
    ['fc-invd','invoiceDate'], ['fc-sd','stampDate'], ['fc-wn','wmCertNo'], ['fc-wd','wmCertDate'],
    ['fc-grnno','grnNo'], ['fc-grndate','grnDate'],
  ];
  let ok = true;
  req.forEach(([fid,vid])=>{
    const f = $(fid), v = $(vid).value.trim();
    f.classList.toggle('err', !v);
    if(!v) ok = false;
  });
  // Every MPD row needs its own serial number and nozzle count.
  getMpdRows().forEach(row=>{
    const serialField = $('fc-serial-'+row.index);
    const nozzlesField = $('fc-nozzles-'+row.index);
    const serialBad = !row.serial;
    const nozzlesBad = !row.nozzles;
    if(serialField) serialField.classList.toggle('err', serialBad);
    if(nozzlesField) nozzlesField.classList.toggle('err', nozzlesBad);
    if(serialBad || nozzlesBad) ok = false;
  });
  // W&M Cert and Receipt attachments are required; Extra Doc stays optional.
  ['cert','receipt'].forEach(t=>{
    const box = document.querySelector('#slot-'+t+' .upload-box');
    const missing = !(images[t] && images[t].length);
    if(box) box.classList.toggle('err', missing);
    if(missing) ok = false;
  });
  return ok;
}

/* ══════════════════════════════════════════════
   PREVIEW
   ══════════════════════════════════════════════ */
function doPreview(){
  if(!validate()){ toast('Please fill all required fields.', true); return; }
  $('previewHost').innerHTML = buildInvoiceHTML();
  const el = $('previewHost').firstElementChild;
  el.style.width = '100%'; el.style.maxWidth = '760px'; el.style.margin = '0 auto';
  el.style.boxShadow = '0 2px 16px rgba(16,27,45,.12)'; el.style.borderRadius='8px';
  $('overlay').classList.add('on');
  lockScroll();
}
function closeOv(){ $('overlay').classList.remove('on'); unlockScroll(); }

/* ══════════════════════════════════════════════
   PDF GENERATION
   ══════════════════════════════════════════════ */
function doGeneratePDF(){
  if(!validate()){ toast('Please fill all required fields.', true); return; }
  closeOv();
  const btn = $('downloadBtn');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" style="animation:spin 0.8s linear infinite;"></i> Generating…';
  reIcons();

  const el = $('inv-render');
  showCloudLoader('Generating your invoice…');

  // commitInvoiceNo() reserves the real invoice number for this invoice —
  // from the cloud counter if reachable, else the local one — and always
  // resolves, so generation never breaks even with no backend deployed.
  commitInvoiceNo().then(()=>{
    el.innerHTML = buildInvoiceHTML();
    toast('Generating PDF…');

    const { jsPDF } = window.jspdf;

    return html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#ffffff', width:794 }).then(canvas=>{
      const pdf = new jsPDF('p','mm','a4');
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();

      const invImg = canvas.toDataURL('image/png');
      const iW = pW - 14;
      const iH = iW * canvas.height / canvas.width;
      pdf.addImage(invImg, 'PNG', 7, 7, iW, Math.min(iH, pH-14));

      let pages = 1;
      ['cert','receipt','extra'].forEach(t=>{
        const arr = images[t];
        if(arr && arr.length){
          arr.forEach(imgSrc=>{ pdf.addPage(); addImagePage(pdf, imgSrc, pW, pH); pages++; });
        }
      });

      const safeInv = ($('invoiceNo').value.trim() || 'Draft').replace(/[/\\?%*:|"<>]/g,'-');
      pdf.save(`Reimbursement_${safeInv}.pdf`);
      toast(`PDF saved — ${pages} page${pages>1?'s':''}!`);
      // Fire-and-forget: cache this dealer's details for next time (see
      // cloud-sync.js). Never blocks or fails the PDF that was just saved.
      if(typeof cloudSaveCustomer === 'function') cloudSaveCustomer();
    });
  }).catch(err=>{
    console.error(err);
    toast('PDF generation failed.', true);
  }).finally(()=>{
    el.innerHTML = '';
    hideCloudLoader();
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="download"></i> Download &amp; Share';
    reIcons();
  });
}
function addImagePage(pdf, src, pW, pH){
  const margin = 8;
  const maxW = pW - margin*2, maxH = pH - margin*2;
  const tmp = new Image(); tmp.src = src;
  const natW = tmp.naturalWidth || 794, natH = tmp.naturalHeight || 1123;
  const ratio = natW/natH;
  let w = maxW, h = w/ratio;
  if(h>maxH){ h = maxH; w = h*ratio; }
  pdf.addImage(src, 'JPEG', (pW-w)/2, (pH-h)/2, w, h);
}

/* ══════════════════════════════════════════════
   RESET
   ══════════════════════════════════════════════ */
function confirmReset(){
  if(confirm('Clear all fields, dispensing units and attached photos? This cannot be undone.')) executeReset();
}
function executeReset(){
  document.querySelectorAll('input').forEach(el=>{ if(!el.readOnly) el.value=''; });
  ['invoiceDateDisplay','stampDateDisplay','wmCertDateDisplay','grnDateDisplay'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
  resetMpdRows();
  ['cert','receipt','extra'].forEach(t=>{ images[t]=null; renderSlot(t); });
  extraDocType = null;
  document.querySelectorAll('.input-group').forEach(f=>f.classList.remove('err'));
  document.querySelectorAll('.upload-box').forEach(b=>b.classList.remove('err'));
  $('invoiceNo')._userEdited = false;
  currentInvSeq = null;
  currentInvSeqCommitted = false;
  setDefaultDates();
  updateHeaderInfo();
  updateInvoiceNo();
  recalc();
  localStorage.removeItem('bss_wm_data');
  toast('Form reset');
}

/* ══════════════════════════════════════════════
   TOAST
   ══════════════════════════════════════════════ */
function toast(msg, bad){
  const el = $('toast');
  el.innerHTML = `<i data-lucide="${bad?'alert-circle':'check-circle-2'}"></i><span>${msg}</span>`;
  el.className = 'toast show' + (bad?' bad':'');
  reIcons();
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════════
   LOCAL PERSISTENCE — remembers station details only
   ══════════════════════════════════════════════ */
function saveLocal(){
  const data = {};
  PERSIST_FIELDS.forEach(id=> data[id] = $(id).value);
  localStorage.setItem('bss_wm_data', JSON.stringify(data));
}
function loadLocal(){
  try{
    const data = JSON.parse(localStorage.getItem('bss_wm_data')||'{}');
    PERSIST_FIELDS.forEach(id=>{ if(data[id]) $(id).value = data[id]; });
  }catch(e){}
}
PERSIST_FIELDS.forEach(id=> $(id).addEventListener('input', saveLocal));
['stationName','dealerCode','vendorCode'].forEach(id=> $(id).addEventListener('input', updateHeaderInfo));
