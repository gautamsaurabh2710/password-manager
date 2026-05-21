const nodemailer = require("nodemailer");

const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`,
    });
  } catch (err) {
    // Preserve the original nodemailer error so the login handler returns meaningful 500 details
    throw new Error(err?.message || "Failed to send OTP email via nodemailer");
  }
};

module.exports = sendOTP;

