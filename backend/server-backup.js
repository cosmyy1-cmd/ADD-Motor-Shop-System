const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

const PORT = 3000;


/* =========================================
   DATABASE CONFIGURATION
========================================= */

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "motorshop",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================
   FRONTEND FOLDER
========================================= */

const frontendPath = path.join(
    __dirname,
    "..",
    "frontend"
);

app.use(
    "/frontend",
    express.static(frontendPath)
);


/* =========================================
   ROOT PAGE
========================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "index.html"
        )
    );

});


/* =========================================
   DATABASE TEST
========================================= */

app.get("/api/test-db", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT 1 AS connected"
        );

        res.json({

            success: true,

            message:
                "MySQL database connected successfully!",

            result:
                rows

        });

    } catch (error) {

        console.error(
            "Database connection error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Database connection failed.",

            error:
                error.message

        });

    }

});


/* =========================================
   API TEST
========================================= */

app.get("/api/test", (req, res) => {

    res.json({

        success: true,

        message:
            "ADD Motor Shop backend is running!"

    });

});


/* =========================================
   REGISTER CUSTOMER
========================================= */

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            phone,
            address
        } = req.body;


        if (
            !name ||
            !email ||
            !password ||
            !phone ||
            !address
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please complete all required fields."

            });

        }


        const cleanName =
            String(name).trim();

        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();

        const cleanPhone =
            String(phone).trim();

        const cleanAddress =
            String(address).trim();


        if (cleanName.length < 2) {

            return res.status(400).json({

                success: false,

                message:
                    "Name must contain at least 2 characters."

            });

        }


        if (
            !cleanEmail.endsWith("@gmail.com")
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please use a valid Gmail address ending with @gmail.com."

            });

        }


        const emailPattern =
            /^[^\s@]+@gmail\.com$/i;

        if (
            !emailPattern.test(cleanEmail)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid Gmail address."

            });

        }


        if (password.length < 8) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 8 characters long."

            });

        }


        if (!/\d/.test(password)) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must contain at least one number."

            });

        }


        const phonePattern =
            /^09\d{9}$/;

        if (
            !phonePattern.test(cleanPhone)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid 11-digit Philippine mobile number starting with 09."

            });

        }


        if (cleanAddress.length < 5) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your complete address."

            });

        }


        const [existingUsers] =
            await db.query(

                "SELECT id FROM users WHERE email = ?",

                [cleanEmail]

            );


        if (
            existingUsers.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "An account with this email already exists."

            });

        }


        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        const [result] =
            await db.query(

                `INSERT INTO users
                (
                    name,
                    email,
                    password,
                    phone,
                    address,
                    role
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'customer'
                )`,

                [
                    cleanName,
                    cleanEmail,
                    hashedPassword,
                    cleanPhone,
                    cleanAddress
                ]

            );


        res.status(201).json({

            success: true,

            message:
                "Registration successful!",

            user: {

                id:
                    result.insertId,

                name:
                    cleanName,

                email:
                    cleanEmail,

                phone:
                    cleanPhone,

                address:
                    cleanAddress,

                role:
                    "customer"

            }

        });

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        if (
            error.code === "ER_DUP_ENTRY"
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "An account with this email already exists."

            });

        }


        res.status(500).json({

            success: false,

            message:
                "Registration failed. Please try again.",

            error:
                error.message

        });

    }

});


/* =========================================
   LOGIN
========================================= */

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your email and password."

            });

        }


        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();


        if (
            !cleanEmail.endsWith("@gmail.com")
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please use the Gmail address associated with your account."

            });

        }


        const [users] =
            await db.query(

                `SELECT
                    id,
                    name,
                    email,
                    password,
                    phone,
                    address,
                    role,
                    created_at
                 FROM users
                 WHERE email = ?
                 LIMIT 1`,

                [cleanEmail]

            );


        if (
            users.length === 0
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        const user =
            users[0];


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        res.json({

            success: true,

            message:
                "Login successful!",

            user: {

                id:
                    user.id,

                name:
                    user.name,

                email:
                    user.email,

                phone:
                    user.phone,

                address:
                    user.address,

                role:
                    user.role,

                created_at:
                    user.created_at

            }

        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Unable to login. Please try again.",

            error:
                error.message

        });

    }

});


/* =========================================
   GET CURRENT USER
========================================= */

