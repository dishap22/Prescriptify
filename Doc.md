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
