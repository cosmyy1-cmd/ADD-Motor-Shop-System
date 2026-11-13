/* =========================================================
   ADD MOTOR SHOP - CUSTOMER DASHBOARD
   ========================================================= */


/* =========================================================
   GET LOGGED-IN USER
========================================================= */

const storedUser =
    localStorage.getItem("addMotorUser");


let currentUser = null;


if (!storedUser) {

    window.location.href =
        "login.html";

} else {

    try {

        currentUser =
            JSON.parse(storedUser);

    } catch (error) {

        console.error(
            "Invalid user data in localStorage."
        );

        localStorage.removeItem(
            "addMotorUser"
        );

        localStorage.removeItem(
            "user"
        );

        localStorage.removeItem(
            "userId"
        );

        window.location.href =
            "login.html";
    }

}


/* =========================================================
   USER ID
========================================================= */

const userId =
    currentUser?.id ??
    currentUser?.user_id ??
    currentUser?.userId;


/* =========================================================
   API BASE
========================================================= */

const API_BASE =
    "/api";


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (!userId) {

            console.error(
                "No logged-in user ID found."
            );

            showDashboardError();

            return;
        }


        updateWelcomeMessage();

        loadDashboard();

        setupLogout();

    }
);


/* =========================================================
   WELCOME MESSAGE
========================================================= */

function updateWelcomeMessage() {

    const welcomeName =
        document.querySelector(
            ".welcome h1 span"
        );


    if (!welcomeName) {
        return;
    }


    const name =
        currentUser?.name ||
        "Customer";


    welcomeName.textContent =
        `${name}!`;

}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        await Promise.all([
            loadReservations(),
            loadMotorcycles()
        ]);

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }

}


/* =========================================================
   LOAD RESERVATIONS
========================================================= */

