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
        console.log(`[Duplicate Check] Starting check for Prescription: ${prescriptionData._id}`);
        
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            for (const med of prescriptionData.medications) {
                // Ensure we have a valid medicine ID string
                const rawMedId = med.medicine?._id || med.medicine;
                if (!rawMedId) {
                    console.log("[Duplicate Check] Skipping medication with no ID (invalid data).");
                    continue;
                }
                const medId = rawMedId.toString();
                
                // Ensure current prescription ID is a string for comparison
                const currentPxId = prescriptionData._id ? prescriptionData._id.toString() : null;
                
                // 1. Technical Duplicate Check
                const technicalDuplicate = await Prescription.findOne({
                    _id: { $ne: currentPxId },
                    patientId: prescriptionData.patientId,
                    'medications.medicine': medId,
                    createdAt: { $gte: oneHourAgo },
                    status: { $ne: 'REVOKED' } 
                }).exec();

                if (technicalDuplicate) {
                    console.log(`[Duplicate Check] FAILED: Double-submission for medicine ${medId}. Recent match: ${technicalDuplicate._id}`);
                    return false;
                }

                // 2. Over-Prescription Check
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
                        const createdAt = prev.createdAt ? new Date(prev.createdAt) : new Date();
                        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 3600 * 24);
                        if (daysSinceCreation < prevMed.duration) {
                            console.log(`[Duplicate Check] FAILED: Over-prescription for ${medId}. Still has ${Math.ceil(prevMed.duration - daysSinceCreation)} days supply from Prescription ${prev._id}.`);
                            return false;
                        }
                    }
                }
            }
            
            console.log("[Duplicate Check] PASSED.");
            return true;
        } catch (error) {
            console.error("[Duplicate Check] CRITICAL ERROR:", error);
            return false;
        }
    }
}

module.exports = {
    AuthenticityCheckHandler,
    FraudCheckHandler,
    DuplicateCheckHandler
};
