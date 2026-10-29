/* ══════════════════════════════════════════════
   CROPPER — real drag-handle crop box (rule-of-thirds guide)
   Drag corners to resize, drag inside to move, rotate 90° at a time.
   No zoom slider — resizing the box IS the zoom.
   ══════════════════════════════════════════════ */
const cropS = { target:null, workingImg:null, rawSrc:null, wrapW:0, wrapH:0, box:{x:0,y:0,w:0,h:0}, mode:null, startPtr:null, startBox:null };

/* A modern phone camera photo can be 4000-8000px+ per side. Editing that
   full-resolution image live (the on-screen <img>, and especially the
   full-size canvas rotateCrop() builds) is what triggers "low memory" /
   app-crash errors on budget or older phones. So as soon as the photo is
   decoded, the working copy used for cropping/rotating is shrunk down to
   a sane editing resolution — applyCrop() already re-encodes the final
   crop at up to 1800px, so this doesn't reduce the saved photo's
   quality, it just keeps everything in between small. */
const CROP_MAX_WORKING_DIM = 2000;
function downscaleForCropper(img, originalSrc, onReady){
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if(longest <= CROP_MAX_WORKING_DIM){ onReady(img, originalSrc); return; }
  try{
    const scale = CROP_MAX_WORKING_DIM / longest;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const smallSrc = canvas.toDataURL('image/jpeg', 0.92);
    const smallImg = new Image();
    smallImg.onload = ()=> onReady(smallImg, smallSrc);
    smallImg.onerror = ()=> onReady(img, originalSrc); // fall back to the full-size image rather than get stuck
    smallImg.src = smallSrc;
  }catch(err){
    console.error(err);
    onReady(img, originalSrc); // downscale failed — still let the user try with the original
  }
}
function openCropper(dataUrl, target){
  const img = new Image();
  img.onload = ()=>{
    downscaleForCropper(img, dataUrl, (workingImg, workingSrc)=>{
      cropS.target = target;
      cropS.workingImg = workingImg;
      cropS.rawSrc = workingSrc;
      buildCropperDom();
    });
  };
  img.onerror = ()=>{
    toast('Could not open that photo — it may be too large for this device.', true);
    renderSlot(target);
  };
  img.src = dataUrl;
}
function buildCropperDom(){
  $('cropHost').innerHTML = `
    <div class="crop-modal" id="cropModal">
      <div class="crop-top">
        <button onclick="cancelCrop()"><i data-lucide="x"></i></button>
        <span class="ttl">ADJUST PHOTO</span>
        <button class="done" onclick="applyCrop()"><i data-lucide="check"></i> Done</button>
      </div>
      <div class="crop-stage" id="cropStage">
        <div class="crop-imgwrap" id="cropImgWrap">
          <img id="cropImgEl" draggable="false" alt="">
          <div class="crop-box" id="cropBox">
            <div class="third v1"></div><div class="third v2"></div>
            <div class="third h1"></div><div class="third h2"></div>
            <div class="crop-handle nw" data-h="nw"></div>
            <div class="crop-handle ne" data-h="ne"></div>
            <div class="crop-handle sw" data-h="sw"></div>
            <div class="crop-handle se" data-h="se"></div>
          </div>
        </div>
        <div class="crop-hint">Drag corners to crop · drag inside to move</div>
      </div>
      <div class="crop-toolbar">
        <button onclick="rotateCrop()"><i data-lucide="rotate-cw"></i> Rotate</button>
        <button onclick="resetCropBox()"><i data-lucide="refresh-ccw"></i> Reset</button>
      </div>
    </div>`;
  reIcons();
  lockScroll();
  layoutCropper();
  attachCropHandlers();
}
function layoutCropper(){
  const stage = $('cropStage');
  const maxW = stage.clientWidth - 32;
  const maxH = stage.clientHeight - 32;
  const img = cropS.workingImg;
  let w = maxW, h = w * img.naturalHeight / img.naturalWidth;
  if(h > maxH){ h = maxH; w = h * img.naturalWidth / img.naturalHeight; }
  cropS.wrapW = w; cropS.wrapH = h;
  const wrap = $('cropImgWrap');
  wrap.style.width = w + 'px';
  wrap.style.height = h + 'px';
  $('cropImgEl').src = cropS.rawSrc;
  cropS.box = { x:0, y:0, w:w, h:h };
  renderBox();
}
function renderBox(){
  const el = $('cropBox');
  el.style.left = cropS.box.x + 'px';
  el.style.top = cropS.box.y + 'px';
  el.style.width = cropS.box.w + 'px';
  el.style.height = cropS.box.h + 'px';
}

