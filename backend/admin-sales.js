
const express = require("express");
const crypto = require("crypto");

function createAdminSalesRouter(db, requireAdmin) {
    const router = express.Router();

    const formatReference = (id) => `DS-${String(id).padStart(6, "0")}`;
    const toCents = (value) => Math.round(Number(value || 0) * 100);
    const fromCents = (cents) => (cents / 100).toFixed(2);

    // GET /api/admin/sales/products
    // Products come directly from the existing Inventory table.
    router.get("/products", requireAdmin, async (req, res) => {
        try {
            const [products] = await db.query(`
                SELECT
                    id,
                    name,
                    price,
                    stock,
                    status
                FROM products
                WHERE is_archived = 0
                ORDER BY name ASC
            `);

            return res.json({
                success: true,
                products: products.map((product) => ({
                    id: Number(product.id),
                    name: product.name,
                    price: Number(product.price),
                    stock: Number(product.stock || 0),
                    status: product.status
                }))
            });
        } catch (error) {
            console.error("Load sales products error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to load inventory products."
            });
        }
    });

    // GET /api/admin/sales/stats
    router.get("/stats", requireAdmin, async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    COUNT(DISTINCT ds.id) AS total_transactions,
                    COALESCE(SUM(ds.total_amount), 0) AS total_sales,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN DATE(ds.created_at) = CURDATE()
                                THEN ds.total_amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS today_sales,
                    COALESCE(SUM(dsi.quantity), 0) AS items_sold
                FROM direct_sales ds
                LEFT JOIN direct_sale_items dsi
                    ON dsi.sale_id = ds.id
            `);

            const stats = rows[0];

            return res.json({
                success: true,
                stats: {
                    total_transactions: Number(stats.total_transactions || 0),
                    total_sales: Number(stats.total_sales || 0),
                    today_sales: Number(stats.today_sales || 0),
                    items_sold: Number(stats.items_sold || 0)
                }
            });
        } catch (error) {
            console.error("Product sales statistics error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to retrieve product sales statistics."
            });
        }
    });

    // GET /api/admin/sales
    router.get("/", requireAdmin, async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    ds.id,
                    ds.sale_reference,
                    ds.total_amount,
                    ds.created_by,
                    ds.created_at,
                    dsi.product_id,
                    dsi.product_name,
                    dsi.quantity,
                    dsi.unit_price,
                    dsi.subtotal
                FROM direct_sales ds
                LEFT JOIN direct_sale_items dsi
                    ON dsi.sale_id = ds.id
                ORDER BY ds.created_at DESC, ds.id DESC
            `);

            const sales = rows.map((sale) => ({
                id: Number(sale.id),
                sale_reference: sale.sale_reference,
                product_id: sale.product_id == null
                    ? null
                    : Number(sale.product_id),
                product_name: sale.product_name || "Unknown product",
                quantity: Number(sale.quantity || 0),
                unit_price: Number(sale.unit_price || 0),
                subtotal: Number(sale.subtotal || 0),
                total_amount: Number(sale.total_amount || 0),
                created_by: sale.created_by == null
                    ? null
                    : Number(sale.created_by),
                sale_date: sale.created_at
            }));

            return res.json({ success: true, count: sales.length, sales });
        } catch (error) {
            console.error("Get product sales error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to retrieve product sales."
            });
        }
    });

    // POST /api/admin/sales
    // Body: { "product_id": 1, "quantity": 2 }
    router.post("/", requireAdmin, async (req, res) => {
        let connection;
        let transactionStarted = false;

        try {
            const productId = Number(req.body.product_id);
            const quantity = Number(req.body.quantity);

            if (!Number.isSafeInteger(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a valid inventory product."
                });
            }

            if (!Number.isSafeInteger(quantity) || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be a whole number greater than zero."
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();
            transactionStarted = true;

            const [products] = await connection.query(
                `
                SELECT id, name, price, stock, status, is_archived
                FROM products
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [productId]
            );

            if (!products.length) {
                await connection.rollback();
                transactionStarted = false;
                return res.status(404).json({
                    success: false,
                    message: "The selected product was not found."
                });
            }

            const product = products[0];
            const currentStock = Number(product.stock || 0);

            if (Number(product.is_archived) === 1) {
                await connection.rollback();
                transactionStarted = false;
                return res.status(409).json({
                    success: false,
                    message: "Archived products cannot be sold."
                });
            }

            if (String(product.status).toLowerCase() !== "available") {
                await connection.rollback();
                transactionStarted = false;
                return res.status(409).json({
                    success: false,
                    message: "This product is currently unavailable."
                });
            }

            if (currentStock < quantity) {
                await connection.rollback();
                transactionStarted = false;
                return res.status(409).json({
                    success: false,
                    message: `Insufficient stock. Only ${currentStock} item(s) are available.`,
                    available_stock: currentStock
                });
            }

            // Price is always retrieved from the database, not the browser.
            const unitPriceCents = toCents(product.price);
            const totalCents = unitPriceCents * quantity;

            if (
                !Number.isSafeInteger(unitPriceCents) ||
                unitPriceCents < 0 ||
                !Number.isSafeInteger(totalCents)
            ) {
                await connection.rollback();
                transactionStarted = false;
                return res.status(400).json({
                    success: false,
                    message: "The product price or sale total is invalid."
                });
            }

            const unitPrice = fromCents(unitPriceCents);
            const totalAmount = fromCents(totalCents);
            const newStock = currentStock - quantity;
            const temporaryReference = `TMP-${crypto.randomUUID()}`;
            const adminId = Number(req.admin?.id) || null;

            const [saleResult] = await connection.query(
                `
                INSERT INTO direct_sales
                    (sale_reference, total_amount, created_by)
                VALUES (?, ?, ?)
                `,
                [temporaryReference, totalAmount, adminId]
            );

            const saleId = Number(saleResult.insertId);
            const saleReference = formatReference(saleId);

            await connection.query(
                `UPDATE direct_sales SET sale_reference = ? WHERE id = ?`,
                [saleReference, saleId]
            );

            await connection.query(
                `
                INSERT INTO direct_sale_items
                    (sale_id, product_id, product_name, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    saleId,
                    productId,
                    product.name,
                    quantity,
                    unitPrice,
                    totalAmount
                ]
            );

            await connection.query(
                `UPDATE products SET stock = ? WHERE id = ?`,
                [newStock, productId]
            );

            await connection.query(
                `
                INSERT INTO inventory_transactions
                    (product_id, type, quantity, previous_stock, new_stock, reference)
                VALUES (?, 'Stock Out', ?, ?, ?, ?)
                `,
                [
                    productId,
                    quantity,
                    currentStock,
                    newStock,
                    saleReference
                ]
            );

            await connection.commit();
            transactionStarted = false;

            return res.status(201).json({
                success: true,
                message: "Product sale recorded and inventory updated successfully.",
                sale: {
                    id: saleId,
                    sale_reference: saleReference,
                    product_id: productId,
                    product_name: product.name,
                    quantity,
                    unit_price: Number(unitPrice),
                    subtotal: Number(totalAmount),
                    total_amount: Number(totalAmount),
                    previous_stock: currentStock,
                    new_stock: newStock,
                    sale_date: new Date().toISOString()
                }
            });
        } catch (error) {
            if (connection && transactionStarted) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error("Product sale rollback error:", rollbackError);
                }
            }

            console.error("Record product sale error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to record the product sale."
            });
        } finally {
            if (connection) connection.release();
        }
    });

    // GET /api/admin/sales/:reference
    // Keep this route after /products and /stats.
    router.get("/:reference", requireAdmin, async (req, res) => {
        try {
            const reference = String(req.params.reference || "").trim();

            const [sales] = await db.query(
                `
                SELECT id, sale_reference, total_amount, created_by, created_at
                FROM direct_sales
                WHERE sale_reference = ?
                LIMIT 1
                `,
                [reference]
            );

            if (!sales.length) {
                return res.status(404).json({
                    success: false,
                    message: "Product sale not found."
                });
            }

            const sale = sales[0];

            const [items] = await db.query(
                `
                SELECT id, product_id, product_name, quantity, unit_price, subtotal
                FROM direct_sale_items
                WHERE sale_id = ?
                ORDER BY id ASC
                `,
                [sale.id]
            );

            return res.json({
                success: true,
                sale: {
                    id: Number(sale.id),
                    sale_reference: sale.sale_reference,
                    total_amount: Number(sale.total_amount),
                    created_by: sale.created_by == null
                        ? null
                        : Number(sale.created_by),
                    sale_date: sale.created_at,
                    items: items.map((item) => ({
                        id: Number(item.id),
                        product_id: Number(item.product_id),
                        product_name: item.product_name,
                        quantity: Number(item.quantity),
                        unit_price: Number(item.unit_price),
                        subtotal: Number(item.subtotal)
                    }))
                }
            });
        } catch (error) {
            console.error("Get product sale details error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to retrieve product sale details."
            });
        }
    });

    return router;
}

module.exports = createAdminSalesRouter;