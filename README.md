# BPCL W&M Reimbursement — project guide

> New AI session on this project? Read **`CLAUDE.md`** first — it has the
> full stack/architecture rundown so you don't need to be re-briefed.

## Changelog

**2026-10-29 — InfinityFree cloud backend + multi-MPD + loader**
- Added a PHP + MySQL backend (`api/`) for InfinityFree hosting: dealer-code
  lookup/autofill cache, invoice-number sequence moved server-side (shared
  across devices), and an overwrite-approval queue — a changed dealer
  detail is never silently overwritten, it's queued for approval and
  pinged to Discord.
- Added a password-gated admin dashboard (`admin/`): usage totals, "active
  now" sessions, pending approvals with Approve/Reject buttons.
- **Fixed:** the invoice number was advancing on every page refresh, not
  just on real generation — now it only reserves a number at the moment a
  PDF is actually built (local fallback if the cloud backend isn't
  deployed yet).
- Added support for multiple MPDs per invoice ("+ Add MPD"), since a
  handwritten W&M certificate can list more than one machine. Max count
  is configurable via `MAX_MACHINES_PER_INVOICE` in `src/js/config.js`
  (default 2). The generated PDF now prints one line item per machine.
- Added the user-provided `loader.gif` as a loading overlay, shown during
  PDF generation and any cloud sync call.
- **Cloud sync is fully optional and fails silently** — until
  `api/config.php` is filled in (see "Cloud backend setup" below), the app
  works exactly as it did before this round, with everything local-only.

**2026-10-29 — Low-memory crash fix (photo crop/rotate)**
- A modern phone camera photo (often 4000–8000px) was being decoded and
  rotated at full resolution in the crop editor, which could exceed
  memory on budget/older phones — especially during Rotate. Fixed: the
  working image is now downscaled to 2000px (longest side) immediately
  after a photo is picked, before the cropper opens or any rotate
  happens. Saved photo quality is unchanged (final crop was already
  re-encoded to ≤1800px).
- Added a proper error toast if a photo genuinely can't be opened,
  instead of the screen silently getting stuck.

**2026-10-29 — Rate per Nozzle unlocked**
- The "Rate per Nozzle" field was a readonly ₹1500 constant — it's now a
  normal editable field (still defaults to ₹1500), and the invoice
  summary label and generated PDF reflect whatever rate is entered.

## Cloud backend setup (InfinityFree + MySQL)

Full design notes are in `CLAUDE.md` — quick-start version:

1. Create a MySQL database in the InfinityFree control panel.
2. Import `api/schema.sql` via phpMyAdmin (one-time).
3. Copy `api/config.sample.php` → `api/config.php` and fill in your DB
   credentials, a Discord webhook URL, an admin password (`ADMIN_TOKEN`),
   and `SITE_URL`.
4. Upload `dist/`'s contents **together with** `api/` and `admin/` to the
   same InfinityFree web root (they need to share an origin).
5. Visit `yoursite.com/api/health.php` — should return `{"ok":true,...}`.
6. Visit `yoursite.com/admin/` and log in with your `ADMIN_TOKEN`.

`api/config.php` is gitignored — never commit it.

## Folders

| Folder | What it is | What to do with it |
|---|---|---|
| `src/` | The readable source — this is what you actually edit. | Make all changes here. |
| `dist/` | Obfuscated + minified build generated from `src/`. **This is what you upload to your host.** Already built once, sitting here ready to deploy. | Never hand-edit. Regenerate with `npm run build` after any `src/` change. |
| `build/` | The Node build script that turns `src/` into `dist/`. | Run it whenever `src/` changes. |
| `license-worker/` | A small Cloudflare Worker + setup guide for the optional domain-lock feature. | Deploy once if you want the license gate active — see below. |
| `api/` | PHP + MySQL backend for InfinityFree (dealer cache, invoice-number sequence, approvals). | Deploy alongside `dist/`. Fill in `api/config.php` first — see "Cloud backend setup" above. |
| `admin/` | Password-gated usage dashboard. | Deploy alongside `api/`. |

## Day-to-day: editing the app

1. Edit files in `src/`.
2. Rebuild:
   ```
   cd build
   npm install     # first time only
   npm run build
   ```
3. Upload the regenerated `dist/` folder to your host. `src/` never goes live.

## What actually changed for copy-protection, and what didn't

Two separate things went in, matching the two problems from our chat:

**1. Obfuscation (`dist/js/*.js`)** — every JS file is run through
`javascript-obfuscator` (control-flow flattening, encoded strings, dead
code injection, anti-tamper wrapping). This doesn't hide the files from
DevTools' Sources panel — nothing can, that panel just shows what your
browser already downloaded, for any website. What it does is turn
"copy-paste readable code" into "copy-paste a wall of unreadable
`_0x270f06` noise," which is a real, meaningful deterrent against casual
reuse, verified to produce byte-for-byte identical behavior to the
source (see the test notes below) — just not against someone willing to
spend real effort reverse-engineering it.

**2. License gate (`js/license-gate.js` + `license-worker/`)** — off by
default. Once you deploy the Worker and flip it on, the site checks in
with your Worker before it renders, and only runs on domains you've
explicitly allowed. A raw copy of `dist/` re-hosted on some other domain
gets a lockout screen instead of your invoice tool. This is a real
technical barrier — but a developer who opens the (obfuscated) files,
notices the license-gate script, and deletes it can still get a working
copy running. There's no way to close that last gap in a pure static
site; doing so would mean rendering the whole page server-side per
request instead of shipping static files, which is a much bigger
architecture change than this tool needs.

### Turning the license gate on

See `license-worker/README.md` for the full click-by-click steps
(free Cloudflare account, ~5 minutes, no CLI). Short version:
1. Deploy `license-worker/worker.js` as a Cloudflare Worker.
2. Add your real domain(s) to its `ALLOWED_ORIGINS` list.
3. Put the Worker's URL into `LICENSE_ENDPOINT` in `src/js/license-gate.js`
   and set `LICENSE_GATE_ENABLED = true`.
4. `cd build && npm run build`, then deploy the new `dist/`.

It fails **closed** by default (locks out if the Worker can't be
reached) — the stronger choice for deterring copies, but it also means
the tool won't load if a dealer is offline or the Worker has an outage.
That trade-off, and how to flip it to fail-open instead, is documented
in the comments at the top of `src/js/license-gate.js`.

## Verification notes

Before handing this off, the obfuscated build was checked against the
readable source: every JS file passes a syntax check, and a battery of
calls (rupee-in-words conversion, date formatting, financial-year
calculation, GSTIN/HTML escaping, and a cross-file constant lookup
mirroring how `invoice-number.js` reads `MONTH_ABBR` from `config.js`)
produced byte-identical output on both sides. That covers the pure
logic; the interactive parts (crop, PDF paging, PDF export) rely on
real browser APIs the same way as before and should be spot-checked in
a browser once deployed, the same as any release.
