const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");

const limiter = require("../middlewares/ratelimiter");;

router.post("/register", limiter, authController.register);

router.post("/verify-otp", limiter, authController.verifyOTP);

router.post("/login", limiter, authController.login);

router.post("/logout", authController.logout);

router.post("/forgot-password", limiter, authController.forgotPassword);

router.post("/reset-password", limiter, authController.resetPassword);

module.exports = router;
