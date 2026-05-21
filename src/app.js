const express = require("express");

const helmet = require("helmet");

const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

const passwordRoutes = require("./routes/passwordRoutes");

const app = express();

app.use(helmet());
app.use(cors());

// Health-check + basic sanity endpoint
app.get("/", (req, res) => {
    res.status(200).send("API Working");
});

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/passwords", passwordRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found", path: req.originalUrl });
});

module.exports = app;

