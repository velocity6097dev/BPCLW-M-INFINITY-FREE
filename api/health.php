<?php
/* Hit this first after deploying — api/health.php — to confirm config.php
   is filled in correctly and the InfinityFree DB is reachable, before
   relying on anything else. */
require_once __DIR__ . '/helpers.php';

try{
  $pdo = get_db();
  $pdo->query('SELECT 1');
  json_out(['ok' => true, 'time' => date('c')]);
}catch(Exception $e){
  json_out(['ok' => false, 'error' => 'DB query failed'], 500);
}
