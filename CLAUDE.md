# CLAUDE.md — project context for any AI session working on this repo

Read this before making changes. It exists so you don't have to be
re-briefed from scratch every time a new chat/account picks this project
up. Keep it updated as things change — see "Keeping this file current" at
the bottom.

## What this is

**BPCLW-M** — an invoice generator for BPCL petrol pump dealers to claim
reimbursement of the **Weights & Measures (W&M) stamping fee** charged per
nozzle/machine each year. A dealer fills in station + machine details,
attaches their W&M certificate + payment receipt (+ optional extra doc),
and the app produces a formatted tax-invoice PDF (invoice page + attached
images as extra pages) ready to submit.

## Stack

- **Frontend**: plain HTML/CSS/vanilla JS. No framework, no bundler logic
  beyond obfuscation. `jsPDF` + `html2canvas` (CDN) build the PDF client-side.
- **Backend** (new, this round): PHP + MySQL, built for **InfinityFree**
  free hosting. No framework — plain PDO + hand-written endpoints.
- **Build pipeline**: `src/` is hand-edited source. `build/build.js`
  (Node, uses `javascript-obfuscator` + `clean-css` + `html-minifier-terser`)
  produces the obfuscated `dist/` that actually gets deployed.

## ⚠️ The one rule that matters most: never edit `dist/` by hand

`dist/` is a **build artifact**. Every change goes in `src/`, then:

```bash
cd build
npm install      # only needed once, or if build/package.json changes
node build.js    # regenerates dist/ from src/
```

`build/node_modules` is usually already vendored in the project zip so
this works offline. If it's missing, `npm install` needs internet once.

The git repo (see `.git`) historically **only tracks `dist/`** — `src/`
was not committed. `.gitignore` now also tracks `api/`, `admin/`,
`CLAUDE.md` and `README.md` (but never `api/config.php` — that holds real
credentials and must never be committed). If you want `src/` tracked too,
that's a deliberate choice to make with the project owner, not something
to change silently.

## Repo layout

```
src/            hand-edited source — index.html, css/, js/, assets/
dist/           obfuscated build output — this is what gets deployed to Vercel/wherever the frontend is hosted
build/          build.js + its package.json/node_modules
api/            PHP backend (new) — see "Cloud backend" below
admin/          password-gated admin dashboard (new) — single index.php
license-worker/ optional Cloudflare Worker for a license gate (pre-existing, unrelated to this round's work)
```

### `src/js/` — one concern per file

| File | Responsibility |
|---|---|
| `config.js` | Constants: `MAX_MACHINES_PER_INVOICE`, `ENABLE_CLOUD_SYNC`, `API_BASE`, persisted field list, month abbreviations |
| `utils.js` | `$()`, `rsPlain()`, `numWords()`, icon refresh, small shared helpers |
| `mpd-rows.js` | **New.** Repeatable "Machine N" rows in Equipment & Pricing — add/remove, capped by `MAX_MACHINES_PER_INVOICE`. `getMpdRows()` is the single source of truth for what machines are on the form right now; everything else (recalc, invoice template, validation) reads through it instead of touching row DOM directly. |
| `cloud-sync.js` | **New.** All calls to `api/*.php`. Every function here fails silently (returns `null`/no-ops) if the backend isn't reachable — the app must keep working with zero backend deployed. |
| `dates.js` | Date pickers, FY calculation |
| `invoice-number.js` | Nozzle/rate totals (`recalc()`), and the invoice number: **peek vs. commit** split (see below) |
| `attachments.js` | Upload slots for cert/receipt/extra doc, FileReader → cropper handoff |
| `cropper.js` | Crop/rotate UI. Downscales large camera photos to `CROP_MAX_WORKING_DIM` (2000px) before editing — see "Fixed bugs" below |
| `invoice-template.js` | Builds the actual invoice HTML that gets rasterized into the PDF |
| `actions.js` | Validation, Reset, Generate PDF, toast, localStorage persistence |
| `security.js`, `license-gate.js` | Pre-existing, unrelated to this round |
| `app.js` | `DOMContentLoaded` — init order matters, see the file |

## Fixed bugs (don't reintroduce these)

1. **Invoice number used to advance on every page refresh**, not just on
   real generation — `app.js` called `updateInvoiceNo()` on load, which
   committed+incremented the stored sequence unconditionally. Fixed by
   splitting `invoice-number.js` into a read-only **peek** (display only,
   called on load/every input change) and a **commit** (`commitInvoiceNo()`,
   called exactly once, only from `doGeneratePDF()` in `actions.js`, right
   before the PDF is actually built). Never call anything that writes to
   the sequence counter outside `commitInvoiceNo()`.
