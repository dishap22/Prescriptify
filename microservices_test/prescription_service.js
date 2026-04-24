const express = require('express');
const axios = require('axios');
const connectDB = require('./db');
const { Prescription } = require('../backend/models/Prescription');
const app = express();
app.use(express.json());

connectDB();

app.post('/api/prescriptions', async (req, res) => {
    const prescriptionData = req.body;
    
    try {
        // 1. Call Auth Service
        const authRes = await axios.post('http://localhost:5002/verify', { doctorId: prescriptionData.doctorId });
        if (!authRes.data.isValid) return res.status(400).json({ error: 'Auth failed' });

        // 2. Call Fraud Service
        const fraudRes = await axios.post('http://localhost:5003/verify', { medications: prescriptionData.medications });
        if (!fraudRes.data.isValid) return res.status(400).json({ error: 'Fraud failed' });

        // 3. Call History Service
        const historyRes = await axios.post('http://localhost:5004/verify', prescriptionData);
        if (!historyRes.data.isValid) return res.status(400).json({ error: 'History check failed' });

        // 4. Persistence (Simulating final save)
        // In a real Saga, this would be a distributed transaction, but we simulate it here with a DB save.
        const px = new Prescription(prescriptionData);
        await px.save();

        res.status(201).json({ message: 'Success', id: px._id });
    } catch (error) {
        console.error("ORCHESTRATOR ERROR:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(5001, () => console.log('Prescription Service running on 5001'));
