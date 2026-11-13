
const express = require("express");
const db = require("../db");

const router = express.Router();

/* =========================================
   CREATE RESERVATION
   SUPPORTS MULTIPLE SERVICES
========================================= */

router.post("/reservations", async (req, res) => {
    let connection;

    try {
        const {
            user_id,
            service_id,
            services,
            motorcycle_id,
            reservation_date,
            reservation_time,
            notes
        } = req.body;

        // BASIC VALIDATION
        if (!user_id || !reservation_date || !reservation_time) {
            return res.status(400).json({
                success: false,
                message: "Please provide user, reservation date, and reservation time."
            });
        }

        const userId = Number(user_id);

        const motorcycleId =
            motorcycle_id !== undefined &&
            motorcycle_id !== null &&
            motorcycle_id !== ""
                ? Number(motorcycle_id)
                : null;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        // RESERVATION DATE VALIDATION
        const reservationDate = String(reservation_date).trim();
        const reservationTime = String(reservation_time).trim();

        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        const timePattern = /^\d{2}:\d{2}(:\d{2})?$/;

        if (!datePattern.test(reservationDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation date format."
            });
        }

        if (!timePattern.test(reservationTime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation time format."
            });
        }

        const normalizedTime = reservationTime.substring(0, 5);

        const dateParts = reservationDate.split("-").map(Number);

        const reservationDateObject = new Date(
            Date.UTC(
                dateParts[0],
                dateParts[1] - 1,
                dateParts[2]
            )
        );

        if (
            Number.isNaN(reservationDateObject.getTime()) ||
            reservationDateObject.getUTCFullYear() !== dateParts[0] ||
            reservationDateObject.getUTCMonth() !== dateParts[1] - 1 ||
            reservationDateObject.getUTCDate() !== dateParts[2]
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid reservation date."
            });
        }

        // SUNDAY IS CLOSED
        if (reservationDateObject.getUTCDay() === 0) {
            return res.status(400).json({
                success: false,
                message: "The motor shop is closed on Sundays. Please choose another date."
            });
        }

        // PREVENT PAST DATES
        const today = new Date();

        const todayUTC = new Date(
            Date.UTC(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
            )
        );

        if (reservationDateObject < todayUTC) {
            return res.status(400).json({
                success: false,
                message: "You cannot book a service for a past date."
            });
        }

        // NORMALIZE SERVICES
        let rawServiceIds = [];

        if (Array.isArray(services)) {
            rawServiceIds = services.map(service => {
                if (service && typeof service === "object") {
                    return service.id;
                }

                return service;
            });
        } else if (
            service_id !== undefined &&
            service_id !== null &&
            service_id !== ""
        ) {
            rawServiceIds = [service_id];
        }

        if (rawServiceIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one service."
            });
        }

        const parsedServiceIds = rawServiceIds.map(value => Number(value));

        if (
            parsedServiceIds.some(
                id => !Number.isInteger(id) || id < 1
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "One or more selected services are invalid."
            });
        }

        // REMOVE DUPLICATE SERVICE SELECTIONS
        const serviceIds = [...new Set(parsedServiceIds)];

        // DATABASE TRANSACTION
        connection = await db.getConnection();
        await connection.beginTransaction();

        // VERIFY USER
        const [users] = await connection.query(
            `SELECT
                id,
                name,
                email,
                phone,
                address
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = users[0];

        // VERIFY MOTORCYCLE
        if (motorcycleId !== null) {
            if (
                !Number.isInteger(motorcycleId) ||
                motorcycleId < 1
            ) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "Invalid motorcycle ID."
                });
            }

            const [motorcycles] = await connection.query(
                `SELECT
                    id,
                    user_id,
                    brand,
                    model,
                    year,
                    engine_cc,
                    plate_number,
                    color
                 FROM customer_motorcycles
                 WHERE id = ?
                 AND user_id = ?
                 LIMIT 1`,
                [motorcycleId, userId]
            );

            if (motorcycles.length === 0) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "The selected motorcycle does not belong to this customer."
                });
            }
        }

        // GET ALL SELECTED SERVICES
        const placeholders = serviceIds.map(() => "?").join(",");

        const [selectedServices] = await connection.query(
            `SELECT
                id,
                name,
                description,
                price,
                duration,
                status
             FROM services
             WHERE id IN (${placeholders})
             ORDER BY id ASC`,
            serviceIds
        );

        if (selectedServices.length !== serviceIds.length) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "One or more selected services could not be found."
            });
        }

        // VERIFY SERVICE AVAILABILITY
        const unavailableServices = selectedServices.filter(
            service => service.status !== "available"
        );

        if (unavailableServices.length > 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: `The following service(s) are currently unavailable: ${unavailableServices
                    .map(service => service.name)
                    .join(", ")}.`
            });
        }

        // RESTORE THE FRONTEND SELECTION ORDER
        const orderedServices = serviceIds.map(
            serviceId =>
                selectedServices.find(
                    service => Number(service.id) === serviceId
                )
        );

        // FIRST SERVICE IS THE PRIMARY SERVICE
        const primaryService = orderedServices[0];
        const primaryServiceId = Number(primaryService.id);

        // CALCULATE TOTAL AND DURATION
        let totalAmount = 0;
        let totalDuration = 0;

        orderedServices.forEach(service => {
            totalAmount += Number(service.price);
            totalDuration += Number(service.duration || 0);
        });

        totalAmount = Number(totalAmount.toFixed(2));

        // CHECK SCHEDULE COLLISION
        const [existingReservations] = await connection.query(
            `SELECT
                id,
                status
             FROM reservations
             WHERE reservation_date = ?
             AND reservation_time = ?
             AND status IN
                (
                    'Pending',
                    'Confirmed',
                    'In Service'
                )
             LIMIT 1`,
            [reservationDate, normalizedTime]
        );

        if (existingReservations.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "The selected date and time is already reserved. Please choose another schedule."
            });
        }

        // CREATE MAIN RESERVATION
        const [reservationResult] = await connection.query(
            `INSERT INTO reservations
            (
                user_id,
                service_id,
                motorcycle_id,
                reservation_date,
                reservation_time,
                notes,
                status
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'Pending'
            )`,
            [
                userId,
                primaryServiceId,
                motorcycleId,
                reservationDate,
                normalizedTime,
                notes || null
            ]
        );

        const reservationId = reservationResult.insertId;

        // CREATE RESERVATION SERVICE ROWS
        for (const service of orderedServices) {
            await connection.query(
                `INSERT INTO reservation_services
                (
                    reservation_id,
                    service_id,
                    price
                )
                VALUES
                (
                    ?,
                    ?,
                    ?
                )`,
                [
                    reservationId,
                    service.id,
                    service.price
                ]
            );
        }

        // COMMIT TRANSACTION
        await connection.commit();

        // RESPONSE
        res.status(201).json({
            success: true,
            message: "Reservation created successfully!",
            reservation: {
                id: reservationId,
                appointment_number: `ADD-${String(reservationId).padStart(6, "0")}`,
                user_id: userId,
                customer_name: user.name,
                service_id: primaryServiceId,
                service_ids: orderedServices.map(
                    service => Number(service.id)
                ),
                services: orderedServices.map(service => ({
                    id: Number(service.id),
                    name: service.name,
                    price: Number(service.price),
                    duration: Number(service.duration || 0)
                })),
                total: totalAmount,
                total_duration: totalDuration,
                motorcycle_id: motorcycleId,
                reservation_date: reservationDate,
                reservation_time: normalizedTime,
                notes: notes || null,
                status: "Pending"
            }
        });

    } catch (error) {
        console.error("Create reservation error:", error);

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Reservation rollback error:", rollbackError);
            }
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "One or more selected services are already attached to this reservation."
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to create reservation.",
            error: error.message
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});


/* =========================================
   GET CUSTOMER RESERVATIONS
   RETURNS ALL SERVICES
========================================= */

router.get("/reservations/user/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        // GET RESERVATION BASE INFORMATION
        const [reservations] = await db.query(
            `SELECT
                r.id,
                r.user_id,
                r.service_id,

                s.name AS service_name,
                s.description AS service_description,
                s.price AS service_price,
                s.duration,

                r.motorcycle_id,

                cm.brand,
                cm.model,
                cm.year,
                cm.engine_cc,
                cm.plate_number,
                cm.color,

                r.reservation_date,
                r.reservation_time,
                r.notes,
                r.status,
                r.created_at

             FROM reservations r

             INNER JOIN services s
                ON r.service_id = s.id

             LEFT JOIN customer_motorcycles cm
                ON r.motorcycle_id = cm.id

             WHERE r.user_id = ?

             ORDER BY
                r.reservation_date DESC,
                r.reservation_time DESC,
                r.id DESC`,
            [userId]
        );

        if (reservations.length === 0) {
            return res.json({
                success: true,
                count: 0,
                reservations: []
            });
        }

        // GET ALL RESERVATION SERVICES
        const reservationIds = reservations.map(
            reservation => reservation.id
        );

        const reservationPlaceholders = reservationIds
            .map(() => "?")
            .join(",");

        const [reservationServices] = await db.query(
            `SELECT
                rs.id,
                rs.reservation_id,
                rs.service_id,
                rs.price,

                s.name,
                s.description,
                s.duration

             FROM reservation_services rs

             INNER JOIN services s
                ON rs.service_id = s.id

             WHERE rs.reservation_id
                IN (${reservationPlaceholders})

             ORDER BY
                rs.reservation_id ASC,
                rs.id ASC`,
            reservationIds
        );

        // GROUP SERVICES BY RESERVATION
        const servicesByReservation = {};

        reservationServices.forEach(service => {
            if (!servicesByReservation[service.reservation_id]) {
                servicesByReservation[service.reservation_id] = [];
            }

            servicesByReservation[service.reservation_id].push({
                id: Number(service.service_id),
                name: service.name,
                description: service.description,
                price: Number(service.price),
                duration: Number(service.duration || 0)
            });
        });

        // BUILD FINAL RESPONSE
        const finalReservations = reservations.map(reservation => {
            let services =
                servicesByReservation[reservation.id] || [];

            // BACKWARD COMPATIBILITY FOR OLDER RESERVATIONS
            if (services.length === 0) {
                services = [{
                    id: Number(reservation.service_id),
                    name: reservation.service_name,
                    description: reservation.service_description,
                    price: Number(reservation.service_price),
                    duration: Number(reservation.duration || 0)
                }];
            }

            const total = services.reduce(
                (sum, service) => sum + Number(service.price),
                0
            );

            const totalDuration = services.reduce(
                (sum, service) =>
                    sum + Number(service.duration || 0),
                0
            );

            return {
                ...reservation,

                appointment_number: `ADD-${String(reservation.id).padStart(6, "0")}`,

                service_ids: services.map(
                    service => Number(service.id)
                ),

                services,

                total: Number(total.toFixed(2)),
                total_duration: totalDuration,

                service_price: Number(reservation.service_price),
                duration: Number(reservation.duration || 0)
            };
        });

        res.json({
            success: true,
            count: finalReservations.length,
            reservations: finalReservations
        });

    } catch (error) {
        console.error("Get reservations error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve reservations.",
            error: error.message
        });
    }
});


/* =========================================
   GET SINGLE RESERVATION
   RETURNS ALL SERVICES
========================================= */

router.get("/reservations/:id", async (req, res) => {
    try {
        const reservationId = Number(req.params.id);

        if (!reservationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation ID."
            });
        }

        // GET MAIN RESERVATION
        const [reservations] = await db.query(
            `SELECT
                r.id,
                r.user_id,

                u.name AS customer_name,
                u.email,
                u.phone,
                u.address,

                r.service_id,

                s.name AS service_name,
                s.description AS service_description,
                s.price AS service_price,
                s.duration,

                r.motorcycle_id,

                cm.brand,
                cm.model,
                cm.year,
                cm.engine_cc,
                cm.plate_number,
                cm.color,

                r.reservation_date,
                r.reservation_time,
                r.notes,
                r.status,
                r.created_at

             FROM reservations r

             INNER JOIN users u
                ON r.user_id = u.id

             INNER JOIN services s
                ON r.service_id = s.id

             LEFT JOIN customer_motorcycles cm
                ON r.motorcycle_id = cm.id

             WHERE r.id = ?

             LIMIT 1`,
            [reservationId]
        );

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found."
            });
        }

        const reservation = reservations[0];

        // GET ALL SERVICES
        const [reservationServices] = await db.query(
            `SELECT
                rs.id,
                rs.reservation_id,
                rs.service_id,
                rs.price,

                s.name,
                s.description,
                s.duration

             FROM reservation_services rs

             INNER JOIN services s
                ON rs.service_id = s.id

             WHERE rs.reservation_id = ?

             ORDER BY rs.id ASC`,
            [reservationId]
        );

        let services = reservationServices.map(service => ({
            id: Number(service.service_id),
            name: service.name,
            description: service.description,
            price: Number(service.price),
            duration: Number(service.duration || 0)
        }));

        // BACKWARD COMPATIBILITY FOR OLDER RESERVATIONS
        if (services.length === 0) {
            services = [{
                id: Number(reservation.service_id),
                name: reservation.service_name,
                description: reservation.service_description,
                price: Number(reservation.service_price),
                duration: Number(reservation.duration || 0)
            }];
        }

        const total = services.reduce(
            (sum, service) => sum + Number(service.price),
            0
        );

        const totalDuration = services.reduce(
            (sum, service) =>
                sum + Number(service.duration || 0),
            0
        );

        res.json({
            success: true,
            reservation: {
                ...reservation,

                appointment_number: `ADD-${String(reservation.id).padStart(6, "0")}`,

                service_ids: services.map(
                    service => Number(service.id)
                ),

                services,

                total: Number(total.toFixed(2)),
                total_duration: totalDuration
            }
        });

    } catch (error) {
        console.error("Get reservation error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve reservation.",
            error: error.message
        });
    }
});


/* =========================================
   CANCEL RESERVATION
========================================= */

router.post("/reservations/:id/cancel", async (req, res) => {
    try {
        const reservationId = Number(req.params.id);

        if (!reservationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation ID."
            });
        }

        const [reservations] = await db.query(
            `SELECT
                id,
                status
             FROM reservations
             WHERE id = ?
             LIMIT 1`,
            [reservationId]
        );

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found."
            });
        }

        if (reservations[0].status === "Completed") {
            return res.status(400).json({
                success: false,
                message: "A completed reservation cannot be cancelled."
            });
        }

        if (reservations[0].status === "Cancelled") {
            return res.status(400).json({
                success: false,
                message: "This reservation is already cancelled."
            });
        }

        await db.query(
            `UPDATE reservations
             SET status = 'Cancelled'
             WHERE id = ?`,
            [reservationId]
        );

        res.json({
            success: true,
            message: "Reservation cancelled successfully."
        });

    } catch (error) {
        console.error("Cancel reservation error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to cancel reservation.",
            error: error.message
        });
    }
});

module.exports = router;
