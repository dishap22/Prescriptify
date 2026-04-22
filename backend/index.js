const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const PrescriptionBuilder = require('./logic/PrescriptionBuilder');
const { AuthenticityCheckHandler, FraudCheckHandler, DuplicateCheckHandler } = require('./logic/VerificationChain');
const { PrescriptionStateManager } = require('./logic/StateManager');
const { authorize } = require('./middleware/auth');
const { Prescription } = require('./models/Prescription');

const app = express();
app.use(cors());
app.use(express.json());

// Step 4: API Orchestration Endpoint

// 1. Create Prescription (DOCTOR only)
app.post('/api/prescriptions', authorize('CREATE_PRESCRIPTION'), async (req, res) => {
    try {
        const { patientId, doctorId, medications } = req.body;

        // 1. Prescription Construction (Builder Pattern)
        const builder = new PrescriptionBuilder();
        builder.setPatient(patientId).setDoctor(doctorId);
        medications.forEach(m => {
            builder.addMedication(m.medicine, m.dosage, m.frequency, m.duration);
        });
        const prescriptionData = builder.build();

        // 2. Verification (Chain of Responsibility)
        const authenticityHandler = new AuthenticityCheckHandler();
        const fraudHandler = new FraudCheckHandler();
        const duplicateHandler = new DuplicateCheckHandler();

        authenticityHandler.setNext(fraudHandler).setNext(duplicateHandler);

        const isValid = await authenticityHandler.handle(prescriptionData);
        if (!isValid) {
            return res.status(400).json({ error: "Prescription verification failed. Check logs for details." });
        }

        // 3. Initial State Setting & Event Broadcast (State Pattern)
        const prescription = await PrescriptionStateManager.setInitialState(prescriptionData);

        res.status(201).json({
            message: "Prescription created successfully",
            prescriptionId: prescription._id,
            status: prescription.status
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 2. Verify/Get Prescription (DOCTOR, PHARMACIST, PATIENT)
app.get('/api/prescriptions/:id', authorize('VIEW_PRESCRIPTION'), async (req, res) => {
    try {
        const { id } = req.params;
        const prescription = await Prescription.findById(id).populate('medications.medicine');
        
        if (!prescription) {
            return res.status(404).json({ error: "Prescription not found." });
        }

        res.json(prescription);
    } catch (error) {
        res.status(500).json({ error: "Search failed." });
    }
});

// 3. Dispense Prescription (PHARMACIST only)
app.patch('/api/prescriptions/:id/dispense', authorize('DISPENSE_PRESCRIPTION'), async (req, res) => {
    try {
        const { id } = req.params;
        const prescription = await PrescriptionStateManager.transitionToDispensed(id);
        
        res.status(200).json({
            message: "Prescription marked as DISPENSED",
            prescriptionId: prescription._id,
            status: prescription.status
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 4. List Patient Prescriptions (PATIENT, DOCTOR)
app.get('/api/patients/:patientId/prescriptions', async (req, res) => {
    try {
        const { patientId } = req.params;
        const list = await Prescription.find({ patientId }).sort({ createdAt: -1 });
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch history." });
    }
});

// Seed Medicines for the Prototype
app.get('/api/seed', async (req, res) => {
    const { Medicine, Prescription } = require('./models/Prescription');
    await Medicine.deleteMany({});
    await Prescription.deleteMany({});
    
    // Seed Medicines
    await Medicine.create({ _id: 'MED-001', name: 'Paracetamol 500mg' });
    await Medicine.create({ _id: 'MED-002', name: 'Amoxicillin 250mg' });
    await Medicine.create({ _id: 'MED-003', name: 'Ibuprofen 400mg' });
    await Medicine.create({ _id: 'MED-004', name: 'Cetirizine 10mg' });
    await Medicine.create({ _id: 'MED-005', name: 'Azithromycin 500mg' });

    // Seed Prescriptions for Testing
    await Prescription.create({
        _id: 'RX-VAL-001',
        patientId: 'PAT-101',
        doctorId: 'DOC-001',
        status: 'ACTIVE',
        medications: [{ medicine: 'MED-001', dosage: '1 tab', frequency: '3 times a day', duration: 5 }]
    });
    await Prescription.create({
        _id: 'RX-VAL-002',
        patientId: 'PAT-101',
        doctorId: 'DOC-001',
        status: 'ACTIVE',
        medications: [{ medicine: 'MED-002', dosage: '1 cap', frequency: 'Every 8 hours', duration: 7 }]
    });
    await Prescription.create({
        _id: 'RX-BAD-999',
        patientId: 'PAT-101',
        doctorId: 'DOC-001',
        status: 'DISPENSED',
        medications: [{ medicine: 'MED-003', dosage: '1 tab', frequency: 'Twice daily', duration: 3 }]
    });

    res.json({ message: "Prototype seed successful" });
});

const PORT = 5000;
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescriptify')
//     .then(() => {
//         console.log("Connected to MongoDB");
//         app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//     })
//     .catch(err => console.error("Could not connect to MongoDB", err));
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (Using In-Memory Mock DB)`);
});