app.get(
    "/api/user/:id",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.id);


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const [users] =
                await db.query(

                    `SELECT
                        id,
                        name,
                        email,
                        phone,
                        address,
                        role,
                        created_at
                     FROM users
                     WHERE id = ?
                     LIMIT 1`,

                    [userId]

                );


            if (
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            res.json({

                success: true,

                user:
                    users[0]

            });

        } catch (error) {

            console.error(
                "Get user error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve user information.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   CUSTOMER MOTORCYCLES
   GET ALL MOTORCYCLES FOR CUSTOMER
========================================= */

app.get(
    "/api/customer-motorcycles/:userId",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.userId);


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const [motorcycles] =
                await db.query(

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

                count:
                    motorcycles.length,

                motorcycles:
                    motorcycles

            });

        } catch (error) {

            console.error(
                "Get customer motorcycles error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve customer motorcycles.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   ADD CUSTOMER MOTORCYCLE
========================================= */

app.post(
    "/api/customer-motorcycles",
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


            const userId =
                Number(user_id);


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const cleanBrand =
                String(brand || "").trim();

            const cleanModel =
                String(model || "").trim();

            const cleanPlate =
                String(plate_number || "").trim();

            const cleanColor =
                String(color || "").trim();


            if (!cleanBrand) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a motorcycle brand."

                });

            }


            if (!cleanModel) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter the motorcycle model."

                });

            }


            const motorcycleYear =
                year !== undefined &&
                year !== null &&
                year !== ""
                    ? Number(year)
                    : null;


            const engineCC =
                engine_cc !== undefined &&
                engine_cc !== null &&
                engine_cc !== ""
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

                    message:
                        "Please enter a valid motorcycle year."

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

                    message:
                        "Please enter a valid engine CC."

                });

            }


            const [users] =
                await db.query(

                    `SELECT id
                     FROM users
                     WHERE id = ?
                     LIMIT 1`,

                    [userId]

                );


            if (
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Customer account not found."

                });

            }


            const makePrimary =
                Boolean(
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


            const [existingMotorcycles] =
                await db.query(

                    `SELECT id
                     FROM customer_motorcycles
                     WHERE user_id = ?
                     LIMIT 1`,

                    [userId]

                );


            const finalPrimary =
                makePrimary ||
                existingMotorcycles.length === 0;


            const [result] =
                await db.query(

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
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )`,

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


            const [motorcycles] =
                await db.query(

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

                message:
                    "Motorcycle added successfully!",

                motorcycle:
                    motorcycles[0]

            });

        } catch (error) {

            console.error(
                "Add customer motorcycle error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to add motorcycle.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   UPDATE CUSTOMER MOTORCYCLE
========================================= */

app.put(
    "/api/customer-motorcycles/:id",
    async (req, res) => {

        try {

            const motorcycleId =
                Number(req.params.id);


            if (!motorcycleId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid motorcycle ID."

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


            const userId =
                Number(user_id);


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const [existing] =
                await db.query(

                    `SELECT
                        id,
                        user_id
                     FROM customer_motorcycles
                     WHERE id = ?
                     LIMIT 1`,

                    [motorcycleId]

                );


            if (
                existing.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Motorcycle not found."

                });

            }


            if (
                Number(existing[0].user_id) !==
                userId
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not allowed to update this motorcycle."

                });

            }


            const cleanBrand =
                String(brand || "").trim();

            const cleanModel =
                String(model || "").trim();

            const cleanPlate =
                String(plate_number || "").trim();

            const cleanColor =
                String(color || "").trim();


            if (!cleanBrand) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a motorcycle brand."

                });

            }


            if (!cleanModel) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter the motorcycle model."

                });

            }


            const motorcycleYear =
                year !== undefined &&
                year !== null &&
                year !== ""
                    ? Number(year)
                    : null;


            const engineCC =
                engine_cc !== undefined &&
                engine_cc !== null &&
                engine_cc !== ""
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

                    message:
                        "Please enter a valid motorcycle year."

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

                    message:
                        "Please enter a valid engine CC."

                });

            }


            const makePrimary =
                Boolean(
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

                    [
                        userId,
                        motorcycleId
                    ]

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


            const [remaining] =
                await db.query(

                    `SELECT
                        id,
                        is_primary
                     FROM customer_motorcycles
                     WHERE user_id = ?
                     ORDER BY id ASC`,

                    [userId]

                );


            const hasPrimary =
                remaining.some(
                    motorcycle =>
                        Number(
                            motorcycle.is_primary
                        ) === 1
                );


            if (
                !hasPrimary &&
                remaining.length > 0
            ) {

                await db.query(

                    `UPDATE customer_motorcycles
                     SET is_primary = 1
                     WHERE id = ?
                     AND user_id = ?`,

                    [
                        remaining[0].id,
                        userId
                    ]

                );

            }


            const [updated] =
                await db.query(

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

                message:
                    "Motorcycle updated successfully!",

                motorcycle:
                    updated[0]

            });

        } catch (error) {

            console.error(
                "Update customer motorcycle error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to update motorcycle.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   DELETE CUSTOMER MOTORCYCLE
========================================= */

app.delete(
    "/api/customer-motorcycles/:id",
    async (req, res) => {

        try {

            const motorcycleId =
                Number(req.params.id);

            const userId =
                Number(
                    req.body.user_id ||
                    req.query.user_id
                );


            if (!motorcycleId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid motorcycle ID."

                });

            }


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User ID is required."

                });

            }


            const [motorcycles] =
                await db.query(

                    `SELECT
                        id,
                        user_id,
                        is_primary
                     FROM customer_motorcycles
                     WHERE id = ?
                     LIMIT 1`,

                    [motorcycleId]

                );


            if (
                motorcycles.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Motorcycle not found."

                });

            }


            const motorcycle =
                motorcycles[0];


            if (
                Number(motorcycle.user_id) !==
                userId
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not allowed to delete this motorcycle."

                });

            }


            const wasPrimary =
                Number(
                    motorcycle.is_primary
                ) === 1;


            await db.query(

                `DELETE FROM customer_motorcycles
                 WHERE id = ?
                 AND user_id = ?`,

                [
                    motorcycleId,
                    userId
                ]

            );


            if (wasPrimary) {

                const [remaining] =
                    await db.query(

                        `SELECT
                            id
                         FROM customer_motorcycles
                         WHERE user_id = ?
                         ORDER BY id ASC
                         LIMIT 1`,

                        [userId]

                    );


                if (
                    remaining.length > 0
                ) {

                    await db.query(

                        `UPDATE customer_motorcycles
                         SET is_primary = 1
                         WHERE id = ?
                         AND user_id = ?`,

                        [
                            remaining[0].id,
                            userId
                        ]

                    );

                }

            }


            res.json({

                success: true,

                message:
                    "Motorcycle deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete customer motorcycle error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to delete motorcycle.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   SET PRIMARY MOTORCYCLE
========================================= */

app.put(
    "/api/customer-motorcycles/:id/primary",
    async (req, res) => {

        try {

            const motorcycleId =
                Number(req.params.id);

            const userId =
                Number(req.body.user_id);


            if (!motorcycleId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid motorcycle ID."

                });

            }


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const [motorcycles] =
                await db.query(

                    `SELECT
                        id,
                        user_id
                     FROM customer_motorcycles
                     WHERE id = ?
                     LIMIT 1`,

                    [motorcycleId]

                );


            if (
                motorcycles.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Motorcycle not found."

                });

            }


            if (
                Number(
                    motorcycles[0].user_id
                ) !== userId
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not allowed to modify this motorcycle."

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

                [
                    motorcycleId,
                    userId
                ]

            );


            const [updated] =
                await db.query(

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

                message:
                    "Primary motorcycle updated successfully.",

                motorcycle:
                    updated[0]

            });

        } catch (error) {

            console.error(
                "Set primary motorcycle error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to set primary motorcycle.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   SERVICES API
========================================= */

app.get(
    "/api/services",
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
                     WHERE status = 'available'
                     ORDER BY id ASC`

                );


            res.json({

                success: true,

                count:
                    services.length,

                services:
                    services

            });

        } catch (error) {

            console.error(
                "Get services error:",
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


/* =========================================
   GET SINGLE SERVICE
========================================= */

app.get(
    "/api/services/:id",
    async (req, res) => {

        try {

            const serviceId =
                Number(req.params.id);


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

                    [serviceId]

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


            res.json({

                success: true,

                service:
                    services[0]

            });

        } catch (error) {

            console.error(
                "Get service error:",
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


/* =========================================
   PRODUCTS API
========================================= */

app.get(
    "/api/products",
    async (req, res) => {

        try {

            const [products] =
                await db.query(

                    `SELECT
                        p.id,
                        p.category_id,
                        c.name AS category,
                        p.name,
                        p.description,
                        p.price,
                        p.stock,
                        p.image,
                        p.status,
                        p.created_at
                     FROM products p
                     INNER JOIN categories c
                        ON p.category_id = c.id
                     WHERE p.status = 'available'
                     ORDER BY p.id ASC`

                );


            res.json({

                success: true,

                count:
                    products.length,

                products:
                    products

            });

        } catch (error) {

            console.error(
                "Get products error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve products.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   GET SINGLE PRODUCT
========================================= */

app.get(
    "/api/products/:id",
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);


            if (!productId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            const [products] =
                await db.query(

                    `SELECT
                        p.id,
                        p.category_id,
                        c.name AS category,
                        p.name,
                        p.description,
                        p.price,
                        p.stock,
                        p.image,
                        p.status,
                        p.created_at
                     FROM products p
                     INNER JOIN categories c
                        ON p.category_id = c.id
                     WHERE p.id = ?
                     LIMIT 1`,

                    [productId]

                );


            if (
                products.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });

            }


            res.json({

                success: true,

                product:
                    products[0]

            });

        } catch (error) {

            console.error(
                "Get product error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve product.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   CREATE RESERVATION
   SUPPORTS MULTIPLE SERVICES
========================================= */

app.post(
    "/api/reservations",
    async (req, res) => {

        let connection;


        try {

            const {
                user_id,
                service_id,
                services,
                motorcycle_id,
                reservation_date,
                reservation_time,
                notes
            } = req.body;


            /* -----------------------------------------
               BASIC VALIDATION
            ----------------------------------------- */

            if (
                !user_id ||
                !reservation_date ||
                !reservation_time
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide user, reservation date, and reservation time."

                });

            }


            const userId =
                Number(user_id);


            const motorcycleId =
                motorcycle_id !== undefined &&
                motorcycle_id !== null &&
                motorcycle_id !== ""
                    ? Number(motorcycle_id)
                    : null;


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            /* -----------------------------------------
               RESERVATION DATE VALIDATION
            ----------------------------------------- */

            const reservationDate =
                String(
                    reservation_date
                ).trim();


            const reservationTime =
                String(
                    reservation_time
                ).trim();


            const datePattern =
                /^\d{4}-\d{2}-\d{2}$/;


            const timePattern =
                /^\d{2}:\d{2}(:\d{2})?$/;


            if (
                !datePattern.test(
                    reservationDate
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid reservation date format."

                });

            }


            if (
                !timePattern.test(
                    reservationTime
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid reservation time format."

                });

            }


            const normalizedTime =
                reservationTime.substring(
                    0,
                    5
                );


            const dateParts =
                reservationDate
                    .split("-")
                    .map(Number);


            const reservationDateObject =
                new Date(
                    Date.UTC(
                        dateParts[0],
                        dateParts[1] - 1,
                        dateParts[2]
                    )
                );


            if (
                Number.isNaN(
                    reservationDateObject.getTime()
                ) ||
                reservationDateObject
                    .getUTCFullYear() !== dateParts[0] ||
                reservationDateObject
                    .getUTCMonth() !== dateParts[1] - 1 ||
                reservationDateObject
                    .getUTCDate() !== dateParts[2]
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide a valid reservation date."

                });

            }


            /*
             * Sunday is closed.
             */

            if (
                reservationDateObject.getUTCDay() === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "The motor shop is closed on Sundays. Please choose another date."

                });

            }


            /* -----------------------------------------
               PREVENT PAST DATES
            ----------------------------------------- */

            const today =
                new Date();


            const todayUTC =
                new Date(
                    Date.UTC(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate()
                    )
                );


            if (
                reservationDateObject <
                todayUTC
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You cannot book a service for a past date."

                });

            }


            /* -----------------------------------------
               NORMALIZE SERVICES
            ----------------------------------------- */

            let rawServiceIds = [];


            /*
             * New format:
             *
             * services: [1, 2, 4]
             *
             * or:
             *
             * services: [
             *     { id: 1 },
             *     { id: 2 }
             * ]
             */


            if (
                Array.isArray(services)
            ) {

                rawServiceIds =
                    services.map(
                        service => {

                            if (
                                service &&
                                typeof service === "object"
                            ) {

                                return service.id;

                            }

                            return service;

                        }
                    );

            }


            /*
             * Backward compatibility with
             * the old single-service format.
             */

            else if (
                service_id !== undefined &&
                service_id !== null &&
                service_id !== ""
            ) {

                rawServiceIds = [
                    service_id
                ];

            }


            if (
                rawServiceIds.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select at least one service."

                });

            }


            const parsedServiceIds =
                rawServiceIds.map(
                    value =>
                        Number(value)
                );


            /*
             * Make sure every supplied service ID
             * is a valid positive integer.
             */

            if (
                parsedServiceIds.some(
                    id =>
                        !Number.isInteger(id) ||
                        id < 1
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "One or more selected services are invalid."

                });

            }


            /*
             * Remove duplicate service selections.
             */

            const serviceIds =
                [
                    ...new Set(
                        parsedServiceIds
                    )
                ];


            /* -----------------------------------------
               DATABASE TRANSACTION
            ----------------------------------------- */

            connection =
                await db.getConnection();


            await connection.beginTransaction();


            /* -----------------------------------------
               VERIFY USER
            ----------------------------------------- */

            const [users] =
                await connection.query(

                    `SELECT
                        id,
                        name,
                        email,
                        phone,
                        address
                     FROM users
                     WHERE id = ?
                     LIMIT 1`,

                    [userId]

                );


            if (
                users.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const user =
                users[0];


            /* -----------------------------------------
               VERIFY MOTORCYCLE
            ----------------------------------------- */

            if (
                motorcycleId !== null
            ) {

                if (
                    !Number.isInteger(
                        motorcycleId
                    ) ||
                    motorcycleId < 1
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid motorcycle ID."

                    });

                }


                const [motorcycles] =
                    await connection.query(

                        `SELECT
                            id,
                            user_id,
                            brand,
                            model,
                            year,
                            engine_cc,
                            plate_number,
                            color
                         FROM customer_motorcycles
                         WHERE id = ?
                         AND user_id = ?
                         LIMIT 1`,

                        [
                            motorcycleId,
                            userId
                        ]

                    );


                if (
                    motorcycles.length === 0
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "The selected motorcycle does not belong to this customer."

                    });

                }

            }


            /* -----------------------------------------
               GET ALL SELECTED SERVICES
               DIRECTLY FROM DATABASE
            ----------------------------------------- */

            const placeholders =
                serviceIds
                    .map(() => "?")
                    .join(",");


            const [selectedServices] =
                await connection.query(

                    `SELECT
                        id,
                        name,
                        description,
                        price,
                        duration,
                        status
                     FROM services
                     WHERE id IN (${placeholders})
                     ORDER BY id ASC`,

                    serviceIds

                );


            /*
             * Every selected service must exist.
             */

            if (
                selectedServices.length !==
                serviceIds.length
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "One or more selected services could not be found."

                });

            }


            /*
             * Every selected service must
             * currently be available.
             */

            const unavailableServices =
                selectedServices.filter(
                    service =>
                        service.status !==
                        "available"
                );


            if (
                unavailableServices.length > 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        `The following service(s) are currently unavailable: ${unavailableServices
                            .map(service => service.name)
                            .join(", ")}.`

                });

            }


            /*
             * Restore the exact selection order
             * from the frontend.
             */

            const orderedServices =
                serviceIds.map(
                    serviceId =>
                        selectedServices.find(
                            service =>
                                Number(
                                    service.id
                                ) === serviceId
                        )
                );


            /*
             * First service remains in
             * reservations.service_id for
             * backward compatibility.
             */

            const primaryService =
                orderedServices[0];


            const primaryServiceId =
                Number(
                    primaryService.id
                );


            /* -----------------------------------------
               CALCULATE TOTAL AND DURATION
            ----------------------------------------- */

            let totalAmount = 0;

            let totalDuration = 0;


            orderedServices.forEach(
                service => {

                    totalAmount +=
                        Number(
                            service.price
                        );


                    totalDuration +=
                        Number(
                            service.duration || 0
                        );

                }
            );


            totalAmount =
                Number(
                    totalAmount.toFixed(2)
                );


            /* -----------------------------------------
               CHECK SCHEDULE COLLISION
            ----------------------------------------- */

            const [existingReservations] =
                await connection.query(

                    `SELECT
                        id,
                        status
                     FROM reservations
                     WHERE reservation_date = ?
                     AND reservation_time = ?
                     AND status IN
                        (
                            'Pending',
                            'Confirmed',
                            'In Service'
                        )
                     LIMIT 1`,

                    [
                        reservationDate,
                        normalizedTime
                    ]

                );


            if (
                existingReservations.length > 0
            ) {

                await connection.rollback();

                return res.status(409).json({

                    success: false,

                    message:
                        "The selected date and time is already reserved. Please choose another schedule."

                });

            }


            /* -----------------------------------------
               CREATE MAIN RESERVATION
            ----------------------------------------- */

            const [reservationResult] =
                await connection.query(

                    `INSERT INTO reservations
                    (
                        user_id,
                        service_id,
                        motorcycle_id,
                        reservation_date,
                        reservation_time,
                        notes,
                        status
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'Pending'
                    )`,

                    [
                        userId,
                        primaryServiceId,
                        motorcycleId,
                        reservationDate,
                        normalizedTime,
                        notes || null
                    ]

                );


            const reservationId =
                reservationResult.insertId;


            /* -----------------------------------------
               CREATE RESERVATION SERVICE ROWS
            ----------------------------------------- */

            for (
                const service of orderedServices
            ) {

                await connection.query(

                    `INSERT INTO reservation_services
                    (
                        reservation_id,
                        service_id,
                        price
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?
                    )`,

                    [
                        reservationId,
                        service.id,
                        service.price
                    ]

                );

            }


            /* -----------------------------------------
               COMMIT TRANSACTION
            ----------------------------------------- */

            await connection.commit();


            /* -----------------------------------------
               RESPONSE
            ----------------------------------------- */

            res.status(201).json({

                success: true,

                message:
                    "Reservation created successfully!",

                reservation: {

                    id:
                        reservationId,

                    appointment_number:
                        `ADD-${String(
                            reservationId
                        ).padStart(6, "0")}`,

                    user_id:
                        userId,

                    customer_name:
                        user.name,

                    service_id:
                        primaryServiceId,

                    service_ids:
                        orderedServices.map(
                            service =>
                                Number(
                                    service.id
                                )
                        ),

                    services:
                        orderedServices.map(
                            service => ({

                                id:
                                    Number(
                                        service.id
                                    ),

                                name:
                                    service.name,

                                price:
                                    Number(
                                        service.price
                                    ),

                                duration:
                                    Number(
                                        service.duration || 0
                                    )

                            })
                        ),

                    total:
                        totalAmount,

                    total_duration:
                        totalDuration,

                    motorcycle_id:
                        motorcycleId,

                    reservation_date:
                        reservationDate,

                    reservation_time:
                        normalizedTime,

                    notes:
                        notes || null,

                    status:
                        "Pending"

                }

            });

        } catch (error) {

            console.error(
                "Create reservation error:",
                error
            );


            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "Reservation rollback error:",
                        rollbackError
                    );

                }

            }


            /*
             * Handle duplicate reservation-service
             * entries gracefully.
             */

            if (
                error.code === "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "One or more selected services are already attached to this reservation."

                });

            }


            res.status(500).json({

                success: false,

                message:
                    "Unable to create reservation.",

                error:
                    error.message

            });

        } finally {

            if (connection) {

                connection.release();

            }

        }

    }
);


