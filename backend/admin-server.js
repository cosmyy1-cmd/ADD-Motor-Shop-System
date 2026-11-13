
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const adminServicesRouter =
    require("./admin-services");

const createAdminInventoryRouter =
    require("./admin-inventory");

const createAdminInventoryArchiveRouter =
    require("./admin-inventory-archive");

const createAdminSuppliersRouter =
    require("./admin-suppliers");

const createAdminSalesRouter =
    require("./admin-sales");

const createAdminPurchasesRouter =
    require("./admin-purchases");

const createAdminSupplierProductsRouter =
    require("./admin-supplier-products");

const createAdminReportsRouter =
    require("./admin-reports");

/* NEW: DASHBOARD ANALYTICS ROUTER */
const createAdminDashboardAnalyticsRouter =
    require("./admin-dashboard-analytics");

const {
    getCustomerStatuses
} = require("./customer-status");

const app = express();

const PORT = 3001;


/* =========================================
   DATABASE CONFIGURATION
========================================= */

const db = mysql.createPool({
    host: "localhost",
    port: 3307,
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

app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================
   ADMIN AUTHENTICATION HELPER

   All authorized admin accounts can access
   shop-wide records and transactions.

   Record ownership is not restricted by
   the ID of the admin who created a record.
========================================= */

async function requireAdmin(req, res, next) {

    try {

        let adminId = Number(
            req.headers["x-admin-id"] || 0
        );


        /*
         * FALLBACK TO LOGIN COOKIE
         */

        if (
            !adminId &&
            req.headers.cookie
        ) {

            const cookies =
                req.headers.cookie
                    .split(";")
                    .map(cookie => cookie.trim());


            const adminCookie =
                cookies.find(cookie =>
                    cookie.startsWith("admin_id=")
                );


            if (adminCookie) {

                const cookieValue =
                    adminCookie.substring(
                        "admin_id=".length
                    );

                adminId = Number(
                    decodeURIComponent(cookieValue)
                );

            }

        }


        /*
         * CHECK AUTHENTICATION
         */

        if (
            !Number.isInteger(adminId) ||
            adminId <= 0
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Admin authentication is missing. Please log in again."

            });

        }


        /*
         * VERIFY ADMIN ACCOUNT
         */

        const [users] = await db.query(

            `SELECT
                id,
                name,
                email,
                role

             FROM users

             WHERE id = ?

             LIMIT 1`,

            [adminId]

        );


        if (users.length === 0) {

            return res.status(401).json({

                success: false,

                message:
                    "Admin account not found."

            });

        }


        const user = users[0];


        /*
         * ONLY AUTHORIZED ADMIN ACCOUNTS
         * CAN ACCESS ADMIN ENDPOINTS.
         */

        if (
            String(user.role).toLowerCase() !== "admin"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Administrator access is required."

            });

        }


        /*
         * ATTACH VERIFIED ADMIN
         */

        req.admin = user;

        return next();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to verify admin access.",

            error:
                error.message

        });

    }

}


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
   ADMIN HOME
========================================= */

