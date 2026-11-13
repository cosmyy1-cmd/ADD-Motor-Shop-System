/* =========================================================
   ADD MOTOR SHOP
   CUSTOMER STATUS SERVICE

   PURPOSE:
   Automatically determine whether a customer is
   ACTIVE or INACTIVE based on their latest
   non-cancelled service reservation.

   RULE:
   - No booking = INACTIVE
   - Less than 31 days since latest booking = ACTIVE
   - 31 days or more since latest booking = INACTIVE
   - Cancelled reservations are ignored

   This file does NOT modify the users table.
========================================================= */


/* =========================================================
   GET CUSTOMER STATUS
========================================================= */

async function getCustomerStatus(db, userId) {

    try {

        const [rows] = await db.query(
            `
            SELECT
                r.reservation_date,
                r.status
            FROM reservations r
            WHERE
                r.user_id = ?
                AND r.status <> 'Cancelled'
                AND r.reservation_date <= CURDATE()
            ORDER BY
                r.reservation_date DESC,
                r.reservation_time DESC,
                r.id DESC
            LIMIT 1
            `,
            [userId]
        );


        /* =================================================
           NO NON-CANCELLED RESERVATION
        ================================================= */

        if (
            !rows ||
            rows.length === 0
        ) {

            return {
                status: "Inactive",
                last_booking_date: null,
                days_since_booking: null
            };

        }


        /* =================================================
           GET LATEST BOOKING
        ================================================= */

        const latestBooking =
            rows[0].reservation_date;


        /* =================================================
           CALCULATE DAYS SINCE BOOKING
        ================================================= */

        const [dateRows] = await db.query(
            `
            SELECT
                DATEDIFF(
                    CURDATE(),
                    ?
                ) AS days_since_booking
            `,
            [latestBooking]
        );


        const daysSinceBooking =
            Number(
                dateRows[0]?.days_since_booking || 0
            );


        /* =================================================
           DETERMINE STATUS

           0 - 30 days = Active
           31+ days   = Inactive
        ================================================= */

        const customerStatus =
            daysSinceBooking >= 31
                ? "Inactive"
                : "Active";


        return {

            status:
                customerStatus,

            last_booking_date:
                latestBooking,

            days_since_booking:
                daysSinceBooking

        };

    } catch (error) {

        console.error(
            "Customer status calculation error:",
            error
        );

        throw error;

    }

}


/* =========================================================
   GET STATUS FOR MULTIPLE CUSTOMERS
========================================================= */

async function getCustomerStatuses(
    db,
    customers
) {

    const finalCustomers = [];


    for (
        const customer of customers
    ) {

        const status =
            await getCustomerStatus(
                db,
                customer.id
            );


        finalCustomers.push({

            ...customer,

            status:
                status.status,

            last_booking_date:
                status.last_booking_date,

            days_since_booking:
                status.days_since_booking

        });

    }


    return finalCustomers;

}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

    getCustomerStatus,

    getCustomerStatuses

};