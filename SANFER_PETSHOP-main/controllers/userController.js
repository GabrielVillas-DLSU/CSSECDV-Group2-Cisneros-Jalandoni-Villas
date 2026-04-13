const bcrypt = require("bcrypt");
const User = require("../models/user");
const winston = require("winston");
const { now } = require("mongoose");
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format((info) => {
            info.timestamp = new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            });
            return info;
        })(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: "security.log" }),
    ],
});

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

const usernameRegex = /^(?=.{4,20}$)(?!.*[_.-]{2})[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*$/

const minPasswordLength = 12;

exports.getLoginAttempts = async (req, res) => {
    try {
        const users = await User.find({});
        const loginAttempts = users.map(user => ({
            username: user.username,
            role: user.role,
            failedLoginAttempts: user.failedLoginAttempts,
            lastLogin: user.lastLogin
        }));

        // Optionally, you can save this data to a JSON or CSV file here
        const fs = require('fs');
        fs.writeFileSync('loginAttempts.json', JSON.stringify(loginAttempts, null, 2));

        res.json(loginAttempts);
    } catch (error) {
        console.error("Error fetching login attempts:", error);
        res.status(500).send("Error fetching login attempts");
    }
};

//2.1.1. Require authentication for all pages and resources, except those specifically intended to
// be public
exports.authorize = (roles) => {
    return (req, res, next) => {
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            logger.warn(`Access control failure: User ${req.session.user?.username} attempted to access ${req.originalUrl}.`);
            return res.status(403).render("403", { message: "Access denied." });
        }
        next();
    };
};
// 2.1.4. Authentication failure responses should not indicate which part of the authentication data
// was incorrect. For example, instead of "Invalid username" or "Invalid password", just use
// Invalid username and/or password for both
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const now = Date.now();
        const user = await User.findOne({ username });

        if (!user) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        // 2.1.8. Enforce account disabling after an established number of invalid login attempts (e.g., five
        // attempts is common). The account must be disabled for a period of time sufficient to
        // discourage brute force guessing of credentials, but not so long as to allow for a denial-of-
        // service attack to be performed
        if (user.lockUntil && user.lockUntil.getTime() > now) {
            const remaining = Math.ceil((user.lockUntil.getTime() - now) / 60000);
            req.flash('error', `Account is locked. Try again in ${remaining} minute(s).`);
            logger.warn(`Account: ${username} is locked until ${user.lockUntil}.`);
            user.lastFailedLogin = new Date(now);
            await user.save();
            return res.redirect('/login');
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(now + 5 * 60 * 1000); // lock for 5 mins
                req.flash('error', `Account is locked. Try again in 5 minute(s).`);
                logger.warn(`Account: ${username} locked due to too many failed login attempts.`);
                user.lastFailedLogin = new Date(now);
                await user.save();
                return res.redirect('/login');
            } else {
                const remainingAttempts = 5 - user.failedLoginAttempts;
                req.flash('error', `Invalid username or password. ${remainingAttempts} attempt(s) left.`);
                logger.warn(`Invalid login attempt by: ${username}.`);
                user.lastFailedLogin = new Date(now);
                await user.save();
                return res.redirect('/login');
            }
        }

        // Double check lock even after password match
        if (user.lockUntil && user.lockUntil.getTime() > now) {
            const remaining = Math.ceil((user.lockUntil.getTime() - now) / 60000);
            req.flash('error', `Account is locked. Try again in ${remaining} minute(s).`);
            logger.warn(`Account: ${username} is still locked until ${user.lockUntil}.`);
            user.lastFailedLogin = new Date(now);
            await user.save();
            return res.redirect('/login');
        }

        // Successful reset counters
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        user.lastSuccessLogin = new Date(now);

        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            lastSuccessLogin: user.lastSuccessLogin,
            lastFailedLogin: user.lastFailedLogin
        };

        await user.save();
        logger.info(`Successful login by: ${username}.`);

        return res.redirect('/home');

    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred during login');
        return res.redirect('/login');
    }
};



exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Logout failed");
        }
        res.redirect("/home");
    });
}; 

//2.1.6. Enforce password length requirements established by policy or regulation
exports.register = async (req, res) => {
    try {
        const { username, password, confirmPassword, role, email, securityQuestion, securityAnswer } = req.body;


        if (username.length > 20){
            req.flash('error', 'Invalid Username');
            return res.redirect("/register");
        }

        // Validate Username complexity
        if (!usernameRegex.test(username)) {
            req.flash('error', 'Invalid Username');
            return res.redirect("/register");
        }

        // Validate password complexity
        if (!passwordComplexityRegex.test(password)) {
            req.flash('error', 'Invalid Password');
            return res.redirect("/register");
        }

        if (password.length < minPasswordLength) {
            req.flash('error', 'Invalid Password');
            return res.redirect("/register");
        }

        if (password !== confirmPassword){
            req.flash('error', 'Password does not match');
            return res.redirect("/register")
        }

        // Check for duplicate username or email
        const existingUser = await User.findOne({ 
            $or: [
                { username: username },
            ]
        });

        if (existingUser) {
            req.flash('error', 'Username already exists');
            return res.redirect("/register");
        }

        const now = Date.now();
        //2.1.3. Only cryptographically strong one-way salted hashes of passwords are stored
        const hashedPasswordForHistory = await bcrypt.hash(password, 12);

        const newUser = new User({
            username,
            password,
            role,
            email,
            securityQuestion,
            securityAnswer,
            passwordChangedAt: now,
            lastSuccessLogin: now,
            passwordHistory: [hashedPasswordForHistory],
        });

        await newUser.save();

        return res.redirect("/login");


    } catch (error) {
        req.flash('error', 'Registration Error');
        console.error("Registration error:", error);
        return res.status(500).json({ message: "Error registering user", error: error.message });
    }
};

