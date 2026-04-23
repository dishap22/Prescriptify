# Prescriptify Prototype Documentation

## Step 1: Backend Scaffolding & Data Model

We've established the structural foundation for the **Prescription Creation** functionality using the MERN (MongoDB, Express, React, Node) stack.

### 1.1 Prescription Model (`backend/models/Prescription.js`)

The core entity is the `Prescription` model which incorporates several key architectural decisions:

- **Composition Relationship**: A `Prescription` is composed of 1 or more `MedicationItem` objects.
- **Aggregation Relationship**: Each `MedicationItem` references a `Medicine` record.
- **State Pattern Enforced**: The `status` field is an `enum` capturing the valid lifecycle states: `PENDING`, `ACTIVE`, `DISPENSED`, `EXPIRED`, `REVOKED`.
- **Optimistic Concurrency Control (ADR 4)**: A `version` field is incremented on every change via a `pre-save` hook to prevent race conditions during concurrent updates.

#### Key Code Structure:
- `MedicineSchema`: Stores drug names, safety info, and side effects.
- `MedicationItemSchema`: Defines dosage, frequency, and duration for a single entry in a prescription.
- `PrescriptionSchema`: Links the patient, doctor, and list of medications.

## Step 2: Domain Logic (Implementation)

This step implements the behavioral design patterns to handle the construction and validation of prescriptions.

### 2.1 PrescriptionBuilder (`backend/logic/PrescriptionBuilder.js`)

The **Builder Pattern** ensures a prescription object is valid and complete before creation.
- Methods: `setPatient`, `setDoctor`, `addMedication`, and `build`.
- Logic: Validates required IDs and ensures at least one medication is present, returning the prepared data.

### 2.2 Verification Chain (`backend/logic/VerificationChain.js`)

Implemented as a **Chain of Responsibility**, this ensures a systematic series of checks (e.g., authenticity/fraud/duplicate) before a prescription moves to its initial state.

- **Base `VerificationHandler`**: Manages the chain (`setNext`, `handle`) and enforces a standard `verify` interface for subclasses.
- **`AuthenticityCheckHandler`**: Verifies the identity of the prescribing doctor.
- **`FraudCheckHandler`**: Checks for suspicious patterns in medication duration or dosages.
- **`DuplicateCheckHandler`**: Ensures the same patient hasn't been prescribed the same medication within a restricted timeframe.
    - **Logic Implementation**: 
        1. **Technical Duplicate (60 min)**: Prevents accidental double-submissions by scanning for identical patient/medicine pairs in the last hour.
        2. **Over-Prescription Check**: Analyzes existing `PENDING` or `ACTIVE` prescriptions. It calculates the remaining supply based on the `duration` of previous prescriptions. If a patient attempts to get a new prescription while they still have unused days of supply remaining, the check fails.
    - **Outcome**: Prevents drug abuse and redundant prescription issuance.

#### Logic Flow:
1. `PrescriptionBuilder` creates the object.
2. `Chain` processes it (`Authenticity` → `Fraud` → `Duplicate`).
3. If all pass, the creation proceeds to **Step 3 (State Management)**.

## Step 3: State Management & Lifecycle

In this step, we've implemented the **State Pattern** and **Observer Pattern** to handle how a prescription behaves once it is validated and enters the system.

### 3.1 State Pattern (`backend/logic/StateManager.js`)

Central component for lifecycle enforcement (**ADR 2**).

- **`PrescriptionState` (Abstract)**: Defines the common interface for lifecycle states including `onEnter` and `onExit` hooks.
- **`PendingState` (Concrete)**: The state initialized after a successful verification. When entered, it triggers secondary actions like broadcasting events.
- **`PrescriptionStateManager`**: The centralized service responsible for applying transition rules. It ensures that the first step of a prescription's life is controlled and atomic.

### 3.2 Observer Pattern (`backend/logic/StateManager.js`)

Enables event-driven communication (**ADR 1**) across the platform via a Singleton `EventBus`.

- **`EventBus` (Singleton Pattern)**: A centralized messaging hub where different parts of the platform (like notifications or analytics) can subscribe to events.
- **Decoupling**: The main prescription creation process doesn't wait for secondary actions. `PendingState` simply publishes a `PRESCRIPTION_CREATED` event, allowing listeners like a `NotificationListener` to handle those tasks asynchronously.

#### Key Operations:
1. `PrescriptionStateManager` persists the built prescription.
2. `PendingState.onEnter()` is called.
3. The state broadcasts `PRESCRIPTION_CREATED` to the `EventBus`.

### 3.3 State Transition Logic: Marking as "Used/Dispensed"

We've added the capability to transition a prescription from `PENDING/ACTIVE` to `DISPENSED`.

- **`DispensedState`**: A concrete state implementation that handles the side effects of medication being dispensed (e.g., broadcasting `PRESCRIPTION_DISPENSED` event).
- **`PrescriptionStateManager.transitionToDispensed()`**: Enforces the business rule that only non-expired, non-revoked prescriptions can be marked as used. This prevents the fraudulent reuse of prescriptions.

### 3.4 Role-Based Access Control (RBAC)