app.get("/", (req, res) => {

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ADD Motor Shop Admin</title>

            <style>
                body {
                    margin: 0;
                    min-height: 100vh;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    background: #080808;
                    color: white;

                    font-family:
                        Arial,
                        sans-serif;
                }

                .box {
                    width: 90%;
                    max-width: 500px;

                    padding: 40px;

                    text-align: center;

                    border-radius: 16px;

                    background: #151515;

                    border: 1px solid #333;

                    box-shadow:
                        0 20px 60px
                        rgba(0, 0, 0, 0.5);
                }

                h1 {
                    color: #dc2626;
                    margin-bottom: 10px;
                }

                p {
                    color: #aaa;
                    line-height: 1.6;
                }

                a {
                    display: inline-block;

                    margin-top: 20px;

                    padding: 12px 20px;

                    border-radius: 8px;

                    background: #dc2626;

                    color: white;

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

                <h1>
                    ADD MOTOR SHOP
                </h1>

                <p>
                    Admin backend is running successfully.
                </p>

                <p>
                    Admin server:
                    <strong>
                        http://localhost:3001
                    </strong>
                </p>

                <a href="/frontend/admin/appointments.html">
                    Open Admin Appointments
                </a>

            </div>

        </body>
        </html>
    `);

});


/* =========================================
   DATABASE TEST
========================================= */

app.get(
    "/api/admin/test-db",
    async (req, res) => {

        try {

            const [rows] = await db.query(
                "SELECT 1 AS connected"
            );

            res.json({

                success: true,

                message:
                    "Admin database connection successful!",

                result:
                    rows

            });

        } catch (error) {

            console.error(
                "Admin database error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Admin database connection failed.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   ADMIN API TEST
========================================= */

app.get(
    "/api/admin/test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "ADD Motor Shop admin backend is running!"

        });

    }
);


/* =========================================
   ADMIN LOGIN
========================================= */

app.post(
    "/api/admin/login",
    async (req, res) => {

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
                        "Email and password are required."

                });

            }


            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();


            const [users] = await db.query(

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


            if (users.length === 0) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            const user = users[0];


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


            if (
                String(user.role).toLowerCase() !== "admin"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Admin access is required."

                });

            }


            delete user.password;


            /*
             * CREATE ADMIN AUTHENTICATION COOKIE
             */

            res.setHeader(
                "Set-Cookie",
                `admin_id=${encodeURIComponent(
                    user.id
                )}; Path=/; HttpOnly; SameSite=Lax`
            );


            res.json({

                success: true,

                message:
                    "Admin login successful.",

                user

            });

        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to process admin login.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   ADMIN LOGOUT
========================================= */

app.post(
    "/api/admin/logout",
    (req, res) => {

        res.setHeader(
            "Set-Cookie",
            "admin_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        );

        res.json({

            success: true,

            message:
                "Admin logged out successfully."

        });

    }
);



/* =========================================
   GET ALL CUSTOMERS
========================================= */

app.get(
    "/api/admin/customers",
    requireAdmin,
    async (req, res) => {
        try {
            const [customers] = await db.query(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.phone,
                    u.address,
                    u.created_at,

                    (
                        SELECT COUNT(*)
                        FROM customer_motorcycles cm
                        WHERE cm.user_id = u.id
                    ) AS motorcycle_count,

                    (
                        SELECT COUNT(*)
                        FROM reservations r
                        WHERE r.user_id = u.id
                    ) AS appointment_count

                 FROM users u

                 WHERE LOWER(u.role) = 'customer'

                 ORDER BY
                    u.created_at DESC,
                    u.id DESC`
            );

            const formattedCustomers = customers.map(customer => ({
                ...customer,
                motorcycle_count: Number(customer.motorcycle_count || 0),
                appointment_count: Number(customer.appointment_count || 0)
            }));

            const customersWithStatus = await getCustomerStatuses(
                db,
                formattedCustomers
            );

            res.json({
                success: true,
                count: customersWithStatus.length,
                customers: customersWithStatus
            });

        } catch (error) {
            console.error("Get admin customers error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to retrieve customers.",
                error: error.message
            });
        }
    }
);


/* =========================================
   GET PENDING CUSTOMER COUNT
========================================= */

app.get(
    "/api/admin/customers/pending/count",
    requireAdmin,
    async (req, res) => {

        try {

            const [result] = await db.query(

                `SELECT COUNT(*) AS total

                 FROM users

                 WHERE LOWER(role) = 'customer'
                 AND account_status = 'pending'`

            );

            res.json({
                success: true,
                count: Number(result[0].total)
            });

        } catch (error) {

            console.error(
                "Pending customer count error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve pending account count.",
                error: error.message
            });

        }

    }
);


/* =========================================
   APPROVE OR REJECT CUSTOMER ACCOUNT
========================================= */

