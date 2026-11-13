
const express = require("express");

function createAdminCustomerRestorationRouter(db, requireAdmin) {
    const router = express.Router();

    // ==============================================
    // GET LOCKED CUSTOMER ACCOUNTS
    // GET /api/admin/customers/locked
    // ==============================================

    router.get("/locked", requireAdmin, async (req, res) => {
        try {
            const [customers] = await db.execute(
                `SELECT
                    id,
                    name,
                    email,
                    phone,
                    address,
                    failed_login_attempts,
                    created_at
                 FROM users
                 WHERE
                    LOWER(role) = 'customer'
                    AND COALESCE(failed_login_attempts, 0) >= 5
                 ORDER BY failed_login_attempts DESC, created_at DESC`
            );

            return res.json({
                success: true,
                count: customers.length,
                customers
            });

        } catch (error) {
            console.error(
                "Get locked customers error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve locked customer accounts."
            });
        }
    });

    // ==============================================
    // RESTORE LOCKED CUSTOMER ACCOUNT
    // POST /api/admin/customers/:id/restore
    // ==============================================

    router.post("/:id/restore", requireAdmin, async (req, res) => {
        let connection;

        try {
            const customerId = Number(req.params.id);

            if (
                !Number.isInteger(customerId) ||
                customerId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid customer ID."
                });
            }

            connection = await db.getConnection();

            await connection.beginTransaction();

            // Lock the customer row while restoring the account.
            const [customers] = await connection.execute(
                `SELECT
                    id,
                    name,
                    email,
                    failed_login_attempts
                 FROM users
                 WHERE id = ?
                    AND LOWER(role) = 'customer'
                 LIMIT 1
                 FOR UPDATE`,
                [customerId]
            );

            if (customers.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Customer account not found."
                });
            }

            const customer = customers[0];

            const failedAttempts = Number(
                customer.failed_login_attempts || 0
            );

            if (failedAttempts < 5) {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message: "This customer account is not currently locked."
                });
            }

            // Restore the account by resetting its failed attempts.
            await connection.execute(
                `UPDATE users
                 SET failed_login_attempts = 0
                 WHERE id = ?`,
                [customerId]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: "Customer account restored successfully.",
                customer: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    failed_login_attempts: 0
                }
            });

        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Account restoration rollback error:",
                        rollbackError
                    );
                }
            }

            console.error(
                "Restore customer account error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to restore the customer account. Please try again."
            });

        } finally {
            if (connection) {
                connection.release();
            }
        }
    });

    return router;
}

module.exports = createAdminCustomerRestorationRouter;
