const { Prescription } = require('../models/Prescription');

/**
 * EventBus: Implements a Singleton pattern for system-wide event propagation.
 * ADR 1: Event-Driven Architecture for Secondary Subsystems.
 */
class EventBus {
    constructor() {
        if (!EventBus.instance) {
            this.listeners = {};
            EventBus.instance = this;
        }
        return EventBus.instance;
    }

    subscribe(eventType, listener) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(listener);
    }

    publish(eventType, data) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(listener => {
                try {
                    listener.update(data);
                } catch (err) {
                    console.error(`Error in event listener for ${eventType}:`, err);
                }
            });
        }
    }
}

const eventBusInstance = new EventBus();
Object.freeze(eventBusInstance);

/**
 * Abstract PrescriptionState for State Pattern.
 */
class PrescriptionState {
    constructor(name) {
        this.name = name;
    }
    async onEnter(prescription) {}
    async onExit(prescription) {}
}

/**
 * Concrete Pending State.
 */
class PendingState extends PrescriptionState {
    constructor() {
        super('PENDING');
    }

    async onEnter(prescription) {
        console.log(`Prescription ${prescription._id} entered PENDING state.`);
        // Logic: Broadcast created event to listeners (e.g., Notifications, Analytics)
        eventBusInstance.publish('PRESCRIPTION_CREATED', { 
            prescriptionId: prescription._id, 
            patientId: prescription.patientId,
            doctorId: prescription.doctorId
        });
    }
}

/**
 * PrescriptionStateManager handles all lifecycle transitions.
 * ADR 2: Centralized Prescription Lifecycle Enforcement via State Machine.
 */
class PrescriptionStateManager {
    static async setInitialState(prescriptionData) {
        const prescription = new Prescription(prescriptionData);
        // Ensure initial state is PENDING
        prescription.status = 'PENDING';
        await prescription.save();
        
        const state = new PendingState();
        await state.onEnter(prescription);
        
        return prescription;
    }

    // Future implementation for other state transitions (e.g., transitionTo)
}

module.exports = {
    EventBus: eventBusInstance,
    PrescriptionStateManager
};