async function loadReservations() {

    const appointmentsList =
        document.getElementById(
            "appointments-list"
        );


    const historyList =
        document.getElementById(
            "history-list"
        );


    try {

        const response =
            await fetch(
                `${API_BASE}/reservations/user/${userId}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Reservation API response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Failed to load reservations."
            );

        }


        const reservations =
            Array.isArray(
                data.reservations
            )
                ? data.reservations
                : [];


        updateAppointmentStat(
            reservations
        );


        updateCompletedServiceStat(
            reservations
        );


        updateTotalSpentStat(
            reservations
        );


        updateUpcomingAppointments(
            reservations
        );


        updateServiceHistory(
            reservations
        );

    } catch (error) {

        console.error(
            "Error loading reservations:",
            error
        );


        if (appointmentsList) {

            appointmentsList.innerHTML = `

                <div class="error-state">

                    ⚠️

                    <span>
                        Unable to load appointments.
                    </span>

                </div>

            `;

        }


        if (historyList) {

            historyList.innerHTML = `

                <div class="error-state">

                    ⚠️

                    <span>
                        Unable to load service history.
                    </span>

                </div>

            `;

        }

    }

}


/* =========================================================
   APPOINTMENTS STAT
========================================================= */

function updateAppointmentStat(
    reservations
) {

    const element =
        document.getElementById(
            "appointments-count"
        );


    if (!element) {
        return;
    }


    const upcoming =
        getUpcomingReservations(
            reservations
        );


    element.textContent =
        upcoming.length;

}


/* =========================================================
   COMPLETED SERVICE STAT
========================================================= */

function updateCompletedServiceStat(
    reservations
) {

    const element =
        document.getElementById(
            "completed-services-count"
        );


    if (!element) {
        return;
    }


    const completed =
        reservations.filter(
            reservation =>
                reservation.status ===
                "Completed"
        );


    let completedServiceCount = 0;


    completed.forEach(
        reservation => {

            if (
                Array.isArray(
                    reservation.services
                ) &&
                reservation.services.length > 0
            ) {

                completedServiceCount +=
                    reservation.services.length;

            } else {

                completedServiceCount++;

            }

        }
    );


    element.textContent =
        completedServiceCount;

}


/* =========================================================
   TOTAL SPENT STAT
========================================================= */

function updateTotalSpentStat(
    reservations
) {

    const element =
        document.getElementById(
            "total-spent"
        );


    if (!element) {
        return;
    }


    const completed =
        reservations.filter(
            reservation =>
                reservation.status ===
                "Completed"
        );


    const totalSpent =
        completed.reduce(
            (total, reservation) => {

                /*
                   Use backend total first.

                   This is important because one
                   reservation can contain multiple
                   services.
                */

                if (
                    reservation.total !==
                    undefined &&
                    reservation.total !==
                    null
                ) {

                    return total +
                        Number(
                            reservation.total
                        );

                }


                if (
                    reservation.estimated_total !==
                    undefined &&
                    reservation.estimated_total !==
                    null
                ) {

                    return total +
                        Number(
                            reservation.estimated_total
                        );

                }


                /*
                   Fallback for older reservations.
                */

                if (
                    Array.isArray(
                        reservation.services
                    ) &&
                    reservation.services.length > 0
                ) {

                    const serviceTotal =
                        reservation.services.reduce(
                            (
                                serviceSum,
                                service
                            ) => {

                                return serviceSum +
                                    (
                                        Number(
                                            service.price
                                        ) || 0
                                    );

                            },
                            0
                        );


                    return total +
                        serviceTotal;

                }


                return total +
                    (
                        Number(
                            reservation.service_price
                        ) || 0
                    );

            },
            0
        );


    element.textContent =
        formatCurrency(
            totalSpent
        );

}


/* =========================================================
   GET UPCOMING RESERVATIONS
========================================================= */

function getUpcomingReservations(
    reservations
) {

    const now =
        new Date();


    return reservations

        .filter(
            reservation => {

                if (
                    reservation.status ===
                    "Cancelled"
                ) {

                    return false;

                }


                if (
                    reservation.status ===
                    "Completed"
                ) {

                    return false;

                }


                if (
                    !reservation.reservation_date ||
                    !reservation.reservation_time
                ) {

                    return false;

                }


                const appointmentDate =
                    createDateTime(
                        reservation.reservation_date,
                        reservation.reservation_time
                    );


                return appointmentDate >= now;

            }
        )

        .sort(
            (a, b) => {

                const dateA =
                    createDateTime(
                        a.reservation_date,
                        a.reservation_time
                    );


                const dateB =
                    createDateTime(
                        b.reservation_date,
                        b.reservation_time
                    );


                return dateA - dateB;

            }
        );

}


/* =========================================================
   UPDATE UPCOMING APPOINTMENTS
========================================================= */

function updateUpcomingAppointments(
    reservations
) {

    const container =
        document.getElementById(
            "appointments-list"
        );


    if (!container) {
        return;
    }


    const upcoming =
        getUpcomingReservations(
            reservations
        );


    container.innerHTML = "";


    if (upcoming.length === 0) {

        container.innerHTML = `

            <div class="appointment">

                <div class="empty-state">

                    📅

                    <span>
                        No upcoming appointments.
                    </span>

                </div>

            </div>

        `;

        return;
    }


    upcoming
        .slice(0, 2)
        .forEach(
            reservation => {

                const card =
                    createAppointmentCard(
                        reservation
                    );


                container.appendChild(
                    card
                );

            }
        );

}


/* =========================================================
   CREATE APPOINTMENT CARD
========================================================= */

function createAppointmentCard(
    reservation
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "appointment";


    const reservationDate =
        String(
            reservation.reservation_date ||
            ""
        )
            .split("T")[0];


    const appointmentYear =
        reservationDate
            ? reservationDate.substring(
                0,
                4
            )
            : new Date()
                .getFullYear();


    const appointmentNumber =
        `#APP-${appointmentYear}-${String(
            reservation.id
        ).padStart(3, "0")}`;


    const motorcycleName =
        getMotorcycleName(
            reservation
        );


    const statusClass =
        getStatusClass(
            reservation.status
        );


    const formattedDate =
        formatDate(
            reservation.reservation_date
        );


    const formattedTime =
        formatTime(
            reservation.reservation_time
        );


    const services =
        getReservationServices(
            reservation
        );


    const serviceName =
        reservation.service_name ||
        (
            services.length > 0
                ? services[0].name
                : "Motorcycle Service"
        );


    const serviceTags =
        services
            .map(
                service => `

                    <span class="service-tag">

                        ${escapeHTML(
                            service.name ||
                            "Service"
                        )}

                    </span>

                `
            )
            .join("");


    const total =
        getReservationTotal(
            reservation
        );


    card.innerHTML = `

        <div class="appointment-top">

            <div>

                <div class="appointment-title">

                    ${escapeHTML(
                        serviceName
                    )}

                    ${
                        services.length > 1
                            ? ` + ${
                                services.length - 1
                            } more`
                            : ""
                    }

                </div>


                <div class="appointment-number">

                    ${appointmentNumber}

                </div>

            </div>


            <span
                class="status ${statusClass}"
            >

                ${escapeHTML(
                    reservation.status ||
                    "Pending"
                )}

            </span>

        </div>


        <div class="appointment-details">


            <div>

                <div class="detail-label">
                    Motorcycle
                </div>

                <div class="detail-value">

                    ${escapeHTML(
                        motorcycleName
                    )}

                </div>

            </div>


            <div>

                <div class="detail-label">
                    Date
                </div>

                <div class="detail-value">

                    ${formattedDate}

                </div>

            </div>


            <div>

                <div class="detail-label">
                    Time
                </div>

                <div class="detail-value">

                    ${formattedTime}

                </div>

            </div>


        </div>


        ${
            services.length > 0
                ? `

                    <div
                        class="appointment-services"
                    >

                        <div
                            class="appointment-services-label"
                        >
                            Services
                        </div>


                        <div
                            class="appointment-services-list"
                        >

                            ${serviceTags}

                        </div>

                    </div>

                `
                : ""
        }


        ${
            total > 0
                ? `

                    <div
                        class="appointment-total"
                    >

                        Estimated Total:
                        ${formatCurrency(total)}

                    </div>

                `
                : ""
        }

    `;


    return card;

}


/* =========================================================
   GET RESERVATION SERVICES
========================================================= */

function getReservationServices(
    reservation
) {

    if (
        Array.isArray(
            reservation.services
        )
    ) {

        return reservation.services;

    }


    if (
        reservation.service_name
    ) {

        return [

            {

                id:
                    reservation.service_id,

                name:
                    reservation.service_name,

                price:
                    reservation.service_price,

                duration:
                    reservation.duration

            }

        ];

    }


    return [];

}


/* =========================================================
   GET RESERVATION TOTAL
========================================================= */

function getReservationTotal(
    reservation
) {

    if (
        reservation.total !==
        undefined &&
        reservation.total !==
        null
    ) {

        return Number(
            reservation.total
        ) || 0;

    }


    if (
        reservation.estimated_total !==
        undefined &&
        reservation.estimated_total !==
        null
    ) {

        return Number(
            reservation.estimated_total
        ) || 0;

    }


    const services =
        getReservationServices(
            reservation
        );


    if (services.length > 0) {

        return services.reduce(
            (
                total,
                service
            ) => {

                return total +
                    (
                        Number(
                            service.price
                        ) || 0
                    );

            },
            0
        );

    }


    return Number(
        reservation.service_price
    ) || 0;

}


/* =========================================================
   LOAD MOTORCYCLES
========================================================= */

async function loadMotorcycles() {

    const motorcycleList =
        document.getElementById(
            "motorcycle-list"
        );


    try {

        const response =
            await fetch(
                `${API_BASE}/customer-motorcycles/${userId}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Motorcycle API response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Failed to load motorcycles."
            );

        }


        const motorcycles =
            Array.isArray(
                data.motorcycles
            )
                ? data.motorcycles
                : [];


        updateMotorcycleStat(
            motorcycles
        );


        updateMotorcycleList(
            motorcycles
        );

    } catch (error) {

        console.error(
            "Error loading motorcycles:",
            error
        );


        if (motorcycleList) {

            motorcycleList.innerHTML = `

                <div class="error-state">

                    ⚠️

                    <span>
                        Unable to load motorcycles.
                    </span>

                </div>


                <a
                    href="motorcycles.html"
                    class="manage-link"
                >
                    + Add another motorcycle
                </a>

            `;

        }

    }

}


