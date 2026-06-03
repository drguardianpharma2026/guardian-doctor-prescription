-- =============================================
-- NexusRx / Guardian Pharma - Neon DB Setup
-- Run this in Neon SQL Editor to create all tables
-- =============================================

-- 1. Patient records (MRN)
CREATE TABLE IF NOT EXISTS mrn (
  mrn         VARCHAR(50) PRIMARY KEY,
  name        TEXT,
  age         INTEGER,
  sex         TEXT,
  phone       TEXT,
  last_weight TEXT,
  last_bp     TEXT,
  last_pulse  TEXT,
  last_temp   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Medicine master list
CREATE TABLE IF NOT EXISTS medicine (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT,
  composition TEXT,
  category    TEXT
);

-- 3. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id          SERIAL PRIMARY KEY,
  mrn         TEXT,
  patient_name TEXT,
  date        TEXT,
  diagnosis   TEXT,
  complaints  TEXT,
  medicines   TEXT,
  advice      TEXT,
  follow_up   TEXT,
  doctor_name TEXT,
  doctor_reg_no TEXT,
  vitals      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. Clinic settings (always row id=1)
CREATE TABLE IF NOT EXISTS clinic_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  name        TEXT,
  phone       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. Doctor login accounts
CREATE TABLE IF NOT EXISTS "dr login" (
  phone         TEXT PRIMARY KEY,
  name          TEXT,
  password      TEXT,
  qualification TEXT,
  consultant    TEXT,
  reg_no        TEXT
);

-- 6. Saved doctors (for dropdown)
CREATE TABLE IF NOT EXISTS doctors (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  qualifications TEXT,
  role           TEXT,
  reg_no         TEXT
);

-- 7. Fees history tracking
CREATE TABLE IF NOT EXISTS fees_history (
  id          SERIAL PRIMARY KEY,
  mrn         TEXT,
  date        TEXT,
  dr_fees     TEXT,
  med_fees    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

