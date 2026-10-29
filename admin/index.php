<?php
/* Password-gated dashboard: usage summary, "active now", and pending
   approvals with Approve/Reject buttons. The password IS your ADMIN_TOKEN
   from api/config.php — simple session-based gate, not full user
   accounts, which is enough for a single-operator tool but keep the
   token private and long. */
session_start();
require_once __DIR__ . '/../api/db.php';

if(isset($_GET['logout'])){
  session_destroy();
  header('Location: ./');
  exit;
}

if(isset($_POST['password'])){
  if(hash_equals(ADMIN_TOKEN, $_POST['password'])){
    $_SESSION['admin_ok'] = true;
    $_SESSION['admin_token'] = $_POST['password']; // kept only for this PHP session, to sign Approve/Reject calls below
  }else{
    $error = 'Wrong password.';
  }
}

if(empty($_SESSION['admin_ok'])){
  ?>
  <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BPCLW-M Admin</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#EEF1F7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
    form{background:#fff;padding:28px;border-radius:14px;box-shadow:0 4px 20px rgba(16,35,63,.12);width:280px;}
    h2{margin:0 0 16px;color:#10233F;font-size:17px;}
    input{width:100%;padding:11px;border:1.5px solid #DEE4EF;border-radius:8px;margin-bottom:12px;font-size:15px;box-sizing:border-box;}
    button{width:100%;padding:11px;background:#17325B;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;}
    .err{color:#D64545;font-size:12.5px;margin-bottom:10px;}
  </style></head><body>
    <form method="post">
      <h2>BPCLW-M Admin</h2>
      <?php if(!empty($error)): ?><div class="err"><?= htmlspecialchars($error) ?></div><?php endif; ?>
      <input type="password" name="password" placeholder="Admin token" autofocus required>
      <button type="submit">Log in</button>
    </form>
  </body></html>
  <?php
  exit;
}

$pdo = get_db();
$totalInvoices = (int)$pdo->query("SELECT COUNT(*) FROM usage_log WHERE action='generate'")->fetchColumn();
$todayInvoices = (int)$pdo->query("SELECT COUNT(*) FROM usage_log WHERE action='generate' AND DATE(created_at)=CURDATE()")->fetchColumn();
$totalDealers  = (int)$pdo->query("SELECT COUNT(*) FROM customers")->fetchColumn();
$active = $pdo->query(
  "SELECT dealer_code, station_name, MAX(created_at) AS last_seen FROM usage_log
   WHERE created_at >= (NOW() - INTERVAL 15 MINUTE) GROUP BY dealer_code, station_name ORDER BY last_seen DESC"
)->fetchAll();
$pending = $pdo->query("SELECT * FROM pending_changes WHERE status='pending' ORDER BY created_at ASC")->fetchAll();
$recent = $pdo->query("SELECT dealer_code, station_name, action, created_at FROM usage_log ORDER BY created_at DESC LIMIT 25")->fetchAll();
?>
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BPCLW-M Admin</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#EEF1F7;color:#10233F;margin:0;padding:20px;}
  h1{font-size:19px;margin:0 0 4px;}
  .sub{color:#64708A;font-size:12.5px;margin-bottom:20px;}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;}
  .card{background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(16,35,63,.06);}
  .card .n{font-size:24px;font-weight:800;}
  .card .l{font-size:11px;color:#64708A;font-weight:600;}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;margin-bottom:24px;box-shadow:0 2px 8px rgba(16,35,63,.06);}
  th,td{padding:9px 12px;text-align:left;font-size:12.5px;border-bottom:1px solid #E9EDF4;}
  th{background:#F6F8FB;color:#64708A;font-weight:700;text-transform:uppercase;font-size:10.5px;letter-spacing:.3px;}
  section{margin-bottom:28px;}
  section h2{font-size:14px;margin:0 0 10px;}
  .approve,.reject{padding:6px 12px;border-radius:6px;border:none;font-weight:700;font-size:11.5px;cursor:pointer;margin-right:6px;}
  .approve{background:#178A63;color:#fff;}
  .reject{background:#D64545;color:#fff;}
  .logout{position:absolute;top:20px;right:20px;font-size:12px;color:#64708A;text-decoration:none;}
  .empty{color:#8996AC;font-size:12.5px;padding:14px;}
  .wrap{max-width:900px;margin:0 auto;position:relative;}
</style></head><body>
<div class="wrap">
<a class="logout" href="?logout=1">Log out</a>
<h1>BPCLW-M — Cloud Dashboard</h1>
<div class="sub">"Active" = a request in the last 15 minutes (shared hosting has no live presence channel, so this is an approximation).</div>

<div class="cards">
  <div class="card"><div class="n"><?= $totalInvoices ?></div><div class="l">Invoices (all time)</div></div>
  <div class="card"><div class="n"><?= $todayInvoices ?></div><div class="l">Invoices today</div></div>
  <div class="card"><div class="n"><?= $totalDealers ?></div><div class="l">Dealers cached</div></div>
  <div class="card"><div class="n"><?= count($active) ?></div><div class="l">Active now</div></div>
</div>

<section>
  <h2>Pending approvals (<?= count($pending) ?>)</h2>
  <?php if(!$pending): ?><div class="empty">Nothing waiting on you.</div><?php else: ?>
  <table>
    <tr><th>Dealer</th><th>Field</th><th>Old</th><th>New</th><th>When</th><th></th></tr>
    <?php foreach($pending as $p): ?>
    <tr>
      <td><?= htmlspecialchars($p['dealer_code']) ?></td>
      <td><?= htmlspecialchars($p['field_name']) ?></td>
      <td><?= htmlspecialchars($p['old_value']) ?></td>
      <td><?= htmlspecialchars($p['new_value']) ?></td>
      <td><?= htmlspecialchars($p['created_at']) ?></td>
      <td>
        <button class="approve" onclick="decide(<?= (int)$p['id'] ?>,'approve')">Approve</button>
        <button class="reject" onclick="decide(<?= (int)$p['id'] ?>,'reject')">Reject</button>
      </td>
    </tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>
</section>

<section>
  <h2>Active sessions</h2>
  <?php if(!$active): ?><div class="empty">No one active right now.</div><?php else: ?>
  <table>
    <tr><th>Dealer</th><th>Station</th><th>Last seen</th></tr>
    <?php foreach($active as $a): ?>
    <tr><td><?= htmlspecialchars($a['dealer_code']) ?></td><td><?= htmlspecialchars($a['station_name'] ?? '') ?></td><td><?= htmlspecialchars($a['last_seen']) ?></td></tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>
</section>

<section>
  <h2>Recent activity</h2>
  <table>
    <tr><th>Dealer</th><th>Station</th><th>Action</th><th>When</th></tr>
    <?php foreach($recent as $r): ?>
    <tr><td><?= htmlspecialchars($r['dealer_code'] ?? '') ?></td><td><?= htmlspecialchars($r['station_name'] ?? '') ?></td><td><?= htmlspecialchars($r['action']) ?></td><td><?= htmlspecialchars($r['created_at']) ?></td></tr>
    <?php endforeach; ?>
  </table>
</section>
</div>

<script>
function decide(id, decision){
  const token = <?= json_encode($_SESSION['admin_token'] ?? '') ?>;
  fetch('../api/approve.php?id='+id+'&decision='+decision+'&token='+encodeURIComponent(token))
    .then(r=>r.json())
    .then(d=>{ if(d.error){ alert(d.error); } location.reload(); });
}
</script>
</body></html>
