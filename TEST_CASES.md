# 🧪 Prescriptify Test Suite

This document outlines the manual and automated test cases to verify the **MERN** implementation, focused on the architectural design patterns (Chain of Responsibility, State, Observer, Builder).

---

## 🛠️ Prerequisites & Setup

1.  **Backend**: `cd backend && npm run dev` (Ensure `.env` is configured).
2.  **Frontend**: `cd frontend && npm run dev`.
3.  **Bootstrap Data**: Visit `http://localhost:5000/api/seed` in your browser to initialize test users and medicines.

---

## 🏃 Test Plan

### 1. User Authentication (RBAC)
**Goal**: Verify roles can only access their respective dashboards.
- [ ] **TC-1.1**: Register and login as `doctor@test.com` / `password123`. Verify access to the **Doctor Console**.
- [ ] **TC-1.2**: Register and login as `patient@test.com` / `password123`. Verify access to **Medical History**.
- [ ] **TC-1.3**: Register and login as `pharmacist@test.com` / `password123`. Verify access to **Verification Portal**.

### 2. Prescription Issuance (Builder & Security Chain)
**Goal**: Verify a Doctor can issue a prescription and the system blocks fraudulent/duplicate entries.
- [ ] **TC-2.1**: From the Doctor Console, create a prescription for `PAT-101` with `Amoxicillin`.
- [ ] **TC-2.2 (Security Chain)**: Attempt to create the **exact same** prescription again immediately.
    - *Expected Result*: The backend should return a `400 Error` stating "Duplicate prescription detected." (Chain of Responsibility).

### 3. Verification & Dispensing (State & Observer)
**Goal**: Verify the Pharmacist can transition the state of a prescription.
- [ ] **TC-3.1**: Log in as Pharmacist.
- [ ] **TC-3.2**: Go to "Verify Prescriptions" and enter `RX-VAL-001`.
- [ ] **TC-3.3**: Click **"Verify Authenticity"**. Status should stay `PENDING`.
- [ ] **TC-3.4**: Click **"Dispense"**.
    - *Expected Result*: Status changes to `DISPENSED`. Check the **Backend Terminal** for a log message: `[Notification Service] Prescription RX-VAL-001 has been dispensed...` (Observer Pattern).

### 4. Patient History (Data Integrity)
**Goal**: Verify data reflects correctly on the patient side.
- [ ] **TC-4.1**: Log in as Patient.
- [ ] **TC-4.2**: Verify that the medicine names are displayed (e.g., "Paracetamol") instead of IDs.
- [ ] **TC-4.3**: Click "View Details" to ensure the **QR Code** is generated for the `RX-ID`.

---

## 🤖 Automated Integration Testing
If you have Python installed, you can run the full workflow automatically:

```bash
python3 test_integration.py
```

This script performs:
1. `POST /api/auth/login` (Admin/Doctor/Pharmacist)
2. `POST /api/prescriptions` (Builder + Chain)
3. `GET /api/prescriptions/:id/verify` (Logic Gate)
4. `PATCH /api/prescriptions/:id/dispense` (State + Observer)
