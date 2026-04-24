# Prescriptify

### Link to the UML diagram whiteboard:

https://www.figma.com/board/OszPTk7H5XhrWHUtcCIPgH/UML-diagram--Copy-?node-id=0-1&t=p9fd3Q1Hyyo1FLWZ-1

### Link to some documentation regarding the architecture:

https://docs.google.com/document/d/1mb9HfLCixGOGJcYr22EzpSXQFL6BDxHzkwVTk6o2CoU/edit?usp=sharing

### Link to the proposal doc:

https://docs.google.com/document/d/19xW4LnH3X6CiZDv5VFJRQdYMrVu5Z8vqcndWgWpJIi8/edit?usp=sharing

---

## Project Overview

Prescriptify is a comprehensive prescription management system designed to streamline the creation, validation, and lifecycle management of medical prescriptions. The system ensures a structured sequence of validation before prescriptions become active, providing a centralized repository accessible to authorized stakeholders (Doctors, Pharmacists, and Patients). Key features include robust fraud and duplicate detection, event-driven notifications, scheduling for medication reminders, and strict role-based access control to protect sensitive health data.

## Getting Started & UI Navigation

### 1. Setup & Installation

**Prerequisites:** Node.js (v18+), MongoDB Atlas.

1.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    # Create .env in the root directory with MONGODB_URI
    npm run dev
    # PS : DO NOT create `.env` in the backend folder. It should be in the root directory. The backend will automatically load it.
    ```
2.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    npm run dev # Runs on http://localhost:5173
    ```
3.  **Data Initialization:**
    ```bash
    curl http://localhost:5000/api/seed
    ```
    OR <br>
    Visit `http://localhost:5000/api/seed` in your browser to load the medicine database and sample prescriptions.


### 2. Navigation Guide

- **Patient Dashboard**: Displays active/past prescriptions. Click "View Details" to see the QR code for the pharmacist.
- **Doctor Console**: A simple form to issue new prescriptions. It automatically checks for duplicates via the Logic Chain.
- **Pharmacist Portal**: Go to "Verify Prescriptions" to enter an ID (e.g., RX-VAL-001). Once verified, toggle the "Dispense" button to finalize. A terminal log in the backend will simulate the notification service.
- The passwords for all the pre-seeded users is `Pass`.

For deep technical details on design patterns, see [Doc.md](Doc.md).

### 3, Testing

Testing can be done manually, or through the automated test suit, by running

```bash
cd backend
npm test
```