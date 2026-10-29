<?php
/* GET api/invoice-number.php?action=peek|reserve&dealer_code=119934&date=2026-10-28

   action=peek    — read-only. Returns what the next seq WOULD be. Never writes.
   action=reserve — atomically advances and returns the real next seq for
                    this dealer_code + date. Called once, only when a PDF
                    is actually being generated (commitInvoiceNo() in
                    invoice-number.js, via cloudReserveInvoiceSeq() in
                    cloud-sync.js).

   Every call also runs a lazy cleanup of counter rows older than a day —
   see lazy_cleanup_invoice_counters() in helpers.php for why that's a
   lazy sweep instead of a cron job. */
require_once __DIR__ . '/helpers.php';

$pdo = get_db();
lazy_cleanup_invoice_counters($pdo);

$dealer_code = trim($_GET['dealer_code'] ?? '');
$date = trim($_GET['date'] ?? date('Y-m-d'));
$action = $_GET['action'] ?? 'peek';

if($dealer_code === '') json_out(['error' => 'dealer_code required'], 400);
if(!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_out(['error' => 'date must be YYYY-MM-DD'], 400);

if($action === 'reserve'){
  // Atomic upsert: creates the row at seq=1 the first time, otherwise
  // increments it. Two devices generating for the same dealer on the same
  // day at the same instant still can never get the same number.
  $stmt = $pdo->prepare(
    "INSERT INTO invoice_counters (dealer_code, inv_date, seq) VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE seq = seq + 1"
  );
  $stmt->execute([$dealer_code, $date]);

  $stmt = $pdo->prepare("SELECT seq FROM invoice_counters WHERE dealer_code = ? AND inv_date = ?");
  $stmt->execute([$dealer_code, $date]);
  json_out(['seq' => (int)$stmt->fetchColumn()]);
}

// action=peek (default) — read-only.
$stmt = $pdo->prepare("SELECT seq FROM invoice_counters WHERE dealer_code = ? AND inv_date = ?");
$stmt->execute([$dealer_code, $date]);
$current = $stmt->fetchColumn();
json_out(['seq' => $current !== false ? ((int)$current + 1) : 1]);
