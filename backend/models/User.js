const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // e.g., PAT-101, DOC-202
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['PATIENT', 'DOCTOR', 'PHARMACIST'], 
        required: true 
    },
    // Pattern: Observer - Preferences for notifications
    notificationPreferences: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = { User };
