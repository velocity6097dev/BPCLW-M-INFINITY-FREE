/* ══════════════════════════════════════════════
   LICENSE WORKER — deploy on Cloudflare Workers (free tier, no CLI
   needed — see README.md in this folder for the click-by-click steps).

   Checks the calling page's Origin header against an allowlist and
   returns { ok: true } or { ok: false }. js/license-gate.js in the main
   site calls this before it lets the page render.
   ══════════════════════════════════════════════ */

// Every domain (scheme + host, NO trailing slash) this tool is allowed
// to run on. Keep the localhost entries while developing; drop them
// once you're done if you want dev machines to require a real domain.
const ALLOWED_ORIGINS = [
  'https://bpclw-m.vercel.app',
  'https://www.yourdomain.com',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const ok = ALLOWED_ORIGINS.includes(origin);
    return new Response(JSON.stringify({ ok }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Wide open on purpose: the actual restriction happens above,
        // based on the incoming Origin header, not on this response header.
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  },
};