2. **Low-memory crashes when cropping/rotating camera photos** — a
   4000–8000px camera photo was being decoded and rotated at full
   resolution. Fixed in `cropper.js`: the working image is downscaled to
   `CROP_MAX_WORKING_DIM` (2000px longest side) immediately after the
   initial decode, before the cropper UI builds or any rotate happens.
   `applyCrop()` already re-encodes the final crop to ≤1800px, so this
   doesn't reduce saved photo quality.

## Multiple MPDs per invoice

A handwritten W&M certificate can list more than one machine (typically
up to 2). The Equipment & Pricing section supports adding MPD rows via
`mpd-rows.js`, capped by `MAX_MACHINES_PER_INVOICE` in `config.js` (raise
this one constant to allow more — nothing else needs to change). Rate per
Nozzle and Additional Charges stay **global** (shared across every
machine); only Model / Serial No. / Nozzle count are per-row. The
generated PDF prints one line item per machine.

Rows are only ever added at the end and removed from the end (no
mid-list removal), which keeps ids stable and avoids a renumbering step.

## Cloud backend (`api/`, `admin/`) — InfinityFree + MySQL

**Status: code is written and ready to deploy, but NOT yet connected to a
real database.** The frontend is designed so that's safe — every
`cloud-sync.js` call fails silently and falls back to local-only behavior
until this is set up.

### To go live
1. Create a MySQL database in the InfinityFree control panel.
2. Import `api/schema.sql` via phpMyAdmin (one-time).
3. Copy `api/config.sample.php` → `api/config.php`, fill in:
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` (from the InfinityFree panel)
   - `DISCORD_WEBHOOK_URL` (Discord → Server Settings → Integrations → Webhooks)
   - `ADMIN_TOKEN` (a password you choose — also logs into `/admin`)
   - `SITE_URL` (the deployed site's URL, no trailing slash)
4. Upload the contents of `dist/` **and** the `api/` and `admin/` folders
   together, all in the same web root on InfinityFree (they must share an
   origin — `API_BASE = 'api/'` in `config.js` is a relative path).
5. Hit `yoursite.com/api/health.php` first — it should return
   `{"ok":true,...}`. If not, re-check `api/config.php`.
6. Visit `yoursite.com/admin/` and log in with `ADMIN_TOKEN`.

### Design decisions worth knowing
- **No cron job.** InfinityFree's free tier doesn't reliably offer
  scheduled tasks. Instead, `api/invoice-number.php` does a **lazy
  cleanup** on every call — deletes `invoice_counters` rows older than a
  day as a side effect of normal traffic (`lazy_cleanup_invoice_counters()`
  in `api/helpers.php`). No external scheduler needed.
- **Overwrite protection.** `api/save-customer.php` never silently
  overwrites a cached dealer record. A genuinely different (non-blank)
  value goes into `pending_changes` + a Discord ping; only filling in a
  previously-blank field is applied immediately. Approve/reject from
  `/admin` (calls `api/approve.php`, token-protected).
- **"Active sessions"** (`/admin`, `api/stats.php`) = distinct
  dealer/station with a request in the last 15 minutes. There's no
  websocket/presence channel on shared PHP hosting, so this is an
  approximation, documented as such on the dashboard itself.
- **Admin auth** is a single shared `ADMIN_TOKEN`, not real accounts —
  adequate for a single-operator tool, not a multi-admin system.
- IP addresses are **hashed** (`usage_log.ip_hash`, SHA-256) before
  storage, never stored raw.

### DB tables (full detail in `api/schema.sql`)
`customers` (cache, keyed by `dealer_code`) · `pending_changes`
(overwrite queue) · `invoice_counters` (per dealer+date sequence) ·
`usage_log` (lookups + generations, feeds the dashboard).

## Loader

`src/assets/loader.gif` (user-provided) is shown via `#cloudLoader` (CSS
in `styles.css`, shown/hidden by `showCloudLoader()`/`hideCloudLoader()`
in `cloud-sync.js`) during PDF generation and any cloud API call.

## Keeping this file current

When you make a meaningful change to this project in a new session,
update this file (and add a dated entry to `README.md`'s changelog)
**before** ending your turn — don't rely on being asked. That's the whole
point of this file existing.
