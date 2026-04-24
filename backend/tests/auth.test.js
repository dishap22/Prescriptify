/**
 * auth.test.js
 * Integration tests for TC-1: User Authentication & RBAC
 *
 * Covers:
 *   TC-1.1 – Doctor signup/login returns token, role grants CREATE_PRESCRIPTION
 *   TC-1.2 – Patient signup/login returns token, role is denied CREATE_PRESCRIPTION
 *   TC-1.3 – Pharmacist signup/login returns token, role is denied CREATE_PRESCRIPTION
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const { authorize } = require('../middleware/auth');

let mongod;
let app;
let server;

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

function buildApp() {
    const _app = express();
    _app.use(cors());
    _app.use(express.json());

    // Signup
    _app.post('/api/auth/signup', async (req, res) => {
        try {
            const { userId, name, email, password, role } = req.body;
            const existing = await User.findOne({ $or: [{ email }, { userId }] });
            if (existing) return res.status(400).json({ error: 'User already exists.' });
            const user = new User({ userId, name, email, password, role });
            await user.save();
            res.status(201).json({ message: 'User registered successfully.' });
        } catch (err) {
            res.status(500).json({ error: 'Registration failed.', details: err.message });
        }
    });

    // Login
    _app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            const token = jwt.sign(
                { id: user._id, userId: user.userId, role: user.role },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            res.json({ token, user: { userId: user.userId, name: user.name, role: user.role } });
        } catch (err) {
            res.status(500).json({ error: 'Login failed.' });
        }
    });

    // Protected stub – needs CREATE_PRESCRIPTION permission
    _app.post('/api/prescriptions', authorize('CREATE_PRESCRIPTION'), (req, res) => {
        res.status(201).json({ message: 'ok' });
    });

    return _app;
}

// Lifecycle
beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    app = buildApp();
});

afterAll(async () => {
    await mongoose.connection.close();
    await mongoose.disconnect();
    await mongod.stop();
});

afterEach(async () => {
    await User.deleteMany({});
});

// Helpers
async function signupAndLogin(role, suffix = '') {
    const email = `${role.toLowerCase()}${suffix}@test.com`;
    await request(app).post('/api/auth/signup').send({
        userId: `${role}-${suffix || '001'}`,
        name: `Test ${role}`,
        email,
        password: 'password123',
        role,
    });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    return res;
}

// TC-1.1: Doctor
describe('TC-1.1 – Doctor authentication', () => {
    test('registers and logs in successfully, returns JWT', async () => {
        const res = await signupAndLogin('DOCTOR');
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.role).toBe('DOCTOR');
    });

    test('Doctor JWT grants access to CREATE_PRESCRIPTION endpoint', async () => {
        const loginRes = await signupAndLogin('DOCTOR');
        const token = loginRes.body.token;

        const res = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(201);
    });
});

// TC-1.2: Patient
describe('TC-1.2 – Patient authentication', () => {
    test('registers and logs in successfully, returns JWT', async () => {
        const res = await signupAndLogin('PATIENT');
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.role).toBe('PATIENT');
    });

    test('Patient JWT is denied access to CREATE_PRESCRIPTION (403)', async () => {
        const loginRes = await signupAndLogin('PATIENT');
        const token = loginRes.body.token;

        const res = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(403);
    });
});

// TC-1.3: Pharmacist
describe('TC-1.3 – Pharmacist authentication', () => {
    test('registers and logs in successfully, returns JWT', async () => {
        const res = await signupAndLogin('PHARMACIST');
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.role).toBe('PHARMACIST');
    });

    test('Pharmacist JWT is denied access to CREATE_PRESCRIPTION (403)', async () => {
        const loginRes = await signupAndLogin('PHARMACIST');
        const token = loginRes.body.token;

        const res = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(403);
    });
});

// Edge cases
describe('Authentication edge cases', () => {
    test('login with wrong password returns 401', async () => {
        await request(app).post('/api/auth/signup').send({
            userId: 'PAT-999',
            name: 'Wrong Pass',
            email: 'wrong@test.com',
            password: 'password123',
            role: 'PATIENT',
        });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'wrong@test.com', password: 'badpassword' });
        expect(res.status).toBe(401);
    });

    test('request without token or role header returns 401', async () => {
        const res = await request(app).post('/api/prescriptions').send({});
        expect(res.status).toBe(401);
    });

    test('duplicate signup returns 400', async () => {
        await signupAndLogin('DOCTOR');
        const res = await request(app).post('/api/auth/signup').send({
            userId: 'DOCTOR-001',
            name: 'Dup Doctor',
            email: 'doctor@test.com',
            password: 'password123',
            role: 'DOCTOR',
        });
        expect(res.status).toBe(400);
    });
});