exports.initiateReset = async (req, res) => {
    const { username } = req.body;
        
    const user = await User.findOne({ username });
    try {
        const user = await User.findOne({ username });
        if (!user) {
            req.flash('error', 'Invalid Username');
            return res.redirect("/forgot-password");
        }

        if (user.passwordChangedAt) {
            const passwordAgeMs = Date.now() - user.passwordChangedAt.getTime();
            const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours

            if (passwordAgeMs < oneDayMs) {
                req.flash('error', 'Password reset not allowed. Please try again after 24 hours.');
                logger.warn(`Password change attemps by: ${username}.`);
                return res.redirect("/forgot-password");
            }
        }

        if (!user.securityQuestion || !user.securityAnswer) {
            req.flash('error', 'No security question set for this account contact admin');
            return res.redirect("/forgot-password");
        }
        // 2.1.9. Password reset questions should support sufficiently random answers. (e.g., "favorite
        // book" is a bad question because “The Bible” is a very common answer)
        res.render("reset-password", {
            userId: user._id,
            securityQuestion: user.securityQuestion,
            messages: req.flash()
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error', 'An error occurred');
        res.redirect("/forgot-password");
    }
};

exports.showResetForm = async (req, res) => {
    const { userId } = req.query;
    
    try {
        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', 'Invalid reset link');
            return res.redirect('/forgot-password');
        }

        res.render('reset-password', {
            userId: user._id,
            securityVerified: true,
            layout: 'login-layout',
            messages: req.flash()
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred');
        res.redirect('/forgot-password');
    }
};

exports.handleResetPassword = async (req, res) => {
    const { userId, password, confirmPassword } = req.body;
    const now = Date.now();
    if (password !== confirmPassword) {
        req.flash("error", "Passwords do not match.");
        return res.redirect(`/reset-password?userId=${userId}`);

    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            req.flash("error", "Invalid Username / User not found");
            return res.redirect("/forgot-password");
        }

         // Validate password complexity
        if (!passwordComplexityRegex.test(password)) {
            req.flash('error', 'Password complexity error');
            return res.redirect(`/reset-password?userId=${userId}`);
        }

        const isReused = await Promise.all(
            (user.passwordHistory || []).map(async (oldHash) => await bcrypt.compare(password, oldHash))
        );

        if (isReused.includes(true)) {
            req.flash('error', 'You cannot reuse an old password.');
            logger.warn(`You cannot reuse an old password: ${userId}.`);
            return res.redirect(`/reset-password?userId=${userId}`);
        }

        user.password = password;
        user.passwordChangedAt = new Date(now);
        const hashedForHistory = await bcrypt.hash(password, 12);
        user.passwordHistory = user.passwordHistory || [];
        user.passwordHistory.push(hashedForHistory);
 
        if (user.passwordHistory.length > 3) {
                user.passwordHistory = user.passwordHistory.slice(-3);
            }

        
        await user.save();

        req.flash("success", "Password reset successfully. Please login with your new password.");
        res.redirect("/login");
    } catch (err) {
        console.error(err);
        req.flash("error", "Please try again.");
        res.redirect(`/reset-password?userId=${userId}`);
    }
};

exports.handleSecurityAnswer = async function(req, res) {
    const { userId, securityAnswer } = req.body;

    try {
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'Invalid Username / User not found');
            return res.redirect('/forgot-password');
        }

        // Compare the provided answer with the answer in the database
        const isMatch = await bcrypt.compare(securityAnswer.toLowerCase(), user.securityAnswer);
        
        if (!isMatch) {
            req.flash('error', 'Incorrect security answer');
            return res.render('reset-password', {
                userId: user._id,
                securityQuestion: user.securityQuestion,
                messages: req.flash()
            });
        }

        // If answer is correct, show the password reset form
        res.render("reset-password", {
            userId: user._id,
            //securityQuestion: false,
            securityVerified: true,
            messages: req.flash()
        });

    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred');
        res.redirect("/forgot-password");
    }
};


new winston.transports.File({ filename: "C:\Users\molin\OneDrive\Documents\CSSECDEV\security.log" });