/* =========================================
   GET CUSTOMER RESERVATIONS
   RETURNS ALL SERVICES
========================================= */

app.get(
    "/api/reservations/user/:userId",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.userId);


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            /* -----------------------------------------
               GET RESERVATION BASE INFORMATION
            ----------------------------------------- */

            const [reservations] =
                await db.query(

                    `SELECT
                        r.id,
                        r.user_id,
                        r.service_id,

                        s.name AS service_name,
                        s.description AS service_description,
                        s.price AS service_price,
                        s.duration,

                        r.motorcycle_id,

                        cm.brand,
                        cm.model,
                        cm.year,
                        cm.engine_cc,
                        cm.plate_number,
                        cm.color,

                        r.reservation_date,
                        r.reservation_time,
                        r.notes,
                        r.status,
                        r.created_at

                     FROM reservations r

                     INNER JOIN services s
                        ON r.service_id = s.id

                     LEFT JOIN customer_motorcycles cm
                        ON r.motorcycle_id = cm.id

                     WHERE r.user_id = ?

                     ORDER BY
                        r.reservation_date DESC,
                        r.reservation_time DESC,
                        r.id DESC`,

                    [userId]

                );


            if (
                reservations.length === 0
            ) {

                return res.json({

                    success: true,

                    count: 0,

                    reservations: []

                });

            }


            /* -----------------------------------------
               GET ALL RESERVATION SERVICES
            ----------------------------------------- */

            const reservationIds =
                reservations.map(
                    reservation =>
                        reservation.id
                );


            const reservationPlaceholders =
                reservationIds
                    .map(() => "?")
                    .join(",");


            const [reservationServices] =
                await db.query(

                    `SELECT
                        rs.id,
                        rs.reservation_id,
                        rs.service_id,
                        rs.price,

                        s.name,
                        s.description,
                        s.duration

                     FROM reservation_services rs

                     INNER JOIN services s
                        ON rs.service_id = s.id

                     WHERE rs.reservation_id
                        IN (${reservationPlaceholders})

                     ORDER BY
                        rs.reservation_id ASC,
                        rs.id ASC`,

                    reservationIds

                );


            /* -----------------------------------------
               GROUP SERVICES BY RESERVATION
            ----------------------------------------- */

            const servicesByReservation =
                {};


            reservationServices.forEach(
                service => {

                    if (
                        !servicesByReservation[
                            service.reservation_id
                        ]
                    ) {

                        servicesByReservation[
                            service.reservation_id
                        ] = [];

                    }


                    servicesByReservation[
                        service.reservation_id
                    ].push({

                        id:
                            Number(
                                service.service_id
                            ),

                        name:
                            service.name,

                        description:
                            service.description,

                        price:
                            Number(
                                service.price
                            ),

                        duration:
                            Number(
                                service.duration || 0
                            )

                    });

                }
            );


            /* -----------------------------------------
               BUILD FINAL RESPONSE
            ----------------------------------------- */

            const finalReservations =
                reservations.map(
                    reservation => {

                        let services =
                            servicesByReservation[
                                reservation.id
                            ] || [];


                        /*
                         * Backward compatibility for
                         * reservations created before
                         * reservation_services existed.
                         */

                        if (
                            services.length === 0
                        ) {

                            services = [{

                                id:
                                    Number(
                                        reservation.service_id
                                    ),

                                name:
                                    reservation.service_name,

                                description:
                                    reservation.service_description,

                                price:
                                    Number(
                                        reservation.service_price
                                    ),

                                duration:
                                    Number(
                                        reservation.duration || 0
                                    )

                            }];

                        }


                        const total =
                            services.reduce(
                                (
                                    sum,
                                    service
                                ) =>
                                    sum +
                                    Number(
                                        service.price
                                    ),
                                0
                            );


                        const totalDuration =
                            services.reduce(
                                (
                                    sum,
                                    service
                                ) =>
                                    sum +
                                    Number(
                                        service.duration || 0
                                    ),
                                0
                            );


                        return {

                            ...reservation,

                            appointment_number:
                                `ADD-${String(
                                    reservation.id
                                ).padStart(6, "0")}`,

                            service_ids:
                                services.map(
                                    service =>
                                        Number(
                                            service.id
                                        )
                                ),

                            services:
                                services,

                            total:
                                Number(
                                    total.toFixed(2)
                                ),

                            total_duration:
                                totalDuration,

                            /*
                             * These fields remain available
                             * so existing frontend pages
                             * do not immediately break.
                             */

                            service_price:
                                Number(
                                    reservation.service_price
                                ),

                            duration:
                                Number(
                                    reservation.duration || 0
                                )

                        };

                    }
                );


            res.json({

                success: true,

                count:
                    finalReservations.length,

                reservations:
                    finalReservations

            });

        } catch (error) {

            console.error(
                "Get reservations error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve reservations.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   GET SINGLE RESERVATION
   RETURNS ALL SERVICES
========================================= */

app.get(
    "/api/reservations/:id",
    async (req, res) => {

        try {

            const reservationId =
                Number(req.params.id);


            if (!reservationId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid reservation ID."

                });

            }


            /* -----------------------------------------
               GET MAIN RESERVATION
            ----------------------------------------- */

            const [reservations] =
                await db.query(

                    `SELECT
                        r.id,
                        r.user_id,

                        u.name AS customer_name,
                        u.email,
                        u.phone,
                        u.address,

                        r.service_id,

                        s.name AS service_name,
                        s.description AS service_description,
                        s.price AS service_price,
                        s.duration,

                        r.motorcycle_id,

                        cm.brand,
                        cm.model,
                        cm.year,
                        cm.engine_cc,
                        cm.plate_number,
                        cm.color,

                        r.reservation_date,
                        r.reservation_time,
                        r.notes,
                        r.status,
                        r.created_at

                     FROM reservations r

                     INNER JOIN users u
                        ON r.user_id = u.id

                     INNER JOIN services s
                        ON r.service_id = s.id

                     LEFT JOIN customer_motorcycles cm
                        ON r.motorcycle_id = cm.id

                     WHERE r.id = ?

                     LIMIT 1`,

                    [reservationId]

                );


            if (
                reservations.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Reservation not found."

                });

            }


            const reservation =
                reservations[0];


            /* -----------------------------------------
               GET ALL SERVICES
            ----------------------------------------- */

            const [reservationServices] =
                await db.query(

                    `SELECT
                        rs.id,
                        rs.reservation_id,
                        rs.service_id,
                        rs.price,

                        s.name,
                        s.description,
                        s.duration

                     FROM reservation_services rs

                     INNER JOIN services s
                        ON rs.service_id = s.id

                     WHERE rs.reservation_id = ?

                     ORDER BY rs.id ASC`,

                    [reservationId]

                );


            let services =
                reservationServices.map(
                    service => ({

                        id:
                            Number(
                                service.service_id
                            ),

                        name:
                            service.name,

                        description:
                            service.description,

                        price:
                            Number(
                                service.price
                            ),

                        duration:
                            Number(
                                service.duration || 0
                            )

                    })
                );


            /*
             * Backward compatibility for older
             * reservations.
             */

            if (
                services.length === 0
            ) {

                services = [{

                    id:
                        Number(
                            reservation.service_id
                        ),

                    name:
                        reservation.service_name,

                    description:
                        reservation.service_description,

                    price:
                        Number(
                            reservation.service_price
                        ),

                    duration:
                        Number(
                            reservation.duration || 0
                        )

                }];

            }


            const total =
                services.reduce(
                    (
                        sum,
                        service
                    ) =>
                        sum +
                        Number(
                            service.price
                        ),
                    0
                );


            const totalDuration =
                services.reduce(
                    (
                        sum,
                        service
                    ) =>
                        sum +
                        Number(
                            service.duration || 0
                        ),
                    0
                );


            res.json({

                success: true,

                reservation: {

                    ...reservation,

                    appointment_number:
                        `ADD-${String(
                            reservation.id
                        ).padStart(6, "0")}`,

                    service_ids:
                        services.map(
                            service =>
                                Number(
                                    service.id
                                )
                        ),

                    services:
                        services,

                    total:
                        Number(
                            total.toFixed(2)
                        ),

                    total_duration:
                        totalDuration

                }

            });

        } catch (error) {

            console.error(
                "Get reservation error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve reservation.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   CANCEL RESERVATION
========================================= */

app.post(
    "/api/reservations/:id/cancel",
    async (req, res) => {

        try {

            const reservationId =
                Number(req.params.id);


            if (!reservationId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid reservation ID."

                });

            }


            const [reservations] =
                await db.query(

                    `SELECT
                        id,
                        status
                     FROM reservations
                     WHERE id = ?
                     LIMIT 1`,

                    [reservationId]

                );


            if (
                reservations.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Reservation not found."

                });

            }


            if (
                reservations[0].status ===
                "Completed"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A completed reservation cannot be cancelled."

                });

            }


            if (
                reservations[0].status ===
                "Cancelled"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This reservation is already cancelled."

                });

            }


            await db.query(

                `UPDATE reservations
                 SET status = 'Cancelled'
                 WHERE id = ?`,

                [reservationId]

            );


            res.json({

                success: true,

                message:
                    "Reservation cancelled successfully."

            });

        } catch (error) {

            console.error(
                "Cancel reservation error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to cancel reservation.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   GET CUSTOMER CART
========================================= */

app.get(
    "/api/cart/:userId",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.userId);


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const [users] =
                await db.query(

                    `SELECT id
                     FROM users
                     WHERE id = ?
                     LIMIT 1`,

                    [userId]

                );


            if (
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            let [carts] =
                await db.query(

                    `SELECT
                        id,
                        user_id,
                        created_at
                     FROM carts
                     WHERE user_id = ?
                     ORDER BY id DESC
                     LIMIT 1`,

                    [userId]

                );


            if (
                carts.length === 0
            ) {

                const [cartResult] =
                    await db.query(

                        `INSERT INTO carts
                        (
                            user_id
                        )
                        VALUES
                        (?)`,

                        [userId]

                    );


                carts = [

                    {

                        id:
                            cartResult.insertId,

                        user_id:
                            userId,

                        created_at:
                            new Date()

                    }

                ];

            }


            const cart =
                carts[0];


            const [items] =
                await db.query(

                    `SELECT
                        ci.id,
                        ci.cart_id,
                        ci.product_id,
                        p.name,
                        p.description,
                        p.price,
                        p.stock,
                        p.image,
                        ci.quantity,
                        (
                            p.price * ci.quantity
                        ) AS subtotal
                     FROM cart_items ci
                     INNER JOIN products p
                        ON ci.product_id = p.id
                     WHERE ci.cart_id = ?
                     ORDER BY ci.id ASC`,

                    [cart.id]

                );


            let total = 0;


            items.forEach(
                item => {

                    total +=
                        Number(
                            item.subtotal
                        );

                }
            );


            res.json({

                success: true,

                cart: {

                    id:
                        cart.id,

                    user_id:
                        cart.user_id,

                    created_at:
                        cart.created_at,

                    items:
                        items,

                    total:
                        total.toFixed(2)

                }

            });

        } catch (error) {

            console.error(
                "Get cart error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve cart.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   ADD ITEM TO CART
========================================= */

app.post(
    "/api/cart/items",
    async (req, res) => {

        try {

            const {
                user_id,
                product_id,
                quantity
            } = req.body;


            const userId =
                Number(user_id);

            const productId =
                Number(product_id);

            const itemQuantity =
                Number(quantity);


            if (
                !userId ||
                !productId ||
                !itemQuantity ||
                itemQuantity < 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid cart information."

                });

            }


            const [users] =
                await db.query(

                    `SELECT id
                     FROM users
                     WHERE id = ?
                     LIMIT 1`,

                    [userId]

                );


            if (
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const [products] =
                await db.query(

                    `SELECT
                        id,
                        name,
                        price,
                        stock,
                        status
                     FROM products
                     WHERE id = ?
                     LIMIT 1`,

                    [productId]

                );


            if (
                products.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });

            }


            const product =
                products[0];


            if (
                product.status !==
                "available"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This product is currently unavailable."

                });

            }


            if (
                product.stock <
                itemQuantity
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Only ${product.stock} item(s) are available.`

                });

            }


            let [carts] =
                await db.query(

                    `SELECT
                        id
                     FROM carts
                     WHERE user_id = ?
                     ORDER BY id DESC
                     LIMIT 1`,

                    [userId]

                );


            let cartId;


            if (
                carts.length === 0
            ) {

                const [cartResult] =
                    await db.query(

                        `INSERT INTO carts
                        (
                            user_id
                        )
                        VALUES
                        (?)`,

                        [userId]

                    );


                cartId =
                    cartResult.insertId;

            } else {

                cartId =
                    carts[0].id;

            }


            const [existingItems] =
                await db.query(

                    `SELECT
                        id,
                        quantity
                     FROM cart_items
                     WHERE cart_id = ?
                     AND product_id = ?
                     LIMIT 1`,

                    [
                        cartId,
                        productId
                    ]

                );


            if (
                existingItems.length > 0
            ) {

                const newQuantity =
                    Number(
                        existingItems[0].quantity
                    ) +
                    itemQuantity;


                if (
                    newQuantity >
                    product.stock
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            `You cannot add that many. Only ${product.stock} item(s) are available.`

                    });

                }


                await db.query(

                    `UPDATE cart_items
                     SET quantity = ?
                     WHERE id = ?`,

                    [
                        newQuantity,
                        existingItems[0].id
                    ]

                );

            } else {

                await db.query(

                    `INSERT INTO cart_items
                    (
                        cart_id,
                        product_id,
                        quantity
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?
                    )`,

                    [
                        cartId,
                        productId,
                        itemQuantity
                    ]

                );

            }


            res.json({

                success: true,

                message:
                    "Product added to cart successfully."

            });

        } catch (error) {

            console.error(
                "Add cart item error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to add product to cart.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   UPDATE CART ITEM
========================================= */

app.put(
    "/api/cart/items/:id",
    async (req, res) => {

        try {

            const itemId =
                Number(req.params.id);

            const quantity =
                Number(req.body.quantity);


            if (
                !itemId ||
                !quantity ||
                quantity < 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid cart item or quantity."

                });

            }


            const [items] =
                await db.query(

                    `SELECT
                        ci.id,
                        ci.quantity,
                        p.stock,
                        p.name
                     FROM cart_items ci

                     INNER JOIN products p
                        ON ci.product_id = p.id

                     WHERE ci.id = ?

                     LIMIT 1`,

                    [itemId]

                );


            if (
                items.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Cart item not found."

                });

            }


            const item =
                items[0];


            if (
                quantity >
                item.stock
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Only ${item.stock} item(s) are available for ${item.name}.`

                });

            }


            await db.query(

                `UPDATE cart_items
                 SET quantity = ?
                 WHERE id = ?`,

                [
                    quantity,
                    itemId
                ]

            );


            res.json({

                success: true,

                message:
                    "Cart item updated successfully."

            });

        } catch (error) {

            console.error(
                "Update cart item error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to update cart item.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   REMOVE CART ITEM
========================================= */

app.delete(
    "/api/cart/items/:id",
    async (req, res) => {

        try {

            const itemId =
                Number(req.params.id);


            if (!itemId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid cart item ID."

                });

            }


            const [result] =
                await db.query(

                    `DELETE FROM cart_items
                     WHERE id = ?`,

                    [itemId]

                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Cart item not found."

                });

            }


            res.json({

                success: true,

                message:
                    "Cart item removed successfully."

            });

        } catch (error) {

            console.error(
                "Remove cart item error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to remove cart item.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   CREATE ORDER FROM CART
========================================= */

app.post(
    "/api/orders",
    async (req, res) => {

        let connection;


        try {

            const {
                user_id,
                delivery_address,
                phone,
                payment_method
            } = req.body;


            const userId =
                Number(user_id);


            if (
                !userId ||
                !delivery_address ||
                !phone ||
                !payment_method
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please complete all checkout information."

                });

            }


            const cleanAddress =
                String(
                    delivery_address
                ).trim();

            const cleanPhone =
                String(phone).trim();

            const cleanPaymentMethod =
                String(
                    payment_method
                ).trim();


            if (
                cleanAddress.length < 5
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid delivery address."

                });

            }


            if (
                !/^09\d{9}$/.test(
                    cleanPhone
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid 11-digit Philippine mobile number."

                });

            }


            const allowedPaymentMethods = [

                "Cash on Delivery",

                "GCash",

                "Bank Transfer"

            ];


            if (
                !allowedPaymentMethods.includes(
                    cleanPaymentMethod
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment method."

                });

            }


            connection =
                await db.getConnection();


            await connection.beginTransaction();


            const [users] =
                await connection.query(

                    `SELECT
                        id,
                        name,
                        email,
                        phone,
                        address
                     FROM users
                     WHERE id = ?
                     LIMIT 1`,

                    [userId]

                );


            if (
                users.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const user =
                users[0];


            const [carts] =
                await connection.query(

                    `SELECT
                        id,
                        user_id,
                        created_at
                     FROM carts
                     WHERE user_id = ?
                     ORDER BY id DESC
                     LIMIT 1`,

                    [userId]

                );


            if (
                carts.length === 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "Your cart is empty."

                });

            }


            const cart =
                carts[0];


            const [cartItems] =
                await connection.query(

                    `SELECT
                        ci.id,
                        ci.product_id,
                        ci.quantity,
                        p.name,
                        p.price,
                        p.stock,
                        p.status
                     FROM cart_items ci

                     INNER JOIN products p
                        ON ci.product_id = p.id

                     WHERE ci.cart_id = ?

                     ORDER BY ci.id ASC`,

                    [cart.id]

                );


            if (
                cartItems.length === 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "Your cart is empty."

                });

            }


            let totalAmount = 0;


            for (
                const item of cartItems
            ) {

                if (
                    item.status !==
                    "available"
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            `${item.name} is currently unavailable.`

                    });

                }


                if (
                    Number(item.quantity) < 1
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            `Invalid quantity for ${item.name}.`

                    });

                }


                if (
                    Number(item.quantity) >
                    Number(item.stock)
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            `Not enough stock for ${item.name}. Only ${item.stock} item(s) are available.`

                    });

                }


                const subtotal =
                    Number(item.price) *
                    Number(item.quantity);


                totalAmount +=
                    subtotal;

            }


            totalAmount =
                Number(
                    totalAmount.toFixed(2)
                );


            const [orderResult] =
                await connection.query(

                    `INSERT INTO orders
                    (
                        user_id,
                        total_amount,
                        delivery_address,
                        phone,
                        payment_method,
                        status
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'Pending'
                    )`,

                    [
                        userId,
                        totalAmount,
                        cleanAddress,
                        cleanPhone,
                        cleanPaymentMethod
                    ]

                );


            const orderId =
                orderResult.insertId;


            for (
                const item of cartItems
            ) {

                await connection.query(

                    `INSERT INTO order_items
                    (
                        order_id,
                        product_id,
                        quantity,
                        price
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?
                    )`,

                    [
                        orderId,
                        item.product_id,
                        item.quantity,
                        item.price
                    ]

                );


                await connection.query(

                    `UPDATE products
                     SET stock = stock - ?
                     WHERE id = ?
                     AND stock >= ?`,

                    [
                        item.quantity,
                        item.product_id,
                        item.quantity
                    ]

                );

            }


            await connection.query(

                `DELETE FROM cart_items
                 WHERE cart_id = ?`,

                [cart.id]

            );


            await connection.commit();


            res.status(201).json({

                success: true,

                message:
                    "Order placed successfully!",

                order: {

                    id:
                        orderId,

                    user_id:
                        userId,

                    customer_name:
                        user.name,

                    email:
                        user.email,

                    total_amount:
                        totalAmount.toFixed(2),

                    delivery_address:
                        cleanAddress,

                    phone:
                        cleanPhone,

                    payment_method:
                        cleanPaymentMethod,

                    status:
                        "Pending"

                }

            });

        } catch (error) {

            console.error(
                "Create order error:",
                error
            );


            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "Rollback error:",
                        rollbackError
                    );

                }

            }


            res.status(500).json({

                success: false,

                message:
                    "Unable to place order.",

                error:
                    error.message

            });

        } finally {

            if (connection) {

                connection.release();

            }

        }

    }
);


