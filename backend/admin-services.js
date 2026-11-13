/* =========================================================
   ADD MOTOR SHOP
   ADMIN SERVICES API
========================================================= */

const express = require("express");

const router = express.Router();


/* =========================================================
   DATABASE
========================================================= */

const mysql = require("mysql2/promise");

const db = mysql.createPool({

    host: "localhost",

    user: "root",

    password: "",

    database: "motorshop",

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

});


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

async function requireAdmin(
    req,
    res,
    next
) {

    try {

        const adminId =
            Number(
                req.headers["x-admin-id"]
            );


        if (!adminId) {

            return res.status(401).json({

                success: false,

                message:
                    "Admin authentication is required."

            });

        }


        const [users] =
            await db.query(

                `SELECT
                    id,
                    name,
                    email,
                    role

                 FROM users

                 WHERE id = ?

                 LIMIT 1`,

                [
                    adminId
                ]

            );


        if (
            users.length === 0
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Admin account not found."

            });

        }


        const user =
            users[0];


        if (
            String(user.role)
                .toLowerCase() !==
            "admin"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Administrator access is required."

            });

        }


        req.admin =
            user;


        next();

    } catch (error) {

        console.error(
            "Admin services authentication error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Unable to verify admin access.",

            error:
                error.message

        });

    }

}


/* =========================================================
   GET ALL SERVICES
========================================================= */