/* =========================================================
   MOTORCYCLE STAT
========================================================= */

function updateMotorcycleStat(
    motorcycles
) {

    const element =
        document.getElementById(
            "motorcycles-count"
        );


    if (!element) {
        return;
    }


    element.textContent =
        motorcycles.length;

}


/* =========================================================
   UPDATE MOTORCYCLE LIST
========================================================= */

function updateMotorcycleList(
    motorcycles
) {

    const motorcycleBox =
        document.getElementById(
            "motorcycle-list"
        );


    if (!motorcycleBox) {
        return;
    }


    motorcycleBox.innerHTML = "";


    if (motorcycles.length === 0) {

        motorcycleBox.innerHTML = `

            <div class="empty-state">

                🏍️

                <span>
                    No motorcycles registered yet.
                </span>

            </div>


            <a
                href="motorcycles.html"
                class="manage-link"
            >
                + Add another motorcycle
            </a>

        `;

        return;
    }


    /*
       Show up to 3 motorcycles
    */

    motorcycles
        .slice(0, 3)
        .forEach(
            motorcycle => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "motorcycle";


                const name =
                    `${motorcycle.brand || ""} ${
                        motorcycle.model || ""
                    }`.trim();


                const plate =
                    motorcycle.plate_number
                        ? `Plate: ${motorcycle.plate_number}`
                        : "No plate number";


                card.innerHTML = `

                    <div class="motorcycle-icon">
                        🏍️
                    </div>


                    <div class="motorcycle-info">

                        <div class="motorcycle-name">

                            ${escapeHTML(
                                name ||
                                "Unnamed Motorcycle"
                            )}

                        </div>


                        <div class="motorcycle-plate">

                            ${escapeHTML(
                                plate
                            )}

                        </div>

                    </div>

                `;


                motorcycleBox.appendChild(
                    card
                );

            }
        );


    const manageLink =
        document.createElement(
            "a"
        );


    manageLink.href =
        "motorcycles.html";


    manageLink.className =
        "manage-link";


    manageLink.textContent =
        "+ Add another motorcycle";


    motorcycleBox.appendChild(
        manageLink
    );

}


