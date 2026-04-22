/**
 * VerificationHandler is the base abstract class for the validation chain.
 * Implements the Chain of Responsibility pattern.
 */
class VerificationHandler {
    constructor() {
        this.nextHandler = null;
    }

    setNext(handler) {
        this.nextHandler = handler;
        return handler;
    }

    // handle() is the public entry point that manages chaining
    async handle(prescriptionData) {
        if (await this.verify(prescriptionData)) {
            if (this.nextHandler) {
                return await this.nextHandler.handle(prescriptionData);
            }
            return true; // All handlers passed
        }
        return false;
    }

    // verify() is must be overridden by concrete handlers
    async verify(prescriptionData) {
        throw new Error("verify() method must be implemented by subclasses");
    }
}

/**
 * Checks if the issuing doctor is valid and authorized to create prescriptions.
 */
class AuthenticityCheckHandler extends VerificationHandler {
    async verify(prescriptionData) {
        console.log("Authenticity Check: Verifying doctor identity...");
        // In a real system, verify doctor credentials or signature here
        return !!prescriptionData.doctorId; 
    }
}

/**
 * Checks for suspicious medication patterns or dosage limits.
 */
class FraudCheckHandler extends VerificationHandler {
    async verify(prescriptionData) {
        console.log("Fraud Check: Running rules against prescription data...");
        // Rules-based fraud check: example, prevent absurdly long durations
        for (const med of prescriptionData.medications) {
            if (med.duration > 365) { 
                console.log("Fraud Check Failed: Drug duration too high.");
                return false;
            }
        }
        return true;
    }
}

/**
 * Prevents multiple prescriptions for the same medication from the same patient.
 */
const { Prescription } = require('../models/Prescription');

class DuplicateCheckHandler extends VerificationHandler {
    async verify(prescriptionData) {
        console.log("Duplicate Check: Searching for identical prescriptions...");
        
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        for (const med of prescriptionData.medications) {
            // 1. Technical Duplicate Check: Same medicine in the last 60 minutes
            const technicalDuplicate = await Prescription.findOne({
                patientId: prescriptionData.patientId,
                'medications.medicine': med.medicine,
                createdAt: { $gte: oneHourAgo },
                status: { $ne: 'REVOKED' } 
            });

            if (technicalDuplicate) {
                console.log(`Duplicate Check Failed: Double-submission detected for medicine ${med.medicine}.`);
                return false;
            }

            // 2. Over-Prescription Check: Check if current active prescription duration is still valid
            // we check for ANY active/pending prescription that hasn't "expired" yet based on its duration
            const overlaps = await Prescription.find({
                patientId: prescriptionData.patientId,
                'medications.medicine': med.medicine,
                status: { $in: ['PENDING', 'ACTIVE'] }
            }).sort({ createdAt: -1 });

            for (const prev of overlaps) {
                const prevMed = prev.medications.find(m => m.medicine.toString() === med.medicine.toString());
                if (prevMed) {
                    const daysSinceCreation = (Date.now() - prev.createdAt.getTime()) / (1000 * 3600 * 24);
                    // If the previous prescription was for 30 days and only 15 have passed, flag it
                    if (daysSinceCreation < prevMed.duration) {
                        console.log(`Duplicate Check Failed: Over-prescription detected. Patient still has ${Math.ceil(prevMed.duration - daysSinceCreation)} days of supply remaining for medicine ${med.medicine}.`);
                        return false;
                    }
                }
            }
        }
        return true;
    }
}

module.exports = {
    AuthenticityCheckHandler,
    FraudCheckHandler,
    DuplicateCheckHandler
};
