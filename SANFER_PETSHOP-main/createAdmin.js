require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/user');

// Database connect
mongoose.connect(process.env.LOCAL_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to the database');

        // Admin credentials
        const username = 'DumasAdmin2';
        const password = 'DumasAdmin123!';
        const securityQuestion = 'What is your childhood nickname?';
        const securityAnswer = 'Admin Answer';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username });
        if (existingAdmin) {
            console.log('Admin account already exists.');
            mongoose.disconnect();
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase(), 12);

        const newAdmin = new User({
            username,
            password,
            role: 'admin',
            securityQuestion,
            securityAnswer: hashedSecurityAnswer,
            passwordChangedAt: Date.now(),
            passwordHistory: [hashedPassword]
        });

        await newAdmin.save();
        console.log('Admin account created successfully!');
        mongoose.disconnect();
    })
    .catch(error => {
        console.error('Error connecting to the database:', error);
    });
