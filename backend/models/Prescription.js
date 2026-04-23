const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    safetyInfo: String,
    sideEffects: String
});

const MedicationItemSchema = new mongoose.Schema({
    medicine: { type: String, ref: 'Medicine', required: true },
    // dosage: { type: String, required: true },
    // frequency: { type: String, required: true },
    // duration: { type: Number, required: true } // Duration in days
    dosage: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d+(?:mg|mL)$/.test(v);
            },
            message: props => `${props.value} is not a valid dosage (e.g. 500mg or 10mL)!`
        }
    },
    frequency: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d+ times a day$/i.test(v);
            },
            message: props => `${props.value} must be in format 'x times a day'!`
        }
    },
    duration: {
        type: Number,
        required: true,
        min: [1, 'Duration must be at least 1 day'],
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not a whole number duration'
        }
    }
});

const PrescriptionSchema = new mongoose.Schema({
    _id: { 
        type: String, 
        default: () => `RX-${Math.random().toString(36).substr(2, 6).toUpperCase()}` 
    },
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'DISPENSED', 'EXPIRED', 'REVOKED', 'REJECTED'],
        default: 'PENDING'
    },
    rejectionReason: { type: String },
    version: { type: Number, default: 1 }, // OCC: Optimistic Concurrency Control
    medications: [MedicationItemSchema]
}, { timestamps: true });

// Pre-save hook for OCC (Optimistic Concurrency Control) as per ADR 4
PrescriptionSchema.pre('save', async function () {
    this.version += 1;
});

module.exports = {
    Medicine: mongoose.model('Medicine', MedicineSchema),
    Prescription: mongoose.model('Prescription', PrescriptionSchema)
};
