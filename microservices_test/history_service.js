const express = require('express');
const connectDB = require('./db');
const { Prescription } = require('../backend/models/Prescription');
const app = express();
app.use(express.json());

connectDB();

app.post('/verify', async (req, res) => {
    const prescriptionData = req.body;
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        for (const med of prescriptionData.medications) {
            const medId = (med.medicine?._id || med.medicine || "").toString();
            const currentPxId = prescriptionData._id ? prescriptionData._id.toString() : null;

            const technicalDuplicate = await Prescription.findOne({
                _id: { $ne: currentPxId },
                patientId: prescriptionData.patientId,
                'medications.medicine': medId,
                createdAt: { $gte: oneHourAgo },
                status: { $ne: 'REVOKED' }
            }).exec();

            if (technicalDuplicate) {
                return res.json({ isValid: false, reason: 'Technical Duplicate' });
            }

            const overlaps = await Prescription.find({
                _id: { $ne: currentPxId },
                patientId: prescriptionData.patientId,
                'medications.medicine': medId,
                status: { $in: ['PENDING', 'ACTIVE'] }
            }).sort({ createdAt: -1 }).exec();

            for (const prev of overlaps) {
                const prevMed = prev.medications.find(m => 
                    (m.medicine?._id || m.medicine || "").toString() === medId
                );
                if (prevMed) {
                    const createdAt = new Date(prev.createdAt);
                    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 3600 * 24);
                    if (daysSinceCreation < prevMed.duration) {
                        return res.json({ isValid: false, reason: 'Over-Prescription' });
                    }
                }
            }
        }
        res.json({ isValid: true });
    } catch (error) {
        res.status(500).json({ isValid: false, error: error.message });
    }
});

app.listen(5004, () => console.log('History Service running on 5004'));
