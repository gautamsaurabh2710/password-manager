const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const passwordController = require("../controllers/passwordController");

router.post("/", authMiddleware, passwordController.addPassword);

router.get("/", authMiddleware, passwordController.getPasswords);

module.exports = router;