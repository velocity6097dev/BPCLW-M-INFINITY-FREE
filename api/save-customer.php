<?php
/* POST api/save-customer.php  {dealer_code, station_name, vendor_code, gstin, pan_no}
   Called once a PDF has actually been generated (cloudSaveCustomer() in
   cloud-sync.js). New dealer → cached straight away. Known dealer with
   identical or newly-filled-in-blank details → applied straight away.
   Known dealer with a genuinely CHANGED value → never overwritten
   silently: queued in pending_changes and pinged to Discord, left for you
   to approve/reject from /admin. */
require_once __DIR__ . '/helpers.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'POST only'], 405);

$body = read_json_body();
$dealer_code = trim($body['dealer_code'] ?? '');
if($dealer_code === '') json_out(['error' => 'dealer_code required'], 400);

$incoming = [
  'station_name' => trim($body['station_name'] ?? ''),
  'vendor_code'  => trim($body['vendor_code'] ?? ''),
  'gstin'        => strtoupper(trim($body['gstin'] ?? '')),
  'pan_no'       => trim($body['pan_no'] ?? ''),
];

$pdo = get_db();
$stmt = $pdo->prepare("SELECT * FROM customers WHERE dealer_code = ?");
$stmt->execute([$dealer_code]);
$existing = $stmt->fetch();

log_usage($pdo, $dealer_code, $incoming['station_name'], 'generate');

if(!$existing){
  $stmt = $pdo->prepare("INSERT INTO customers (dealer_code, station_name, vendor_code, gstin, pan_no) VALUES (?,?,?,?,?)");
  $stmt->execute([$dealer_code, $incoming['station_name'], $incoming['vendor_code'], $incoming['gstin'], $incoming['pan_no']]);
  json_out(['status' => 'created']);
}

// Field-by-field diff — a value that was blank before and is now filled in
// isn't a "change" worth approving, only a genuinely different non-blank
// value is.
$diffs = [];
foreach($incoming as $field => $newVal){
  $oldVal = (string)($existing[$field] ?? '');
  if($newVal !== '' && $newVal !== $oldVal){
    $diffs[$field] = ['old' => $oldVal, 'new' => $newVal];
  }
}

if(empty($diffs)){
  $stmt = $pdo->prepare(
    "UPDATE customers SET
       station_name = COALESCE(NULLIF(?, ''), station_name),
       vendor_code  = COALESCE(NULLIF(?, ''), vendor_code),
       gstin        = COALESCE(NULLIF(?, ''), gstin),
       pan_no       = COALESCE(NULLIF(?, ''), pan_no)
     WHERE dealer_code = ?"
  );
  $stmt->execute([$incoming['station_name'], $incoming['vendor_code'], $incoming['gstin'], $incoming['pan_no'], $dealer_code]);
  json_out(['status' => 'unchanged']);
}

$stmt = $pdo->prepare("INSERT INTO pending_changes (dealer_code, field_name, old_value, new_value) VALUES (?,?,?,?)");
$lines = [];
foreach($diffs as $field => $v){
  $stmt->execute([$dealer_code, $field, $v['old'], $v['new']]);
  $lines[] = "• **$field**: `{$v['old']}` → `{$v['new']}`";
}

$adminUrl = SITE_URL !== '' ? (rtrim(SITE_URL, '/') . '/admin/') : '(set SITE_URL in api/config.php for a direct link)';
send_discord(
  "⚠️ **Dealer $dealer_code** entered details that differ from what's cached:\n" .
  implode("\n", $lines) . "\n" .
  "Review & approve/reject: $adminUrl"
);

json_out(['status' => 'pending_approval', 'changed_fields' => array_keys($diffs)]);
