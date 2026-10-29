<?php
/* GET/POST api/approve.php?id=5&decision=approve|reject&token=YOUR_ADMIN_TOKEN
   Applies (or discards) one pending_changes row. Called from the /admin
   dashboard's Approve/Reject buttons — token-protected, see
   require_admin_token() in helpers.php. */
require_once __DIR__ . '/helpers.php';
require_admin_token();

$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$decision = $_GET['decision'] ?? $_POST['decision'] ?? '';
if(!$id || !in_array($decision, ['approve', 'reject'], true)){
  json_out(['error' => 'id and decision=approve|reject required'], 400);
}

$pdo = get_db();
$stmt = $pdo->prepare("SELECT * FROM pending_changes WHERE id = ? AND status = 'pending'");
$stmt->execute([$id]);
$change = $stmt->fetch();
if(!$change) json_out(['error' => 'Not found or already decided'], 404);

if($decision === 'approve'){
  // Column name can't be a bound parameter — validated against a fixed
  // allow-list first, so this stays injection-safe.
  $allowed = ['station_name', 'vendor_code', 'gstin', 'pan_no'];
  $field = $change['field_name'];
  if(!in_array($field, $allowed, true)) json_out(['error' => 'Unexpected field'], 400);
  $stmt = $pdo->prepare("UPDATE customers SET `$field` = ? WHERE dealer_code = ?");
  $stmt->execute([$change['new_value'], $change['dealer_code']]);
}

$stmt = $pdo->prepare("UPDATE pending_changes SET status = ?, decided_at = NOW() WHERE id = ?");
$stmt->execute([$decision === 'approve' ? 'approved' : 'rejected', $id]);

json_out(['status' => $decision]);
