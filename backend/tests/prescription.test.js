/**
 * prescription.test.js
 * Integration tests for:
 *   TC-2 – Prescription Issuance (Builder + Security Chain)
 *   TC-3 – Verification & Dispensing (State + Observer)
 *   TC-4 – Patient History (Data Integrity)
 *
 * Uses an in-memory MongoDB instance; no changes to production code required.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Logic / models
const PrescriptionBuilder = require('../logic/PrescriptionBuilder');
const { AuthenticityCheckHandler, FraudCheckHandler, DuplicateCheckHandler } = require('../logic/VerificationChain');
const { PrescriptionStateManager } = require('../logic/StateManager');
const { authorize } = require('../middleware/auth');
const { Prescription, Medicine } = require('../models/Prescription');
const { User } = require('../models/User');
const { NotificationListener, AuditLogListener } = require('../logic/EventListeners');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

// App builder
function buildApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // POST /api/prescriptions  (DOCTOR only) – TC-2.1, TC-2.2
    app.post('/api/prescriptions', authorize('CREATE_PRESCRIPTION'), async (req, res) => {
        const { patientId, doctorId, medications } = req.body;
        let prescriptionData = null;
        try {
            const builder = new PrescriptionBuilder();
            builder.setPatient(patientId).setDoctor(doctorId);
            medications.forEach(m => builder.addMedication(m.medicine, m.dosage, m.frequency, m.duration));
            prescriptionData = builder.build();

            const head = new AuthenticityCheckHandler();
            const fraud = new FraudCheckHandler();
            const dup = new DuplicateCheckHandler();
            head.setNext(fraud).setNext(dup);

            const isValid = await head.handle(prescriptionData);
            if (!isValid) throw new Error('Duplicate prescription detected.');

            const prescription = await PrescriptionStateManager.setInitialState(prescriptionData);
            res.status(201).json({ prescriptionId: prescription._id, status: prescription.status });
        } catch (error) {
            if (prescriptionData) {
                try { await PrescriptionStateManager.recordRejection(prescriptionData, error.message); } catch (_) {}
            }
            res.status(400).json({ error: error.message });
        }
    });

    // GET /api/prescriptions/:id/verify  (PHARMACIST only) – TC-3.2, TC-3.3
    app.get('/api/prescriptions/:id/verify', authorize('DISPENSE_PRESCRIPTION'), async (req, res) => {
        try {
            const prescription = await Prescription.findById(req.params.id).populate('medications.medicine');
            if (!prescription) return res.status(404).json({ error: 'Not found.' });

            const head = new AuthenticityCheckHandler();
            const fraud = new FraudCheckHandler();
            const dup = new DuplicateCheckHandler();
            head.setNext(fraud).setNext(dup);

            const isValid = await head.handle(prescription);
            if (!isValid) return res.status(400).json({ error: 'Security Verification Failed' });

            res.json({ message: 'Verification Successful', isValid: true, prescription });
        } catch (error) {
            res.status(500).json({ error: 'Verification failed.' });
        }
    });

    // PATCH /api/prescriptions/:id/dispense  (PHARMACIST only) – TC-3.4
    app.patch('/api/prescriptions/:id/dispense', authorize('DISPENSE_PRESCRIPTION'), async (req, res) => {
        try {
            const prescription = await PrescriptionStateManager.transitionToDispensed(req.params.id);
            res.status(200).json({ prescriptionId: prescription._id, status: prescription.status });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // GET /api/patients/:patientId/prescriptions  – TC-4
    app.get('/api/patients/:patientId/prescriptions', async (req, res) => {
        try {
            const list = await Prescription.find({ patientId: req.params.patientId })
                .populate('medications.medicine')
                .sort({ createdAt: -1 })
                .lean();
            res.json(list);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch history.' });
        }
    });

    return app;
}

// Lifecycle
let mongod, app, server;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // Boot observer listeners once (mirrors index.js)
    NotificationListener.init();
    AuditLogListener.init();

    app = buildApp();
});

afterAll(async () => {
    await mongoose.connection.close();
    await mongoose.disconnect();
    await mongod.stop();
});

afterEach(async () => {
    await Prescription.deleteMany({});
    await Medicine.deleteMany({});
});

// Helpers
function makeToken(role, userId = 'USR-001') {
    return jwt.sign({ id: new mongoose.Types.ObjectId(), userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

const doctorToken = () => makeToken('DOCTOR', 'DOC-001');
const pharmacistToken = () => makeToken('PHARMACIST', 'PHR-001');

const BASE_MED = {
    medicine: 'MED-AMX',
    dosage: '500mg',
    frequency: '2 times a day',
    duration: 7,
};

async function seedMedicine(id = 'MED-AMX', name = 'Amoxicillin') {
    await Medicine.create({ _id: id, name, safetyInfo: 'Take with food.' });
}

async function createPrescription(overrides = {}) {
    const body = {
        patientId: 'PAT-101',
        doctorId: 'DOC-001',
        medications: [BASE_MED],
        ...overrides,
    };
    return request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken()}`)
        .send(body);
}

// TC-2.1: Prescription Creation
describe('TC-2.1 – Doctor issues a prescription', () => {
    beforeEach(seedMedicine);

    test('returns 201 with PENDING status', async () => {
        const res = await createPrescription();
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('PENDING');
        expect(res.body.prescriptionId).toBeDefined();
    });

    test('prescription is persisted in the database', async () => {
        const res = await createPrescription();
        const saved = await Prescription.findById(res.body.prescriptionId);
        expect(saved).not.toBeNull();
        expect(saved.patientId).toBe('PAT-101');
    });
});

// TC-2.2: Duplicate Detection (Chain of Responsibility)
describe('TC-2.2 – Duplicate prescription is rejected', () => {
    beforeEach(seedMedicine);

    test('second identical prescription within an hour returns 400', async () => {
        // First prescription (should succeed)
        const first = await createPrescription();
        expect(first.status).toBe(201);

        // Identical prescription immediately after
        const second = await createPrescription();
        expect(second.status).toBe(400);
        expect(second.body.error.toLowerCase()).toMatch(/duplicate/);
    });
});

// TC-3: Verification & Dispensing (State + Observer)
describe('TC-3 – Pharmacist verifies and dispenses a prescription', () => {
    let prescriptionId;

    beforeEach(async () => {
        await seedMedicine();
        const res = await createPrescription();
        prescriptionId = res.body.prescriptionId;
    });

    test('TC-3.3 – Verify returns isValid: true and status stays PENDING', async () => {
        const res = await request(app)
            .get(`/api/prescriptions/${prescriptionId}/verify`)
            .set('Authorization', `Bearer ${pharmacistToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.isValid).toBe(true);
        expect(res.body.prescription.status).toBe('PENDING');
    });

    test('TC-3.4 – Dispense transitions status to DISPENSED', async () => {
        const res = await request(app)
            .patch(`/api/prescriptions/${prescriptionId}/dispense`)
            .set('Authorization', `Bearer ${pharmacistToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('DISPENSED');
    });

    test('TC-3.4 – DISPENSED state is persisted in the database', async () => {
        await request(app)
            .patch(`/api/prescriptions/${prescriptionId}/dispense`)
            .set('Authorization', `Bearer ${pharmacistToken()}`);

        const prescription = await Prescription.findById(prescriptionId);
        expect(prescription.status).toBe('DISPENSED');
    });

    test('Cannot dispense an already-DISPENSED prescription (400)', async () => {
        // First dispense
        await request(app)
            .patch(`/api/prescriptions/${prescriptionId}/dispense`)
            .set('Authorization', `Bearer ${pharmacistToken()}`);

        // Second dispense attempt
        const res = await request(app)
            .patch(`/api/prescriptions/${prescriptionId}/dispense`)
            .set('Authorization', `Bearer ${pharmacistToken()}`);

        expect(res.status).toBe(400);
    });

    test('Verify endpoint requires PHARMACIST role – Doctor is denied (403)', async () => {
        const res = await request(app)
            .get(`/api/prescriptions/${prescriptionId}/verify`)
            .set('Authorization', `Bearer ${doctorToken()}`);

        expect(res.status).toBe(403);
    });
});

// TC-4: Patient History (Data Integrity)
describe('TC-4 – Patient history shows correctly populated data', () => {
    beforeEach(async () => {
        await seedMedicine('MED-PCM', 'Paracetamol');
        await createPrescription({ medications: [{ ...BASE_MED, medicine: 'MED-PCM' }] });
    });

    test('TC-4.1 & TC-4.2 – Returns an array with medicine name populated (not just ID)', async () => {
        const res = await request(app).get('/api/patients/PAT-101/prescriptions');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);

        const med = res.body[0].medications[0];
        // After populate, medicine should be an object with a name field
        expect(typeof med.medicine).toBe('object');
        expect(med.medicine.name).toBe('Paracetamol');
    });

    test('TC-4.3 – Each prescription has an _id (RX-ID for QR generation)', async () => {
        const res = await request(app).get('/api/patients/PAT-101/prescriptions');
        expect(res.body[0]._id).toBeDefined();
        expect(res.body[0]._id).toMatch(/^RX-/);
    });

    test('Returns empty array for a patient with no prescriptions', async () => {
        const res = await request(app).get('/api/patients/PAT-999/prescriptions');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});
