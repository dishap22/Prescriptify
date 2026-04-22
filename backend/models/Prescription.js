const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    safetyInfo: String,
    sideEffects: String
});

const MedicationItemSchema = new mongoose.Schema({
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: Number, required: true } // Duration in days
});

const PrescriptionSchema = new mongoose.Schema({
    patientId: { type: String, required: true }, // For prototype, using String IDs
    doctorId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'DISPENSED', 'EXPIRED', 'REVOKED'],
        default: 'PENDING'
    },
    version: { type: Number, default: 1 }, // OCC: Optimistic Concurrency Control
    medications: [MedicationItemSchema]
}, { timestamps: true });

// Pre-save hook for OCC (Optimistic Concurrency Control) as per ADR 4
PrescriptionSchema.pre('save', function(next) {
    this.version += 1;
    next();
});

module.exports = {
    Medicine: mongoose.model('Medicine', MedicineSchema),
    Prescription: mongoose.model('Prescription', PrescriptionSchema)
};