router.get(
    "/",
    requireAdmin,
    async (req, res) => {

        try {

            const [services] =
                await db.query(

                    `SELECT
                        id,
                        name,
                        description,
                        price,
                        duration,
                        status,
                        created_at

                     FROM services

                     ORDER BY
                        id DESC`

                );


            const finalServices =
                services.map(
                    service => ({

                        id:
                            Number(
                                service.id
                            ),

                        name:
                            service.name || "",

                        description:
                            service.description || "",

                        price:
                            Number(
                                service.price || 0
                            ),

                        duration:
                            Number(
                                service.duration || 0
                            ),

                        status:
                            service.status ||
                            "available",

                        created_at:
                            service.created_at ||
                            null

                    })
                );


            res.json({

                success: true,

                count:
                    finalServices.length,

                services:
                    finalServices

            });

        } catch (error) {

            console.error(
                "Admin get services error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve services.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   GET SINGLE SERVICE
========================================================= */

router.get(
    "/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const serviceId =
                Number(
                    req.params.id
                );


            if (!serviceId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid service ID."

                });

            }


            const [services] =
                await db.query(

                    `SELECT
                        id,
                        name,
                        description,
                        price,
                        duration,
                        status,
                        created_at

                     FROM services

                     WHERE id = ?

                     LIMIT 1`,

                    [
                        serviceId
                    ]

                );


            if (
                services.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Service not found."

                });

            }


            const service =
                services[0];


            res.json({

                success: true,

                service: {

                    id:
                        Number(
                            service.id
                        ),

                    name:
                        service.name,

                    description:
                        service.description || "",

                    price:
                        Number(
                            service.price || 0
                        ),

                    duration:
                        Number(
                            service.duration || 0
                        ),

                    status:
                        service.status ||
                        "available",

                    created_at:
                        service.created_at

                }

            });

        } catch (error) {

            console.error(
                "Admin get single service error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve service.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   ADD NEW SERVICE
========================================================= */

router.post(
    "/",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                name,
                description,
                price,
                duration,
                status
            } = req.body;


            /* =========================================
               SERVICE NAME
            ========================================== */

            const cleanName =
                String(
                    name || ""
                ).trim();


            if (!cleanName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service name is required."

                });

            }


            if (
                cleanName.length > 150
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service name cannot exceed 150 characters."

                });

            }


            /* =========================================
               DESCRIPTION
            ========================================== */

            const cleanDescription =
                String(
                    description || ""
                ).trim();


            /* =========================================
               PRICE
            ========================================== */

            const servicePrice =
                Number(price);


            if (
                !Number.isFinite(
                    servicePrice
                ) ||
                servicePrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service price must be a valid number greater than or equal to 0."

                });

            }


            /* =========================================
               DURATION
            ========================================== */

            const serviceDuration =
                Number(duration);


            if (
                !Number.isFinite(
                    serviceDuration
                ) ||
                serviceDuration < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service duration must be a valid number greater than or equal to 0."

                });

            }


            if (
                !Number.isInteger(
                    serviceDuration
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service duration must be a whole number of minutes."

                });

            }


            /* =========================================
               STATUS
            ========================================== */

            const serviceStatus =
                String(
                    status ||
                    "available"
                )
                .trim()
                .toLowerCase();


            const allowedStatuses = [

                "available",

                "unavailable"

            ];


            if (
                !allowedStatuses.includes(
                    serviceStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service status must be either available or unavailable."

                });

            }


            /* =========================================
               INSERT
            ========================================== */

            const [result] =
                await db.query(

                    `INSERT INTO services
                    (
                        name,
                        description,
                        price,
                        duration,
                        status
                    )

                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )`,

                    [

                        cleanName,

                        cleanDescription ||
                            null,

                        servicePrice,

                        serviceDuration,

                        serviceStatus

                    ]

                );


            /* =========================================
               GET CREATED SERVICE
            ========================================== */

            const [services] =
                await db.query(

                    `SELECT
                        id,
                        name,
                        description,
                        price,
                        duration,
                        status,
                        created_at

                     FROM services

                     WHERE id = ?

                     LIMIT 1`,

                    [
                        result.insertId
                    ]

                );


            const service =
                services[0];


            /* =========================================
               SUCCESS
            ========================================== */

            res.status(201).json({

                success: true,

                message:
                    "Service added successfully.",

                service: {

                    id:
                        Number(
                            service.id
                        ),

                    name:
                        service.name,

                    description:
                        service.description ||
                        "",

                    price:
                        Number(
                            service.price ||
                            0
                        ),

                    duration:
                        Number(
                            service.duration ||
                            0
                        ),

                    status:
                        service.status,

                    created_at:
                        service.created_at

                }

            });

        } catch (error) {

            console.error(
                "Admin add service error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to add service.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   UPDATE SERVICE
========================================================= */

router.put(
    "/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const serviceId =
                Number(
                    req.params.id
                );


            if (!serviceId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid service ID."

                });

            }


            const {
                name,
                description,
                price,
                duration,
                status
            } = req.body;


            /* =========================================
               CHECK SERVICE EXISTS
            ========================================== */

            const [existing] =
                await db.query(

                    `SELECT
                        id

                     FROM services

                     WHERE id = ?

                     LIMIT 1`,

                    [
                        serviceId
                    ]

                );


            if (
                existing.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Service not found."

                });

            }


            /* =========================================
               SERVICE NAME
            ========================================== */

            const cleanName =
                String(
                    name || ""
                ).trim();


            if (!cleanName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service name is required."

                });

            }


            if (
                cleanName.length > 150
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service name cannot exceed 150 characters."

                });

            }


            /* =========================================
               DESCRIPTION
            ========================================== */

            const cleanDescription =
                String(
                    description || ""
                ).trim();


            /* =========================================
               PRICE
            ========================================== */

            const servicePrice =
                Number(price);


            if (
                !Number.isFinite(
                    servicePrice
                ) ||
                servicePrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service price must be a valid number greater than or equal to 0."

                });

            }


            /* =========================================
               DURATION
            ========================================== */

            const serviceDuration =
                Number(duration);


            if (
                !Number.isFinite(
                    serviceDuration
                ) ||
                serviceDuration < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service duration must be a valid number greater than or equal to 0."

                });

            }


            if (
                !Number.isInteger(
                    serviceDuration
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service duration must be a whole number of minutes."

                });

            }


            /* =========================================
               STATUS
            ========================================== */

            const serviceStatus =
                String(
                    status ||
                    "available"
                )
                .trim()
                .toLowerCase();


            const allowedStatuses = [

                "available",

                "unavailable"

            ];


            if (
                !allowedStatuses.includes(
                    serviceStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service status must be either available or unavailable."

                });

            }


            /* =========================================
               UPDATE
            ========================================== */

            await db.query(

                `UPDATE services

                 SET
                    name = ?,
                    description = ?,
                    price = ?,
                    duration = ?,
                    status = ?

                 WHERE id = ?`,

                [

                    cleanName,

                    cleanDescription ||
                        null,

                    servicePrice,

                    serviceDuration,

                    serviceStatus,

                    serviceId

                ]

            );


            /* =========================================
               GET UPDATED SERVICE
            ========================================== */

            const [services] =
                await db.query(

                    `SELECT
                        id,
                        name,
                        description,
                        price,
                        duration,
                        status,
                        created_at

                     FROM services

                     WHERE id = ?

                     LIMIT 1`,

                    [
                        serviceId
                    ]

                );


            const service =
                services[0];


            /* =========================================
               SUCCESS
            ========================================== */

            res.json({

                success: true,

                message:
                    "Service updated successfully.",

                service: {

                    id:
                        Number(
                            service.id
                        ),

                    name:
                        service.name,

                    description:
                        service.description ||
                        "",

                    price:
                        Number(
                            service.price ||
                            0
                        ),

                    duration:
                        Number(
                            service.duration ||
                            0
                        ),

                    status:
                        service.status,

                    created_at:
                        service.created_at

                }

            });

        } catch (error) {

            console.error(
                "Admin update service error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to update service.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   DELETE SERVICE
========================================================= */

router.delete(
    "/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const serviceId =
                Number(
                    req.params.id
                );


            if (!serviceId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid service ID."

                });

            }


            /* =========================================
               CHECK SERVICE EXISTS
            ========================================== */

            const [existing] =
                await db.query(

                    `SELECT
                        id,
                        name

                     FROM services

                     WHERE id = ?

                     LIMIT 1`,

                    [
                        serviceId
                    ]

                );


            if (
                existing.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Service not found."

                });

            }


            /* =========================================
               DELETE SERVICE
            ========================================== */

            await db.query(

                `DELETE FROM services

                 WHERE id = ?`,

                [
                    serviceId
                ]

            );


            /* =========================================
               SUCCESS
            ========================================== */

            res.json({

                success: true,

                message:
                    "Service deleted successfully.",

                service: {

                    id:
                        serviceId,

                    name:
                        existing[0].name

                }

            });

        } catch (error) {

            console.error(
                "Admin delete service error:",
                error
            );


            /*
             * This can happen if the service is
             * already being referenced by a
             * reservation.
             */

            if (
                error.code ===
                "ER_ROW_IS_REFERENCED_2"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This service cannot be deleted because it is already being used by an appointment."

                });

            }


            res.status(500).json({

                success: false,

                message:
                    "Unable to delete service.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;