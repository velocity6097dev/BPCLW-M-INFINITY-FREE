<?php
/* GET api/stats.php?token=YOUR_ADMIN_TOKEN
   JSON usage summary — totals, who's "active", pending approvals, recent
   activity. The /admin dashboard queries the DB directly rather than
   calling this, but it's here too in case you ever want the numbers from
   somewhere else (a Discord bot command, a quick curl check, etc). */
require_once __DIR__ . '/helpers.php';
require_admin_token();

$pdo = get_db();

$totalInvoices = (int)$pdo->query("SELECT COUNT(*) FROM usage_log WHERE action='generate'")->fetchColumn();
$todayInvoices = (int)$pdo->query("SELECT COUNT(*) FROM usage_log WHERE action='generate' AND DATE(created_at)=CURDATE()")->fetchColumn();
$totalDealers  = (int)$pdo->query("SELECT COUNT(*) FROM customers")->fetchColumn();

// "Active" = a request in the last 15 minutes. There's no live
// presence/websocket channel on shared PHP hosting, so this is the
// closest practical stand-in for "who's using it right now".
$active = $pdo->query(
  "SELECT dealer_code, station_name, MAX(created_at) AS last_seen
   FROM usage_log
   WHERE created_at >= (NOW() - INTERVAL 15 MINUTE)
   GROUP BY dealer_code, station_name
   ORDER BY last_seen DESC"
)->fetchAll();

$pending = $pdo->query(
  "SELECT id, dealer_code, field_name, old_value, new_value, created_at
   FROM pending_changes WHERE status='pending' ORDER BY created_at ASC"
)->fetchAll();

$recent = $pdo->query(
  "SELECT dealer_code, station_name, action, created_at
   FROM usage_log ORDER BY created_at DESC LIMIT 25"
)->fetchAll();

json_out([
  'total_invoices'  => $totalInvoices,
  'today_invoices'  => $todayInvoices,
  'total_dealers'   => $totalDealers,
  'active_sessions' => $active,
  'pending_changes' => $pending,
  'recent_activity' => $recent,
]);
