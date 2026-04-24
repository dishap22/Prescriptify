const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    if (mongoose.connection.readyState === 0) {
        console.log("Connecting to:", process.env.MONGODB_URI ? "URI FOUND" : "URI MISSING");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB Atlas for Microservice");
    }
};

module.exports = connectDB;
