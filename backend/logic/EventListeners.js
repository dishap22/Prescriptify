const { EventBus } = require('./StateManager');

/**
 * NotificationListener (Observer Implementation)
 * Listens for prescription lifecycle events and simulates sending notifications.
 */
class NotificationListener {
    static init() {
        // Listen for creation to notify the patient
        EventBus.subscribe('PRESCRIPTION_CREATED', (data) => {
            console.log(`\n[Notification Service] 📧 SENDING EMAIL to Patient ${data.patientId}`);
            console.log(`[Notification Service] Content: Your prescription ${data.prescriptionId} has been issued and is PENDING.`);
        });

        // Listen for status changes (e.g., Dispensed)
        EventBus.subscribe('PRESCRIPTION_DISPENSED', (data) => {
            console.log(`\n[Notification Service] 📱 SENDING SMS to Patient ${data.patientId}`);
            console.log(`[Notification Service] Content: Medication for ${data.prescriptionId} has been DISPENSED. Stay healthy!`);
        });

        // Listen for Rejections
        EventBus.subscribe('PRESCRIPTION_REJECTED', (data) => {
            console.log(`\n[Notification Service] ⚠️ ALERT to Doctor: Prescription Rejection`);
            console.log(`[Notification Service] Reason: ${data.reason}`);
        });
    }
}

/**
 * AuditLogListener (Observer Implementation)
 * Logs all system events for security auditing and compliance (HIPAA).
 */
class AuditLogListener {
    static init() {
        EventBus.subscribe('*', (data, eventType) => {
            const timestamp = new Date().toISOString();
            console.log(`[Audit Log] ${timestamp} | EVENT: ${eventType} | DATA: ${JSON.stringify(data)}`);
        });
    }
}

module.exports = { NotificationListener, AuditLogListener };
