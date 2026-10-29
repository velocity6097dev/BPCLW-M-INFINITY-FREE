/* ══════════════════════════════════════════════
   UTILS — small generic helpers shared by every other module
   ══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function reIcons(){ if(window.lucide) lucide.createIcons(); }
function escAttr(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }

/* Small timing helpers used by the upload-loading animation so a fast
   local file read doesn't just flash for a frame — see attachments.js. */
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
async function ensureMinDuration(startedAt, minMs){
  const elapsed = performance.now() - startedAt;
  if(elapsed < minMs) await sleep(minMs - elapsed);
}

function fmtDate(d){ if(!d) return 'N/A'; return d.split('-').reverse().join('-'); }
function fmtDMY(iso){
  if(!iso) return '';
  const parts = iso.split('-');
  if(parts.length!==3) return '';
  const [y,m,d] = parts;
  return `${d}/${m}/${y}`;
}
function rsPlain(v){ return '₹' + (Number(v)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function numWords(num){
  num = Math.round(num);
  if(num===0) return 'Zero';
  const a=['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b=['','','Twenty ','Thirty ','Forty ','Fifty ','Sixty ','Seventy ','Eighty ','Ninety '];
  if((''+num).length>9) return 'Overflow';
  const n = ('000000000'+num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if(!n) return '';
  let str='';
  str += n[1]!=0 ? (a[Number(n[1])]||b[n[1][0]]+a[n[1][1]])+'Crore ' : '';
  str += n[2]!=0 ? (a[Number(n[2])]||b[n[2][0]]+a[n[2][1]])+'Lakh '  : '';
  str += n[3]!=0 ? (a[Number(n[3])]||b[n[3][0]]+a[n[3][1]])+'Thousand ' : '';
  str += n[4]!=0 ? (a[Number(n[4])]||b[n[4][0]]+a[n[4][1]])+'Hundred '  : '';
  str += n[5]!=0 ? ((str!=='')?'and ':'')+(a[Number(n[5])]||b[n[5][0]]+a[n[5][1]]) : '';
  return str.trim()+' Only';
}
function getFinancialYear(dateStr){
  if(!dateStr) return new Date().getFullYear();
  const d=new Date(dateStr), y=d.getFullYear(), m=d.getMonth();
  return m<3 ? `${y-1}-${(''+y).slice(-2)}` : `${y}-${(''+(y+1)).slice(-2)}`;
}

/* ══════════════════════════════════════════════
   SCROLL LOCK — reference-counted so nested/back-to-back modals
   (crop → extra-doc type → preview) never unlock each other early.
   ══════════════════════════════════════════════ */
let _scrollLockCount = 0;
let _scrollLockY = 0;
function lockScroll(){
  if(_scrollLockCount === 0){
    _scrollLockY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `-${_scrollLockY}px`;
    document.body.classList.add('scroll-locked');
  }
  _scrollLockCount++;
}
function unlockScroll(){
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if(_scrollLockCount === 0){
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
    // behavior:'instant' — the page has global scroll-behavior:smooth
    // (see css/styles.css), which would otherwise animate this restore
    // and look like the page is scrolling itself from the top every
    // time a modal (crop, extra-doc type, preview) closes or is
    // cancelled while scrolled down.
    window.scrollTo({ top: _scrollLockY, left: 0, behavior: 'instant' });
  }
}
