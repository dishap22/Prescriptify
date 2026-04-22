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

        // 2. Initial State Setting & Event Broadcast (State Pattern)
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

// 2. Get Prescription Details (PATIENT, DOCTOR, PHARMACIST)
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

// 3. Validity Verification (PHARMACIST only)
app.get('/api/prescriptions/:id/verify', authorize('DISPENSE_PRESCRIPTION'), async (req, res) => {
    try {
        const { id } = req.params;
        const prescription = await Prescription.findById(id).populate('medications.medicine');
        
        if (!prescription) {
            return res.status(404).json({ error: "Prescription not found for verification." });
        }

        const authenticityHandler = new AuthenticityCheckHandler();
        const fraudHandler = new FraudCheckHandler();
        const duplicateHandler = new DuplicateCheckHandler();

        authenticityHandler.setNext(fraudHandler).setNext(duplicateHandler);

        const isValid = await authenticityHandler.handle(prescription);
        if (!isValid) {
            return res.status(400).json({ error: "Security Verification Failed. This prescription may be fraudulent or already processed." });
        }

        res.json({ message: "Verification Successful", isValid: true, prescription });
    } catch (error) {
        res.status(500).json({ error: "Verification process failed." });
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

// 5. Seed Database from JSON Files
app.get('/api/seed', async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const { Medicine, Prescription } = require('./models/Prescription');

    try {
        const medsPath = path.join(__dirname, '../frontend/src/medicine.json');
        const specsPath = path.join(__dirname, '../frontend/src/prescriptions.json');

        if (!fs.existsSync(medsPath) || !fs.existsSync(specsPath)) {
            return res.status(404).json({ error: "Source JSON files not found." });
        }

        const medsData = JSON.parse(fs.readFileSync(medsPath, 'utf8'));
        const specsData = JSON.parse(fs.readFileSync(specsPath, 'utf8'));

        await Medicine.deleteMany({});
        await Prescription.deleteMany({});

        // 1. Seed Medicines
        const insertedMeds = await Medicine.insertMany(medsData);

        // 2. Map & Seed Prescriptions
        const mappedSpecs = specsData.map(spec => ({
            _id: spec._id,
            patientId: spec.patientId,
            doctorId: 'DOC-001', // Standardized for prototype
            status: spec.status,
            createdAt: new Date(spec.date),
            medications: spec.medications.map(m => {
                const medRef = medsData.find(med => med.name === m.name);
                return {
                    medicine: medRef ? medRef._id : "UNKNOWN",
                    dosage: m.dosage,
                    frequency: m.frequency,
                    duration: m.duration
                };
            })
        }));

        const insertedSpecs = await Prescription.insertMany(mappedSpecs);

        res.json({ 
            message: "Database seeded successfully from JSON files", 
            medicinesLoaded: insertedMeds.length,
            prescriptionsLoaded: insertedSpecs.length
        });
    } catch (error) {
        console.error("Seed Error:", error);
        res.status(500).json({ error: "Failed to seed from JSON files." });
    }
});

const PORT = 5000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB Atlas");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error("Could not connect to MongoDB", err));
