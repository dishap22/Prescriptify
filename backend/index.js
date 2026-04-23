const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PrescriptionBuilder = require('./logic/PrescriptionBuilder');
const { AuthenticityCheckHandler, FraudCheckHandler, DuplicateCheckHandler } = require('./logic/VerificationChain');
const { PrescriptionStateManager } = require('./logic/StateManager');
const { authorize } = require('./middleware/auth');
const { Prescription } = require('./models/Prescription');
const { NotificationListener, AuditLogListener } = require('./logic/EventListeners');
const { User } = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize Observer Listeners
NotificationListener.init();
AuditLogListener.init();

const app = express();
app.use(cors());
app.use(express.json());

// Auth Endpoints (Signup/Login)
app.post('/api/auth/signup', async (req, res) => {
    console.log("Signup Request Received:", req.body);
    try {
        const { userId, name, email, password, role } = req.body;
        
        // Find if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { userId }] });
        if (existingUser) {
            return res.status(400).json({ error: "User with this ID or Email already exists." });
        }

        const user = new User({ userId, name, email, password, role });
        await user.save();

        res.status(201).json({ message: "User registered successfully." });
    } catch (err) {
        console.error("Signup Error Details:", err);
        res.status(500).json({ error: "Registration failed.", details: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = jwt.sign(
            { id: user._id, userId: user.userId, role: user.role },
            process.env.JWT_SECRET || 'prototype-secret',
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                userId: user.userId,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Login failed." });
    }
});

// Step 4: API Orchestration Endpoint

// 1. Create Prescription (DOCTOR only)
app.post('/api/prescriptions', authorize('CREATE_PRESCRIPTION'), async (req, res) => {
    const { patientId, doctorId, medications } = req.body;
    let prescriptionData = null;

    try {
        // 1. Prescription Construction (Builder Pattern)
        const builder = new PrescriptionBuilder();
        builder.setPatient(patientId).setDoctor(doctorId);
        medications.forEach(m => {
            builder.addMedication(m.medicine, m.dosage, m.frequency, m.duration);
        });
        prescriptionData = builder.build();

        // 2. Verification (Chain of Responsibility)
        const authenticityHandler = new AuthenticityCheckHandler();
        const fraudHandler = new FraudCheckHandler();
        const duplicateHandler = new DuplicateCheckHandler();

        authenticityHandler.setNext(fraudHandler).setNext(duplicateHandler);

        const isValid = await authenticityHandler.handle(prescriptionData);
        if (!isValid) {
            throw new Error("Prescription verification failed at logic layer (Duplicate or Fraud detected).");
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
        
        // Compliance: Record the rejection if we have enough data (Builder succeeded)
        if (prescriptionData) {
            try {
                await PrescriptionStateManager.recordRejection(prescriptionData, error.message);
            } catch (saveErr) {
                console.error("Failed to record rejection audit:", saveErr.message);
            }
        }

        res.status(400).json({ error: error.message });
    }
});

// 2. Get Prescription Details (PATIENT, DOCTOR, PHARMACIST)
app.get('/api/prescriptions/:id', authorize('VIEW_PRESCRIPTION'), async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.headers['x-user-role'];
        const patientIdHeader = req.headers['x-patient-id']; // For PATIENT role

        const prescription = await Prescription.findById(id).populate('medications.medicine');
        
        if (!prescription) {
            return res.status(404).json({ error: "Prescription not found." });
        }

        // Logic-based Authorization (Finer granularity than middleware)
        if (userRole === 'DOCTOR' || userRole === 'PHARMACIST') {
            // General view permission
            return res.json(prescription);
        } else if (userRole === 'PATIENT') {
            // VIEW_OWN_PRESCRIPTION logic
            if (prescription.patientId !== patientIdHeader) {
                return res.status(403).json({ error: "Access Denied: You can only view your own prescriptions." });
            }
            return res.json(prescription);
        }

        res.status(403).json({ error: "Unauthorized access." });
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

        // Capture verification result
        const isValid = await authenticityHandler.handle(prescription);
        
        if (!isValid) {
            return res.status(400).json({ 
                error: "Security Verification Failed", 
                details: "Duplicate or fraudulent pattern detected. This patient may already have an active supply of this medication."
            });
        }

        res.json({ message: "Verification Successful", isValid: true, prescription });
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ error: "Verification process failed internal check." });
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
        const list = await Prescription.find({ patientId })
            .populate('medications.medicine')
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for faster read and to ensure objects are plain JS
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
        console.log("Seeded meds:", insertedMeds);

        // 2. Map & Seed Prescriptions
        const mappedSpecs = specsData.map(spec => ({
            _id: spec._id,
            patientId: spec.patientId,
            doctorId: 'DOC-001', // Standardized for prototype
            status: spec.status,
            createdAt: new Date(spec.date),
            medications: spec.medications.map(m => {
                const medRef = insertedMeds.find(med => med.name === m.name || med._id === m.name);
                return {
                    medicine: medRef ? medRef._id : m.name, // Fallback to provided name string if ID mapping fails
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

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB Atlas");
        // Explicitly listen on all interfaces to avoid binding issues
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server fully initialized and listening on port ${PORT}`);
            console.log(`Endpoint: http://localhost:${PORT}/api/auth/signup`);
        });
    })
    .catch(err => {
        console.error("CRITICAL: Could not connect to MongoDB", err);
        process.exit(1);
    });
