/* ══════════════════════════════════════════════
   LICENSE GATE — domain allowlist check
   ──────────────────────────────────────────────
   Must be the FIRST script tag in <head>, loaded without async/defer, so
   it runs before anything paints. It hides the page, asks a small
   Cloudflare Worker whether the current origin is allowed to run this
   tool, and only reveals the page if the answer is yes.

   What this does NOT do: hide your source from someone visiting a
   *licensed* domain. Nothing running in a browser can do that (see
   js/security.js). What this DOES do: stop a straight copy of this
   folder from working if it's re-hosted on a domain you never approved.
   That copy still calls the same Worker, gets back {ok:false} (its
   Origin isn't in the allowlist), and shows a lockout screen instead of
   the invoice tool. A developer who notices this script and deletes it
   can still get the copy running — obfuscating this file (done
   automatically by build/build.js) raises that bar, but doesn't
   eliminate it. There's no version of this that's unbreakable.

   SETUP — do this before flipping LICENSE_GATE_ENABLED to true:
     1. Deploy license-worker/worker.js as a Cloudflare Worker (free
        tier is enough). See license-worker/README.md for exact steps.
     2. Put the Worker's URL in LICENSE_ENDPOINT below.
     3. Add every domain this tool should run on to the Worker's
        ALLOWED_ORIGINS list (keep the localhost entries while you're
        still developing).
     4. Set LICENSE_GATE_ENABLED to true.
     5. Rebuild (cd build && npm run build) and deploy the dist/ folder
        it produces — not this src/ folder.

   FAIL MODE: this fails CLOSED — if the Worker is unreachable (network
   hiccup, not deployed yet, Worker deleted), the tool locks out rather
   than running. That's the stronger choice for deterring copies, but it
   also means the tool won't run at all if a dealer is offline or the
   Worker has an outage. To fail OPEN instead (run normally when the
   check can't be reached, only block on an explicit {ok:false}), swap
   the .catch(showLockout) line below for .catch(reveal).
   ══════════════════════════════════════════════ */
(function () {
  // Left off by default so a fresh build never accidentally locks out
  // your own users before setup above is finished. Flip once ready.
  var LICENSE_GATE_ENABLED = true;
  var LICENSE_ENDPOINT = 'https://spring-bush-ab0cbpclwandmliccheck.velocity6097-dev.workers.dev/';

  if (!LICENSE_GATE_ENABLED) return;

  document.documentElement.style.visibility = 'hidden';

  function reveal() {
    document.documentElement.style.visibility = '';
  }

  function showLockout() {
    reveal();
    var paint = function () {
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
        'text-align:center;padding:40px;font-family:sans-serif;color:#10233F;background:#EEF1F7;">' +
        '<div><h2 style="margin:0 0 10px;font-size:19px;">This copy isn\'t licensed for this domain.</h2>' +
        '<p style="margin:0;color:#64708A;font-size:14px;">Contact velocity.logs to license this tool for your site.</p>' +
        '</div></div>';
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', paint);
    } else {
      paint();
    }
  }

  fetch(LICENSE_ENDPOINT, { cache: 'no-store', mode: 'cors' })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.ok) { reveal(); } else { showLockout(); } })
    .catch(showLockout);
})();
