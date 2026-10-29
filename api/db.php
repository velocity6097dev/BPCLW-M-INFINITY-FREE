<?php
/* Shared DB bootstrap. Every other api/*.php file requires this (directly
   or via helpers.php) instead of connecting itself. */

if(!file_exists(__DIR__ . '/config.php')){
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'api/config.php is missing. Copy api/config.sample.php to api/config.php and fill in your InfinityFree DB details.']);
  exit;
}
require_once __DIR__ . '/config.php';

function get_db(){
  static $pdo = null;
  if($pdo !== null) return $pdo;
  try{
    $pdo = new PDO(
      'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
      DB_USER, DB_PASS,
      [ PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC ]
    );
  }catch(PDOException $e){
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database connection failed — check api/config.php against your InfinityFree MySQL Databases page.']);
    exit;
  }
  return $pdo;
}
