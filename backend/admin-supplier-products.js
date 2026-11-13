/* =========================================================
   ADD MOTOR SHOP - ADMIN SUPPLIER PRODUCTS
   Supplier ↔ Products management

   - Get all available products
   - Get products offered by supplier
   - Add one product to supplier
   - Update products offered by supplier
========================================================= */

const express = require("express");


function createAdminSupplierProductsRouter(
    db,
    requireAdmin
) {

    const router =
        express.Router();


    /* =========================================================
       GET ALL AVAILABLE PRODUCTS
       Used by Suppliers > Edit Supplier > Add Product
    ========================================================= */

    router.get(
        "/products",
        requireAdmin,
        async (req, res) => {

            try {

                const [rows] =
                    await db.query(`
                        SELECT
                            p.id,
                            p.category_id,
                            p.name,
                            p.description,
                            p.price,
                            p.stock,
                            p.image,
                            p.status,
                            p.created_at,
                            c.name AS category_name
                        FROM products p
                        LEFT JOIN categories c
                            ON c.id = p.category_id
                        ORDER BY p.name ASC
                    `);


                res.json({
                    success: true,
                    products: rows
                });


            } catch (error) {

                console.error(
                    "Error loading available products:",
                    error
                );


                res.status(500).json({
                    success: false,
                    message:
                        "Unable to load available products.",
                    error:
                        error.message
                });

            }

        }
    );


    /* =========================================================
       GET PRODUCTS OFFERED BY ONE SUPPLIER
    ========================================================= */

    router.get(
        "/:supplierId",
        requireAdmin,
        async (req, res) => {

            const supplierId =
                Number(
                    req.params.supplierId
                );


            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid supplier ID."
                });

            }


            try {

                /* =============================================
                   CHECK SUPPLIER
                ============================================= */

                const [supplierRows] =
                    await db.query(
                        `
                            SELECT
                                id,
                                name
                            FROM suppliers
                            WHERE id = ?
                            LIMIT 1
                        `,
                        [supplierId]
                    );


                if (
                    supplierRows.length === 0
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Supplier not found."
                    });

                }


                /* =============================================
                   GET LINKED PRODUCTS
                ============================================= */

                const [rows] =
                    await db.query(
                        `
                            SELECT

                                sp.id
                                    AS supplier_product_id,

                                sp.supplier_id,

                                sp.product_id,

                                sp.supplier_price,

                                sp.created_at
                                    AS supplier_product_created_at,

                                p.id,

                                p.name,

                                p.description,

                                p.price,

                                p.stock,

                                p.image,

                                p.status,

                                p.category_id,

                                c.name
                                    AS category_name

                            FROM supplier_products sp

                            INNER JOIN products p
                                ON p.id =
                                   sp.product_id

                            LEFT JOIN categories c
                                ON c.id =
                                   p.category_id

                            WHERE sp.supplier_id = ?

                            ORDER BY p.name ASC
                        `,
                        [supplierId]
                    );


                res.json({
                    success: true,
                    products: rows
                });


            } catch (error) {

                console.error(
                    "Error loading supplier products:",
                    error
                );


                res.status(500).json({
                    success: false,
                    message:
                        "Unable to load supplier products.",
                    error:
                        error.message
                });

            }

        }
    );


    /* =========================================================
       ADD ONE PRODUCT TO A SUPPLIER
       
       Expected body:

       {
           "supplier_id": 1,
           "product_id": 3,
           "supplier_price": 350
       }
    ========================================================= */

    router.post(
        "/",
        requireAdmin,
        async (req, res) => {

            const supplierId =
                Number(
                    req.body?.supplier_id
                );


            const productId =
                Number(
                    req.body?.product_id
                );


            let supplierPrice =
                req.body?.supplier_price;


            /* =============================================
               VALIDATE SUPPLIER ID
            ============================================= */

            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid supplier ID."
                });

            }


            /* =============================================
               VALIDATE PRODUCT ID
            ============================================= */

            if (
                !Number.isInteger(
                    productId
                ) ||
                productId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid product ID."
                });

            }


            /* =============================================
               VALIDATE SUPPLIER PRICE
            ============================================= */

            if (
                supplierPrice === null ||
                supplierPrice === undefined ||
                supplierPrice === ""
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Supplier price is required."
                });

            }


            supplierPrice =
                Number(
                    supplierPrice
                );


            if (
                Number.isNaN(
                    supplierPrice
                ) ||
                supplierPrice < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Supplier price must be a valid non-negative number."
                });

            }


            const connection =
                await db.getConnection();


            try {

                /* =============================================
                   CHECK SUPPLIER
                ============================================= */

                const [supplierRows] =
                    await connection.query(
                        `
                            SELECT
                                id,
                                name
                            FROM suppliers
                            WHERE id = ?
                            LIMIT 1
                        `,
                        [supplierId]
                    );


                if (
                    supplierRows.length === 0
                ) {

                    connection.release();

                    return res.status(404).json({
                        success: false,
                        message:
                            "Supplier not found."
                    });

                }


                /* =============================================
                   CHECK PRODUCT
                ============================================= */

                const [productRows] =
                    await connection.query(
                        `
                            SELECT
                                id,
                                name
                            FROM products
                            WHERE id = ?
                            LIMIT 1
                        `,
                        [productId]
                    );


                if (
                    productRows.length === 0
                ) {

                    connection.release();

                    return res.status(404).json({
                        success: false,
                        message:
                            "Product not found."
                    });

                }


                /* =============================================
                   CHECK DUPLICATE RELATIONSHIP
                ============================================= */

                const [existingRows] =
                    await connection.query(
                        `
                            SELECT
                                id,
                                supplier_price
                            FROM supplier_products
                            WHERE supplier_id = ?
                            AND product_id = ?
                            LIMIT 1
                        `,
                        [
                            supplierId,
                            productId
                        ]
                    );


                if (
                    existingRows.length > 0
                ) {

                    connection.release();

                    return res.status(409).json({
                        success: false,
                        message:
                            "This product is already linked to this supplier."
                    });

                }


                /* =============================================
                   INSERT RELATIONSHIP
                ============================================= */

                await connection.query(
                    `
                        INSERT INTO supplier_products
                        (
                            supplier_id,
                            product_id,
                            supplier_price
                        )
                        VALUES
                        (?, ?, ?)
                    `,
                    [
                        supplierId,
                        productId,
                        supplierPrice
                    ]
                );


                /* =============================================
                   RETURN ADDED PRODUCT
                ============================================= */

                const [savedRows] =
                    await connection.query(
                        `
                            SELECT

                                sp.id
                                    AS supplier_product_id,

                                sp.supplier_id,

                                sp.product_id,

                                sp.supplier_price,

                                sp.created_at
                                    AS supplier_product_created_at,

                                p.id,

                                p.name,

                                p.description,

                                p.price,

                                p.stock,

                                p.image,

                                p.status,

                                p.category_id,

                                c.name
                                    AS category_name

                            FROM supplier_products sp

                            INNER JOIN products p
                                ON p.id =
                                   sp.product_id

                            LEFT JOIN categories c
                                ON c.id =
                                   p.category_id

                            WHERE sp.supplier_id = ?
                            AND sp.product_id = ?

                            LIMIT 1
                        `,
                        [
                            supplierId,
                            productId
                        ]
                    );


                connection.release();


                res.status(201).json({
                    success: true,
                    message:
                        "Product added to supplier successfully.",
                    product:
                        savedRows[0]
                });


            } catch (error) {

                try {

                    connection.release();

                } catch (releaseError) {

                    console.error(
                        "Connection release error:",
                        releaseError
                    );

                }


                console.error(
                    "Error adding supplier product:",
                    error
                );


                res.status(500).json({
                    success: false,
                    message:
                        "Unable to add product to supplier.",
                    error:
                        error.message
                });

            }

        }
    );


    /* =========================================================
       UPDATE PRODUCTS OFFERED BY SUPPLIER

       Expected body:

       {
           "products": [
               {
                   "product_id": 3,
                   "supplier_price": 350
               },
               {
                   "product_id": 4,
                   "supplier_price": 300
               }
           ]
       }

       Any product not included will be removed
       from this supplier.
    ========================================================= */

    router.put(
        "/:supplierId",
        requireAdmin,
        async (req, res) => {

            const supplierId =
                Number(
                    req.params.supplierId
                );


            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid supplier ID."
                });

            }


            const products =
                Array.isArray(
                    req.body?.products
                )
                    ? req.body.products
                    : null;


            if (!products) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Products must be provided as an array."
                });

            }


            const connection =
                await db.getConnection();


            try {

                /* =============================================
                   CHECK SUPPLIER
                ============================================= */

                const [supplierRows] =
                    await connection.query(
                        `
                            SELECT
                                id,
                                name
                            FROM suppliers
                            WHERE id = ?
                            LIMIT 1
                        `,
                        [supplierId]
                    );


                if (
                    supplierRows.length === 0
                ) {

                    connection.release();

                    return res.status(404).json({
                        success: false,
                        message:
                            "Supplier not found."
                    });

                }


                /* =============================================
                   NORMALIZE PRODUCTS
                ============================================= */

                const normalizedProducts = [];

                const seenProductIds =
                    new Set();


                for (
                    const product of products
                ) {

                    const productId =
                        Number(
                            product?.product_id
                        );


                    if (
                        !Number.isInteger(
                            productId
                        ) ||
                        productId <= 0
                    ) {

                        connection.release();

                        return res.status(400).json({
                            success: false,
                            message:
                                "Invalid product ID."
                        });

                    }


                    if (
                        seenProductIds.has(
                            productId
                        )
                    ) {

                        connection.release();

                        return res.status(400).json({
                            success: false,
                            message:
                                "A product cannot be selected more than once."
                        });

                    }


                    seenProductIds.add(
                        productId
                    );


                    let productSupplierPrice =
                        product?.supplier_price;


                    if (
                        productSupplierPrice ===
                        null ||
                        productSupplierPrice ===
                        undefined ||
                        productSupplierPrice === ""
                    ) {

                        productSupplierPrice = null;

                    } else {

                        productSupplierPrice =
                            Number(
                                productSupplierPrice
                            );


                        if (
                            Number.isNaN(
                                productSupplierPrice
                            ) ||
                            productSupplierPrice < 0
                        ) {

                            connection.release();

                            return res.status(400).json({
                                success: false,
                                message:
                                    "Supplier price must be a valid non-negative number."
                            });

                        }

                    }


                    normalizedProducts.push({
                        productId,
                        supplierPrice:
                            productSupplierPrice
                    });

                }


                /* =============================================
                   VERIFY PRODUCTS EXIST
                ============================================= */

                if (
                    normalizedProducts.length > 0
                ) {

                    const productIds =
                        normalizedProducts.map(
                            item =>
                                item.productId
                        );


                    const placeholders =
                        productIds
                            .map(
                                () => "?"
                            )
                            .join(",");


                    const [
                        existingProducts
                    ] =
                        await connection.query(
                            `
                                SELECT
                                    id
                                FROM products
                                WHERE id IN (${placeholders})
                            `,
                            productIds
                        );


                    const existingIds =
                        new Set(
                            existingProducts.map(
                                product =>
                                    Number(
                                        product.id
                                    )
                            )
                        );


                    const missingIds =
                        productIds.filter(
                            id =>
                                !existingIds.has(
                                    id
                                )
                        );


                    if (
                        missingIds.length > 0
                    ) {

                        connection.release();

                        return res.status(400).json({
                            success: false,
                            message:
                                `Product ID ${missingIds[0]} does not exist.`
                        });

                    }

                }


                /* =============================================
                   TRANSACTION
                ============================================= */

                await connection.beginTransaction();


                /* =============================================
                   REMOVE OLD RELATIONSHIPS
                ============================================= */

                await connection.query(
                    `
                        DELETE FROM supplier_products
                        WHERE supplier_id = ?
                    `,
                    [supplierId]
                );


                /* =============================================
                   INSERT NEW RELATIONSHIPS
                ============================================= */

                for (
                    const item of normalizedProducts
                ) {

                    await connection.query(
                        `
                            INSERT INTO supplier_products
                            (
                                supplier_id,
                                product_id,
                                supplier_price
                            )
                            VALUES (?, ?, ?)
                        `,
                        [
                            supplierId,
                            item.productId,
                            item.supplierPrice
                        ]
                    );

                }


                await connection.commit();


                /* =============================================
                   RETURN SAVED PRODUCTS
                ============================================= */

                const [savedProducts] =
                    await connection.query(
                        `
                            SELECT

                                sp.id
                                    AS supplier_product_id,

                                sp.supplier_id,

                                sp.product_id,

                                sp.supplier_price,

                                p.name,

                                p.description,

                                p.price,

                                p.stock,

                                p.image,

                                p.status,

                                p.category_id,

                                c.name
                                    AS category_name

                            FROM supplier_products sp

                            INNER JOIN products p
                                ON p.id =
                                   sp.product_id

                            LEFT JOIN categories c
                                ON c.id =
                                   p.category_id

                            WHERE sp.supplier_id = ?

                            ORDER BY p.name ASC
                        `,
                        [supplierId]
                    );


                connection.release();


                res.json({
                    success: true,
                    message:
                        "Supplier products updated successfully.",
                    products:
                        savedProducts
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


                try {

                    connection.release();

                } catch (releaseError) {

                    console.error(
                        "Connection release error:",
                        releaseError
                    );

                }


                console.error(
                    "Error updating supplier products:",
                    error
                );


                res.status(500).json({
                    success: false,
                    message:
                        "Unable to update supplier products.",
                    error:
                        error.message
                });

            }

        }
    );


    return router;

}


module.exports =
    createAdminSupplierProductsRouter;