-- ==========================================================================
-- TRAVEL & EXPENSE MODULE — Database Migration
-- Adds: travel_role on users, config tables, travel request tables,
--       expense claim tables, attachment storage.
-- Idempotent: safe to re-run.
-- ==========================================================================

-- 1. Add travel_role to users (separate from leave role)
SET @c := (SELECT COUNT(*) FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'users'
             AND column_name = 'travel_role');
SET @s := IF(@c = 0,
  "ALTER TABLE users ADD COLUMN travel_role ENUM('employee','manager','office_coordinator','finance_admin','admin') NOT NULL DEFAULT 'employee' AFTER role",
  "SELECT 'travel_role exists' AS status");
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Sync travel_role from existing role column for managers/admins
UPDATE users SET travel_role = 'admin'   WHERE LOWER(role) = 'admin'   AND travel_role = 'employee';
UPDATE users SET travel_role = 'manager' WHERE LOWER(role) = 'manager' AND travel_role = 'employee';

-- 3. Per Diem Rates (Admin uploadable via CSV)
CREATE TABLE IF NOT EXISTS per_diem_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  region VARCHAR(50) NOT NULL,            -- SA / Africa / Europe / USA / Asia
  meal_type ENUM('Full Day','Half Day') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'ZAR',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_region_meal (region, meal_type)
);

-- 4. Project IDs (Admin uploadable via CSV)
CREATE TABLE IF NOT EXISTS project_ids (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_code VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Expense Categories (Admin uploadable via CSV)
CREATE TABLE IF NOT EXISTS expense_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Travel Requests (parent record)
CREATE TABLE IF NOT EXISTS travel_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_email VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  credential ENUM('MR','MRS','DR') NOT NULL,
  id_passport VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  project_id_1 VARCHAR(50) NOT NULL,
  project_id_2 VARCHAR(50),
  email VARCHAR(255) NOT NULL,
  cellphone VARCHAR(50) NOT NULL,
  purpose_of_travel TEXT NOT NULL,
  place_to_be_visited VARCHAR(255) NOT NULL,
  chai_role VARCHAR(255) NOT NULL,
  -- Approval
  manager_email VARCHAR(255),
  alternative_manager_email VARCHAR(255),
  approver_reason TEXT,
  status ENUM('pending','approved','rejected','cancelled','in_progress','booked','per_diem_paid','completed') DEFAULT 'pending',
  manager_comment TEXT,
  rejection_reason TEXT,
  -- Per diem totals (computed at submit)
  per_diem_local_zar DECIMAL(12,2) DEFAULT 0,
  per_diem_other_zar DECIMAL(12,2) DEFAULT 0,
  business_advance_zar DECIMAL(12,2) DEFAULT 0,
  total_zar DECIMAL(12,2) DEFAULT 0,
  date_amount_required DATE,
  disbursement_method ENUM('Bank Details','Petty Cash') DEFAULT 'Bank Details',
  -- Banking
  bank_name VARCHAR(150),
  branch_number VARCHAR(50),
  account_number VARCHAR(50),
  account_name VARCHAR(150),
  -- Coordinator/Finance processing
  coordinator_email VARCHAR(255),
  coordinator_completed_at TIMESTAMP NULL,
  finance_email VARCHAR(255),
  finance_completed_at TIMESTAMP NULL,
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_travel_requester (requester_email),
  INDEX idx_travel_manager (manager_email),
  INDEX idx_travel_status (status)
);

-- 7. Travel Flights (multi-row child)
CREATE TABLE IF NOT EXISTS travel_flights (
  id INT PRIMARY KEY AUTO_INCREMENT,
  travel_request_id INT NOT NULL,
  from_location VARCHAR(150) NOT NULL,
  to_location VARCHAR(150) NOT NULL,
  flight_date DATE NOT NULL,
  time_from TIME,
  time_to TIME,
  meal_request VARCHAR(150),
  frequent_flyer_number VARCHAR(50),
  FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE
);

-- 8. Car Rental / Shuttle (single record per request)
CREATE TABLE IF NOT EXISTS travel_car_rental (
  id INT PRIMARY KEY AUTO_INCREMENT,
  travel_request_id INT NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  preferred_mode ENUM('Manual','Automatic') DEFAULT 'Automatic',
  total_kilos_estimated DECIMAL(10,2),
  pickup_branch VARCHAR(150),
  dropoff_branch VARCHAR(150),
  pickup_date DATE,
  dropoff_date DATE,
  pickup_time TIME,
  dropoff_time TIME,
  FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE
);

