<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if($_SERVER['REQUEST_METHOD'] === 'OPTIONS'){ http_response_code(204); exit; }

function json_out($data, $status = 200){
  http_response_code($status);
  echo json_encode($data);
  exit;
}

function read_json_body(){
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function require_admin_token(){
  $token = $_GET['token'] ?? ($_POST['token'] ?? '');
  if(!hash_equals(ADMIN_TOKEN, (string)$token)){
    json_out(['error' => 'Invalid or missing admin token'], 403);
  }
}

/* Sends a message to the configured Discord webhook. Does nothing (not
   even an error) if no webhook URL is set, so a request never fails just
   because Discord isn't configured yet. */
function send_discord($content){
  if(empty(DISCORD_WEBHOOK_URL)) return;
  $ch = curl_init(DISCORD_WEBHOOK_URL);
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode(['content' => $content]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 5,
  ]);
  curl_exec($ch);
  curl_close($ch);
}

/* InfinityFree's free tier doesn't reliably offer cron jobs, so instead of
   a scheduled task this piggybacks cleanup onto normal traffic: every call
   to invoice-number.php quietly deletes counter rows for dates more than a
   day old. One cheap indexed DELETE — keeps the table from growing forever
   with no external scheduler needed. */
function lazy_cleanup_invoice_counters($pdo){
  $pdo->exec("DELETE FROM invoice_counters WHERE inv_date < (CURDATE() - INTERVAL 1 DAY)");
}

function log_usage($pdo, $dealer_code, $station_name, $action){
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $ip_hash = $ip ? hash('sha256', $ip) : null; // hash only — never store the raw IP
  $stmt = $pdo->prepare("INSERT INTO usage_log (dealer_code, station_name, action, ip_hash) VALUES (?,?,?,?)");
  $stmt->execute([$dealer_code ?: null, $station_name ?: null, $action, $ip_hash]);
}
