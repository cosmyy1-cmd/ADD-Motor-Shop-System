
const express = require("express");

module.exports = function createAdminInventoryArchiveRouter(
    db,
    requireAdmin
) {
    const router = express.Router();

    /*
    =========================================================
    ARCHIVE DATABASE REQUIREMENT

    The products table must have:
        is_archived TINYINT(1) NOT NULL DEFAULT 0

    0 = Active
    1 = Archived

    Run the SQL migration provided after this code.
    =========================================================
    */

    /*
    =========================================================
    GET ARCHIVED PRODUCTS
    GET /api/admin/inventory/archive
    =========================================================
    */

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
                LEFT JOIN categories c
                    ON c.id = p.category_id
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
            console.error(
                "Admin archived inventory error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve archived products.",
                error: error.message
            });
        }
    });

    /*
    =========================================================
    ARCHIVE PRODUCT
    POST /api/admin/inventory/:id/archive

    Products with remaining stock cannot be archived.
    Existing records and transaction history are preserved.
    =========================================================
    */

    router.post("/:id/archive", requireAdmin, async (req, res) => {
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
                    message: "Product not found."
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
                        `Cannot archive "${product.name}" because it still has ${stock} item(s) in stock. Handle the remaining stock first.`
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
                message: `"${product.name}" was moved to Archive.`,
                product: {
                    id: productId,
                    is_archived: true
                }
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

            console.error(
                "Admin archive product error:",
                error
            );

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

    /*
    =========================================================
    RESTORE PRODUCT
    POST /api/admin/inventory/:id/restore
    =========================================================
    */

    router.post("/:id/restore", requireAdmin, async (req, res) => {
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
                SELECT id, name, is_archived
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
                    message: "Product not found."
                });
            }

            const product = products[0];

            if (Number(product.is_archived) !== 1) {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message: "This product is not archived."
                });
            }

            await connection.query(
                `
                UPDATE products
                SET is_archived = 0
                WHERE id = ?
                `,
                [productId]
            );

            await connection.commit();

            return res.json({
                success: true,
                action: "restored",
                message: `"${product.name}" was restored to inventory.`,
                product: {
                    id: productId,
                    is_archived: false
                }
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Restore rollback error:",
                        rollbackError
                    );
                }
            }

            console.error(
                "Admin restore product error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to restore product.",
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