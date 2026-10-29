/* ══════════════════════════════════════════════
   ATTACHMENTS — picker + bottom sheet
   ══════════════════════════════════════════════ */
const images = { cert:null, receipt:null, extra:null };
/* Label chosen by the user for the Extra Doc attachment (e.g. "Technician
   Report" or a custom typed name). Null until they pick one. */
let extraDocType = null;

function renderSlot(target){
  const meta = ATT_META[target];
  const host = $('slot-'+target);
  const arr = images[target];
  const displayLabel = (target==='extra' && extraDocType) ? extraDocType : meta.label;
  if(arr && arr.length){
    const multi = arr.length > 1;
    host.innerHTML = `
      <div class="att-preview">
        <img src="${arr[0]}" alt="${escAttr(displayLabel)}">
        ${multi?`<div class="page-badge">${arr.length} pages</div>`:''}
        <div class="att-bar">
          <div class="chk"><i data-lucide="check"></i></div>
          <div class="actions">
            ${!multi?`<button class="abtn" onclick="event.stopPropagation();reeditImage('${target}')" aria-label="Edit"><i data-lucide="pencil"></i></button>`:''}
            <button class="abtn" onclick="event.stopPropagation();removeImage('${target}')" aria-label="Remove"><i data-lucide="x"></i></button>
          </div>
        </div>
        <div class="fname">${escAttr(displayLabel)}${multi?` · ${arr.length} pages`:''}</div>
      </div>`;
  } else {
    host.innerHTML = `
      <div class="upload-box" onclick="openPicker('${target}')" role="button" tabindex="0" style="border-top:3px solid ${meta.badgeIco};"
           onkeydown="if(event.key==='Enter'||event.key===' ')openPicker('${target}')">
        <div class="u-ico" style="background:${meta.badge};color:${meta.badgeIco};"><i data-lucide="${meta.icon}"></i></div>
        <div class="u-text">${meta.label}</div>
        <div class="u-sub">${meta.sub}</div>
      </div>`;
  }
  reIcons();
}
function removeImage(target){
  images[target] = null;
  if(target === 'extra') extraDocType = null;
  renderSlot(target);
}
function reeditImage(target){ const arr = images[target]; if(arr && arr.length===1) openCropper(arr[0], target); }

/* Loading state shown in an att-grid slot the instant a file is picked,
   replaced by either the crop modal (images) or the finished preview
   (PDFs) once processing finishes — see the file-input listeners below.
   A progress bar fills toward ~88% while the file is being read/parsed;
   finishUploadLoading() snaps it the rest of the way and flips the spinner
   to a checkmark right before the handoff to the cropper or thumbnail. */
function showUploadLoading(target, label){
  const host = $('slot-'+target);
  if(!host) return;
  host.innerHTML = `
    <div class="upload-loading" id="upl-${target}">
      <div class="u-spin"><i data-lucide="loader-2"></i></div>
      <div class="u-label">${escAttr(label || 'Uploading…')}</div>
      <div class="u-progress-track"><div class="u-progress-fill"></div></div>
    </div>`;
  reIcons();
  // Two rAFs so the browser commits the 0% width first, then transitions
  // to 88% — a plain synchronous style change would skip the transition.
  requestAnimationFrame(()=> requestAnimationFrame(()=>{
    const fill = host.querySelector('.u-progress-fill');
    if(fill) fill.style.width = '88%';
  }));
}

/* Plays the "done" beat — bar snaps to 100%, spinner becomes a check —
   then resolves after a short beat so the next screen (cropper/thumbnail)
   feels like a handoff rather than an abrupt swap. */
function finishUploadLoading(target){
  return new Promise(resolve=>{
    const card = $('upl-'+target);
    if(!card){ resolve(); return; }
    const fill = card.querySelector('.u-progress-fill');
    card.classList.add('done');
    if(fill){ fill.style.transitionDuration = '.2s'; fill.style.width = '100%'; }
    const spin = card.querySelector('.u-spin');
    if(spin) spin.innerHTML = '<i data-lucide="check"></i>';
    reIcons();
    setTimeout(resolve, 260);
  });
}

