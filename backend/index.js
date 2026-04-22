const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const PrescriptionBuilder = require('./logic/PrescriptionBuilder');
const { AuthenticityCheckHandler, FraudCheckHandler, DuplicateCheckHandler } = require('./logic/VerificationChain');
const { PrescriptionStateManager } = require('./logic/StateManager');
const { authorize } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Step 4: API Orchestration Endpoint
app.post('/api/prescriptions', authorize('CREATE_PRESCRIPTION'), async (req, res) => {
    try {
        const { patientId, doctorId, medications } = req.body;

        // 1. Prescription Construction (Builder Pattern)
        const builder = new PrescriptionBuilder();
        builder.setPatient(patientId).setDoctor(doctorId);
        medications.forEach(m => {
            builder.addMedication(m.medicineId, m.dosage, m.frequency, m.duration);
        });
        const prescriptionData = builder.build();

        // 2. Verification (Chain of Responsibility)
        const authenticityHandler = new AuthenticityCheckHandler();
        const fraudHandler = new FraudCheckHandler();
        const duplicateHandler = new DuplicateCheckHandler();

        // Define the chain
        authenticityHandler.setNext(fraudHandler).setNext(duplicateHandler);

        // Execute chain
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
// Step 4: Dispensing/Usage Endpoint
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
        console.error("Dispensing Error:", error.message);
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescriptify')
    .then(() => {
        console.log("Connected to MongoDB");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error("Could not connect to MongoDB", err));
