<?php
/* Copy this file to config.php (same folder) and fill in your real values.
   config.php is listed in .gitignore so your credentials never get
   committed — if it's missing, every api/ endpoint fails safely with a
   clear JSON error instead of exposing anything. */

// ── InfinityFree MySQL — Control Panel → MySQL Databases ──
define('DB_HOST', 'sqlXXX.infinityfree.com');   // shown on the MySQL Databases page
define('DB_NAME', 'if0_XXXXXXXX_bpclwm');       // your database name
define('DB_USER', 'if0_XXXXXXXX');              // usually same as the DB name's prefix
define('DB_PASS', 'your-db-password');

// ── Discord webhook — in your Discord server: Server Settings →
//    Integrations → Webhooks → New Webhook → Copy Webhook URL.
//    Leave blank to disable Discord notifications. ──
define('DISCORD_WEBHOOK_URL', '');

// ── Admin password — used to log into /admin and to approve/reject
//    pending changes. Make this long and only something you know; anyone
//    with it can see usage stats and approve changes to cached dealer
//    details. ──
define('ADMIN_TOKEN', 'change-this-to-something-only-you-know');

// Full site URL with no trailing slash, e.g. https://yoursite.infinityfreeapp.com
// Used to build the "review it here" link sent to Discord.
define('SITE_URL', '');
