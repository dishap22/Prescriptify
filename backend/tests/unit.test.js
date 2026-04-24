/**
 * unit.test.js
 * Pure unit tests for logic classes:
 *   - PrescriptionBuilder  (Builder Pattern)
 *   - AuthenticityCheckHandler, FraudCheckHandler  (Chain of Responsibility)
 *   - EventBus  (Observer / Singleton)
 *
 * No database or HTTP server is started here.
 */

const PrescriptionBuilder = require('../logic/PrescriptionBuilder');
const {
    AuthenticityCheckHandler,
    FraudCheckHandler,
} = require('../logic/VerificationChain');

// PrescriptionBuilder
describe('PrescriptionBuilder', () => {
    test('builds a valid prescription object with all required fields', () => {
        const builder = new PrescriptionBuilder();
        const result = builder
            .setPatient('PAT-101')
            .setDoctor('DOC-001')
            .addMedication('MED-AMX', '500mg', '2 times a day', 7)
            .build();

        expect(result.patientId).toBe('PAT-101');
        expect(result.doctorId).toBe('DOC-001');
        expect(result.medications).toHaveLength(1);
        expect(result.medications[0].medicine).toBe('MED-AMX');
        expect(result.status).toBe('PENDING');
    });

    test('supports chaining multiple addMedication calls', () => {
        const result = new PrescriptionBuilder()
            .setPatient('PAT-101')
            .setDoctor('DOC-001')
            .addMedication('MED-A', '100mg', '1 times a day', 5)
            .addMedication('MED-B', '200mg', '2 times a day', 10)
            .build();

        expect(result.medications).toHaveLength(2);
    });

    test('throws when patientId is missing', () => {
        const builder = new PrescriptionBuilder()
            .setDoctor('DOC-001')
            .addMedication('MED-AMX', '500mg', '2 times a day', 7);

        expect(() => builder.build()).toThrow('Patient ID and Doctor ID are required');
    });

    test('throws when doctorId is missing', () => {
        const builder = new PrescriptionBuilder()
            .setPatient('PAT-101')
            .addMedication('MED-AMX', '500mg', '2 times a day', 7);

        expect(() => builder.build()).toThrow('Patient ID and Doctor ID are required');
    });

    test('throws when no medications are added', () => {
        const builder = new PrescriptionBuilder()
            .setPatient('PAT-101')
            .setDoctor('DOC-001');

        expect(() => builder.build()).toThrow('At least one medication is required');
    });
});

// AuthenticityCheckHandler
describe('AuthenticityCheckHandler', () => {
    test('passes when doctorId is present', async () => {
        const handler = new AuthenticityCheckHandler();
        const result = await handler.verify({ doctorId: 'DOC-001', medications: [] });
        expect(result).toBe(true);
    });

    test('fails when doctorId is absent', async () => {
        const handler = new AuthenticityCheckHandler();
        const result = await handler.verify({ medications: [] });
        expect(result).toBe(false);
    });
});

// FraudCheckHandler
describe('FraudCheckHandler', () => {
    test('passes for normal medication durations', async () => {
        const handler = new FraudCheckHandler();
        const result = await handler.verify({
            medications: [
                { medicine: 'MED-A', duration: 30 },
                { medicine: 'MED-B', duration: 90 },
            ],
        });
        expect(result).toBe(true);
    });

    test('passes for a duration exactly at 365 days', async () => {
        const handler = new FraudCheckHandler();
        const result = await handler.verify({
            medications: [{ medicine: 'MED-A', duration: 365 }],
        });
        expect(result).toBe(true);
    });

    test('fails when any medication has duration > 365 days', async () => {
        const handler = new FraudCheckHandler();
        const result = await handler.verify({
            medications: [{ medicine: 'MED-A', duration: 366 }],
        });
        expect(result).toBe(false);
    });

    test('passes with an empty medication list', async () => {
        const handler = new FraudCheckHandler();
        const result = await handler.verify({ medications: [] });
        expect(result).toBe(true);
    });
});

// EventBus (Singleton)
describe('EventBus', () => {
    // Re-require to get the singleton instance
    const { EventBus } = require('../logic/StateManager');

    test('calls subscribed listener when event is published', () => {
        const mockListener = jest.fn();
        EventBus.subscribe('TEST_EVENT', mockListener);
        EventBus.publish('TEST_EVENT', { foo: 'bar' });
        expect(mockListener).toHaveBeenCalledWith({ foo: 'bar' }, 'TEST_EVENT');
    });

    test('is a singleton – same instance returned on multiple imports', () => {
        const { EventBus: EventBus2 } = require('../logic/StateManager');
        expect(EventBus).toBe(EventBus2);
    });
});