app.put(
    "/api/admin/customers/:id/account-status",
    requireAdmin,
    async (req, res) => {

        try {

            const customerId =
                Number(req.params.id);

            const accountStatus =
                String(
                    req.body.account_status || ""
                ).toLowerCase();


            if (
                !Number.isInteger(customerId) ||
                customerId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid customer ID."
                });

            }


            if (
                !["approved", "rejected"].includes(
                    accountStatus
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Account status must be approved or rejected."
                });

            }


            const [result] = await db.query(

                `UPDATE users

                 SET account_status = ?

                 WHERE id = ?
                 AND LOWER(role) = 'customer'
                 AND account_status = 'pending'`,

                [
                    accountStatus,
                    customerId
                ]

            );


            if (result.affectedRows === 0) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This customer account is no longer pending or does not exist."
                });

            }


            res.json({
                success: true,
                message:
                    accountStatus === "approved"
                        ? "Customer account approved successfully."
                        : "Customer account rejected successfully.",
                customer: {
                    id: customerId,
                    account_status: accountStatus
                }
            });

        } catch (error) {

            console.error(
                "Update customer account status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update customer account status.",
                error: error.message
            });

        }

    }
);


/* =========================================
   GET ALL RESERVATIONS
========================================= */

app.get(
    "/api/admin/reservations",
    requireAdmin,
    async (req, res) => {

        try {

            const [reservations] = await db.query(

                `SELECT
                    r.id,
                    r.user_id,

                    u.name AS customer_name,
                    u.email AS customer_email,
                    u.phone AS customer_phone,
                    u.address AS customer_address,

                    r.motorcycle_id,

                    cm.brand AS motorcycle_brand,
                    cm.model AS motorcycle_model,
                    cm.year AS motorcycle_year,
                    cm.engine_cc AS motorcycle_engine_cc,
                    cm.plate_number AS motorcycle_plate_number,
                    cm.color AS motorcycle_color,

                    r.service_id,

                    s.name AS service_name,
                    s.description AS service_description,
                    s.price AS service_price,
                    s.duration AS service_duration,

                    r.reservation_date,
                    r.reservation_time,
                    r.notes,
                    r.status,
                    r.created_at

                 FROM reservations r

                 INNER JOIN users u
                    ON r.user_id = u.id

                 LEFT JOIN services s
                    ON r.service_id = s.id

                 LEFT JOIN customer_motorcycles cm
                    ON r.motorcycle_id = cm.id

                 ORDER BY
                    r.reservation_date ASC,
                    r.reservation_time ASC,
                    r.id DESC`

            );


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

                     ORDER BY
                        rs.reservation_id ASC,
                        rs.id ASC`

                );


            const servicesByReservation = {};


            for (const service of reservationServices) {

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
                        Number(service.service_id),

                    name:
                        service.name,

                    description:
                        service.description,

                    price:
                        Number(service.price),

                    duration:
                        Number(service.duration || 0)

                });

            }


            const finalReservations =
                reservations.map(reservation => {

                    let services =
                        servicesByReservation[
                            reservation.id
                        ] || [];


                    if (
                        services.length === 0 &&
                        reservation.service_id
                    ) {

                        services = [

                            {

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
                                        reservation.service_price || 0
                                    ),

                                duration:
                                    Number(
                                        reservation.service_duration || 0
                                    )

                            }

                        ];

                    }


                    const total =
                        services.reduce(
                            (sum, service) =>
                                sum + Number(service.price || 0),
                            0
                        );


                    const totalDuration =
                        services.reduce(
                            (sum, service) =>
                                sum + Number(service.duration || 0),
                            0
                        );


                    return {

                        ...reservation,

                        service_ids:
                            services.map(service => service.id),

                        services,

                        total,

                        total_duration:
                            totalDuration

                    };

                });


            res.json({

                success: true,

                count:
                    finalReservations.length,

                reservations:
                    finalReservations

            });

        } catch (error) {

            console.error(
                "Admin reservations error:",
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
========================================= */

app.get(
    "/api/admin/reservations/:id",
    requireAdmin,
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


            const [reservations] = await db.query(

                `SELECT
                    r.id,
                    r.user_id,

                    u.name AS customer_name,
                    u.email AS customer_email,
                    u.phone AS customer_phone,
                    u.address AS customer_address,

                    r.motorcycle_id,

                    cm.brand AS motorcycle_brand,
                    cm.model AS motorcycle_model,
                    cm.year AS motorcycle_year,
                    cm.engine_cc AS motorcycle_engine_cc,
                    cm.plate_number AS motorcycle_plate_number,
                    cm.color AS motorcycle_color,

                    r.service_id,

                    s.name AS service_name,
                    s.description AS service_description,
                    s.price AS service_price,
                    s.duration AS service_duration,

                    r.reservation_date,
                    r.reservation_time,
                    r.notes,
                    r.status,
                    r.created_at

                 FROM reservations r

                 INNER JOIN users u
                    ON r.user_id = u.id

                 LEFT JOIN services s
                    ON r.service_id = s.id

                 LEFT JOIN customer_motorcycles cm
                    ON r.motorcycle_id = cm.id

                 WHERE r.id = ?

                 LIMIT 1`,

                [reservationId]

            );


            if (reservations.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Reservation not found."

                });

            }


            const reservation = reservations[0];


            const [services] = await db.query(

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


            let finalServices =
                services.map(service => ({

                    id:
                        Number(service.service_id),

                    name:
                        service.name,

                    description:
                        service.description,

                    price:
                        Number(service.price),

                    duration:
                        Number(service.duration || 0)

                }));


            if (
                finalServices.length === 0 &&
                reservation.service_id
            ) {

                finalServices = [

                    {

                        id:
                            Number(reservation.service_id),

                        name:
                            reservation.service_name,

                        description:
                            reservation.service_description,

                        price:
                            Number(reservation.service_price || 0),

                        duration:
                            Number(reservation.service_duration || 0)

                    }

                ];

            }


            const total =
                finalServices.reduce(
                    (sum, service) =>
                        sum + Number(service.price || 0),
                    0
                );


            const totalDuration =
                finalServices.reduce(
                    (sum, service) =>
                        sum + Number(service.duration || 0),
                    0
                );


            res.json({

                success: true,

                reservation: {

                    ...reservation,

                    services:
                        finalServices,

                    service_ids:
                        finalServices.map(service => service.id),

                    total,

                    total_duration:
                        totalDuration

                }

            });

        } catch (error) {

            console.error(
                "Admin single reservation error:",
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
   UPDATE RESERVATION STATUS
========================================= */

app.put(
    "/api/admin/reservations/:id/status",
    requireAdmin,
    async (req, res) => {

        const connection =
            await db.getConnection();

        try {

            const reservationId =
                Number(req.params.id);

            const {
                status
            } = req.body;


            const allowedStatuses = [

                "Pending",
                "Confirmed",
                "In Service",
                "Completed",
                "Cancelled"

            ];


            if (!reservationId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid reservation ID."

                });

            }


            if (
                !allowedStatuses.includes(status)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid reservation status."

                });

            }


            await connection.beginTransaction();


            const [reservations] =
                await connection.query(

                    `SELECT
                        id,
                        reservation_date,
                        reservation_time,
                        status

                     FROM reservations

                     WHERE id = ?

                     FOR UPDATE`,

                    [reservationId]

                );


            if (reservations.length === 0) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "Reservation not found."

                });

            }


            const reservation = reservations[0];


            if (
                status === "Confirmed" ||
                status === "In Service"
            ) {

                const [conflicts] =
                    await connection.query(

                        `SELECT
                            id,
                            status

                         FROM reservations

                         WHERE reservation_date = ?

                         AND reservation_time = ?

                         AND id <> ?

                         AND status IN (
                            'Confirmed',
                            'In Service'
                         )

                         LIMIT 1`,

                        [
                            reservation.reservation_date,
                            reservation.reservation_time,
                            reservationId
                        ]

                    );


                if (conflicts.length > 0) {

                    await connection.rollback();

                    return res.status(409).json({

                        success: false,

                        message:
                            "This date and time is already confirmed for another appointment.",

                        conflict:
                            conflicts[0]

                    });

                }

            }


            if (
                (
                    status === "In Service" ||
                    status === "Completed"
                ) &&
                reservation.status === "Cancelled"
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "A cancelled appointment cannot be moved directly to this status."

                });

            }


            await connection.query(

                `UPDATE reservations

                 SET status = ?

                 WHERE id = ?`,

                [
                    status,
                    reservationId
                ]

            );


            await connection.commit();


            res.json({

                success: true,

                message:
                    `Reservation status updated to ${status}.`,

                reservation: {

                    id:
                        reservationId,

                    status

                }

            });

        } catch (error) {

            try {

                await connection.rollback();

            } catch (rollbackError) {

                console.error(
                    "Rollback error:",
                    rollbackError
                );

            }


            console.error(
                "Update reservation status error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to update reservation status.",

                error:
                    error.message

            });

        } finally {

            connection.release();

        }

    }
);


/* =========================================
   GET ADMIN DASHBOARD SUMMARY
========================================= */

app.get(
    "/api/admin/dashboard",
    requireAdmin,
    async (req, res) => {

        try {

            const [pendingResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM reservations

                     WHERE status = 'Pending'`

                );


            const [confirmedResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM reservations

                     WHERE status = 'Confirmed'`

                );


            const [serviceResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM reservations

                     WHERE status = 'In Service'`

                );


            const [completedResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM reservations

                     WHERE status = 'Completed'`

                );


            const [cancelledResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM reservations

                     WHERE status = 'Cancelled'`

                );


            const [customersResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM users

                     WHERE role = 'customer'`

                );


            const [motorcyclesResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM customer_motorcycles`

                );


            const [servicesResult] =
                await db.query(

                    `SELECT COUNT(*) AS total

                     FROM services`

                );


            res.json({

                success: true,

                summary: {

                    pending:
                        Number(pendingResult[0].total),

                    confirmed:
                        Number(confirmedResult[0].total),

                    in_service:
                        Number(serviceResult[0].total),

                    completed:
                        Number(completedResult[0].total),

                    cancelled:
                        Number(cancelledResult[0].total),

                    customers:
                        Number(customersResult[0].total),

                    motorcycles:
                        Number(motorcyclesResult[0].total),

                    services:
                        Number(servicesResult[0].total)

                }

            });

        } catch (error) {

            console.error(
                "Admin dashboard error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve admin dashboard data.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   ADMIN - DASHBOARD ANALYTICS API

   Separate from /api/admin/dashboard.
   Handles dashboard charts and daily sales cards.
========================================================= */

app.use(
    "/api/admin/dashboard-analytics",
    createAdminDashboardAnalyticsRouter(
        db,
        requireAdmin
    )
);


/* =========================================================
   ADMIN - GET ALL CUSTOMER MOTORCYCLES

   FIX:
   Uses shared requireAdmin middleware.

   Both x-admin-id and admin_id cookie
   authentication are supported.
========================================================= */

app.get(
    "/api/admin/motorcycles",
    requireAdmin,
    async (req, res) => {

        try {

            const [motorcycles] =
                await db.query(

                    `SELECT
                        cm.id,
                        cm.user_id,
                        cm.brand,
                        cm.model,
                        cm.year,
                        cm.engine_cc,
                        cm.plate_number,
                        cm.color,
                        cm.is_primary,
                        cm.created_at,

                        u.name AS owner_name,
                        u.email AS owner_email,
                        u.phone AS owner_phone,
                        u.address AS owner_address

                     FROM customer_motorcycles cm

                     INNER JOIN users u
                        ON u.id = cm.user_id

                     WHERE LOWER(u.role) = 'customer'

                     ORDER BY
                        cm.created_at DESC,
                        cm.id DESC`

                );


            res.json({

                success: true,

                count:
                    motorcycles.length,

                motorcycles,

                admin: {

                    id:
                        req.admin.id,

                    name:
                        req.admin.name,

                    email:
                        req.admin.email,

                    role:
                        req.admin.role

                }

            });

        } catch (error) {

            console.error(
                "Admin motorcycles error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve motorcycles.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   ADMIN - SERVICES API

   FIX:
   Protect the entire services router.
   Only authenticated admin accounts can
   access and manage shop services.
========================================================= */

app.use(
    "/api/admin/services",
    requireAdmin,
    adminServicesRouter
);


/* =========================================================
   ADMIN - INVENTORY ARCHIVE API
========================================================= */

app.use(
    "/api/admin/inventory",
    createAdminInventoryArchiveRouter(
        db,
        requireAdmin
    )
);


/* =========================================================
   ADMIN - INVENTORY API
========================================================= */

app.use(
    "/api/admin/inventory",
    createAdminInventoryRouter(
        db,
        requireAdmin
    )
);


/* =========================================================
   ADMIN - SUPPLIERS API
========================================================= */

app.use(
    "/api/admin/suppliers",
    createAdminSuppliersRouter(
        db,
        requireAdmin
    )
);


/* =========================================================
   ADMIN - SALES API
========================================================= */

app.use(
    "/api/admin/sales",
    createAdminSalesRouter(
        db,
        requireAdmin
    )
);


/* =========================================================
   ADMIN - PURCHASES API
========================================================= */

app.use(
    "/api/admin/purchases",
    createAdminPurchasesRouter(
        db,
        requireAdmin
    )
);


/* =========================================================
   ADMIN - REPORTS API
========================================================= */

app.use(
    "/api/admin/reports",
    createAdminReportsRouter(
        db,
        requireAdmin
    )
);


/* =========================================================
   ADMIN - SUPPLIER PRODUCTS API
========================================================= */

app.use(
    "/api/admin/supplier-products",
    createAdminSupplierProductsRouter(
        db,
        requireAdmin
    )
);


/* =========================================
   404
========================================= */

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Admin API endpoint not found.",

            path:
                req.originalUrl

        });

    }
);


/* =========================================
   START ADMIN SERVER
========================================= */

app.listen(
    PORT,
    async () => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "       ADD MOTOR SHOP ADMIN SERVER"
        );

        console.log(
            "========================================"
        );

        console.log("");


        console.log(
            `Admin server running at: http://localhost:${PORT}`
        );

        console.log("");


        console.log(
            "Admin frontend:"
        );

        console.log(
            "http://localhost:3001/frontend/admin/"
        );

        console.log("");


        console.log(
            "Admin appointments:"
        );

        console.log(
            "http://localhost:3001/frontend/admin/appointments.html"
        );

        console.log("");


        console.log(
            "Admin services:"
        );

        console.log(
            "http://localhost:3001/api/admin/services"
        );

        console.log("");


        console.log(
            "Admin inventory:"
        );

        console.log(
            "http://localhost:3001/api/admin/inventory"
        );

        console.log("");


        console.log(
            "Admin suppliers:"
        );

        console.log(
            "http://localhost:3001/api/admin/suppliers"
        );

        console.log("");


        console.log(
            "Admin sales:"
        );

        console.log(
            "http://localhost:3001/api/admin/sales"
        );

        console.log("");


        console.log(
            "Admin purchases:"
        );

        console.log(
            "http://localhost:3001/api/admin/purchases"
        );

        console.log("");


        console.log(
            "Admin reports:"
        );

        console.log(
            "http://localhost:3001/api/admin/reports"
        );

        console.log("");


        console.log(
            "Admin supplier products:"
        );

        console.log(
            "http://localhost:3001/api/admin/supplier-products"
        );

        console.log("");


        console.log(
            "Admin dashboard analytics:"
        );

        console.log(
            "http://localhost:3001/api/admin/dashboard-analytics"
        );

        console.log("");


        try {

            const connection =
                await db.getConnection();


            await connection.query(
                "SELECT 1"
            );


            console.log(
                "Admin database connection successful!"
            );


            connection.release();

        } catch (error) {

            console.log(
                "Admin database connection failed!"
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