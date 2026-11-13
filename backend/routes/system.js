
const express = require("express");
const db = require("../db");

const router = express.Router();

// =========================================================
// DATABASE CONNECTION TEST
// GET /api/test-db
// =========================================================

router.get("/test-db", async (req, res) => {
    try {
        const [result] = await db.query("SELECT 1 AS connected");

        res.json({
            success: true,
            message: "Database connection successful.",
            database: result[0].connected === 1 ? "Connected" : "Unknown"
        });

    } catch (error) {
        console.error("Database test error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// =========================================================
// SERVER TEST
// GET /api/test
// =========================================================

router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "ADD Motor Shop API is running."
    });
});

// =========================================================
// DATABASE TABLE LIST
// GET /api/tables
// =========================================================

router.get("/tables", async (req, res) => {
    try {
        const [tables] = await db.query("SHOW TABLES");

        res.json({
            success: true,
            tables
        });

    } catch (error) {
        console.error("Get database tables error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve database tables."
        });
    }
});

module.exports = router;
