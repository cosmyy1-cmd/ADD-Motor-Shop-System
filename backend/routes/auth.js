
const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const db = require("../db");

const router = express.Router();

const MAX_ID_SIZE = 5 * 1024 * 1024;
const MAX_LOGIN_ATTEMPTS = 5;

const ALLOWED_ID_TYPES = [
    "Driver's License",
    "Philippine National ID",
    "Passport",
    "UMID",
    "SSS ID",
    "PhilHealth ID",
    "Postal ID",
    "Voter's ID",
    "Student ID"
];

const ALLOWED_SUFFIXES = [
    "",
    "Jr.",
    "Sr.",
    "II",
    "III",
    "IV",
    "V"
];

// Store uploaded files in memory so they can be saved directly to the database.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_ID_SIZE,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ["image/jpeg", "image/png"];
        const allowedExtensions = /\.(jpg|jpeg|png)$/i;

        if (
            !allowedMimeTypes.includes(file.mimetype) ||
            !allowedExtensions.test(file.originalname)
        ) {
            return callback(
                new Error("Only JPG, JPEG, and PNG ID images are accepted.")
            );
        }

        callback(null, true);
    }
});

function handleIdentityUpload(req, res, next) {
    upload.single("identityDocument")(req, res, error => {
        if (!error) return next();

        if (
            error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_SIZE"
        ) {
            return res.status(400).json({
                success: false,
                message: "Your ID image must not exceed 5 MB."
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message || "Invalid identity document upload."
        });
    });
}

function isValidName(value) {
    return (
        typeof value === "string" &&
        value.trim().length >= 1 &&
        value.trim().length <= 50 &&
        /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(value.trim())
    );
}

function isValidImageSignature(buffer, mimeType) {
    if (!Buffer.isBuffer(buffer)) return false;

    if (mimeType === "image/jpeg") {
        return (
            buffer.length >= 3 &&
            buffer[0] === 0xFF &&
            buffer[1] === 0xD8 &&
            buffer[2] === 0xFF
        );
    }

    if (mimeType === "image/png") {
        const pngSignature = Buffer.from([
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
        ]);

        return (
            buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(pngSignature)
        );
    }

    return false;
}

function cleanFileName(fileName) {
    return String(fileName || "identity-document")
        .replace(/[^\w.\- ]/g, "_")
        .slice(0, 255);
}

// ======================================================
// CUSTOMER REGISTRATION
// POST /api/register
// New customer accounts are automatically PENDING.
// ======================================================

router.post("/register", handleIdentityUpload, async (req, res) => {
    let connection;

    try {
        const {
            firstName,
            middleName,
            lastName,
            suffix,
            email,
            password,
            phone,
            region,
            province,
            city,
            barangay,
            streetAddress,
            idType
        } = req.body;

        // Required information
        if (
            !firstName ||
            !lastName ||
            !email ||
            !password ||
            !phone ||
            !region ||
            !city ||
            !barangay ||
            !streetAddress ||
            !idType
        ) {
            return res.status(400).json({
                success: false,
                message: "Please complete all required registration fields."
            });
        }

        // Validate names
        if (!isValidName(firstName)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid first name."
            });
        }

        if (middleName && !isValidName(middleName)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid middle name."
            });
        }

        if (!isValidName(lastName)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid last name."
            });
        }

        // Validate suffix
        const cleanSuffix = String(suffix || "").trim();

        if (!ALLOWED_SUFFIXES.includes(cleanSuffix)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid name suffix."
            });
        }

        // Validate Gmail address
        const cleanEmail = String(email).trim().toLowerCase();

        if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Only valid Gmail addresses are accepted."
            });
        }

        // Validate Philippine mobile number
        const cleanPhone = String(phone).trim();

        if (!/^09\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 11-digit Philippine mobile number starting with 09."
            });
        }

        // Validate password
        if (
            typeof password !== "string" ||
            password.length < 8 ||
            !/\d/.test(password)
        ) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters and one number."
            });
        }

        // Validate address
        const cleanRegion = String(region).trim();
        const cleanProvince = String(province || "Not Applicable").trim();
        const cleanCity = String(city).trim();
        const cleanBarangay = String(barangay).trim();
        const cleanStreet = String(streetAddress).trim();

        if (
            cleanRegion.length < 2 ||
            cleanCity.length < 2 ||
            cleanBarangay.length < 2 ||
            cleanStreet.length < 3 ||
            cleanStreet.length > 200
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a complete and valid home address."
            });
        }

        // Validate government-issued ID or Student ID
        const cleanIdType = String(idType || "").trim();

        if (!ALLOWED_ID_TYPES.includes(cleanIdType)) {
            return res.status(400).json({
                success: false,
                message: "Please select an accepted government-issued or student ID."
            });
        }

        // Require an uploaded ID image
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload your valid ID."
            });
        }

        // Verify actual image signature
        if (!isValidImageSignature(req.file.buffer, req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file is not a valid JPG or PNG image."
            });
        }

        // Build full name
        const fullName = [
            firstName.trim(),
            middleName ? middleName.trim() : "",
            lastName.trim(),
            cleanSuffix
        ].filter(Boolean).join(" ");

        if (fullName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Your complete name is too long. Please review your name fields."
            });
        }

        // Build complete address
        const fullAddress = [
            cleanStreet,
            cleanBarangay,
            cleanCity,
            cleanProvince !== "Not Applicable" ? cleanProvince : "",
            cleanRegion
        ].filter(Boolean).join(", ");

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save account and identity document together
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check existing email
        const [existingUsers] = await connection.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [cleanEmail]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "This Gmail address is already registered."
            });
        }

        // Create customer account with PENDING status
        const [userResult] = await connection.execute(
            `INSERT INTO users
                (name, email, password, phone, address, role, account_status)
             VALUES (?, ?, ?, ?, ?, 'customer', 'pending')`,
            [
                fullName,
                cleanEmail,
                hashedPassword,
                cleanPhone,
                fullAddress
            ]
        );

        const userId = userResult.insertId;

        // Save identity document
        await connection.execute(
            `INSERT INTO customer_identity_documents
                (user_id, id_type, file_name, mime_type, file_data)
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                cleanIdType,
                cleanFileName(req.file.originalname),
                req.file.mimetype,
                req.file.buffer
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            code: "ACCOUNT_PENDING",
            message: "Your account has been registered successfully and is now waiting for admin approval.",
            user: {
                id: userId,
                name: fullName,
                email: cleanEmail,
                phone: cleanPhone,
                address: fullAddress,
                role: "customer",
                account_status: "pending"
            }
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Registration rollback error:", rollbackError);
            }
        }

        console.error("Registration error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This Gmail address is already registered."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration could not be completed. Please try again."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// ======================================================
// CUSTOMER LOGIN
// POST /api/login
//
// Five consecutive incorrect passwords lock a customer
// account until an administrator restores it.
//
// A locked account cannot log in even with the correct
// password. The database transaction prevents concurrent
// login requests from bypassing the attempt limit.
// ======================================================

router.post("/login", async (req, res) => {

    let connection;
    let transactionStarted = false;

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please use a valid Gmail address."
            });
        }

        // Start transaction to serialize login attempts
        connection = await db.getConnection();

        await connection.beginTransaction();
        transactionStarted = true;

        // Lock the account row while checking the password
        const [users] = await connection.execute(
            `SELECT
                id,
                name,
                email,
                password,
                phone,
                address,
                role,
                account_status,
                failed_login_attempts,
                created_at
             FROM users
             WHERE email = ?
             LIMIT 1
             FOR UPDATE`,
            [cleanEmail]
        );

        if (users.length === 0) {

            await connection.rollback();
            transactionStarted = false;

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        const failedAttempts = Number(
            user.failed_login_attempts || 0
        );

        const isCustomer =
            String(user.role).toLowerCase() === "customer";

        // ==============================================
        // CHECK WHETHER CUSTOMER ACCOUNT IS ALREADY LOCKED
        // ==============================================

        // This check happens BEFORE password comparison.
        // A correct password cannot bypass an existing lock.
        if (
            isCustomer &&
            failedAttempts >= MAX_LOGIN_ATTEMPTS
        ) {

            await connection.rollback();
            transactionStarted = false;

            return res.status(403).json({
                success: false,
                code: "ACCOUNT_LOCKED",
                account_locked: true,
                failedAttempts: MAX_LOGIN_ATTEMPTS,
                message: "Your account has been locked due to five unsuccessful login attempts. Please contact ADD Motor Shop for account restoration."
            });
        }

        // ==============================================
        // VERIFY PASSWORD
        // ==============================================

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        // ==============================================
        // INCORRECT PASSWORD
        // ==============================================

        if (!passwordMatch) {

            // Failed-attempt lockout applies to customer accounts.
            // Admin login behavior is preserved.
            if (!isCustomer) {

                await connection.rollback();
                transactionStarted = false;

                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            // Calculate the next attempt while holding the row lock.
            const updatedAttempts = Math.min(
                failedAttempts + 1,
                MAX_LOGIN_ATTEMPTS
            );

            await connection.execute(
                `UPDATE users
                 SET failed_login_attempts = ?
                 WHERE id = ?`,
                [
                    updatedAttempts,
                    user.id
                ]
            );

            await connection.commit();
            transactionStarted = false;

            const remainingAttempts = Math.max(
                0,
                MAX_LOGIN_ATTEMPTS - updatedAttempts
            );

            // Fifth incorrect password immediately locks the account.
            if (updatedAttempts >= MAX_LOGIN_ATTEMPTS) {

                return res.status(403).json({
                    success: false,
                    code: "ACCOUNT_LOCKED",
                    account_locked: true,
                    failedAttempts: MAX_LOGIN_ATTEMPTS,
                    remainingAttempts: 0,
                    message: "Your account has been locked due to five unsuccessful login attempts. Please contact ADD Motor Shop for account restoration."
                });
            }

            // Warning messages for attempts one through four.
            let message;

            if (updatedAttempts <= 2) {

                message = `Incorrect password. You have ${remainingAttempts} attempts remaining.`;

            } else if (updatedAttempts === 3) {

                message = `Warning: Only ${remainingAttempts} attempts remaining before your account is locked.`;

            } else {

                message = `Final warning: Only ${remainingAttempts} attempt remaining before your account is locked.`;

            }

            return res.status(401).json({
                success: false,
                code: "INVALID_PASSWORD",
                message,
                failedAttempts: updatedAttempts,
                remainingAttempts
            });
        }

        // ==============================================
        // CORRECT PASSWORD: RESET FAILED ATTEMPTS
        // ==============================================

        await connection.execute(
            `UPDATE users
             SET failed_login_attempts = 0
             WHERE id = ?`,
            [user.id]
        );

        await connection.commit();
        transactionStarted = false;

        // ==============================================
        // CUSTOMER ACCOUNT APPROVAL CHECKS
        // ==============================================

        // Pending and rejected customer accounts cannot log in.
        if (isCustomer) {

            if (user.account_status === "pending") {

                return res.status(403).json({
                    success: false,
                    code: "ACCOUNT_PENDING",
                    account_status: "pending",
                    message: "Your account is currently pending admin approval. Please wait until the administrator reviews and approves your registration."
                });
            }

            if (user.account_status === "rejected") {

                return res.status(403).json({
                    success: false,
                    code: "ACCOUNT_REJECTED",
                    account_status: "rejected",
                    message: "Your account registration was not approved. Please contact the administrator for more information."
                });
            }

            if (user.account_status !== "approved") {

                return res.status(403).json({
                    success: false,
                    code: "ACCOUNT_UNAVAILABLE",
                    message: "Your account is not currently available for login."
                });
            }
        }

        // ==============================================
        // SUCCESSFUL LOGIN
        // ==============================================

        const {
            password: savedPassword,
            failed_login_attempts,
            ...safeUser
        } = user;

        return res.json({
            success: true,
            message: "Login successful.",
            user: {
                ...safeUser,
                failed_login_attempts: 0
            }
        });

    } catch (error) {

        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Login transaction rollback error:",
                    rollbackError
                );
            }
        }

        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to log in. Please try again."
        });

    } finally {

        if (connection) {
            connection.release();
        }

    }
});

// ======================================================
// GET CUSTOMER INFORMATION
// GET /api/user/:id
// Existing user-fetch functionality preserved.
// ======================================================

router.get("/user/:id", async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const [users] = await db.query(
            `SELECT
                id,
                name,
                email,
                phone,
                address,
                role,
                account_status,
                created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error("Get user error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user information."
        });
    }
});

module.exports = router;
