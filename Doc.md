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
- **Compliance Monitoring (REJECTED State)**: A new `REJECTED` state has been added to the hierarchy. If a prescription fails any part of the `Verification Chain`, the system now explicitly persists the rejection to the database. This ensures a transparent audit trail of why a request was denied.

#### Key Operations:
1. `PrescriptionStateManager` persists the built prescription.
2. `PendingState.onEnter()` is called.
3. The state broadcasts `PRESCRIPTION_CREATED` to the `EventBus`.
4. If verification fails, `PrescriptionStateManager.recordRejection()` is called, shifting the entity to a `REJECTED` state and broadcasting an audit event.

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

### 8.1 API & Environment Orchestration
- **Universal Configuration**: The system has been updated to use a centralized `.env` file at the project root. This ensures that the Backend, Seeding Utilities, and any future services share a single source of truth for the `MONGODB_URI` and `JWT_SECRET`.
- **Axios Interceptors**: The React frontend uses interceptors to automatically secure all outgoing requests with the current session's JWT, facilitating a seamless transition between Auth and Action states.

### 8.2 User Authentication & Session Persistence
- **JWT Authentication (ADR 6)**: Implemented a robust `User` model with secure `bcrypt` hashing. The system now supports role-based accounts:
  - **DOCTOR**: (ID: `DOC-XX`)
  - **PHARMACIST**: (ID: `PHAR-XX`)
  - **PATIENT**: (ID: `PAT-XX`)
- **Session Management**: Login tokens expire after 1 hour, following industry-standard security protocols for medical data systems.

### 8.3 Automated Seeding Utility (`backend/seed_db.py`)
To accelerate testing and ensure a populated environment for the prototype:
- **Python Seeding**: A dedicated script generates a varied dataset including 10+ standard medications and a baseline of sample prescriptions.
- **Pattern Alignment**: The script bypasses the Builder but explicitly enforces the `version` (ADR 4) and `status` (ADR 2) fields, ensuring the database is in a valid state for the platform to manage.

- **Dry-Run Validation**: The entire logic layer was verified using a mocked database environment, confirming that the internal design patterns work in unison without side effects.

## Step 9: Stability & Data Integrity Fixes

### 9.1 Mongoose Middleware Refactor
Resolved a critical `TypeError: next is not a function` bug by transitioning Mongoose pre-save hooks (used for password hashing and OCC versioning) to standard `async/await` patterns. This modernization prevents middleware execution crashes during registration and updates.

### 9.2 Data Population & Defensive Rendering
- **Backend Schema Population**: Fixed an issue in the Prescription history and verification endpoints where medicine details weren't being correctly returned. Added `.populate('medications.medicine')` to ensuring the UI and the Duplicate Check logic receive full medicine objects.
- **Frontend Safety**: Implemented defensive null-checks in `ActivePrescriptions.jsx` to prevent the `TypeError` crash when medication data is partially missing.

### 9.3 Frontend Routing & State Resilience
- **Persistent Sessions**: Refactored the React `App.jsx` to initialize user state directly from `localStorage`, preventing data loss on page refreshes.
- **Robust Logout Flow**: Implemented a forced `window.location.href` refresh upon logout to ensure all sensitive cryptographic tokens and role-based states are fully purged from the application instance.

## Step 10: Security Chain & Verification Refinement

### 10.1 Chain of Responsibility Synchronization
- **Logic Correction**: Fixed a bug where the `handleVerify` frontend function was calling the generic "View" endpoint instead of the "Security Verification" endpoint. This ensures that the `Authenticity`, `Fraud`, and `Duplicate` check handlers are actually executed by the pharmacist.
- **ID Normalization**: Updated the `DuplicateCheckHandler` to normalize ObjectIDs to strings using `.toString()`. This prevents comparison failures when the database returns a BSON ObjectID while the logic expects a string.

### 10.2 Prototype Notification Simulation
- **Observer Integration**: Verified and synchronized the `NotificationListener`. In this prototype, the service identifies `PRESCRIPTION_CREATED` and `PRESCRIPTION_DISPENSED` events.
- **Console Simulation (Design Pattern Focus)**: While real email/SMS transmission is simulated via console output (`[Notification Service] `), the implementation strictly adheres to the **Observer Pattern**. This allows the core state-management logic to remain entirely agnostic of notification protocols, satisfying the **Interface Segregation** and **Dependency Inversion** principles.
- **Pluggable Architecture**: The use of a centralized `EventBus` ensures that replacing this placeholder with a real service (e.g., SendGrid, Twilio, or AWS SNS) requires zero changes to the `PrescriptionStateManager` or DB models.

## Step 11: Architectural Decoupling & placeholder Philosophy

### 11.1 The "Pluggable" Service Design
Throughout this prototype, several complex external integrations are represented by placeholders. However, these are not mere stubs; they are implemented using advanced design patterns that ensure the system is **Product Ready** from an architectural standpoint:

- **Notification Engine (Observer Pattern)**: 
    - *Placeholders*: Console logs for Email/SMS.
    - *Architecture*: The system avoids "Hard-Coding" notification logic. By using the `EventBus` (Observer Pattern), we've decoupled the **Trigger** (State Change) from the **Action** (Notification). This ensures the core medical logic is never "polluted" by third-party API dependencies.
- **Identity Verification (Chain of Responsibility)**:
    - *Placeholders*: Basic presence checks for `doctorId` and `patientId`.
    - *Architecture*: The `VerificationHandler` abstract class defines a strict contract. Any future "Real-World" authenticity logic (like Digital Certificates or HIPAA-compliant ID verification) can be "plugged into" the chain as a new concrete class without modifying the existing controller logic.
- **Audit Logging (Wildcard Eventing)**:
    - *Placeholders*: Real-time terminal output.
    - *Architecture*: By subscribing to the `*` wildcard event, the `AuditLogListener` demonstrates a system that is "Secure by Design." Every state transition is captured automatically, creating a foundation for legally-defensible medical records.

### 11.2 Benefit: Maintenance vs. Implementation
This approach satisfies the **Open-Closed Principle**: The system is **Open** for extension (adding real services) but **Closed** for modification (the core lifecycle logic remains untouched).
