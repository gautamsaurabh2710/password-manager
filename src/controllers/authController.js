const User = require("../models/users");

const bcrypt = require("bcryptjs");

const generateToken = require("../config/jwt");

const crypto = require("crypto");

const sendOTP = require("../utils/sendOTP");

exports.register = async (req,res) => {

    try{

        const {name, email, password} = req.body;

        const existingUser = await User.findOne({email});

        if(existingUser) {
            return res.status(400).json({message: "User already exists"});

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            otp,

            otpExpires:
            Date.now() + 10 * 60 * 1000
        });

        await sendOTP(email, otp);
        return res.status(201).json({message: "OTP sent to email, please verify"});
    
    }catch(error) {
        return res.status(500).json({
            message: error?.message || "Server error",
            hint: 'Check EMAIL_USER/EMAIL_PASS and server email provider configuration',
            stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack,
        });
    }
};

exports.verifyOTP = async (req, res) => {

    try {
        const {email, otp} = req.body;

        const user = await User.findOne({email});

        if(!user || user.otp !== otp) {
            return res.status(400).json({message: "Invalid OTP"});
        }

        const token = generateToken(user._id);

        user.otp = null;

        await user.save();

        res.json({token});

    }catch(error){
        res.status(500).json({message: "Server error"});

    }
};

exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(500).json({
                message: 'Server email is not configured',
                hint: 'Missing EMAIL_USER/EMAIL_PASS in .env',
            });
        }
        if (!process.env.MONGO_URI) {
            return res.status(500).json({
                message: 'Database is not configured',
                hint: 'Missing MONGO_URI in .env',
            });
        }
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Auth is not configured',
                hint: 'Missing JWT_SECRET in .env',
            });
        }


        const user = await User.findOne({email});

        if(!user) {

            return res.status(400).json({message: "Invalid credentials"});
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch) {
            return res.status(400).json({message: "Invalid credentials"});
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otp = otp;

        user.otpExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        await sendOTP(email, otp);

        res.json({message: "OTP sent to email, please verify"});
    }catch(error) {
        console.error('[authController.login] error:', error);
        return res.status(500).json({
            message: error?.message || 'Server error',
            hint: 'Check EMAIL_USER/EMAIL_PASS and Mongo/JWT env vars',
            name: error?.name,
            stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack,
        });
    }
};

exports.logout = async (req, res) => {
    res.json({message: "Logged out successfully"});
};

exports.forgotPassword = async (req, res) => {
    try {
        const {email} = req.body;
        const user = await User.findOne({email});

        if(!user) {
            return res.status(400).json({message: "User not found"});
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetToken = resetToken;

        user.resetTokenExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        res.json({resetToken});
    }catch(error){
        res.status(500).json(error);
    }

};

exports.resetPassword = async (req, res) => {
    try {
        const {token, password} = req.body;

        const user = await User.findOne({resetToken: token, resetTokenExpires:{ $gt: Date.now() }});

        if(!user) {
            return res.status(400).json({message: "Invalid or expired token"});

        }

        user.password = await bcrypt.hash(password, 10);

        user.resetToken = null;

        await user.save();
        res.json({message: "Password reset successful"});

    }catch(error) {

        res.status(500).json(error);

    }
};

