
const express = require("express");


/* =========================================================
   ADMIN PURCHASES ROUTER

   Handles:
   - Get active purchases
   - Get archived purchases
   - Get single purchase
   - Create purchase
   - Update purchase
   - Cancel purchase
   - Receive purchase
   - Update product stock when purchase is received

   ARCHIVE RULES:
   - Pending, Ordered, Received = Purchase Records
   - Cancelled = Archive
   - Cancelled purchases are never permanently deleted.
========================================================= */


function createAdminPurchasesRouter(
    db,
    requireAdmin
) {

    const router = express.Router();


    /* =====================================================
       PURCHASE LIST HELPER

       Supports:
       - Search
       - Supplier filtering
       - Pagination
       - Active or archived records
    ===================================================== */

    async function getPurchaseList(req, res, archived) {

        try {

            const search =
                String(req.query.search || "").trim();

            const supplierId =
                Number(req.query.supplier_id) || 0;

            const conditions = [];

            const parameters = [];


            /* =============================================
               ACTIVE OR ARCHIVED PURCHASES
            ============================================= */

            if (archived) {

                conditions.push(
                    "p.status = 'Cancelled'"
                );

            } else {

                conditions.push(
                    "p.status <> 'Cancelled'"
                );

            }


            /* =============================================
               SEARCH
            ============================================= */

            if (search) {

                conditions.push(
                    "(s.name LIKE ? OR CAST(p.id AS CHAR) LIKE ?)"
                );

                const searchPattern =
                    `%${search}%`;

                parameters.push(
                    searchPattern,
                    searchPattern
                );

            }


            /* =============================================
               SUPPLIER FILTER
            ============================================= */

            if (supplierId > 0) {

                conditions.push(
                    "p.supplier_id = ?"
                );

                parameters.push(supplierId);

            }


            const whereClause =
                conditions.join(" AND ");


            /* =============================================
               CHECK PAGINATION

               Without limit/offset:
               Return all records for compatibility.

               With pagination:
               Initial: 10
               See More: 50
            ============================================= */

            const paginationRequested =
                req.query.limit !== undefined ||
                req.query.offset !== undefined;


            let limit = null;

            let offset = 0;


            if (paginationRequested) {

                const requestedLimit =
                    Number(req.query.limit) || 10;

                const requestedOffset =
                    Number(req.query.offset) || 0;


                limit =
                    Math.min(
                        Math.max(
                            Math.floor(requestedLimit),
                            1
                        ),
                        50
                    );


                offset =
                    Math.max(
                        Math.floor(requestedOffset),
                        0
                    );

            }


            /* =============================================
               GET TOTAL COUNT
            ============================================= */

            const [countRows] =
                await db.query(
                    `
                    SELECT COUNT(*) AS total

                    FROM purchases p

                    LEFT JOIN suppliers s
                        ON s.id = p.supplier_id

                    WHERE ${whereClause}
                    `,
                    parameters
                );


            const total =
                Number(countRows[0].total || 0);


            /* =============================================
               GET PURCHASE RECORDS
            ============================================= */

            let sql =
                `
                SELECT

                    p.id,

                    p.supplier_id,

                    s.name AS supplier_name,

                    p.purchase_date,

                    p.status,

                    p.notes,

                    p.created_at,

                    COALESCE(
                        (
                            SELECT SUM(
                                pi.quantity * pi.unit_cost
                            )

                            FROM purchase_items pi

                            WHERE pi.purchase_id = p.id
                        ),
                        0
                    ) AS total_amount,

                    COALESCE(
                        (
                            SELECT SUM(pi.quantity)

                            FROM purchase_items pi

                            WHERE pi.purchase_id = p.id
                        ),
                        0
                    ) AS total_items

                FROM purchases p

                LEFT JOIN suppliers s
                    ON s.id = p.supplier_id

                WHERE ${whereClause}

                ORDER BY
                    p.purchase_date DESC,
                    p.id DESC
                `;


            const queryParameters = [
                ...parameters
            ];


            if (paginationRequested) {

                sql += `
                    LIMIT ?
                    OFFSET ?
                `;

                queryParameters.push(
                    limit,
                    offset
                );

            }


            const [purchases] =
                await db.query(
                    sql,
                    queryParameters
                );


            /* =============================================
               FORMAT RESULTS
            ============================================= */

            const formattedPurchases =
                purchases.map(purchase => ({

                    id:
                        Number(purchase.id),

                    supplier_id:
                        Number(purchase.supplier_id),

                    supplier_name:
                        purchase.supplier_name ||
                        "Unknown Supplier",

                    purchase_date:
                        purchase.purchase_date,

                    status:
                        purchase.status,

                    notes:
                        purchase.notes,

                    total_amount:
                        Number(
                            purchase.total_amount || 0
                        ),

                    total_items:
                        Number(
                            purchase.total_items || 0
                        ),

                    created_at:
                        purchase.created_at

                }));


            const nextOffset =
                offset + formattedPurchases.length;


            res.json({

                success: true,

                count:
                    formattedPurchases.length,

                total,

                limit:
                    paginationRequested
                        ? limit
                        : total,

                offset,

                has_more:
                    nextOffset < total,

                purchases:
                    formattedPurchases

            });

        } catch (error) {

            console.error(
                archived
                    ? "Archived purchases error:"
                    : "Admin purchases error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    archived
                        ? "Unable to retrieve archived purchases."
                        : "Unable to retrieve purchases.",

                error:
                    error.message

            });

        }

    }


    /* =====================================================
       GET ACTIVE PURCHASES

       GET /api/admin/purchases

       Excludes Cancelled purchases.

       Pagination example:
       ?limit=10&offset=0
       ?limit=50&offset=10
    ===================================================== */

    router.get(
        "/",
        requireAdmin,
        async (req, res) => {

            await getPurchaseList(
                req,
                res,
                false
            );

        }
    );


    /* =====================================================
       GET ARCHIVED PURCHASES

       IMPORTANT:
       This route MUST be before GET /:id.

       GET /api/admin/purchases/archive

       Returns Cancelled purchases only.

       Pagination:
       Initial: ?limit=10&offset=0
       See More: ?limit=50&offset=10
    ===================================================== */

    router.get(
        "/archive",
        requireAdmin,
        async (req, res) => {

            await getPurchaseList(
                req,
                res,
                true
            );

        }
    );


    /* =====================================================
       GET SINGLE PURCHASE
    ===================================================== */

    router.get(
        "/:id",
        requireAdmin,
        async (req, res) => {

            try {

                const purchaseId =
                    Number(req.params.id);


                if (
                    !Number.isInteger(purchaseId) ||
                    purchaseId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid purchase ID."

                    });

                }


                const [purchases] =
                    await db.query(
                        `
                        SELECT

                            p.id,

                            p.supplier_id,

                            s.name AS supplier_name,

                            s.contact_person
                                AS supplier_contact_person,

                            s.phone
                                AS supplier_phone,

                            s.email
                                AS supplier_email,

                            s.address
                                AS supplier_address,

                            p.purchase_date,

                            p.status,

                            p.notes,

                            p.created_at

                        FROM purchases p

                        LEFT JOIN suppliers s
                            ON s.id = p.supplier_id

                        WHERE p.id = ?

                        LIMIT 1
                        `,
                        [purchaseId]
                    );


                if (purchases.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Purchase not found."

                    });

                }


                const purchase =
                    purchases[0];


                const [items] =
                    await db.query(
                        `
                        SELECT

                            pi.id,

                            pi.purchase_id,

                            pi.product_id,

                            pr.name AS product_name,

                            pr.description
                                AS product_description,

                            pi.quantity,

                            pi.unit_cost,

                            (
                                pi.quantity * pi.unit_cost
                            ) AS subtotal

                        FROM purchase_items pi

                        INNER JOIN products pr
                            ON pr.id = pi.product_id

                        WHERE pi.purchase_id = ?

                        ORDER BY pi.id ASC
                        `,
                        [purchaseId]
                    );


                const formattedItems =
                    items.map(item => ({

                        id:
                            Number(item.id),

                        purchase_id:
                            Number(item.purchase_id),

                        product_id:
                            Number(item.product_id),

                        product_name:
                            item.product_name,

                        product_description:
                            item.product_description,

                        quantity:
                            Number(item.quantity),

                        unit_cost:
                            Number(item.unit_cost),

                        subtotal:
                            Number(item.subtotal)

                    }));


                const total =
                    formattedItems.reduce(
                        (sum, item) =>
                            sum + item.subtotal,
                        0
                    );


                res.json({

                    success: true,

                    purchase: {

                        id:
                            Number(purchase.id),

                        supplier_id:
                            Number(purchase.supplier_id),

                        supplier_name:
                            purchase.supplier_name,

                        supplier_contact_person:
                            purchase.supplier_contact_person,

                        supplier_phone:
                            purchase.supplier_phone,

                        supplier_email:
                            purchase.supplier_email,

                        supplier_address:
                            purchase.supplier_address,

                        purchase_date:
                            purchase.purchase_date,

                        status:
                            purchase.status,

                        notes:
                            purchase.notes,

                        items:
                            formattedItems,

                        total,

                        created_at:
                            purchase.created_at

                    }

                });

            } catch (error) {

                console.error(
                    "Admin single purchase error:",
                    error
                );


                res.status(500).json({

                    success: false,

                    message:
                        "Unable to retrieve purchase.",

                    error:
                        error.message

                });

            }

        }
    );


    /* =====================================================
       CREATE PURCHASE
    ===================================================== */

    router.post(
        "/",
        requireAdmin,
        async (req, res) => {

            let connection;

            try {

                const {
                    supplier_id,
                    purchase_date,
                    status,
                    notes,
                    items
                } = req.body;


                const supplierId =
                    Number(supplier_id);


                if (
                    !Number.isInteger(supplierId) ||
                    supplierId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Supplier is required."

                    });

                }


                if (
                    !Array.isArray(items) ||
                    items.length === 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "At least one purchase item is required."

                    });

                }


                const allowedStatuses = [
                    "Pending",
                    "Ordered",
                    "Received",
                    "Cancelled"
                ];


                const finalStatus =
                    status || "Pending";


                if (
                    !allowedStatuses.includes(finalStatus)
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid purchase status."

                    });

                }


                connection =
                    await db.getConnection();


                const [suppliers] =
                    await connection.query(
                        `
                        SELECT id

                        FROM suppliers

                        WHERE id = ?

                        LIMIT 1
                        `,
                        [supplierId]
                    );


                if (suppliers.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Supplier not found."

                    });

                }


                const cleanedItems = [];


                for (const item of items) {

                    const productId =
                        Number(item.product_id);

                    const quantity =
                        Number(item.quantity);

                    const unitCost =
                        Number(item.unit_cost);


                    if (
                        !Number.isInteger(productId) ||
                        productId <= 0 ||
                        !Number.isInteger(quantity) ||
                        quantity <= 0 ||
                        !Number.isFinite(unitCost) ||
                        unitCost < 0
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Each purchase item must have a valid product, quantity, and unit cost."

                        });

                    }


                    const [products] =
                        await connection.query(
                            `
                            SELECT id

                            FROM products

                            WHERE id = ?

                            LIMIT 1
                            `,
                            [productId]
                        );


                    if (products.length === 0) {

                        return res.status(404).json({

                            success: false,

                            message:
                                `Product ${productId} was not found.`

                        });

                    }


                    cleanedItems.push({

                        product_id: productId,

                        quantity,

                        unit_cost: unitCost

                    });

                }


                await connection.beginTransaction();


                const [purchaseResult] =
                    await connection.query(
                        `
                        INSERT INTO purchases
                        (
                            supplier_id,
                            purchase_date,
                            status,
                            notes
                        )

                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            supplierId,
                            purchase_date || new Date(),
                            finalStatus,
                            notes || null
                        ]
                    );


                const purchaseId =
                    purchaseResult.insertId;


                for (const item of cleanedItems) {

                    await connection.query(
                        `
                        INSERT INTO purchase_items
                        (
                            purchase_id,
                            product_id,
                            quantity,
                            unit_cost
                        )

                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            purchaseId,
                            item.product_id,
                            item.quantity,
                            item.unit_cost
                        ]
                    );

                }


                /* =========================================
                   IF CREATED AS RECEIVED, ADD STOCK
                ========================================= */

                if (finalStatus === "Received") {

                    for (const item of cleanedItems) {

                        const [productRows] =
                            await connection.query(
                                `
                                SELECT stock

                                FROM products

                                WHERE id = ?

                                FOR UPDATE
                                `,
                                [item.product_id]
                            );


                        if (productRows.length === 0) {

                            throw new Error(
                                `Product ${item.product_id} was not found while updating stock.`
                            );

                        }


                        const previousStock =
                            Number(
                                productRows[0].stock || 0
                            );


                        const newStock =
                            previousStock + item.quantity;


                        await connection.query(
                            `
                            UPDATE products

                            SET stock = ?

                            WHERE id = ?
                            `,
                            [
                                newStock,
                                item.product_id
                            ]
                        );


                        await connection.query(
                            `
                            INSERT INTO inventory_transactions
                            (
                                product_id,
                                type,
                                quantity,
                                previous_stock,
                                new_stock,
                                reference
                            )

                            VALUES
                            (
                                ?,
                                'Stock In',
                                ?,
                                ?,
                                ?,
                                ?
                            )
                            `,
                            [
                                item.product_id,
                                item.quantity,
                                previousStock,
                                newStock,
                                `Purchase #${purchaseId}`
                            ]
                        );

                    }

                }


                await connection.commit();


                res.status(201).json({

                    success: true,

                    message:
                        "Purchase created successfully.",

                    purchase: {

                        id:
                            Number(purchaseId),

                        supplier_id:
                            supplierId,

                        purchase_date:
                            purchase_date || new Date(),

                        status:
                            finalStatus,

                        notes:
                            notes || null,

                        items:
                            cleanedItems

                    }

                });

            } catch (error) {

                if (connection) {

                    try {
                        await connection.rollback();
                    } catch (rollbackError) {

                        console.error(
                            "Purchase rollback error:",
                            rollbackError
                        );

                    }

                }


                console.error(
                    "Create purchase error:",
                    error
                );


                res.status(500).json({

                    success: false,

                    message:
                        "Unable to create purchase.",

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


    /* =====================================================
       UPDATE PURCHASE

       Received and Cancelled purchases cannot be edited.
       A purchase cannot be changed directly to Received
       or Cancelled.
    ===================================================== */

    router.put(
        "/:id",
        requireAdmin,
        async (req, res) => {

            let connection;

            try {

                const purchaseId =
                    Number(req.params.id);


                if (
                    !Number.isInteger(purchaseId) ||
                    purchaseId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid purchase ID."

                    });

                }


                const {
                    supplier_id,
                    purchase_date,
                    status,
                    notes,
                    items
                } = req.body;


                connection =
                    await db.getConnection();


                await connection.beginTransaction();


                const [existingRows] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            status

                        FROM purchases

                        WHERE id = ?

                        FOR UPDATE
                        `,
                        [purchaseId]
                    );


                if (existingRows.length === 0) {

                    await connection.rollback();

                    return res.status(404).json({

                        success: false,

                        message:
                            "Purchase not found."

                    });

                }


                const existingPurchase =
                    existingRows[0];


                if (
                    existingPurchase.status === "Received"
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "A received purchase cannot be edited."

                    });

                }


                if (
                    existingPurchase.status === "Cancelled"
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "A cancelled purchase cannot be edited."

                    });

                }


                const supplierId =
                    Number(supplier_id);


                if (
                    !Number.isInteger(supplierId) ||
                    supplierId <= 0
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "Supplier is required."

                    });

                }


                if (
                    !Array.isArray(items) ||
                    items.length === 0
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "At least one purchase item is required."

                    });

                }


                const allowedStatuses = [
                    "Pending",
                    "Ordered",
                    "Received",
                    "Cancelled"
                ];


                const finalStatus =
                    status || existingPurchase.status;


                if (
                    !allowedStatuses.includes(finalStatus)
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid purchase status."

                    });

                }


                if (
                    finalStatus === "Received"
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "Use the receive purchase action to mark a purchase as received."

                    });

                }


                if (
                    finalStatus === "Cancelled"
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "Use the cancel purchase action to cancel a purchase."

                    });

                }


                const [suppliers] =
                    await connection.query(
                        `
                        SELECT id

                        FROM suppliers

                        WHERE id = ?

                        LIMIT 1
                        `,
                        [supplierId]
                    );


                if (suppliers.length === 0) {

                    await connection.rollback();

                    return res.status(404).json({

                        success: false,

                        message:
                            "Supplier not found."

                    });

                }


                const cleanedItems = [];


                for (const item of items) {

                    const productId =
                        Number(item.product_id);

                    const quantity =
                        Number(item.quantity);

                    const unitCost =
                        Number(item.unit_cost);


                    if (
                        !Number.isInteger(productId) ||
                        productId <= 0 ||
                        !Number.isInteger(quantity) ||
                        quantity <= 0 ||
                        !Number.isFinite(unitCost) ||
                        unitCost < 0
                    ) {

                        await connection.rollback();

                        return res.status(400).json({

                            success: false,

                            message:
                                "Each purchase item must have a valid product, quantity, and unit cost."

                        });

                    }


                    const [products] =
                        await connection.query(
                            `
                            SELECT id

                            FROM products

                            WHERE id = ?

                            LIMIT 1
                            `,
                            [productId]
                        );


                    if (products.length === 0) {

                        await connection.rollback();

                        return res.status(404).json({

                            success: false,

                            message:
                                `Product ${productId} was not found.`

                        });

                    }


                    cleanedItems.push({

                        product_id: productId,

                        quantity,

                        unit_cost: unitCost

                    });

                }


                await connection.query(
                    `
                    UPDATE purchases

                    SET
                        supplier_id = ?,
                        purchase_date = ?,
                        status = ?,
                        notes = ?

                    WHERE id = ?
                    `,
                    [
                        supplierId,
                        purchase_date || new Date(),
                        finalStatus,
                        notes || null,
                        purchaseId
                    ]
                );


                await connection.query(
                    `
                    DELETE FROM purchase_items

                    WHERE purchase_id = ?
                    `,
                    [purchaseId]
                );


                for (const item of cleanedItems) {

                    await connection.query(
                        `
                        INSERT INTO purchase_items
                        (
                            purchase_id,
                            product_id,
                            quantity,
                            unit_cost
                        )

                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            purchaseId,
                            item.product_id,
                            item.quantity,
                            item.unit_cost
                        ]
                    );

                }


                await connection.commit();


                res.json({

                    success: true,

                    message:
                        "Purchase updated successfully.",

                    purchase: {

                        id:
                            purchaseId,

                        supplier_id:
                            supplierId,

                        purchase_date:
                            purchase_date,

                        status:
                            finalStatus,

                        notes:
                            notes || null,

                        items:
                            cleanedItems

                    }

                });

            } catch (error) {

                if (connection) {

                    try {
                        await connection.rollback();
                    } catch (rollbackError) {

                        console.error(
                            "Purchase update rollback error:",
                            rollbackError
                        );

                    }

                }


                console.error(
                    "Update purchase error:",
                    error
                );


                res.status(500).json({

                    success: false,

                    message:
                        "Unable to update purchase.",

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


    /* =====================================================
       RECEIVE PURCHASE

       Only Pending and Ordered purchases can be received.

       Receiving:
       - Increases product stock.
       - Creates Stock In inventory transactions.
       - Changes purchase status to Received.
    ===================================================== */

    router.put(
        "/:id/receive",
        requireAdmin,
        async (req, res) => {

            let connection;

            try {

                const purchaseId =
                    Number(req.params.id);


                if (
                    !Number.isInteger(purchaseId) ||
                    purchaseId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid purchase ID."

                    });

                }


                connection =
                    await db.getConnection();


                await connection.beginTransaction();


                const [purchases] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            status

                        FROM purchases

                        WHERE id = ?

                        FOR UPDATE
                        `,
                        [purchaseId]
                    );


                if (purchases.length === 0) {

                    await connection.rollback();

                    return res.status(404).json({

                        success: false,

                        message:
                            "Purchase not found."

                    });

                }


                const purchase =
                    purchases[0];


                if (purchase.status === "Received") {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "This purchase has already been received."

                    });

                }


                if (purchase.status === "Cancelled") {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "A cancelled purchase cannot be received."

                    });

                }


                if (
                    !["Pending", "Ordered"].includes(
                        purchase.status
                    )
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "This purchase cannot be received."

                    });

                }


                const [items] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            product_id,
                            quantity,
                            unit_cost

                        FROM purchase_items

                        WHERE purchase_id = ?

                        ORDER BY id ASC
                        `,
                        [purchaseId]
                    );


                if (items.length === 0) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "This purchase has no items to receive."

                    });

                }


                for (const item of items) {

                    const productId =
                        Number(item.product_id);

                    const quantity =
                        Number(item.quantity);


                    const [products] =
                        await connection.query(
                            `
                            SELECT
                                id,
                                stock

                            FROM products

                            WHERE id = ?

                            FOR UPDATE
                            `,
                            [productId]
                        );


                    if (products.length === 0) {

                        throw new Error(
                            `Product ${productId} was not found.`
                        );

                    }


                    const previousStock =
                        Number(products[0].stock || 0);


                    const newStock =
                        previousStock + quantity;


                    await connection.query(
                        `
                        UPDATE products

                        SET stock = ?

                        WHERE id = ?
                        `,
                        [
                            newStock,
                            productId
                        ]
                    );


                    await connection.query(
                        `
                        INSERT INTO inventory_transactions
                        (
                            product_id,
                            type,
                            quantity,
                            previous_stock,
                            new_stock,
                            reference
                        )

                        VALUES
                        (
                            ?,
                            'Stock In',
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `,
                        [
                            productId,
                            quantity,
                            previousStock,
                            newStock,
                            `Purchase #${purchaseId}`
                        ]
                    );

                }


                await connection.query(
                    `
                    UPDATE purchases

                    SET status = 'Received'

                    WHERE id = ?
                    `,
                    [purchaseId]
                );


                await connection.commit();


                res.json({

                    success: true,

                    message:
                        "Purchase received successfully. Inventory stock has been updated.",

                    purchase: {

                        id:
                            purchaseId,

                        status:
                            "Received"

                    }

                });

            } catch (error) {

                if (connection) {

                    try {
                        await connection.rollback();
                    } catch (rollbackError) {

                        console.error(
                            "Receive rollback error:",
                            rollbackError
                        );

                    }

                }


                console.error(
                    "Receive purchase error:",
                    error
                );


                res.status(500).json({

                    success: false,

                    message:
                        "Unable to receive purchase.",

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


    /* =====================================================
       CANCEL PURCHASE

       Only Pending and Ordered purchases can be cancelled.

       Cancellation:
       - Does not delete the purchase.
       - Does not delete purchase items.
       - Does not change product stock.
       - Cannot cancel Received purchases.
    ===================================================== */

    router.put(
        "/:id/cancel",
        requireAdmin,
        async (req, res) => {

            let connection;

            try {

                const purchaseId =
                    Number(req.params.id);


                if (
                    !Number.isInteger(purchaseId) ||
                    purchaseId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid purchase ID."

                    });

                }


                connection =
                    await db.getConnection();


                await connection.beginTransaction();


                const [purchases] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            status

                        FROM purchases

                        WHERE id = ?

                        FOR UPDATE
                        `,
                        [purchaseId]
                    );


                if (purchases.length === 0) {

                    await connection.rollback();

                    return res.status(404).json({

                        success: false,

                        message:
                            "Purchase not found."

                    });

                }


                const purchase =
                    purchases[0];


                if (purchase.status === "Received") {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "A received purchase cannot be cancelled because its stock has already been added to inventory."

                    });

                }


                if (purchase.status === "Cancelled") {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "This purchase has already been cancelled."

                    });

                }


                if (
                    !["Pending", "Ordered"].includes(
                        purchase.status
                    )
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            "This purchase cannot be cancelled."

                    });

                }


                await connection.query(
                    `
                    UPDATE purchases

                    SET status = 'Cancelled'

                    WHERE id = ?
                    `,
                    [purchaseId]
                );


                await connection.commit();


                res.json({

                    success: true,

                    message:
                        "Purchase cancelled successfully.",

                    purchase: {

                        id: purchaseId,

                        status: "Cancelled"

                    }

                });

            } catch (error) {

                if (connection) {

                    try {
                        await connection.rollback();
                    } catch (rollbackError) {

                        console.error(
                            "Cancel purchase rollback error:",
                            rollbackError
                        );

                    }

                }


                console.error(
                    "Cancel purchase error:",
                    error
                );


                res.status(500).json({

                    success: false,

                    message:
                        "Unable to cancel purchase.",

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


    return router;

}


module.exports =
    createAdminPurchasesRouter;
