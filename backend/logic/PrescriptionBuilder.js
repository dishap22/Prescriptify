/**
 * PrescriptionBuilder handles the step-by-step construction of a Prescription.
 * It ensures all mandatory fields are present before returning the object.
 */
class PrescriptionBuilder {
    constructor() {
        this.prescriptionData = {
            medications: [],
            status: 'PENDING',
            version: 1
        };
    }

    setPatient(patientId) {
        this.prescriptionData.patientId = patientId;
        return this;
    }

    setDoctor(doctorId) {
        this.prescriptionData.doctorId = doctorId;
        return this;
    }

    addMedication(medicineId, dosage, frequency, duration) {
        this.prescriptionData.medications.push({
            medicine: medicineId,
            dosage: dosage,
            frequency: frequency,
            duration: duration
        });
        return this;
    }

    build() {
        if (!this.prescriptionData.patientId || !this.prescriptionData.doctorId) {
            throw new Error("Patient ID and Doctor ID are required to build a prescription.");
        }
        if (this.prescriptionData.medications.length === 0) {
            throw new Error("At least one medication is required.");
        }
        return this.prescriptionData;
    }
}

module.exports = PrescriptionBuilder;
