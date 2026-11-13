
const bcrypt = require("bcryptjs");

const adminServicesRouter =
    require("../admin-services");

const createAdminInventoryRouter =
    require("../admin-inventory");

const createAdminInventoryArchiveRouter =
    require("../admin-inventory-archive");

const createAdminSuppliersRouter =
    require("../admin-suppliers");

const createAdminSalesRouter =
    require("../admin-sales");

const createAdminPurchasesRouter =
    require("../admin-purchases");

const createAdminSupplierProductsRouter =
    require("../admin-supplier-products");

const createAdminReportsRouter =
    require("../admin-reports");

const createAdminCustomerRestorationRouter =
    require("../admin-customer-restoration");

// NEW: ADMIN DASHBOARD ANALYTICS
const createAdminDashboardAnalyticsRouter =
    require("../admin-dashboard-analytics");

const {
    getCustomerStatuses
} = require("../customer-status");


/* =========================================
   REGISTER ADMIN ROUTES

   Uses the existing Express app and shared
   database connection from server.js.

   This file does NOT create another server
   or another database connection.
========================================= */

function registerAdminRoutes(app, db) {


    /* =========================================
       ADMIN AUTHENTICATION HELPER
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
       ADMIN - CUSTOMER ACCOUNT RESTORATION API
    ========================================= */

    app.use(
        "/api/admin/customers",
        createAdminCustomerRestorationRouter(
            db,
            requireAdmin
        )
    );


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


                const formattedCustomers =
                    customers.map(customer => ({

                        id:
                            Number(customer.id),

                        name:
                            customer.name,

                        email:
                            customer.email,

                        phone:
                            customer.phone,

                        address:
                            customer.address,

                        created_at:
                            customer.created_at,

                        motorcycle_count:
                            Number(
                                customer.motorcycle_count || 0
                            ),

                        appointment_count:
                            Number(
                                customer.appointment_count || 0
                            )

                    }));


                const finalCustomers =
                    await getCustomerStatuses(
                        db,
                        formattedCustomers
                    );


                res.json({

                    success: true,

                    count:
                        finalCustomers.length,

                    customers:
                        finalCustomers

                });

            } catch (error) {

                console.error(
                    "Admin customers error:",
                    error
                );

                res.status(500).json({

                    success: false,

                    message:
                        "Unable to retrieve customers.",

                    error:
                        error.message

                });

            }

        }
    );


    /* =========================================
       GET PENDING CUSTOMER ACCOUNTS
    ========================================= */

    app.get(
        "/api/admin/customers/pending",
        requireAdmin,
        async (req, res) => {

            try {

                const [customers] = await db.query(

                    `SELECT
                        id,
                        name,
                        email,
                        phone,
                        address,
                        created_at

                     FROM users

                     WHERE LOWER(role) = 'customer'
                       AND LOWER(COALESCE(account_status, '')) = 'pending'

                     ORDER BY
                        created_at DESC,
                        id DESC`

                );


                res.json({

                    success: true,

                    count:
                        customers.length,

                    customers:
                        customers.map(customer => ({

                            id:
                                Number(customer.id),

                            name:
                                customer.name,

                            email:
                                customer.email,

                            phone:
                                customer.phone,

                            address:
                                customer.address,

                            created_at:
                                customer.created_at,

                            account_status:
                                "pending"

                        }))

                });

            } catch (error) {

                console.error(
                    "Pending customers error:",
                    error
                );

                res.status(500).json({

                    success: false,

                    message:
                        "Unable to retrieve pending customer accounts.",

                    error:
                        error.message

                });

            }

        }
    );


    /* =========================================
       GET PENDING CUSTOMER ACCOUNT COUNT
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
                       AND LOWER(COALESCE(account_status, '')) = 'pending'`

                );


                res.json({

                    success: true,

                    count:
                        Number(result[0].total || 0)

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

                    error:
                        error.message

                });

            }

        }
    );


    /* =========================================
       GET CUSTOMER IDENTITY DOCUMENT
    ========================================= */

    app.get(
        "/api/admin/customers/:id/identity-document",
        requireAdmin,
        async (req, res) => {

            try {

                const customerId =
                    Number(req.params.id);


                if (
                    !Number.isInteger(customerId) ||
                    customerId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid customer ID."

                    });

                }


                const [documents] = await db.query(

                    `SELECT
                        id_type,
                        file_name,
                        mime_type,
                        file_data

                     FROM customer_identity_documents

                     WHERE user_id = ?

                     LIMIT 1`,

                    [customerId]

                );


                if (
                    documents.length === 0 ||
                    !documents[0].file_data
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "No identity document was uploaded by this customer."

                    });

                }


                const document = documents[0];


                const allowedMimeTypes = [
                    "image/jpeg",
                    "image/png"
                ];


                const mimeType =
                    String(document.mime_type || "")
                        .toLowerCase()
                        .trim();


                if (
                    !allowedMimeTypes.includes(mimeType)
                ) {

                    return res.status(415).json({

                        success: false,

                        message:
                            "The uploaded identity document has an unsupported image format."

                    });

                }


                const imageBuffer =
                    Buffer.isBuffer(document.file_data)
                        ? document.file_data
                        : Buffer.from(document.file_data);


                res.setHeader(
                    "Content-Type",
                    mimeType
                );

                res.setHeader(
                    "Content-Disposition",
                    "inline"
                );

                res.setHeader(
                    "Cache-Control",
                    "no-store"
                );

                res.setHeader(
                    "X-Document-Type",
                    encodeURIComponent(
                        document.id_type || "Identity Document"
                    )
                );

                res.setHeader(
                    "X-Document-Name",
                    encodeURIComponent(
                        document.file_name || "identity-document"
                    )
                );


                return res.status(200).send(imageBuffer);

            } catch (error) {

                console.error(
                    "Customer identity document error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to retrieve the customer's identity document.",

                    error:
                        error.message

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


                const status =
                    String(
                        req.body.account_status ||
                        req.body.status ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                const allowedStatuses = [
                    "approved",
                    "rejected"
                ];


                if (
                    !Number.isInteger(customerId) ||
                    customerId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid customer ID."

                    });

                }


                if (
                    !allowedStatuses.includes(status)
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid account status. Use approved or rejected."

                    });

                }


                const [result] = await db.query(

                    `UPDATE users

                     SET account_status = ?

                     WHERE id = ?
                       AND LOWER(role) = 'customer'
                       AND LOWER(COALESCE(account_status, '')) = 'pending'`,

                    [
                        status,
                        customerId
                    ]

                );


                if (result.affectedRows === 0) {

                    const [customers] = await db.query(

                        `SELECT
                            id,
                            role,
                            account_status

                         FROM users

                         WHERE id = ?

                         LIMIT 1`,

                        [customerId]

                    );


                    if (customers.length === 0) {

                        return res.status(404).json({

                            success: false,

                            message:
                                "Customer account not found."

                        });

                    }


                    if (
                        String(customers[0].role).toLowerCase() !== "customer"
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "The selected account is not a customer account."

                        });

                    }


                    return res.status(409).json({

                        success: false,

                        message:
                            "This account is no longer pending and cannot be updated."

                    });

                }


                res.json({

                    success: true,

                    message:
                        status === "approved"
                            ? "Customer account approved successfully."
                            : "Customer account rejected successfully.",

                    customer: {

                        id:
                            customerId,

                        account_status:
                            status

                    }

                });

            } catch (error) {

                console.error(
                    "Customer account status update error:",
                    error
                );

                res.status(500).json({

                    success: false,

                    message:
                        "Unable to update customer account status.",

                    error:
                        error.message

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

                const [statusResult] = await db.query(

                    `SELECT
                        COUNT(*) AS total,

                        SUM(
                            CASE WHEN LOWER(status) = 'pending'
                            THEN 1 ELSE 0 END
                        ) AS pending,

                        SUM(
                            CASE WHEN LOWER(status) = 'confirmed'
                            THEN 1 ELSE 0 END
                        ) AS confirmed,

                        SUM(
                            CASE WHEN LOWER(status) = 'in service'
                            THEN 1 ELSE 0 END
                        ) AS in_service,

                        SUM(
                            CASE WHEN LOWER(status) = 'completed'
                            THEN 1 ELSE 0 END
                        ) AS completed,

                        SUM(
                            CASE WHEN LOWER(status) = 'cancelled'
                            THEN 1 ELSE 0 END
                        ) AS cancelled

                     FROM reservations`

                );


                const [customersResult] = await db.query(

                    `SELECT COUNT(*) AS total
                     FROM users
                     WHERE LOWER(role) = 'customer'`

                );


                const [motorcyclesResult] = await db.query(

                    `SELECT COUNT(*) AS total
                     FROM customer_motorcycles`

                );


                const [servicesResult] = await db.query(

                    `SELECT COUNT(*) AS total
                     FROM services`

                );


                const [weekResult] = await db.query(

                    `SELECT
                        DATE_FORMAT(
                            DATE_SUB(
                                CURDATE(),
                                INTERVAL WEEKDAY(CURDATE()) DAY
                            ),
                            '%Y-%m-%d'
                        ) AS week_start`

                );


                const weekStart =
                    weekResult[0].week_start;


                const [weeklyRows] = await db.query(

                    `SELECT
                        DATE_FORMAT(
                            reservation_date,
                            '%Y-%m-%d'
                        ) AS day_date,

                        COUNT(*) AS total,

                        SUM(
                            CASE WHEN LOWER(status) = 'pending'
                            THEN 1 ELSE 0 END
                        ) AS pending,

                        SUM(
                            CASE WHEN LOWER(status) = 'confirmed'
                            THEN 1 ELSE 0 END
                        ) AS confirmed,

                        SUM(
                            CASE WHEN LOWER(status) = 'in service'
                            THEN 1 ELSE 0 END
                        ) AS in_service,

                        SUM(
                            CASE WHEN LOWER(status) = 'completed'
                            THEN 1 ELSE 0 END
                        ) AS completed,

                        SUM(
                            CASE WHEN LOWER(status) = 'cancelled'
                            THEN 1 ELSE 0 END
                        ) AS cancelled

                     FROM reservations

                     WHERE reservation_date >= ?
                       AND reservation_date < DATE_ADD(
                            ?,
                            INTERVAL 6 DAY
                       )

                     GROUP BY DATE(reservation_date)

                     ORDER BY DATE(reservation_date) ASC`,

                    [
                        weekStart,
                        weekStart
                    ]

                );


                const dayNames = [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday"
                ];


                const weeklyRowsByDate = {};

                weeklyRows.forEach(row => {

                    weeklyRowsByDate[row.day_date] = row;

                });


                const weeklyDays = [];


                const startDate = new Date(
                    `${weekStart}T00:00:00Z`
                );


                for (let i = 0; i < 6; i++) {

                    const currentDate = new Date(startDate);

                    currentDate.setUTCDate(
                        currentDate.getUTCDate() + i
                    );


                    const dateKey = [
                        currentDate.getUTCFullYear(),
                        String(
                            currentDate.getUTCMonth() + 1
                        ).padStart(2, "0"),
                        String(
                            currentDate.getUTCDate()
                        ).padStart(2, "0")
                    ].join("-");


                    const row = weeklyRowsByDate[dateKey];


                    weeklyDays.push({

                        day:
                            dayNames[i],

                        date:
                            dateKey,

                        total:
                            Number(row?.total || 0),

                        pending:
                            Number(row?.pending || 0),

                        confirmed:
                            Number(row?.confirmed || 0),

                        in_service:
                            Number(row?.in_service || 0),

                        completed:
                            Number(row?.completed || 0),

                        cancelled:
                            Number(row?.cancelled || 0)

                    });

                }


                const weeklyTotals = {

                    total: 0,

                    pending: 0,

                    confirmed: 0,

                    in_service: 0,

                    completed: 0,

                    cancelled: 0

                };


                weeklyDays.forEach(day => {

                    weeklyTotals.total += day.total;

                    weeklyTotals.pending += day.pending;

                    weeklyTotals.confirmed += day.confirmed;

                    weeklyTotals.in_service += day.in_service;

                    weeklyTotals.completed += day.completed;

                    weeklyTotals.cancelled += day.cancelled;

                });


                const status = statusResult[0];


                res.json({

                    success: true,

                    summary: {

                        total_appointments:
                            Number(status.total || 0),

                        pending:
                            Number(status.pending || 0),

                        confirmed:
                            Number(status.confirmed || 0),

                        in_service:
                            Number(status.in_service || 0),

                        completed:
                            Number(status.completed || 0),

                        cancelled:
                            Number(status.cancelled || 0),

                        customers:
                            Number(customersResult[0].total || 0),

                        motorcycles:
                            Number(motorcyclesResult[0].total || 0),

                        services:
                            Number(servicesResult[0].total || 0)

                    },

                    weekly: {

                        week_start:
                            weekStart,

                        week_end:
                            weeklyDays[5].date,

                        days:
                            weeklyDays,

                        totals:
                            weeklyTotals

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


    /* =========================================
       ADMIN - GET ALL CUSTOMER MOTORCYCLES
    ========================================= */

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


    /* =========================================
       ADMIN - SERVICES API
    ========================================= */

    app.use(
        "/api/admin/services",
        requireAdmin,
        adminServicesRouter
    );


    /* =========================================
       ADMIN - INVENTORY ARCHIVE API
    ========================================= */

    app.use(
        "/api/admin/inventory",
        createAdminInventoryArchiveRouter(
            db,
            requireAdmin
        )
    );


    /* =========================================
       ADMIN - INVENTORY API
    ========================================= */

    app.use(
        "/api/admin/inventory",
        createAdminInventoryRouter(
            db,
            requireAdmin
        )
    );


    /* =========================================
       ADMIN - SUPPLIERS API
    ========================================= */

    app.use(
        "/api/admin/suppliers",
        createAdminSuppliersRouter(
            db,
            requireAdmin
        )
    );


    /* =========================================
       ADMIN - SALES API
    ========================================= */

    app.use(
        "/api/admin/sales",
        createAdminSalesRouter(
            db,
            requireAdmin
        )
    );


    /* =========================================
       ADMIN - PURCHASES API
    ========================================= */

    app.use(
        "/api/admin/purchases",
        createAdminPurchasesRouter(
            db,
            requireAdmin
        )
    );


    /* =========================================
       ADMIN - REPORTS API
    ========================================= */

    app.use(
        "/api/admin/reports",
        createAdminReportsRouter(
            db,
            requireAdmin
        )
    );


    /* =========================================
       ADMIN - SUPPLIER PRODUCTS API
    ========================================= */

    app.use(
        "/api/admin/supplier-products",
        createAdminSupplierProductsRouter(
            db,
            requireAdmin
        )
    );


    /* =========================================
       ADMIN - DASHBOARD ANALYTICS API

       GET /api/admin/dashboard-analytics

       Uses the existing shared database
       connection and admin authentication.
    ========================================= */

    app.use(
        "/api/admin/dashboard-analytics",
        createAdminDashboardAnalyticsRouter(
            db,
            requireAdmin
        )
    );

}


/* =========================================
   EXPORT ADMIN ROUTE REGISTRATION
========================================= */

module.exports = registerAdminRoutes;
