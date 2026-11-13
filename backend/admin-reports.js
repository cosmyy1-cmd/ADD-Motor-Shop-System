const express = require("express");

function createAdminReportsRouter(db, requireAdmin) {
    const router = express.Router();

    function validDate(value) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
    }

    function getDateFilters(req) {
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;

        if (startDate && !validDate(startDate)) {
            throw new Error("Invalid start date. Use YYYY-MM-DD.");
        }

        if (endDate && !validDate(endDate)) {
            throw new Error("Invalid end date. Use YYYY-MM-DD.");
        }

        if (startDate && endDate && startDate > endDate) {
            throw new Error("Start date cannot be later than end date.");
        }

        return { startDate, endDate };
    }

    function addDateConditions(column, filters, params) {
        let sql = "";

        if (filters.startDate) {
            sql += ` AND DATE(${column}) >= ?`;
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            sql += ` AND DATE(${column}) <= ?`;
            params.push(filters.endDate);
        }

        return sql;
    }

    router.get("/", requireAdmin, async (req, res) => {
        try {
            const filters = getDateFilters(req);

            /*
             * PRODUCT SALES
             *
             * Use direct_sales for the sale total.
             * Do not sum the joined item rows because
             * one sale can contain multiple products.
             */
            const salesParams = [];

            let salesSql = `
                SELECT
                    COUNT(*) AS transaction_count,
                    COALESCE(SUM(ds.total_amount), 0) AS product_sales
                FROM direct_sales ds
                WHERE 1 = 1
            `;

            salesSql += addDateConditions(
                "ds.created_at",
                filters,
                salesParams
            );

            const [salesRows] = await db.query(
                salesSql,
                salesParams
            );

            const productSales = Number(
                salesRows[0].product_sales || 0
            );

            const transactionCount = Number(
                salesRows[0].transaction_count || 0
            );

            /*
             * COMPLETED SERVICE REVENUE
             *
             * Use the saved reservation_services price
             * when a reservation has multiple services.
             *
             * If no reservation_services row exists,
             * use the reservation's linked service price.
             *
             * Only Completed reservations are included.
             */
            const serviceParams = [];

            let serviceSql = `
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN rs.id IS NOT NULL
                                    THEN rs.price
                                ELSE COALESCE(s.price, 0)
                            END
                        ),
                        0
                    ) AS service_revenue,
                    COUNT(DISTINCT r.id) AS completed_services
                FROM reservations r
                LEFT JOIN reservation_services rs
                    ON rs.reservation_id = r.id
                LEFT JOIN services s
                    ON s.id = r.service_id
                WHERE LOWER(TRIM(r.status)) = 'completed'
            `;

            serviceSql += addDateConditions(
                "r.reservation_date",
                filters,
                serviceParams
            );

            const [serviceRows] = await db.query(
                serviceSql,
                serviceParams
            );

            const serviceRevenue = Number(
                serviceRows[0].service_revenue || 0
            );

            const completedServices = Number(
                serviceRows[0].completed_services || 0
            );

            /*
             * RECEIVED SUPPLIER PURCHASE COST
             *
             * Only Received purchases count.
             * Cost = quantity * unit_cost.
             */
            const purchaseParams = [];

            let purchaseSql = `
                SELECT
                    COALESCE(
                        SUM(pi.quantity * pi.unit_cost),
                        0
                    ) AS purchase_cost,
                    COUNT(DISTINCT p.id) AS received_purchases
                FROM purchases p
                INNER JOIN purchase_items pi
                    ON pi.purchase_id = p.id
                WHERE LOWER(TRIM(p.status)) = 'received'
            `;

            purchaseSql += addDateConditions(
                "p.purchase_date",
                filters,
                purchaseParams
            );

            const [purchaseRows] = await db.query(
                purchaseSql,
                purchaseParams
            );

            const purchaseCost = Number(
                purchaseRows[0].purchase_cost || 0
            );

            const receivedPurchases = Number(
                purchaseRows[0].received_purchases || 0
            );

            /*
             * TOTAL REVENUE AND PROFIT
             */
            const totalRevenue =
                productSales + serviceRevenue;

            const totalProfit =
                totalRevenue - purchaseCost;

            /*
             * PRODUCT SALES BY CATEGORY
             *
             * Category chart uses actual sold item subtotals.
             */
            const categoryParams = [];

            let categorySql = `
                SELECT
                    COALESCE(c.name, 'Uncategorized') AS category,
                    COALESCE(SUM(dsi.subtotal), 0) AS total_sales
                FROM direct_sales ds
                INNER JOIN direct_sale_items dsi
                    ON dsi.sale_id = ds.id
                LEFT JOIN products pr
                    ON pr.id = dsi.product_id
                LEFT JOIN categories c
                    ON c.id = pr.category_id
                WHERE 1 = 1
            `;

            categorySql += addDateConditions(
                "ds.created_at",
                filters,
                categoryParams
            );

            categorySql += `
                GROUP BY
                    COALESCE(c.name, 'Uncategorized')
                ORDER BY total_sales DESC
            `;

            const [categoryRows] = await db.query(
                categorySql,
                categoryParams
            );

            const categorySales = categoryRows.map(row => ({
                category: row.category,
                total_sales: Number(row.total_sales || 0)
            }));

            /*
             * MONTHLY SALES
             *
             * Product sales and completed service revenue
             * are combined into monthly revenue.
             */
            const monthlySalesParams = [];

            let monthlySalesSql = `
                SELECT
                    DATE_FORMAT(ds.created_at, '%Y-%m') AS month,
                    COALESCE(SUM(ds.total_amount), 0) AS amount
                FROM direct_sales ds
                WHERE 1 = 1
            `;

            monthlySalesSql += addDateConditions(
                "ds.created_at",
                filters,
                monthlySalesParams
            );

            monthlySalesSql += `
                GROUP BY DATE_FORMAT(ds.created_at, '%Y-%m')
            `;

            const [monthlyProductRows] = await db.query(
                monthlySalesSql,
                monthlySalesParams
            );

            const monthlyServiceParams = [];

            let monthlyServiceSql = `
                SELECT
                    DATE_FORMAT(r.reservation_date, '%Y-%m') AS month,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN rs.id IS NOT NULL
                                    THEN rs.price
                                ELSE COALESCE(s.price, 0)
                            END
                        ),
                        0
                    ) AS amount
                FROM reservations r
                LEFT JOIN reservation_services rs
                    ON rs.reservation_id = r.id
                LEFT JOIN services s
                    ON s.id = r.service_id
                WHERE LOWER(TRIM(r.status)) = 'completed'
            `;

            monthlyServiceSql += addDateConditions(
                "r.reservation_date",
                filters,
                monthlyServiceParams
            );

            monthlyServiceSql += `
                GROUP BY DATE_FORMAT(r.reservation_date, '%Y-%m')
            `;

            const [monthlyServiceRows] = await db.query(
                monthlyServiceSql,
                monthlyServiceParams
            );

            /*
             * MONTHLY RECEIVED PURCHASE COST
             */
            const monthlyPurchaseParams = [];

            let monthlyPurchaseSql = `
                SELECT
                    DATE_FORMAT(p.purchase_date, '%Y-%m') AS month,
                    COALESCE(
                        SUM(pi.quantity * pi.unit_cost),
                        0
                    ) AS amount
                FROM purchases p
                INNER JOIN purchase_items pi
                    ON pi.purchase_id = p.id
                WHERE LOWER(TRIM(p.status)) = 'received'
            `;

            monthlyPurchaseSql += addDateConditions(
                "p.purchase_date",
                filters,
                monthlyPurchaseParams
            );

            monthlyPurchaseSql += `
                GROUP BY DATE_FORMAT(p.purchase_date, '%Y-%m')
            `;

            const [monthlyPurchaseRows] = await db.query(
                monthlyPurchaseSql,
                monthlyPurchaseParams
            );

            /*
             * MERGE MONTHLY RESULTS
             */
            const monthlyMap = new Map();

            function addMonthlyRows(rows, key) {
                rows.forEach(row => {
                    if (!row.month) return;

                    if (!monthlyMap.has(row.month)) {
                        monthlyMap.set(row.month, {
                            month: row.month,
                            sales: 0,
                            purchase_cost: 0
                        });
                    }

                    monthlyMap.get(row.month)[key] += Number(
                        row.amount || 0
                    );
                });
            }

            addMonthlyRows(monthlyProductRows, "sales");
            addMonthlyRows(monthlyServiceRows, "sales");
            addMonthlyRows(monthlyPurchaseRows, "purchase_cost");

            const monthlyPerformance = Array.from(
                monthlyMap.values()
            ).sort((a, b) =>
                a.month.localeCompare(b.month)
            );

            res.json({
                success: true,

                filters: {
                    startDate: filters.startDate,
                    endDate: filters.endDate
                },

                summary: {
                    product_sales: productSales,
                    service_revenue: serviceRevenue,
                    total_revenue: totalRevenue,
                    supplier_purchase_cost: purchaseCost,
                    total_profit: totalProfit,
                    transaction_count: transactionCount,
                    completed_services: completedServices,
                    received_purchases: receivedPurchases
                },

                category_sales: categorySales,

                monthly_performance: monthlyPerformance
            });

        } catch (error) {
            console.error("Admin reports error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to generate reports.",
                error: error.message
            });
        }
    });

    return router;
}

module.exports = createAdminReportsRouter;