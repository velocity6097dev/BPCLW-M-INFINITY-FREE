# License Worker — deploy steps

This is the small server-side piece the license gate needs. It runs on
Cloudflare's free tier — no credit card, no CLI, about 5 minutes.

1. Go to https://dash.cloudflare.com and sign up / log in (free).
2. In the sidebar: **Workers & Pages** → **Create** → **Create Worker**.
3. Give it any name (e.g. `bpcl-license-check`) and click **Deploy** to
   create it with the default "Hello World" template.
4. Click **Edit code**. Delete the default contents and paste in the
   contents of `worker.js` from this folder.
5. Edit the `ALLOWED_ORIGINS` array near the top: replace
   `https://yourdomain.com` / `https://www.yourdomain.com` with your
   real production domain(s), exactly as they appear in the browser
   address bar (scheme + host, no trailing slash). Keep the two
   `127.0.0.1:5500` / `localhost:5500` entries while you're still
   developing locally.
6. Click **Deploy** (top right).
7. Copy the URL Cloudflare gives you — it looks like
   `https://bpcl-license-check.<your-subdomain>.workers.dev`.
8. Open `src/js/license-gate.js` in the main project:
   - Paste that URL into `LICENSE_ENDPOINT`.
   - Set `LICENSE_GATE_ENABLED = true`.
9. Rebuild: `cd build && npm install && npm run build`. This regenerates
   `dist/` with the gate wired in and everything obfuscated.
10. Deploy the **dist/** folder (not src/) to your host.

## Updating the allowed domains later

Go back to the Worker in the Cloudflare dashboard → **Edit code** →
update `ALLOWED_ORIGINS` → **Deploy**. Takes effect immediately, no
rebuild of the site needed since the frontend just asks the Worker.

## Cost / limits

Cloudflare Workers' free tier includes 100,000 requests/day, which is
far more than a single dealer-facing invoice tool will ever use.