/* =========================================================
   UPDATE SERVICE HISTORY
========================================================= */

function updateServiceHistory(
    reservations
) {

    const historyList =
        document.getElementById(
            "history-list"
        );


    if (!historyList) {
        return;
    }


    const completed =
        reservations

            .filter(
                reservation =>
                    reservation.status ===
                    "Completed"
            )

            .sort(
                (a, b) => {

                    const dateA =
                        createDateTime(
                            a.reservation_date,
                            a.reservation_time
                        );


                    const dateB =
                        createDateTime(
                            b.reservation_date,
                            b.reservation_time
                        );


                    return dateB - dateA;

                }
            );


    historyList.innerHTML = "";


    if (completed.length === 0) {

        historyList.innerHTML = `

            <div class="empty-state">

                🔧

                <span>
                    No completed services yet.
                </span>

            </div>

        `;

        return;
    }


    /*
       Show maximum of 3 recent
       completed appointments.
    */

    completed
        .slice(0, 3)
        .forEach(
            reservation => {

                const items =
                    createHistoryItems(
                        reservation
                    );


                items.forEach(
                    item => {

                        historyList.appendChild(
                            item
                        );

                    }
                );

            }
        );

}


/* =========================================================
   CREATE SERVICE HISTORY ITEMS
========================================================= */

function createHistoryItems(
    reservation
) {

    const services =
        getReservationServices(
            reservation
        );


    const motorcycleName =
        getMotorcycleName(
            reservation
        );


    const serviceDate =
        formatDate(
            reservation.reservation_date
        );


    /*
       If multiple services exist,
       create one history row for
       each service.
    */

    if (services.length > 0) {

        return services.map(
            service => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "history-item";


                const price =
                    Number(
                        service.price
                    ) || 0;


                item.innerHTML = `

                    <div class="history-info">

                        <h3>

                            ${escapeHTML(
                                service.name ||
                                "Motorcycle Service"
                            )}

                        </h3>


                        <p>

                            ${escapeHTML(
                                motorcycleName
                            )}

                            •

                            ${serviceDate}

                        </p>

                    </div>


                    <div class="history-price">

                        ${formatCurrency(
                            price
                        )}

                    </div>

                `;


                return item;

            }
        );

    }


    /*
       Fallback for old reservations.
    */

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "history-item";


    item.innerHTML = `

        <div class="history-info">

            <h3>

                ${escapeHTML(
                    reservation.service_name ||
                    "Motorcycle Service"
                )}

            </h3>


            <p>

                ${escapeHTML(
                    motorcycleName
                )}

                •

                ${serviceDate}

            </p>

        </div>


        <div class="history-price">

            ${formatCurrency(
                Number(
                    reservation.service_price
                ) || 0
            )}

        </div>

    `;


    return [item];

}


/* =========================================================
   MOTORCYCLE NAME
========================================================= */

