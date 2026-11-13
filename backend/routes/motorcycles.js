
const express = require("express");
const db = require("../db");

const router = express.Router();

/* =========================================
   CUSTOMER MOTORCYCLES
   GET ALL MOTORCYCLES FOR CUSTOMER
========================================= */

router.get(
    "/customer-motorcycles/:userId",
    async (req, res) => {
        try {
            const userId = Number(req.params.userId);

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const [motorcycles] = await db.query(
                `SELECT
                    id,
                    user_id,
                    brand,
                    model,
                    year,
                    engine_cc,
                    plate_number,
                    color,
                    is_primary,
                    created_at
                 FROM customer_motorcycles
                 WHERE user_id = ?
                 ORDER BY
                    is_primary DESC,
                    id ASC`,
                [userId]
            );

            res.json({
                success: true,
                count: motorcycles.length,
                motorcycles
            });

        } catch (error) {
            console.error("Get customer motorcycles error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to retrieve customer motorcycles.",
                error: error.message
            });
        }
    }
);

/* =========================================
   ADD CUSTOMER MOTORCYCLE
========================================= */

router.post(
    "/customer-motorcycles",
    async (req, res) => {
        try {
            const {
                user_id,
                brand,
                model,
                year,
                engine_cc,
                plate_number,
                color,
                is_primary
            } = req.body;

            const userId = Number(user_id);

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const cleanBrand = String(brand || "").trim();
            const cleanModel = String(model || "").trim();
            const cleanPlate = String(plate_number || "").trim();
            const cleanColor = String(color || "").trim();

            if (!cleanBrand) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a motorcycle brand."
                });
            }

            if (!cleanModel) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter the motorcycle model."
                });
            }

            const motorcycleYear =
                year !== undefined && year !== null && year !== ""
                    ? Number(year)
                    : null;

            const engineCC =
                engine_cc !== undefined && engine_cc !== null && engine_cc !== ""
                    ? Number(engine_cc)
                    : null;

            if (
                motorcycleYear !== null &&
                (
                    !Number.isInteger(motorcycleYear) ||
                    motorcycleYear < 1900 ||
                    motorcycleYear > 2100
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid motorcycle year."
                });
            }

            if (
                engineCC !== null &&
                (
                    !Number.isInteger(engineCC) ||
                    engineCC < 1
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid engine CC."
                });
            }

            const [users] = await db.query(
                `SELECT id
                 FROM users
                 WHERE id = ?
                 LIMIT 1`,
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Customer account not found."
                });
            }

            const makePrimary = Boolean(
                is_primary === true ||
                is_primary === 1 ||
                is_primary === "1" ||
                is_primary === "true"
            );

            if (makePrimary) {
                await db.query(
                    `UPDATE customer_motorcycles
                     SET is_primary = 0
                     WHERE user_id = ?`,
                    [userId]
                );
            }

            const [existingMotorcycles] = await db.query(
                `SELECT id
                 FROM customer_motorcycles
                 WHERE user_id = ?
                 LIMIT 1`,
                [userId]
            );

            const finalPrimary =
                makePrimary || existingMotorcycles.length === 0;

            const [result] = await db.query(
                `INSERT INTO customer_motorcycles
                (
                    user_id,
                    brand,
                    model,
                    year,
                    engine_cc,
                    plate_number,
                    color,
                    is_primary
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    cleanBrand,
                    cleanModel,
                    motorcycleYear,
                    engineCC,
                    cleanPlate || null,
                    cleanColor || null,
                    finalPrimary ? 1 : 0
                ]
            );

            const [motorcycles] = await db.query(
                `SELECT
                    id,
                    user_id,
                    brand,
                    model,
                    year,
                    engine_cc,
                    plate_number,
                    color,
                    is_primary,
                    created_at
                 FROM customer_motorcycles
                 WHERE id = ?
                 LIMIT 1`,
                [result.insertId]
            );

            res.status(201).json({
                success: true,
                message: "Motorcycle added successfully!",
                motorcycle: motorcycles[0]
            });

        } catch (error) {
            console.error("Add customer motorcycle error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to add motorcycle.",
                error: error.message
            });
        }
    }
);

/* =========================================
   UPDATE CUSTOMER MOTORCYCLE
========================================= */

router.put(
    "/customer-motorcycles/:id",
    async (req, res) => {
        try {
            const motorcycleId = Number(req.params.id);

            if (!motorcycleId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid motorcycle ID."
                });
            }

            const {
                user_id,
                brand,
                model,
                year,
                engine_cc,
                plate_number,
                color,
                is_primary
            } = req.body;

            const userId = Number(user_id);

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const [existing] = await db.query(
                `SELECT id, user_id
                 FROM customer_motorcycles
                 WHERE id = ?
                 LIMIT 1`,
                [motorcycleId]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Motorcycle not found."
                });
            }

            if (Number(existing[0].user_id) !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to update this motorcycle."
                });
            }

            const cleanBrand = String(brand || "").trim();
            const cleanModel = String(model || "").trim();
            const cleanPlate = String(plate_number || "").trim();
            const cleanColor = String(color || "").trim();

            if (!cleanBrand) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a motorcycle brand."
                });
            }

            if (!cleanModel) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter the motorcycle model."
                });
            }

            const motorcycleYear =
                year !== undefined && year !== null && year !== ""
                    ? Number(year)
                    : null;

            const engineCC =
                engine_cc !== undefined && engine_cc !== null && engine_cc !== ""
                    ? Number(engine_cc)
                    : null;

            if (
                motorcycleYear !== null &&
                (
                    !Number.isInteger(motorcycleYear) ||
                    motorcycleYear < 1900 ||
                    motorcycleYear > 2100
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid motorcycle year."
                });
            }

            if (
                engineCC !== null &&
                (
                    !Number.isInteger(engineCC) ||
                    engineCC < 1
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid engine CC."
                });
            }

            const makePrimary = Boolean(
                is_primary === true ||
                is_primary === 1 ||
                is_primary === "1" ||
                is_primary === "true"
            );

            if (makePrimary) {
                await db.query(
                    `UPDATE customer_motorcycles
                     SET is_primary = 0
                     WHERE user_id = ?
                     AND id != ?`,
                    [userId, motorcycleId]
                );
            }

            await db.query(
                `UPDATE customer_motorcycles
                 SET
                    brand = ?,
                    model = ?,
                    year = ?,
                    engine_cc = ?,
                    plate_number = ?,
                    color = ?,
                    is_primary = ?
                 WHERE id = ?
                 AND user_id = ?`,
                [
                    cleanBrand,
                    cleanModel,
                    motorcycleYear,
                    engineCC,
                    cleanPlate || null,
                    cleanColor || null,
                    makePrimary ? 1 : 0,
                    motorcycleId,
                    userId
                ]
            );

            const [remaining] = await db.query(
                `SELECT id, is_primary
                 FROM customer_motorcycles
                 WHERE user_id = ?
                 ORDER BY id ASC`,
                [userId]
            );

            const hasPrimary = remaining.some(
                motorcycle => Number(motorcycle.is_primary) === 1
            );

            if (!hasPrimary && remaining.length > 0) {
                await db.query(
                    `UPDATE customer_motorcycles
                     SET is_primary = 1
                     WHERE id = ?
                     AND user_id = ?`,
                    [remaining[0].id, userId]
                );
            }

            const [updated] = await db.query(
                `SELECT
                    id,
                    user_id,
                    brand,
                    model,
                    year,
                    engine_cc,
                    plate_number,
                    color,
                    is_primary,
                    created_at
                 FROM customer_motorcycles
                 WHERE id = ?
                 LIMIT 1`,
                [motorcycleId]
            );

            res.json({
                success: true,
                message: "Motorcycle updated successfully!",
                motorcycle: updated[0]
            });

        } catch (error) {
            console.error("Update customer motorcycle error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to update motorcycle.",
                error: error.message
            });
        }
    }
);

/* =========================================
   DELETE CUSTOMER MOTORCYCLE
========================================= */

router.delete(
    "/customer-motorcycles/:id",
    async (req, res) => {
        try {
            const motorcycleId = Number(req.params.id);

            const userId = Number(
                req.body.user_id || req.query.user_id
            );

            if (!motorcycleId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid motorcycle ID."
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User ID is required."
                });
            }

            const [motorcycles] = await db.query(
                `SELECT id, user_id, is_primary
                 FROM customer_motorcycles
                 WHERE id = ?
                 LIMIT 1`,
                [motorcycleId]
            );

            if (motorcycles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Motorcycle not found."
                });
            }

            const motorcycle = motorcycles[0];

            if (Number(motorcycle.user_id) !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to delete this motorcycle."
                });
            }

            const wasPrimary = Number(motorcycle.is_primary) === 1;

            await db.query(
                `DELETE FROM customer_motorcycles
                 WHERE id = ?
                 AND user_id = ?`,
                [motorcycleId, userId]
            );

            if (wasPrimary) {
                const [remaining] = await db.query(
                    `SELECT id
                     FROM customer_motorcycles
                     WHERE user_id = ?
                     ORDER BY id ASC
                     LIMIT 1`,
                    [userId]
                );

                if (remaining.length > 0) {
                    await db.query(
                        `UPDATE customer_motorcycles
                         SET is_primary = 1
                         WHERE id = ?
                         AND user_id = ?`,
                        [remaining[0].id, userId]
                    );
                }
            }

            res.json({
                success: true,
                message: "Motorcycle deleted successfully."
            });

        } catch (error) {
            console.error("Delete customer motorcycle error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to delete motorcycle.",
                error: error.message
            });
        }
    }
);

/* =========================================
   SET PRIMARY MOTORCYCLE
========================================= */

router.put(
    "/customer-motorcycles/:id/primary",
    async (req, res) => {
        try {
            const motorcycleId = Number(req.params.id);
            const userId = Number(req.body.user_id);

            if (!motorcycleId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid motorcycle ID."
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const [motorcycles] = await db.query(
                `SELECT id, user_id
                 FROM customer_motorcycles
                 WHERE id = ?
                 LIMIT 1`,
                [motorcycleId]
            );

            if (motorcycles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Motorcycle not found."
                });
            }

            if (Number(motorcycles[0].user_id) !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to modify this motorcycle."
                });
            }

            await db.query(
                `UPDATE customer_motorcycles
                 SET is_primary = 0
                 WHERE user_id = ?`,
                [userId]
            );

            await db.query(
                `UPDATE customer_motorcycles
                 SET is_primary = 1
                 WHERE id = ?
                 AND user_id = ?`,
                [motorcycleId, userId]
            );

            const [updated] = await db.query(
                `SELECT
                    id,
                    user_id,
                    brand,
                    model,
                    year,
                    engine_cc,
                    plate_number,
                    color,
                    is_primary,
                    created_at
                 FROM customer_motorcycles
                 WHERE id = ?
                 LIMIT 1`,
                [motorcycleId]
            );

            res.json({
                success: true,
                message: "Primary motorcycle updated successfully.",
                motorcycle: updated[0]
            });

        } catch (error) {
            console.error("Set primary motorcycle error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to set primary motorcycle.",
                error: error.message
            });
        }
    }
);

module.exports = router;
