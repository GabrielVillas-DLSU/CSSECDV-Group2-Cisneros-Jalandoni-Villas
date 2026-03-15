const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Define the schema 
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ["buyer", "editor", "admin", "cashier"] },
    securityQuestion: { type: String},
    securityAnswer: { type: String},
    passwordChangedAt:{type: Date},
    passwordHistory: [String],
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: {type: Date},
    lastSuccessLogin:{type: Date},
    lastFailedLogin:{type: Date},
}, { collection: "Users" });

// Hash password and security answer before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password") && !this.isModified("securityAnswer")) return next();
    
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
        this.passwordChangedAt = Date.now();
    }

    if (this.isModified("securityAnswer")) {
        this.securityAnswer = await bcrypt.hash(this.securityAnswer.toLowerCase(), 12);
    }
    
    next();
});

// Compare hashed passwords 
userSchema.methods = {
    comparePassword: async function(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    },
    compareSecurityAnswer: async function(candidateAnswer) {
        return bcrypt.compare(candidateAnswer.toLowerCase(), this.securityAnswer);
    }
};

// Create and export the model 
const User = mongoose.model("User", userSchema);
module.exports = User; // Export only the model 
