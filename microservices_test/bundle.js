const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    if (mongoose.connection.readyState === 0) {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected!");
    }
};

const PrescriptionSchema = new mongoose.Schema({
    _id: { type: String, default: () => `RX-${Math.random().toString(36).substr(2, 6).toUpperCase()}` },
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: 'PENDING' },
    medications: [{
        medicine: { type: String, required: true },
        dosage: String,
        frequency: String,
        duration: Number
    }]
});
const Prescription = mongoose.model('Prescription', PrescriptionSchema);

(async () => {
    await connectDB();
    
    // Auth Service
    const authApp = express();
    authApp.use(express.json());
    authApp.post('/verify', (req, res) => res.json({ isValid: !!req.body.doctorId }));
    authApp.listen(5002);

    // Fraud Service
    const fraudApp = express();
    fraudApp.use(express.json());
    fraudApp.post('/verify', (req, res) => res.json({ isValid: (req.body.medications || []).every(m => m.duration <= 365) }));
    fraudApp.listen(5003);

    // History Service
    const historyApp = express();
    historyApp.use(express.json());
    historyApp.post('/verify', async (req, res) => {
        try {
            const { patientId, medications } = req.body;
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            for (const med of medications) {
                const medId = (med.medicine?._id || med.medicine || "").toString();
                const technicalDuplicate = await Prescription.findOne({
                    patientId,
                    'medications.medicine': medId,
                    createdAt: { $gte: oneHourAgo },
                    status: { $ne: 'REVOKED' }
                }).exec();
                if (technicalDuplicate) return res.json({ isValid: false });
            }
            res.json({ isValid: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    historyApp.listen(5004);

    // Orchestrator
    const mainApp = express();
    mainApp.use(express.json());
    mainApp.post('/api/prescriptions', async (req, res) => {
        try {
            await axios.post('http://localhost:5002/verify', { doctorId: req.body.doctorId });
            await axios.post('http://localhost:5003/verify', { medications: req.body.medications });
            await axios.post('http://localhost:5004/verify', req.body);
            const px = new Prescription(req.body);
            await px.save();
            res.status(201).json({ id: px._id });
        } catch (e) { res.status(500).send(e.message); }
    });
    mainApp.listen(5001, () => console.log('All MS simulation running. Orchestrator on 5001'));
})();
