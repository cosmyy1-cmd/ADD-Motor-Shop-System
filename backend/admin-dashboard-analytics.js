const express = require("express");

function createAdminDashboardAnalyticsRouter(db, requireAdmin) {
    const router = express.Router();

    const toNumber = (value) => Number(value || 0);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const getDateLabel = (dateString, options = {}) => {
        const date = new Date(`${dateString}T12:00:00`);

        return date.toLocaleDateString("en-US", options);
    };

    const buildDateRange = (startDate, endDate) => {
        const dates = [];

        const current = new Date(`${startDate}T12:00:00`);
        const end = new Date(`${endDate}T12:00:00`);

        while (current <= end) {
            const dateString = formatDate(current);

            dates.push({
                date: dateString,
                label: getDateLabel(dateString, {
                    weekday: "short"
                })
            });

            current.setDate(current.getDate() + 1);
        }

        return dates;
    };

    /*
    =========================================
    GET DASHBOARD ANALYTICS

    GET /api/admin/dashboard-analytics

    Includes:
    - Today's product revenue
    - Today's completed service revenue
    - Monday-Saturday appointments
    - Monday-Saturday service categories
    - Whole-month appointments
    =========================================
    */

    router.get("/", requireAdmin, async (req, res) => {
        try {
            /*
             * DATABASE DATE RANGES
             *
             * Reporting periods follow the
             * MariaDB server's current local date.
             */

            const [periodRows] = await db.query(`
                SELECT
                    DATE_FORMAT(
                        CURDATE(),
                        '%Y-%m-%d'
                    ) AS today,

                    DATE_FORMAT(
                        DATE_SUB(
                            CURDATE(),
                            INTERVAL WEEKDAY(CURDATE()) DAY
                        ),
                        '%Y-%m-%d'
                    ) AS week_start,

                    DATE_FORMAT(
                        DATE_ADD(
                            DATE_SUB(
                                CURDATE(),
                                INTERVAL WEEKDAY(CURDATE()) DAY
                            ),
                            INTERVAL 5 DAY
                        ),
                        '%Y-%m-%d'
                    ) AS week_end,

                    DATE_FORMAT(
                        DATE_SUB(
                            CURDATE(),
                            INTERVAL DAYOFMONTH(CURDATE()) - 1 DAY
                        ),
                        '%Y-%m-%d'
                    ) AS month_start,

                    DATE_FORMAT(
                        LAST_DAY(CURDATE()),
                        '%Y-%m-%d'
                    ) AS month_end
            `);

            const periods = periodRows[0];

            const {
                today,
                week_start: weekStart,
                week_end: weekEnd,
                month_start: monthStart,
                month_end: monthEnd
            } = periods;


            /*
             * DAILY PRODUCT REVENUE
             *
             * Includes:
             * 1. Admin-recorded direct product sales.
             * 2. Online orders with successful Paid
             *    payment records.
             *
             * The two channels are added together.
             */

            const [productRevenueRows] = await db.query(
                `
                SELECT
                    (
                        SELECT COALESCE(
                            SUM(ds.total_amount),
                            0
                        )
                        FROM direct_sales ds
                        WHERE DATE(ds.created_at) = ?
                    )
                    +
                    (
                        SELECT COALESCE(
                            SUM(p.amount),
                            0
                        )
                        FROM payments p

                        INNER JOIN orders o
                            ON o.id = p.order_id

                        WHERE p.status = 'Paid'
                        AND DATE(p.created_at) = ?
                        AND o.status <> 'Cancelled'
                    ) AS total
                `,
                [today, today]
            );

            const productRevenueToday =
                toNumber(productRevenueRows[0].total);


            /*
             * DAILY SERVICE REVENUE
             *
             * Only Completed appointments scheduled
             * for today are included.
             *
             * If reservation_services contains services,
             * use its stored prices.
             *
             * Otherwise, use the reservation's primary
             * service price from services.
             */

            const [serviceRevenueRows] = await db.query(
                `
                SELECT
                    COALESCE(
                        SUM(
                            CASE

                                WHEN EXISTS (
                                    SELECT 1
                                    FROM reservation_services rs_check
                                    WHERE rs_check.reservation_id = r.id
                                )

                                THEN (
                                    SELECT COALESCE(
                                        SUM(rs.price),
                                        0
                                    )
                                    FROM reservation_services rs
                                    WHERE rs.reservation_id = r.id
                                )

                                ELSE COALESCE(s.price, 0)

                            END
                        ),
                        0
                    ) AS total

                FROM reservations r

                LEFT JOIN services s
                    ON s.id = r.service_id

                WHERE r.status = 'Completed'
                AND r.reservation_date = ?
                `,
                [today]
            );

            const serviceRevenueToday =
                toNumber(serviceRevenueRows[0].total);


            /*
             * DAILY APPOINTMENTS
             *
             * Monday through Saturday.
             *
             * Uses reservation_date, not created_at.
             * Includes all appointment statuses.
             */

            const [dailyAppointmentRows] = await db.query(
                `
                SELECT
                    DATE_FORMAT(
                        reservation_date,
                        '%Y-%m-%d'
                    ) AS appointment_date,

                    COUNT(*) AS total

                FROM reservations

                WHERE reservation_date BETWEEN ? AND ?

                GROUP BY reservation_date

                ORDER BY reservation_date ASC
                `,
                [weekStart, weekEnd]
            );

            const dailyAppointmentMap = {};

            dailyAppointmentRows.forEach((row) => {
                dailyAppointmentMap[row.appointment_date] =
                    toNumber(row.total);
            });

            const dailyAppointments = buildDateRange(
                weekStart,
                weekEnd
            ).map((day) => ({
                date: day.date,
                label: day.label,
                total: dailyAppointmentMap[day.date] || 0
            }));


            /*
             * WEEKLY APPOINTMENT CATEGORIES
             *
             * Uses services.category.
             *
             * Supports reservations with multiple services
             * and older reservations using service_id.
             *
             * Each reservation is counted once per category,
             * even if it has multiple services in that category.
             */

            const [categoryRows] = await db.query(
                `
                SELECT
                    category,
                    COUNT(*) AS total

                FROM (
                    SELECT
                        r.id AS reservation_id,
                        LOWER(s.category) AS category

                    FROM reservations r

                    INNER JOIN reservation_services rs
                        ON rs.reservation_id = r.id

                    INNER JOIN services s
                        ON s.id = rs.service_id

                    WHERE r.reservation_date BETWEEN ? AND ?

                    UNION

                    SELECT
                        r.id AS reservation_id,
                        LOWER(s.category) AS category

                    FROM reservations r

                    INNER JOIN services s
                        ON s.id = r.service_id

                    WHERE r.reservation_date BETWEEN ? AND ?

                    AND NOT EXISTS (
                        SELECT 1
                        FROM reservation_services rs
                        WHERE rs.reservation_id = r.id
                    )

                ) AS reservation_categories

                GROUP BY category
                ORDER BY category ASC
                `,
                [
                    weekStart,
                    weekEnd,
                    weekStart,
                    weekEnd
                ]
            );

            const categoryTotals = {
                maintenance: 0,
                repair: 0,
                upgrade: 0
            };

            categoryRows.forEach((row) => {
                const category =
                    String(row.category || "").toLowerCase();

                if (
                    Object.prototype.hasOwnProperty.call(
                        categoryTotals,
                        category
                    )
                ) {
                    categoryTotals[category] =
                        toNumber(row.total);
                }
            });

            const weeklyAppointmentCategories = [
                {
                    category: "Maintenance",
                    key: "maintenance",
                    total: categoryTotals.maintenance
                },
                {
                    category: "Repair",
                    key: "repair",
                    total: categoryTotals.repair
                },
                {
                    category: "Upgrade",
                    key: "upgrade",
                    total: categoryTotals.upgrade
                }
            ];


            /*
             * MONTHLY APPOINTMENTS
             *
             * Includes every calendar day in the
             * current month, including zero-count days.
             */

            const [monthlyAppointmentRows] = await db.query(
                `
                SELECT
                    DATE_FORMAT(
                        reservation_date,
                        '%Y-%m-%d'
                    ) AS appointment_date,

                    COUNT(*) AS total

                FROM reservations

                WHERE reservation_date BETWEEN ? AND ?

                GROUP BY reservation_date

                ORDER BY reservation_date ASC
                `,
                [monthStart, monthEnd]
            );

            const monthlyAppointmentMap = {};

            monthlyAppointmentRows.forEach((row) => {
                monthlyAppointmentMap[row.appointment_date] =
                    toNumber(row.total);
            });

            const monthlyAppointments = buildDateRange(
                monthStart,
                monthEnd
            ).map((day) => ({
                date: day.date,
                label: getDateLabel(day.date, {
                    month: "short",
                    day: "numeric"
                }),
                total: monthlyAppointmentMap[day.date] || 0
            }));


            /*
             * RESPONSE
             */

            return res.json({
                success: true,

                periods: {
                    today,
                    week_start: weekStart,
                    week_end: weekEnd,
                    month_start: monthStart,
                    month_end: monthEnd
                },

                daily_revenue: {
                    product_revenue: productRevenueToday,
                    service_revenue: serviceRevenueToday
                },

                daily_appointments: dailyAppointments,

                weekly_appointment_categories:
                    weeklyAppointmentCategories,

                monthly_appointments: monthlyAppointments,

                revenue_basis: {
                    product_revenue:
                        "Direct product sales plus successful Paid online-order payments recorded today.",

                    service_revenue:
                        "Prices of Completed appointments scheduled for today."
                }
            });

        } catch (error) {
            console.error(
                "Admin dashboard analytics error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve dashboard analytics.",
                error: error.message
            });
        }
    });

    return router;
}

module.exports = createAdminDashboardAnalyticsRouter;