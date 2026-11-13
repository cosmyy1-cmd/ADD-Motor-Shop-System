"use strict";

const express = require("express");

function createAdminSuppliersRouter(db, requireAdmin) {
    const router = express.Router();

    router.use(requireAdmin);

    /* =====================================================
       HELPERS
    ===================================================== */

    function sendError(res, status, message) {
        return res.status(status).json({
            success: false,
            message,
            error: message
        });
    }

    function getRows(result) {
        // mysql2/promise pool.query() returns [rows, fields].
        return Array.isArray(result) ? result[0] : result;
    }

    function getResult(result) {
        // mysql2/promise pool.execute() returns [result, fields].
        return Array.isArray(result) ? result[0] : result;
    }

    function normalizeText(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();
    }

    function normalizeEmail(value) {
        return normalizeText(value).toLowerCase();
    }

    function isValidId(value) {
        return /^\d+$/.test(String(value)) &&
            Number.isSafeInteger(Number(value)) &&
            Number(value) > 0;
    }

    function validateSupplier(body) {
        const name = normalizeText(body.name);
        const contactPerson = normalizeText(
            body.contact_person ?? body.contactPerson
        );
        const phone = normalizeText(body.phone);
        const email = normalizeEmail(body.email);
        const address = normalizeText(body.address);
        const status = normalizeText(body.status || "Active");

        if (!name) {
            return {
                error: "Supplier name is required."
            };
        }

        if (name.length > 150) {
            return {
                error: "Supplier name must not exceed 150 characters."
            };
        }

        if (contactPerson.length < 2) {
            return {
                error: "Please enter a valid contact person name."
            };
        }

        if (contactPerson.length > 100) {
            return {
                error: "Contact person must not exceed 100 characters."
            };
        }

        // Philippine mobile format: exactly 11 digits, starting with 09.
        if (!/^09\d{9}$/.test(phone)) {
            return {
                error:
                    "Phone number must contain exactly 11 digits and start with 09."
            };
        }

        if (email && email.length > 150) {
            return {
                error: "Email must not exceed 150 characters."
            };
        }

        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
        ) {
            return {
                error: "Please enter a valid email address."
            };
        }

        if (address.length > 2000) {
            return {
                error: "Supplier address is too long."
            };
        }

        if (!["Active", "Inactive"].includes(status)) {
            return {
                error: "Supplier status must be Active or Inactive."
            };
        }

        return {
            value: {
                name,
                contact_person: contactPerson,
                phone,
                email: email || null,
                address: address || null,
                status
            }
        };
    }

    async function supplierExists(id) {
        const result = await db.execute(
            "SELECT id FROM suppliers WHERE id = ? LIMIT 1",
            [id]
        );

        const rows = getRows(result);
        return Array.isArray(rows) && rows.length > 0;
    }

    async function findDuplicateName(name, excludeId = null) {
        let sql = `
            SELECT id, name
            FROM suppliers
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        `;

        const params = [name];

        if (excludeId !== null) {
            sql += " AND id <> ?";
            params.push(excludeId);
        }

        sql += " LIMIT 1";

        const result = await db.execute(sql, params);
        const rows = getRows(result);

        return Array.isArray(rows) && rows.length > 0
            ? rows[0]
            : null;
    }

    function handleDatabaseError(res, error, fallbackMessage) {
        console.error("[Admin Suppliers]", error);

        if (error && error.code === "ER_DUP_ENTRY") {
            return sendError(
                res,
                409,
                "A supplier with these details already exists."
            );
        }

        if (
            error &&
            (
                error.code === "ER_ROW_IS_REFERENCED" ||
                error.code === "ER_ROW_IS_REFERENCED_2"
            )
        ) {
            return sendError(
                res,
                409,
                "This supplier is linked to existing records and cannot be deleted."
            );
        }

        return sendError(res, 500, fallbackMessage);
    }

    /* =====================================================
       GET ALL SUPPLIERS
       GET /api/admin/suppliers
    ===================================================== */

    router.get("/", async (req, res) => {
        try {
            const result = await db.execute(`
                SELECT
                    s.id,
                    s.name,
                    s.contact_person,
                    s.phone,
                    s.email,
                    s.address,
                    s.status,
                    s.created_at,
                    (
                        SELECT COUNT(*)
                        FROM purchases p
                        WHERE p.supplier_id = s.id
                    ) AS purchase_count
                FROM suppliers s
                ORDER BY s.name ASC, s.id DESC
            `);

            const rows = getRows(result);

            const suppliers = rows.map((supplier) => ({
                ...supplier,
                id: Number(supplier.id),
                purchase_count: Number(supplier.purchase_count || 0)
            }));

            return res.json({
                success: true,
                count: suppliers.length,
                suppliers
            });
        } catch (error) {
            return handleDatabaseError(
                res,
                error,
                "Unable to load suppliers."
            );
        }
    });

    /* =====================================================
       GET ONE SUPPLIER
       GET /api/admin/suppliers/:id
    ===================================================== */

    router.get("/:id", async (req, res) => {
        const id = req.params.id;

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid supplier ID.");
        }

        try {
            const result = await db.execute(
                `
                    SELECT
                        s.id,
                        s.name,
                        s.contact_person,
                        s.phone,
                        s.email,
                        s.address,
                        s.status,
                        s.created_at,
                        (
                            SELECT COUNT(*)
                            FROM purchases p
                            WHERE p.supplier_id = s.id
                        ) AS purchase_count
                    FROM suppliers s
                    WHERE s.id = ?
                    LIMIT 1
                `,
                [Number(id)]
            );

            const rows = getRows(result);

            if (!rows.length) {
                return sendError(res, 404, "Supplier not found.");
            }

            return res.json({
                success: true,
                supplier: {
                    ...rows[0],
                    id: Number(rows[0].id),
                    purchase_count: Number(
                        rows[0].purchase_count || 0
                    )
                }
            });
        } catch (error) {
            return handleDatabaseError(
                res,
                error,
                "Unable to load supplier details."
            );
        }
    });

    /* =====================================================
       CREATE SUPPLIER
       POST /api/admin/suppliers
    ===================================================== */

    router.post("/", async (req, res) => {
        const validation = validateSupplier(req.body || {});

        if (validation.error) {
            return sendError(res, 400, validation.error);
        }

        const supplier = validation.value;

        try {
            const duplicate = await findDuplicateName(
                supplier.name
            );

            if (duplicate) {
                return sendError(
                    res,
                    409,
                    "A supplier with this name already exists."
                );
            }

            const result = await db.execute(
                `
                    INSERT INTO suppliers (
                        name,
                        contact_person,
                        phone,
                        email,
                        address,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    supplier.name,
                    supplier.contact_person,
                    supplier.phone,
                    supplier.email,
                    supplier.address,
                    supplier.status
                ]
            );

            const insertResult = getResult(result);
            const newId = insertResult.insertId;

            const savedResult = await db.execute(
                `
                    SELECT
                        id,
                        name,
                        contact_person,
                        phone,
                        email,
                        address,
                        status,
                        created_at
                    FROM suppliers
                    WHERE id = ?
                    LIMIT 1
                `,
                [newId]
            );

            const savedRows = getRows(savedResult);

            return res.status(201).json({
                success: true,
                message: "Supplier created successfully.",
                supplier: savedRows[0]
            });
        } catch (error) {
            return handleDatabaseError(
                res,
                error,
                "Unable to create supplier."
            );
        }
    });

    /* =====================================================
       UPDATE SUPPLIER
       PUT /api/admin/suppliers/:id
    ===================================================== */

    router.put("/:id", async (req, res) => {
        const id = req.params.id;

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid supplier ID.");
        }

        const validation = validateSupplier(req.body || {});

        if (validation.error) {
            return sendError(res, 400, validation.error);
        }

        const supplier = validation.value;
        const supplierId = Number(id);

        try {
            if (!(await supplierExists(supplierId))) {
                return sendError(res, 404, "Supplier not found.");
            }

            const duplicate = await findDuplicateName(
                supplier.name,
                supplierId
            );

            if (duplicate) {
                return sendError(
                    res,
                    409,
                    "Another supplier already uses this name."
                );
            }

            await db.execute(
                `
                    UPDATE suppliers
                    SET
                        name = ?,
                        contact_person = ?,
                        phone = ?,
                        email = ?,
                        address = ?,
                        status = ?
                    WHERE id = ?
                `,
                [
                    supplier.name,
                    supplier.contact_person,
                    supplier.phone,
                    supplier.email,
                    supplier.address,
                    supplier.status,
                    supplierId
                ]
            );

            const savedResult = await db.execute(
                `
                    SELECT
                        id,
                        name,
                        contact_person,
                        phone,
                        email,
                        address,
                        status,
                        created_at
                    FROM suppliers
                    WHERE id = ?
                    LIMIT 1
                `,
                [supplierId]
            );

            const savedRows = getRows(savedResult);

            return res.json({
                success: true,
                message: "Supplier updated successfully.",
                supplier: savedRows[0]
            });
        } catch (error) {
            return handleDatabaseError(
                res,
                error,
                "Unable to update supplier."
            );
        }
    });

    /* =====================================================
       DELETE SUPPLIER
       DELETE /api/admin/suppliers/:id

       SAFETY:
       - Do not delete a supplier that has purchase records.
       - Keep purchase history intact.
       - The supplier_products FK can cascade its product
         links only when supplier deletion is otherwise safe.
    ===================================================== */

    router.delete("/:id", async (req, res) => {
        const id = req.params.id;

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid supplier ID.");
        }

        const supplierId = Number(id);

        let connection = null;
        let ownsConnection = false;

        try {
            if (typeof db.getConnection === "function") {
                connection = await db.getConnection();
                ownsConnection = true;
            } else {
                connection = db;
            }

            if (typeof connection.beginTransaction === "function") {
                await connection.beginTransaction();
            }

            const supplierResult = await connection.execute(
                `
                    SELECT id, name
                    FROM suppliers
                    WHERE id = ?
                    LIMIT 1
                    FOR UPDATE
                `,
                [supplierId]
            );

            const supplierRows = getRows(supplierResult);

            if (!supplierRows.length) {
                if (typeof connection.rollback === "function") {
                    await connection.rollback();
                }

                return sendError(res, 404, "Supplier not found.");
            }

            const purchaseResult = await connection.execute(
                `
                    SELECT COUNT(*) AS total
                    FROM purchases
                    WHERE supplier_id = ?
                `,
                [supplierId]
            );

            const purchaseRows = getRows(purchaseResult);
            const purchaseCount = Number(
                purchaseRows[0]?.total || 0
            );

            if (purchaseCount > 0) {
                if (typeof connection.rollback === "function") {
                    await connection.rollback();
                }

                return res.status(409).json({
                    success: false,
                    message:
                        `Cannot delete "${supplierRows[0].name}" because ` +
                        `it has ${purchaseCount} purchase record(s). ` +
                        "Preserve the purchase history and set the supplier to Inactive instead.",
                    code: "SUPPLIER_HAS_PURCHASES",
                    purchase_count: purchaseCount
                });
            }

            await connection.execute(
                "DELETE FROM suppliers WHERE id = ?",
                [supplierId]
            );

            if (typeof connection.commit === "function") {
                await connection.commit();
            }

            return res.json({
                success: true,
                message: "Supplier deleted successfully."
            });
        } catch (error) {
            if (
                connection &&
                typeof connection.rollback === "function"
            ) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "[Admin Suppliers] Rollback failed:",
                        rollbackError
                    );
                }
            }

            return handleDatabaseError(
                res,
                error,
                "Unable to delete supplier."
            );
        } finally {
            if (
                ownsConnection &&
                connection &&
                typeof connection.release === "function"
            ) {
                connection.release();
            }
        }
    });

    return router;
}

module.exports = createAdminSuppliersRouter;