We have implemented a middleware layer to enforce permissions based on user roles:

- **Doctor**: Authorized for `CREATE_PRESCRIPTION` and general `VIEW_PRESCRIPTION`.
- **Pharmacist**: Authorized for `DISPENSE_PRESCRIPTION` and general `VIEW_PRESCRIPTION`.
- **Patient**: Authorized only for `VIEW_OWN_PRESCRIPTION`. This logic is enforced at the controller level to verify that the `patientId` on the prescription matches the identity of the requester.

Authentication is handled via an `authorize` middleware that validates base permissions, while cross-object ownership (Patients) is handled in the application logic.

## Step 4: API & Frontend Integration

This stage involves exposing the domain logic via a REST API and building the user interface.

### 4.1 Orchestration API (`backend/index.js`)

We have implemented the central API endpoint `POST /api/prescriptions` which acts as the **conductor** for our patterns:

1. **Request Intake**: Receives raw data from the frontend.
2. **Construction**: Utilizes `PrescriptionBuilder` to standardize the data.
3. **Validation**: Chains `Authenticity` → `Fraud` → `Duplicate` checks via the `VerificationHandler`.
4. **Persistence & Lifecycle**: Calls `PrescriptionStateManager` to save the record in a `PENDING` state and broadcast the creation event.

### 4.2 Error Handling & Feedback

The API is designed to catch errors at each stage:
- Builder errors (missing fields).
- Verification failures (business rule violations).
- Database/Concurrency errors (ADR 4).

## Step 5: Frontend Integration & RBAC Security Refinement

### 5.1 Frontend Development (Mocked Scaffolding)
A React-based frontend has been integrated to demonstrate the system's core capabilities. This covers:
- **Doctor's Console**: Issues prescriptions via the `PrescriptionBuilder` logic.
- **Pharmacist's Panel**: Searches for prescriptions by ID and transitions them to the `DISPENSED` state.
- **Patient's View**: Securely lists their own medical history.

*Note: The frontend was scaffolded in `frontend/` as part of a collaborative effort to visualize the MERN prototype.*

### 5.2 Granular RBAC & Data Ownership
To satisfy the "Strategic Perspective" (HIPAA-like privacy), the security model has been refined to enforce **Data Ownership**:
- **Permission Mapping**: `PATIENT` role is restricted to a specific `VIEW_OWN_PRESCRIPTION` permission.
- **Ownership Verification**: The `GET /api/prescriptions/:id` endpoint now compares the `patientId` field in the record against the `x-patient-id` header provided by the client.
- **Header-Based Role Simulation**: Role-based access is controlled by the `x-user-role` header to support rapid prototyping and testing.

## Step 6: Event Listeners (Observer Pattern Implementation)

### 6.1 Decoupled Core Services
To maintain high maintainability and scalability, we have implemented concrete **Observers** that listen to the `EventBus`:
- **NotificationListener**: Intercepts `PRESCRIPTION_CREATED` and `PRESCRIPTION_STATUS_CHANGED` to simulate sending automated emails/SMS to patients.
- **AuditLogListener**: A compliance-focused observer that records every system event (using wildcard `*` matching) for HIPAA auditing.

### 6.2 Key Benefit: "Open-Closed" Principle
By using the Observer pattern, we can add new post-processing tasks (like `AnalyticsListener` or `InsuranceVerificationListener`) without modifying the core `StateManager` or API controllers.

## Step 7: Compliance Audit (REJECTED State) & System Robustness

### 7.1 "Broken" Prescription Tracking
To meet full medical auditing standards, we implemented a `REJECTED` state.
- **Logic**: If the `VerificationChain` fails (e.g., duplicate detected), the system now creates a record with `status: REJECTED` and stores the `rejectionReason`.
- **Observer Integration**: The `NotificationListener` broadcasts an alert to the prescribing doctor whenever a rejection occurs.

### 7.2 EventBus & Singleton Resilience
The `EventBus` (ADR 1) was refined during dry-run testing to support higher robustness:
- **Wildcard Support**: Implemented wildcard `*` event propagation, allowing the `AuditLogListener` to capture every transition.
- **Dual-Mode Listeners**: Supports both simple callback functions and structured objects with `.update()` methods, ensuring flexible service integration.

### 7.3 Final Prototype Lifecycle Verified
1. **User Auth**: Roles/Permissions mapping in `auth.js`.
2. **Builder**: Creation flow via `PrescriptionBuilder.js`.
3. **Verification**: Business rule checks via the CoR `VerificationChain.js`.
4. **Audit Persistence**: Failed checks are recorded in the `REJECTED` state.
5. **State Life-cycle**: Successful checks transition from `PENDING` to `DISPENSED` via the `PrescriptionStateManager.js`.
6. **Decoupled Responses**: `EventBus` broadcasts changes to the `NotificationListener` and `AuditLogListener`.

## Step 8: Deployment & Environment Readiness
- **Dependency Management**: Standard MERN backend dependencies (`mongoose`, `express`, `cors`) were integrated.
- **Dry-Run Validation**: The entire logic layer was verified using a mocked database environment, confirming that the internal design patterns work in unison without side effects.
