<?php
/* GET api/lookup.php?dealer_code=119934
   Returns the cached Station Name / Vendor Code / GSTIN / PAN for a dealer
   code, or {found:false} if nothing's cached yet. Called from
   cloud-sync.js's cloudLookupDealer(). */
require_once __DIR__ . '/helpers.php';

$dealer_code = trim($_GET['dealer_code'] ?? '');
if($dealer_code === '') json_out(['found' => false]);

$pdo = get_db();
$stmt = $pdo->prepare("SELECT station_name, vendor_code, gstin, pan_no FROM customers WHERE dealer_code = ?");
$stmt->execute([$dealer_code]);
$row = $stmt->fetch();

log_usage($pdo, $dealer_code, $row['station_name'] ?? null, 'lookup');

if(!$row) json_out(['found' => false]);
json_out(array_merge(['found' => true], $row));