-- 9. Accommodation
CREATE TABLE IF NOT EXISTS travel_accommodation (
  id INT PRIMARY KEY AUTO_INCREMENT,
  travel_request_id INT NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  venue VARCHAR(255),
  check_in_date DATE,
  check_out_date DATE,
  meal_first_day BOOLEAN DEFAULT FALSE,
  meal_full_duration BOOLEAN DEFAULT FALSE,
  specific_meal_request TEXT,
  FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE
);

-- 10. Per Diem Lines
CREATE TABLE IF NOT EXISTS travel_per_diem_lines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  travel_request_id INT NOT NULL,
  line_date DATE NOT NULL,
  expense_category VARCHAR(100) NOT NULL,    -- e.g. "SA - Full Day"
  amount DECIMAL(12,2) NOT NULL,             -- in original currency
  currency VARCHAR(8) DEFAULT 'ZAR',
  fx_rate DECIMAL(12,6) DEFAULT 1,
  amount_zar DECIMAL(12,2) NOT NULL,
  region VARCHAR(50),                         -- denormalized for reporting
  FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE
);

-- 11. Travel Attachments (supporting docs)
CREATE TABLE IF NOT EXISTS travel_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  travel_request_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_data LONGBLOB NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE
);

-- 12. Expense Claims (parent)
CREATE TABLE IF NOT EXISTS expense_claims (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_email VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  purpose ENUM('reimbursement','advance_acquittal') NOT NULL,
  related_travel_id INT NULL,
  manager_email VARCHAR(255),
  status ENUM('pending','approved','rejected','cancelled','paid') DEFAULT 'pending',
  total_amount DECIMAL(12,2) DEFAULT 0,
  manager_comment TEXT,
  rejection_reason TEXT,
  finance_email VARCHAR(255),
  finance_completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (related_travel_id) REFERENCES travel_requests(id) ON DELETE SET NULL,
  INDEX idx_expense_requester (requester_email),
  INDEX idx_expense_manager (manager_email),
  INDEX idx_expense_status (status)
);

-- 13. Expense Claim Lines
CREATE TABLE IF NOT EXISTS expense_claim_lines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_claim_id INT NOT NULL,
  line_no INT NOT NULL,
  expense_date DATE NOT NULL,
  location VARCHAR(150),
  project_id VARCHAR(50),
  expense_category VARCHAR(100),
  receipt_amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  -- Manual receipt fields (when no invoice attached)
  manual_receipt_vendor VARCHAR(150),
  manual_receipt_purpose VARCHAR(255),
  manual_receipt_signature VARCHAR(150),
  attachment_id INT NULL,
  FOREIGN KEY (expense_claim_id) REFERENCES expense_claims(id) ON DELETE CASCADE
);

-- 14. Mileage log (for private vehicle travel claims)
CREATE TABLE IF NOT EXISTS expense_mileage_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_claim_id INT NOT NULL,
  travel_date_from DATE NOT NULL,
  travel_date_to DATE NOT NULL,
  opening_km DECIMAL(10,2) NOT NULL,
  closing_km DECIMAL(10,2) NOT NULL,
  total_km DECIMAL(10,2) NOT NULL,
  private_km DECIMAL(10,2) DEFAULT 0,
  business_km DECIMAL(10,2) NOT NULL,
  business_details TEXT,
  FOREIGN KEY (expense_claim_id) REFERENCES expense_claims(id) ON DELETE CASCADE
);

-- 15. Expense Attachments
CREATE TABLE IF NOT EXISTS expense_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_claim_id INT NOT NULL,
  expense_line_id INT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_data LONGBLOB NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_claim_id) REFERENCES expense_claims(id) ON DELETE CASCADE,
  FOREIGN KEY (expense_line_id) REFERENCES expense_claim_lines(id) ON DELETE SET NULL
);

-- 16. Travel notifications log
CREATE TABLE IF NOT EXISTS travel_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  travel_request_id INT NULL,
  expense_claim_id INT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================================
-- Seed: Per Diem Rates
-- ==========================================================================
INSERT IGNORE INTO per_diem_rates (region, meal_type, amount, currency) VALUES
('SA',     'Full Day', 850.00,  'ZAR'),
('SA',     'Half Day', 550.00,  'ZAR'),
('Africa', 'Full Day', 85.00,   'USD'),
('Africa', 'Half Day', 50.00,   'USD'),
('Europe', 'Full Day', 120.00,  'USD'),
('Europe', 'Half Day', 70.00,   'USD'),
('USA',    'Full Day', 110.00,  'USD'),
('USA',    'Half Day', 65.00,   'USD'),
('Asia',   'Full Day', 85.00,   'USD'),
('Asia',   'Half Day', 50.00,   'USD');

SELECT 'Travel module migration complete.' AS status;
