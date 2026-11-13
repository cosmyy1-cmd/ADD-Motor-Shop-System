const express = require("express");

module.exports = function createAdminInventoryRouter(
    db,
    requireAdmin
) {
    const router = express.Router();

    /* =========================================================
       GET ACTIVE INVENTORY
       GET /api/admin/inventory
    ========================================================= */

    router.get("/", requireAdmin, async (req, res) => {
        try {
            const [products] = await db.query(`
                SELECT
                    p.id,
                    p.category_id,
                    c.name AS category_name,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image,
                    p.status,
                    p.created_at
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.is_archived = 0
                ORDER BY p.created_at DESC, p.id DESC
            `);

            const finalProducts = products.map(product => ({
                id: Number(product.id),
                category_id: Number(product.category_id),
                category_name: product.category_name,
                name: product.name,
                description: product.description || "",
                price: Number(product.price || 0),
                stock: Number(product.stock || 0),
                image: product.image || null,
                status: product.status || "available",
                created_at: product.created_at
            }));

            return res.json({
                success: true,
                count: finalProducts.length,
                products: finalProducts
            });
        } catch (error) {
            console.error("Admin inventory error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve inventory.",
                error: error.message
            });
        }
    });

    /* =========================================================
       GET CATEGORIES
       GET /api/admin/inventory/categories
    ========================================================= */

    router.get("/categories", requireAdmin, async (req, res) => {
        try {
            const [categories] = await db.query(`
                SELECT id, name, description
                FROM categories
                ORDER BY name ASC
            `);

            return res.json({
                success: true,
                count: categories.length,
                categories
            });
        } catch (error) {
            console.error("Admin inventory categories error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve categories.",
                error: error.message
            });
        }
    });

    /* =========================================================
       GET TRANSACTIONS
       GET /api/admin/inventory/transactions
    ========================================================= */

    router.get("/transactions", requireAdmin, async (req, res) => {
        try {
            const [transactions] = await db.query(`
                SELECT
                    it.id,
                    it.product_id,
                    p.name AS product_name,
                    it.type,
                    it.quantity,
                    it.previous_stock,
                    it.new_stock,
                    it.reference,
                    it.created_at
                FROM inventory_transactions it
                INNER JOIN products p ON p.id = it.product_id
                ORDER BY it.created_at DESC, it.id DESC
            `);

            const finalTransactions = transactions.map(transaction => ({
                id: Number(transaction.id),
                product_id: Number(transaction.product_id),
                product_name: transaction.product_name,
                type: transaction.type,
                quantity: Number(transaction.quantity),
                previous_stock: Number(transaction.previous_stock),
                new_stock: Number(transaction.new_stock),
                reference: transaction.reference || "",
                created_at: transaction.created_at
            }));

            return res.json({
                success: true,
                count: finalTransactions.length,
                transactions: finalTransactions
            });
        } catch (error) {
            console.error(
                "Admin inventory transactions error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve inventory transactions.",
                error: error.message
            });
        }
    });

    /* =========================================================
       GET ARCHIVED INVENTORY
       GET /api/admin/inventory/archive

       IMPORTANT:
       This route MUST be declared before GET /:id.
       Otherwise, "archive" can be interpreted as a product ID.
    ========================================================= */

    router.get("/archive", requireAdmin, async (req, res) => {
        try {
            const [products] = await db.query(`
                SELECT
                    p.id,
                    p.category_id,
                    c.name AS category_name,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image,
                    p.status,
                    p.created_at,
                    p.is_archived
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.is_archived = 1
                ORDER BY p.id DESC
            `);

            const archivedProducts = products.map(product => ({
                id: Number(product.id),
                category_id: Number(product.category_id),
                category_name: product.category_name,
                name: product.name,
                description: product.description || "",
                price: Number(product.price || 0),
                stock: Number(product.stock || 0),
                image: product.image || null,
                status: product.status || "unavailable",
                created_at: product.created_at,
                is_archived: true
            }));

            return res.json({
                success: true,
                count: archivedProducts.length,
                products: archivedProducts
            });
        } catch (error) {
            console.error("Admin archived inventory error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve archived products.",
                error: error.message
            });
        }
    });

    /* =========================================================
       GET SINGLE ACTIVE PRODUCT
       GET /api/admin/inventory/:id
    ========================================================= */

    router.get("/:id", requireAdmin, async (req, res) => {
        try {
            const productId = Number(req.params.id);

            if (!Number.isInteger(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            const [products] = await db.query(
                `
                SELECT
                    p.id,
                    p.category_id,
                    c.name AS category_name,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image,
                    p.status,
                    p.created_at
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.id = ?
                  AND p.is_archived = 0
                LIMIT 1
                `,
                [productId]
            );

            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Active product not found."
                });
            }

            const product = products[0];

            return res.json({
                success: true,
                product: {
                    ...product,
                    id: Number(product.id),
                    category_id: Number(product.category_id),
                    price: Number(product.price || 0),
                    stock: Number(product.stock || 0)
                }
            });
        } catch (error) {
            console.error("Admin single inventory error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve product.",
                error: error.message
            });
        }
    });

    /* =========================================================
       ADD PRODUCT
       POST /api/admin/inventory
    ========================================================= */

    router.post("/", requireAdmin, async (req, res) => {
        let connection;

        try {
            const {
                category_id,
                name,
                description,
                price,
                stock,
                image,
                status
            } = req.body;

            const categoryId = Number(category_id);
            const productName = String(name || "").trim();
            const productPrice = Number(price);
            const productStock = Number(stock || 0);
            const productStatus =
                status === "unavailable" ? "unavailable" : "available";

            if (!Number.isInteger(categoryId) || categoryId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Category is required."
                });
            }

            if (!productName) {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required."
                });
            }

            if (!Number.isFinite(productPrice) || productPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product price."
                });
            }

            if (
                !Number.isInteger(productStock) ||
                productStock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Stock must be a whole number that is 0 or higher."
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [category] = await connection.query(
                `SELECT id FROM categories WHERE id = ? LIMIT 1`,
                [categoryId]
            );

            if (category.length === 0) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "Selected category does not exist."
                });
            }

            const [result] = await connection.query(
                `
                INSERT INTO products (
                    category_id,
                    name,
                    description,
                    price,
                    stock,
                    image,
                    status,
                    is_archived
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                `,
                [
                    categoryId,
                    productName,
                    description || null,
                    productPrice,
                    productStock,
                    image || null,
                    productStatus
                ]
            );

            const productId = result.insertId;

            if (productStock > 0) {
                await connection.query(
                    `
                    INSERT INTO inventory_transactions (
                        product_id,
                        type,
                        quantity,
                        previous_stock,
                        new_stock,
                        reference
                    )
                    VALUES (?, 'Stock In', ?, 0, ?, ?)
                    `,
                    [
                        productId,
                        productStock,
                        productStock,
                        "Initial inventory"
                    ]
                );
            }

            await connection.commit();

            return res.status(201).json({
                success: true,
                message: "Product added successfully.",
                product: {
                    id: productId
                }
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Inventory rollback error:",
                        rollbackError
                    );
                }
            }

            console.error("Admin add inventory error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to add product.",
                error: error.message
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    });

    /* =========================================================
       UPDATE ACTIVE PRODUCT
       PUT /api/admin/inventory/:id
    ========================================================= */

    router.put("/:id", requireAdmin, async (req, res) => {
        let connection;

        try {
            const productId = Number(req.params.id);

            if (!Number.isInteger(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            const {
                category_id,
                name,
                description,
                price,
                image,
                status
            } = req.body;

            const categoryId = Number(category_id);
            const productName = String(name || "").trim();
            const productPrice = Number(price);
            const productStatus =
                status === "unavailable" ? "unavailable" : "available";

            if (!Number.isInteger(categoryId) || categoryId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Category is required."
                });
            }

            if (!productName) {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required."
                });
            }

            if (!Number.isFinite(productPrice) || productPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product price."
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [existing] = await connection.query(
                `
                SELECT id
                FROM products
                WHERE id = ?
                  AND is_archived = 0
                LIMIT 1
                `,
                [productId]
            );

            if (existing.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Active product not found."
                });
            }

            const [category] = await connection.query(
                `SELECT id FROM categories WHERE id = ? LIMIT 1`,
                [categoryId]
            );

            if (category.length === 0) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "Selected category does not exist."
                });
            }

            await connection.query(
                `
                UPDATE products
                SET
                    category_id = ?,
                    name = ?,
                    description = ?,
                    price = ?,
                    image = ?,
                    status = ?
                WHERE id = ?
                  AND is_archived = 0
                `,
                [
                    categoryId,
                    productName,
                    description || null,
                    productPrice,
                    image || null,
                    productStatus,
                    productId
                ]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: "Product updated successfully."
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Inventory update rollback error:",
                        rollbackError
                    );
                }
            }

            console.error("Admin update inventory error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update product.",
                error: error.message
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    });

    /* =========================================================
       UPDATE STOCK
       POST /api/admin/inventory/:id/stock
    ========================================================= */

    router.post("/:id/stock", requireAdmin, async (req, res) => {
        let connection;

        try {
            const productId = Number(req.params.id);
            const { type, quantity, reference } = req.body;

            const validTypes = [
                "Stock In",
                "Stock Out",
                "Adjustment",
                "Sale"
            ];

            if (!Number.isInteger(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inventory transaction type."
                });
            }

            const transactionQuantity = Number(quantity);

            if (
                !Number.isInteger(transactionQuantity) ||
                transactionQuantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Quantity must be a whole number greater than 0."
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [products] = await connection.query(
                `
                SELECT id, stock
                FROM products
                WHERE id = ?
                  AND is_archived = 0
                FOR UPDATE
                `,
                [productId]
            );

            if (products.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Active product not found."
                });
            }

            const previousStock = Number(products[0].stock || 0);
            let newStock = previousStock;

            if (type === "Stock In") {
                newStock = previousStock + transactionQuantity;
            } else {
                newStock = previousStock - transactionQuantity;
            }

            if (newStock < 0) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "Stock cannot go below zero."
                });
            }

            await connection.query(
                `
                UPDATE products
                SET stock = ?
                WHERE id = ?
                  AND is_archived = 0
                `,
                [newStock, productId]
            );

            await connection.query(
                `
                INSERT INTO inventory_transactions (
                    product_id,
                    type,
                    quantity,
                    previous_stock,
                    new_stock,
                    reference
                )
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    productId,
                    type,
                    transactionQuantity,
                    previousStock,
                    newStock,
                    reference || null
                ]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: "Inventory stock updated successfully.",
                stock: {
                    previous_stock: previousStock,
                    new_stock: newStock
                }
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error("Stock rollback error:", rollbackError);
                }
            }

            console.error("Admin stock update error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update inventory stock.",
                error: error.message
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    });

    /* =========================================================
       ARCHIVE PRODUCT
       DELETE /api/admin/inventory/:id

       - Products with stock above zero cannot be archived.
       - Products are marked archived, not permanently deleted.
       - Related records and transaction history are preserved.
    ========================================================= */

    router.delete("/:id", requireAdmin, async (req, res) => {
        let connection;

        try {
            const productId = Number(req.params.id);

            if (!Number.isInteger(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [products] = await connection.query(
                `
                SELECT id, name, stock, is_archived
                FROM products
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [productId]
            );

            if (products.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found. Refresh the inventory and try again."
                });
            }

            const product = products[0];

            if (Number(product.is_archived) === 1) {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message: "This product is already archived."
                });
            }

            const stock = Number(product.stock || 0);

            if (stock > 0) {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        `Cannot archive "${product.name}" because it still has ${stock} item(s) in stock. Stock must be zero first.`
                });
            }

            await connection.query(
                `
                UPDATE products
                SET is_archived = 1
                WHERE id = ?
                `,
                [productId]
            );

            await connection.commit();

            return res.json({
                success: true,
                action: "archived",
                message:
                    `"${product.name}" was moved to Archive. Its history and related records were preserved.`
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Archive rollback error:",
                        rollbackError
                    );
                }
            }

            console.error("Admin archive inventory error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to archive product.",
                error: error.message
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    });

    return router;
};  