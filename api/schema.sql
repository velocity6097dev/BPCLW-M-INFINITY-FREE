-- BPCLW-M cloud sync schema.
-- Import this once via InfinityFree's phpMyAdmin:
--   Control Panel → MySQL Databases → (your DB) → phpMyAdmin → Import.

CREATE TABLE IF NOT EXISTS customers (
  dealer_code  VARCHAR(20) NOT NULL PRIMARY KEY,
  station_name VARCHAR(150),
  vendor_code  VARCHAR(20),
  gstin        VARCHAR(15),
  pan_no       VARCHAR(10),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pending_changes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  dealer_code VARCHAR(20) NOT NULL,
  field_name  VARCHAR(50) NOT NULL,
  old_value   VARCHAR(255),
  new_value   VARCHAR(255),
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  decided_at  DATETIME NULL,
  INDEX (dealer_code), INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per dealer per day. seq only ever moves up (api/invoice-number.php
-- action=reserve), and rows older than a day are deleted lazily on every
-- call (see lazy_cleanup_invoice_counters() in api/helpers.php) since
-- InfinityFree's free tier doesn't reliably offer cron jobs.
CREATE TABLE IF NOT EXISTS invoice_counters (
  dealer_code VARCHAR(20) NOT NULL,
  inv_date    DATE NOT NULL,
  seq         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (dealer_code, inv_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usage_log (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  dealer_code  VARCHAR(20),
  station_name VARCHAR(150),
  action       VARCHAR(30),      -- 'lookup' | 'generate'
  ip_hash      CHAR(64),         -- SHA-256 of the visitor IP, never the raw IP
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (created_at), INDEX (dealer_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