function getMotorcycleName(
    reservation
) {

    const brand =
        reservation.brand ||
        reservation.motorcycle_brand ||
        "";


    const model =
        reservation.model ||
        reservation.motorcycle_model ||
        "";


    const name =
        `${brand} ${model}`.trim();


    return name ||
        "Motorcycle not specified";

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(
    status
) {

    switch (status) {

        case "Confirmed":
            return "confirmed";


        case "Pending":
            return "pending";


        case "In Service":
            return "in-service";


        case "Completed":
            return "completed";


        case "Cancelled":
            return "cancelled";


        default:
            return "pending";

    }

}


/* =========================================================
   CREATE DATE + TIME
========================================================= */

function createDateTime(
    dateString,
    timeString
) {

    if (!dateString) {

        return new Date(0);

    }


    const date =
        String(dateString)
            .split("T")[0];


    let time =
        timeString
            ? String(
                timeString
            ).substring(
                0,
                8
            )
            : "00:00:00";


    /*
       Handle AM/PM values if the API
       returns them.
    */

    if (
        /AM|PM/i.test(
            time
        )
    ) {

        const parsed =
            parseTimeTo24Hour(
                time
            );

        time =
            parsed;

    }


    return new Date(
        `${date}T${time}`
    );

}


/* =========================================================
   PARSE TIME TO 24-HOUR
========================================================= */

function parseTimeTo24Hour(
    timeString
) {

    const value =
        String(
            timeString
        )
            .trim()
            .toUpperCase();


    const match =
        value.match(
            /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
        );


    if (!match) {

        return "00:00:00";

    }


    let hours =
        parseInt(
            match[1],
            10
        );


    const minutes =
        match[2];


    const period =
        match[3];


    if (
        period === "PM" &&
        hours !== 12
    ) {

        hours += 12;

    }


    if (
        period === "AM" &&
        hours === 12
    ) {

        hours = 0;

    }


    return `${String(
        hours
    ).padStart(
        2,
        "0"
    )}:${minutes}:00`;

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    dateString
) {

    if (!dateString) {

        return "Unknown date";

    }


    const date =
        new Date(
            `${String(
                dateString
            ).split("T")[0]}T00:00:00`
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "Unknown date";

    }


    return date.toLocaleDateString(
        "en-US",
        {
            month:
                "long",

            day:
                "numeric",

            year:
                "numeric"
        }
    );

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    timeString
) {

    if (!timeString) {

        return "Unknown time";

    }


    const value =
        String(
            timeString
        ).trim();


    /*
       Already formatted as AM/PM.
    */

    if (
        /AM|PM/i.test(
            value
        )
    ) {

        return value;

    }


    const parts =
        value.split(":");


    if (
        parts.length < 2
    ) {

        return value;

    }


    let hours =
        parseInt(
            parts[0],
            10
        );


    const minutes =
        parts[1];


    if (
        isNaN(hours)
    ) {

        return value;

    }


    const period =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12 || 12;


    return `${hours}:${minutes} ${period}`;

}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(
    amount
) {

    return `₱${Number(
        amount || 0
    ).toLocaleString(
        "en-PH",
        {
            minimumFractionDigits:
                0,

            maximumFractionDigits:
                2
        }
    )}`;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(
        value
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    localStorage.removeItem(
        "addMotorUser"
    );


    localStorage.removeItem(
        "user"
    );


    localStorage.removeItem(
        "userId"
    );


    localStorage.removeItem(
        "token"
    );


    window.location.href =
        "login.html";

}


/* =========================================================
   SETUP LOGOUT
========================================================= */

function setupLogout() {

    const logoutLink =
        document.querySelector(
            ".nav-links a.logout"
        );


    if (!logoutLink) {
        return;
    }


    logoutLink.addEventListener(
        "click",
        event => {

            event.preventDefault();

            logout();

        }
    );

}


/* =========================================================
   DASHBOARD ERROR
========================================================= */

function showDashboardError() {

    const appointmentsList =
        document.getElementById(
            "appointments-list"
        );


    const historyList =
        document.getElementById(
            "history-list"
        );


    const motorcycleList =
        document.getElementById(
            "motorcycle-list"
        );


    if (appointmentsList) {

        appointmentsList.innerHTML = `

            <div class="error-state">

                ⚠️

                <span>
                    Please log in again.
                </span>

            </div>

        `;

    }


    if (historyList) {

        historyList.innerHTML = `

            <div class="error-state">

                ⚠️

                <span>
                    Please log in again.
                </span>

            </div>

        `;

    }


    if (motorcycleList) {

        motorcycleList.innerHTML = `

            <div class="error-state">

                ⚠️

                <span>
                    Please log in again.
                </span>

            </div>

        `;

    }

}