function attachCropHandlers(){
  const box = $('cropBox');
  box.addEventListener('pointerdown', e=>{
    if(e.target.classList.contains('crop-handle')) return;
    startCropDrag(e, 'move');
  });
  box.querySelectorAll('.crop-handle').forEach(h=>{
    h.addEventListener('pointerdown', e=>{ e.stopPropagation(); startCropDrag(e, h.dataset.h); });
  });
  window.addEventListener('pointermove', onCropPtrMove);
  window.addEventListener('pointerup', onCropPtrUp);
}
function startCropDrag(e, mode){
  e.preventDefault();
  cropS.mode = mode;
  cropS.startPtr = { x:e.clientX, y:e.clientY };
  cropS.startBox = { ...cropS.box };
  if(e.target.setPointerCapture){ try{ e.target.setPointerCapture(e.pointerId); }catch(_){} }
}
function onCropPtrMove(e){
  if(!cropS.mode) return;
  const dx = e.clientX - cropS.startPtr.x;
  const dy = e.clientY - cropS.startPtr.y;
  const MIN = 44;
  const W = cropS.wrapW, H = cropS.wrapH;
  let { x, y, w, h } = cropS.startBox;
  if(cropS.mode === 'move'){
    x = clamp(x + dx, 0, W - w);
    y = clamp(y + dy, 0, H - h);
  } else {
    if(cropS.mode.includes('n')){ let ny = clamp(y + dy, 0, y + h - MIN); h = h + (y - ny); y = ny; }
    if(cropS.mode.includes('s')){ h = clamp(h + dy, MIN, H - y); }
    if(cropS.mode.includes('w')){ let nx = clamp(x + dx, 0, x + w - MIN); w = w + (x - nx); x = nx; }
    if(cropS.mode.includes('e')){ w = clamp(w + dx, MIN, W - x); }
  }
  cropS.box = { x, y, w, h };
  renderBox();
}
function onCropPtrUp(){ cropS.mode = null; }

function rotateCrop(){
  const img = cropS.workingImg;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalHeight; canvas.height = img.naturalWidth;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(Math.PI/2);
  ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);
  const newSrc = canvas.toDataURL('image/jpeg', 0.95);
  const newImg = new Image();
  newImg.onload = ()=>{
    cropS.workingImg = newImg;
    cropS.rawSrc = newSrc;
    layoutCropper();
  };
  newImg.src = newSrc;
}
function resetCropBox(){ layoutCropper(); }
function cancelCrop(){
  const target = cropS.target;
  $('cropHost').innerHTML = '';
  window.removeEventListener('pointermove', onCropPtrMove);
  window.removeEventListener('pointerup', onCropPtrUp);
  cropS.workingImg = null; cropS.mode = null; cropS.target = null;
  unlockScroll();
  // Restores whatever the slot should actually show (empty upload box if
  // nothing was ever attached, or the prior photo on a cancelled re-edit) —
  // in particular this clears any "uploading…" spinner left over from a
  // fresh pick that was cancelled before Done was tapped.
  if(target) renderSlot(target);
}
function applyCrop(){
  const img = cropS.workingImg;
  const scale = img.naturalWidth / cropS.wrapW;
  const sx = cropS.box.x*scale, sy = cropS.box.y*scale, sw = cropS.box.w*scale, sh = cropS.box.h*scale;
  const maxDim = 1800;
  let outW = sw, outH = sh;
  if(Math.max(outW,outH) > maxDim){ const r = maxDim/Math.max(outW,outH); outW*=r; outH*=r; }
  const out = document.createElement('canvas');
  out.width = Math.max(1,Math.round(outW)); out.height = Math.max(1,Math.round(outH));
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,out.width,out.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
  const dataUrl = out.toDataURL('image/jpeg', 0.92);
  images[cropS.target] = [dataUrl];
  renderSlot(cropS.target);
  cancelCrop();
  toast('Photo added');
}
