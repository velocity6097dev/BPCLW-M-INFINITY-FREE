/* ══════════════════════════════════════════════
   COPY / SOURCE DETERRENTS
   ──────────────────────────────────────────────
   Heads up: none of this can truly hide a web page's source. A browser
   has to download the HTML/CSS/JS to run it, so anyone who really wants
   the code can always get it (view-source, devtools, browser dev
   extensions, or the Network tab). What's below just removes the easy,
   accidental ways a casual visitor could right-click → "View Source",
   grab your images, or drag text out of the form. Treat it as a "please
   don't" sign, not a lock.
   ══════════════════════════════════════════════ */

/* Right-click / long-press context menu */
document.addEventListener('contextmenu', e=> e.preventDefault());

/* Common view-source / devtools keyboard shortcuts (Win/Linux + Mac) */
document.addEventListener('keydown', e=>{
  const k = e.key;
  const blockCombo =
    k === 'F12' ||
    (e.ctrlKey && k === 'u') ||                                   // view-source
    (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(k.toLowerCase())) || // devtools panels
    (e.metaKey && e.altKey && ['i','j','c'].includes(k.toLowerCase()));     // Mac devtools
  if(blockCombo) e.preventDefault();
});

/* Block dragging images out of the page / off the attachment previews */
document.addEventListener('dragstart', e=>{
  if(e.target && e.target.tagName === 'IMG') e.preventDefault();
});

/* Text selection is off everywhere except form fields (inputs/textareas
   still need normal select/copy so people can edit their own entries). */
document.addEventListener('DOMContentLoaded', ()=> document.body.classList.add('no-select'));