function openPicker(target){
  // Extra Doc asks what kind of document it is first, so the choice can be
  // printed as enclosure point 3 on the invoice.
  if(target === 'extra'){ openExtraTypeModal(); return; }
  // Native picker: on Android/iOS, accept="image/*,application/pdf" surfaces the
  // OS chooser (Camera / Photos / Files). On desktop it's a plain file dialog.
  $(target+'File').click();
}

/* ══════════════════════════════════════════════
   EXTRA DOC TYPE — quick chooser before the file picker opens.
   Styled with the site's own ink-navy + amber palette (rather than a
   generic system-sheet look) and locks background scroll while open.
   ══════════════════════════════════════════════ */
function openExtraTypeModal(){
  $('extraTypeHost').innerHTML = `
    <div class="overlay on" id="extraTypeOverlay" style="align-items:center;">
      <div class="ov-inner" style="border-radius:20px;max-width:380px;max-height:none;animation:fadeIn .2s ease;">
        <div class="brand-modal-bar">
          <div class="bmb-title">
            <span class="bmb-ico"><i data-lucide="paperclip"></i></span>
            <h3>What is this document?</h3>
          </div>
          <button onclick="closeExtraTypeModal()" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:10px;">
          <button type="button" class="extradoc-opt" onclick="selectExtraDocType('Technician Report')">
            <span class="eo-ico"><i data-lucide="wrench"></i></span>
            <span class="eo-label">Technician Report</span>
          </button>
          <button type="button" class="extradoc-opt" onclick="selectExtraDocType('__other__')">
            <span class="eo-ico"><i data-lucide="file-plus"></i></span>
            <span class="eo-label">Other</span>
          </button>
          <div class="input-group" id="extraOtherWrap" style="display:none;margin-top:2px;">
            <label>Document Name <em>*</em></label>
            <input type="text" id="extraOtherInput" placeholder="e.g. Technician Visit Note" autocapitalize="sentences">
            <span class="errmsg">Please enter a document name</span>
          </div>
        </div>
        <div class="ov-foot" id="extraTypeFoot" style="display:none;">
          <button class="btn btn-line" style="border:1.5px solid var(--line);color:var(--ink);" onclick="closeExtraTypeModal()">Cancel</button>
          <button class="btn btn-green" onclick="confirmExtraOther()">Continue</button>
        </div>
      </div>
    </div>`;
  reIcons();
  lockScroll();
}
function closeExtraTypeModal(){ $('extraTypeHost').innerHTML = ''; unlockScroll(); }
function selectExtraDocType(type){
  if(type === '__other__'){
    $('extraOtherWrap').style.display = 'flex';
    $('extraTypeFoot').style.display = 'flex';
    $('extraOtherInput').focus();
    return;
  }
  extraDocType = type;
  closeExtraTypeModal();
  $('extraFile').click();
}
function confirmExtraOther(){
  const wrap = $('extraOtherWrap');
  const v = $('extraOtherInput').value.trim();
  if(!v){ wrap.classList.add('err'); return; }
  wrap.classList.remove('err');
  extraDocType = v;
  closeExtraTypeModal();
  $('extraFile').click();
}

if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
async function extractPdfPages(arrayBuffer){
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for(let i=1; i<=pdf.numPages; i++){
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    pages.push(canvas.toDataURL('image/jpeg', 0.92));
  }
  return pages;
}

['cert','receipt','extra'].forEach(t=>{
  $(t+'File').addEventListener('change', async e=>{
    const file = e.target.files[0];
    if(!file){ return; }
    const startedAt = performance.now();
    showUploadLoading(t, file.type === 'application/pdf' ? 'Reading PDF…' : 'Uploading…');
    if(file.type === 'application/pdf'){
      try{
        const buf = await file.arrayBuffer();
        const pages = await extractPdfPages(buf);
        images[t] = pages;
        await ensureMinDuration(startedAt, UPLOAD_MIN_MS);
        await finishUploadLoading(t);
        renderSlot(t);
        toast(`Added ${pages.length} page${pages.length>1?'s':''} from PDF`);
      }catch(err){
        console.error(err);
        toast('Could not read that PDF.', true);
        renderSlot(t);
      }
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async ()=>{
      await ensureMinDuration(startedAt, UPLOAD_MIN_MS);
      await finishUploadLoading(t);
      openCropper(reader.result, t);
    };
    reader.onerror = ()=>{ toast('Could not read that file.', true); renderSlot(t); };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
});
