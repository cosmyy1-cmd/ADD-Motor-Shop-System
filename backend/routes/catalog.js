
const express = require("express");
const db = require("../db");

const router = express.Router();

// =========================================================
// GET ALL SERVICES
// GET /api/services
// =========================================================

router.get("/services", async (req, res) => {
    try {
        const [services] = await db.query(
            "SELECT * FROM services ORDER BY id DESC"
        );

        res.json({
            success: true,
            services
        });

    } catch (error) {
        console.error("Get services error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve services."
        });
    }
});

// =========================================================
// GET SERVICE BY ID
// GET /api/services/:id
// =========================================================

router.get("/services/:id", async (req, res) => {
    try {
        const serviceId = req.params.id;

        const [services] = await db.query(
            "SELECT * FROM services WHERE id = ?",
            [serviceId]
        );

        if (services.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        res.json({
            success: true,
            service: services[0]
        });

    } catch (error) {
        console.error("Get service details error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve service details."
        });
    }
});

// =========================================================
// GET ALL PRODUCTS
// GET /api/products
// =========================================================

router.get("/products", async (req, res) => {
    try {
        const [products] = await db.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json({
            success: true,
            products
        });

    } catch (error) {
        console.error("Get products error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve products."
        });
    }
});

// =========================================================
// GET PRODUCT BY ID
// GET /api/products/:id
// =========================================================

router.get("/products/:id", async (req, res) => {
    try {
        const productId = req.params.id;

        const [products] = await db.query(
            "SELECT * FROM products WHERE id = ?",
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            product: products[0]
        });

    } catch (error) {
        console.error("Get product details error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve product details."
        });
    }
});

module.exports = router;