/* =========================================
   GET CUSTOMER ORDERS
========================================= */

app.get(
    "/api/orders/user/:userId",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.userId);


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const [orders] =
                await db.query(

                    `SELECT
                        id,
                        user_id,
                        total_amount,
                        delivery_address,
                        phone,
                        payment_method,
                        status,
                        created_at
                     FROM orders
                     WHERE user_id = ?
                     ORDER BY created_at DESC`,

                    [userId]

                );


            res.json({

                success: true,

                count:
                    orders.length,

                orders:
                    orders

            });

        } catch (error) {

            console.error(
                "Get customer orders error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve customer orders.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   GET SINGLE ORDER
========================================= */

app.get(
    "/api/orders/:id",
    async (req, res) => {

        try {

            const orderId =
                Number(req.params.id);


            if (!orderId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID."

                });

            }


            const [orders] =
                await db.query(

                    `SELECT
                        o.id,
                        o.user_id,
                        u.name AS customer_name,
                        u.email,
                        o.total_amount,
                        o.delivery_address,
                        o.phone,
                        o.payment_method,
                        o.status,
                        o.created_at
                     FROM orders o

                     INNER JOIN users u
                        ON o.user_id = u.id

                     WHERE o.id = ?

                     LIMIT 1`,

                    [orderId]

                );


            if (
                orders.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."

                });

            }


            const [items] =
                await db.query(

                    `SELECT
                        oi.id,
                        oi.order_id,
                        oi.product_id,
                        p.name,
                        p.description,
                        oi.quantity,
                        oi.price,
                        (
                            oi.quantity * oi.price
                        ) AS subtotal
                     FROM order_items oi

                     INNER JOIN products p
                        ON oi.product_id = p.id

                     WHERE oi.order_id = ?

                     ORDER BY oi.id ASC`,

                    [orderId]

                );


            res.json({

                success: true,

                order: {

                    ...orders[0],

                    items:
                        items

                }

            });

        } catch (error) {

            console.error(
                "Get single order error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve order.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   GET DATABASE TABLES
========================================= */

app.get(
    "/api/tables",
    async (req, res) => {

        try {

            const [tables] =
                await db.query(
                    "SHOW TABLES"
                );


            res.json({

                success: true,

                tables:
                    tables

            });

        } catch (error) {

            console.error(
                "Error getting tables:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve database tables.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   404 PAGE
========================================= */

app.use(
    (req, res) => {

        res.status(404).send(`

            <!DOCTYPE html>

            <html lang="en">

            <head>

                <meta charset="UTF-8">

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >

                <title>
                    404 - ADD Motor Shop
                </title>

                <style>

                    * {
                        box-sizing: border-box;
                    }

                    body {

                        margin: 0;

                        min-height: 100vh;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        font-family:
                            Arial,
                            sans-serif;

                        color: white;

                        background:
                            radial-gradient(
                                circle at 20% 30%,
                                rgba(
                                    220,
                                    38,
                                    38,
                                    0.18
                                ),
                                transparent 30%
                            ),
                            linear-gradient(
                                135deg,
                                #050505,
                                #160505,
                                #080808
                            );

                    }

                    .box {

                        width: 90%;

                        max-width: 500px;

                        padding: 40px;

                        text-align: center;

                        border-radius: 15px;

                        border:
                            1px solid #3a1717;

                        background:
                            rgba(
                                20,
                                10,
                                10,
                                0.8
                            );

                        box-shadow:
                            0 20px 50px
                            rgba(
                                0,
                                0,
                                0,
                                0.5
                            );

                    }

                    h1 {

                        margin-bottom: 10px;

                        color: #ef4444;

                        font-size: 3rem;

                    }

                    p {

                        color: #a3a3a3;

                        line-height: 1.6;

                    }

                    a {

                        display: inline-block;

                        margin-top: 20px;

                        padding:
                            11px 20px;

                        border-radius: 8px;

                        color: white;

                        background: #dc2626;

                        text-decoration: none;

                        font-weight: 600;

                    }

                    a:hover {

                        background: #ef4444;

                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>404</h1>

                    <p>
                        The requested page could not be found.
                    </p>

                    <a href="/frontend/index.html">
                        Back to ADD Motor Shop
                    </a>

                </div>

            </body>

            </html>

        `);

    }
);


/* =========================================
   START SERVER
========================================= */

app.listen(
    PORT,
    async () => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "       ADD MOTOR SHOP SYSTEM"
        );

        console.log(
            "========================================"
        );

        console.log("");

        console.log(
            `Server running at: http://localhost:${PORT}`
        );

        console.log("");

        console.log(
            "Frontend:"
        );

        console.log(
            "http://localhost:3000/frontend/"
        );

        console.log("");

        try {

            const connection =
                await db.getConnection();

            console.log(
                "Database connection successful!"
            );

            connection.release();

        } catch (error) {

            console.log(
                "Database connection failed!"
            );

            console.log(
                "Error:",
                error.message
            );

        }

        console.log("");

        console.log(
            "========================================"
        );

        console.log("");

    }
);