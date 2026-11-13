/* =========================================================
   ADD MOTOR SHOP
   SERVICE HISTORY
   DATABASE-DRIVEN VERSION
========================================================= */

"use strict";


/* =========================================================
   USER
========================================================= */

let currentUser = null;
let userId = null;


/* =========================================================
   DATA
========================================================= */

let serviceHistory = [];

let filteredHistory = [];


/* =========================================================
   DOM
========================================================= */

const historyContainer =
    document.getElementById("historyContainer");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const motorcycleFilter =
    document.getElementById("motorcycleFilter");

const yearFilter =
    document.getElementById("yearFilter");

const totalServicesElement =
    document.getElementById("totalServices");

const completedAppointmentsElement =
    document.getElementById("completedAppointments");

const totalSpentElement =
    document.getElementById("totalSpent");

const detailsModal =
    document.getElementById("detailsModal");

const modalBody =
    document.getElementById("modalBody");


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeServiceHistory
);


async function initializeServiceHistory() {

    loadCurrentUser();

    if (!userId) {

        window.location.href =
            "login.html";

        return;
    }


    setupLogout();


    await loadServiceHistory();

}


/* =========================================================
   LOAD CURRENT USER
========================================================= */

function loadCurrentUser() {

    try {

        const storedUser =
            localStorage.getItem("user");


        if (storedUser) {

            currentUser =
                JSON.parse(storedUser);

        }


    } catch (error) {

        console.error(
            "Unable to read user:",
            error
        );

        currentUser = null;
    }


    userId =
        currentUser?.id ||
        currentUser?.user_id ||
        currentUser?.userId ||
        localStorage.getItem("userId");


    if (userId) {

        userId =
            Number(userId);

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

    const logoutButton =
        document.querySelector(
            ".logout-btn"
        );


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            localStorage.removeItem(
                "user"
            );

            localStorage.removeItem(
                "userId"
            );

            localStorage.removeItem(
                "addMotorUser"
            );

            localStorage.removeItem(
                "token"
            );


            window.location.href =
                "login.html";

        }
    );

}


/* =========================================================
   LOAD SERVICE HISTORY FROM DATABASE
========================================================= */

async function loadServiceHistory() {

    try {

        showLoadingState();


        const response =
            await fetch(
                `/api/reservations/user/${userId}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data?.message ||
                "Unable to load service history."
            );

        }


        const reservations =
            Array.isArray(
                data.reservations
            )
                ? data.reservations
                : [];


        /*
         * Service History should only contain
         * completed reservations.
         */
        serviceHistory =
            reservations.filter(
                reservation =>
                    String(
                        reservation.status || ""
                    ).toLowerCase() ===
                    "completed"
            );


        filteredHistory =
            [...serviceHistory];


        updateSummary();

        populateMotorcycleFilter();

        populateYearFilter();

        renderServiceHistory();


    } catch (error) {

        console.error(
            "Service history error:",
            error
        );


        serviceHistory = [];

        filteredHistory = [];


        updateSummary();

        populateMotorcycleFilter();

        populateYearFilter();


        if (historyContainer) {

            historyContainer.innerHTML = "";

        }


        if (emptyState) {

            emptyState.style.display =
                "block";


            const title =
                emptyState.querySelector(
                    "h3"
                );

            const message =
                emptyState.querySelector(
                    "p"
                );


            if (title) {

                title.textContent =
                    "Unable to Load Service History";

            }


            if (message) {

                message.textContent =
                    "We could not retrieve your service history. Please try again.";

            }

        }

    }

}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoadingState() {

    if (!historyContainer) {
        return;
    }


    historyContainer.innerHTML = `

        <div
            class="history-loading"
            style="
                text-align:center;
                padding:40px 20px;
                color:var(--text-muted,#a3a3a3);
            "
        >

            Loading your service history...

        </div>

    `;


    if (emptyState) {

        emptyState.style.display =
            "none";

    }

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    /*
     * Total Services =
     * number of individual services performed
     * across completed reservations.
     */

    const totalServices =
        serviceHistory.reduce(
            function (total, reservation) {

                const services =
                    Array.isArray(
                        reservation.services
                    )
                        ? reservation.services
                        : [];


                return total +
                    services.length;

            },
            0
        );


    const completedAppointments =
        serviceHistory.length;


    const totalSpent =
        serviceHistory.reduce(
            function (total, reservation) {

                return total +
                    Number(
                        reservation.total || 0
                    );

            },
            0
        );


    if (totalServicesElement) {

        totalServicesElement.textContent =
            totalServices;

    }


    if (completedAppointmentsElement) {

        completedAppointmentsElement.textContent =
            completedAppointments;

    }


    if (totalSpentElement) {

        totalSpentElement.textContent =
            formatCurrency(
                totalSpent
            );

    }

}


/* =========================================================
   MOTORCYCLE FILTER
========================================================= */

function populateMotorcycleFilter() {

    if (!motorcycleFilter) {
        return;
    }


    const motorcycles =
        new Set();


    serviceHistory.forEach(
        function (reservation) {

            const motorcycle =
                getMotorcycleName(
                    reservation
                );


            if (motorcycle !== "Not recorded") {

                motorcycles.add(
                    motorcycle
                );

            }

        }
    );


    motorcycleFilter.innerHTML = `

        <option value="all">
            All Motorcycles
        </option>

    `;


    Array.from(motorcycles)
        .sort()
        .forEach(
            function (motorcycle) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    motorcycle;


                option.textContent =
                    motorcycle;


                motorcycleFilter.appendChild(
                    option
                );

            }
        );

}


/* =========================================================
   YEAR FILTER
========================================================= */

function populateYearFilter() {

    if (!yearFilter) {
        return;
    }


    const years =
        new Set();


    serviceHistory.forEach(
        function (reservation) {

            const year =
                getReservationYear(
                    reservation
                );


            if (year) {

                years.add(
                    year
                );

            }

        }
    );


    yearFilter.innerHTML = `

        <option value="all">
            All Years
        </option>

    `;


    Array.from(years)
        .sort(
            function (a, b) {

                return b - a;

            }
        )
        .forEach(
            function (year) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    year;


                option.textContent =
                    year;


                yearFilter.appendChild(
                    option
                );

            }
        );

}


/* =========================================================
   RENDER SERVICE HISTORY
========================================================= */

function renderServiceHistory() {

    if (!historyContainer) {
        return;
    }


    historyContainer.innerHTML = "";


    if (
        filteredHistory.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";


            const title =
                emptyState.querySelector(
                    "h3"
                );

            const message =
                emptyState.querySelector(
                    "p"
                );


            if (title) {

                title.textContent =
                    "No Completed Services Found";

            }


            if (message) {

                message.textContent =
                    "Your completed service appointments will appear here.";

            }

        }


        return;
    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    filteredHistory.forEach(
        function (reservation) {

            historyContainer.appendChild(
                createHistoryCard(
                    reservation
                )
            );

        }
    );

}


/* =========================================================
   CREATE HISTORY CARD
========================================================= */

function createHistoryCard(
    reservation
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "history-card";


    const motorcycle =
        getMotorcycleName(
            reservation
        );


    const year =
        getReservationYear(
            reservation
        );


    const appointmentNumber =
        reservation.appointment_number ||
        generateAppointmentNumber(
            reservation.id
        );


    const serviceDate =
        formatDate(
            reservation.reservation_date
        );


    const duration =
        formatDuration(
            reservation.total_duration
        );


    const services =
        Array.isArray(
            reservation.services
        )
            ? reservation.services
            : [];


    const total =
        Number(
            reservation.total || 0
        );


    const searchText =
        buildSearchText(
            reservation,
            motorcycle,
            appointmentNumber,
            services
        );


    card.dataset.motorcycle =
        motorcycle;


    card.dataset.year =
        year || "";


    card.dataset.search =
        searchText;


    const serviceTags =
        services.length > 0
            ? services
                .map(
                    function (service) {

                        return `

                            <span class="service-tag">

                                ${escapeHTML(
                                    service.name ||
                                    "Service"
                                )}

                            </span>

                        `;

                    }
                )
                .join("")
            : `

                <span class="service-tag">

                    No service details

                </span>

            `;


    card.innerHTML = `

        <div class="history-top">

            <div class="appointment-info">

                <h3>

                    ${escapeHTML(
                        motorcycle
                    )}

                </h3>


                <div class="appointment-id">

                    Appointment #
                    ${escapeHTML(
                        appointmentNumber
                    )}

                </div>

            </div>


            <span class="status completed">

                Completed

            </span>

        </div>


        <div class="history-body">

            <div class="info-item">

                <span class="info-label">

                    Service Date

                </span>


                <span class="info-value">

                    ${escapeHTML(
                        serviceDate
                    )}

                </span>

            </div>


            <div class="info-item">

                <span class="info-label">

                    Mechanic

                </span>


                <span class="info-value">

                    Not recorded

                </span>

            </div>


            <div class="info-item">

                <span class="info-label">

                    Service Duration

                </span>


                <span class="info-value">

                    ${escapeHTML(
                        duration
                    )}

                </span>

            </div>


            <div class="info-item">

                <span class="info-label">

                    Payment

                </span>


                <span class="info-value">

                    Not recorded

                </span>

            </div>

        </div>


        <div class="services-section">

            <div class="services-title">

                Services Performed

            </div>


            <div class="service-list">

                ${serviceTags}

            </div>

        </div>


        <div class="history-footer">

            <div>

                <span class="total-label">

                    Total Cost:

                </span>


                <span class="total-price">

                    ${formatCurrency(
                        total
                    )}

                </span>

            </div>


            <button
                class="view-btn"
                type="button"
            >

                View Details

            </button>

        </div>

    `;


    const viewButton =
        card.querySelector(
            ".view-btn"
        );


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            function () {

                viewDetails(
                    reservation
                );

            }
        );

    }


    return card;

}


/* =========================================================
   BUILD SEARCH TEXT
========================================================= */

function buildSearchText(
    reservation,
    motorcycle,
    appointmentNumber,
    services
) {

    const serviceNames =
        services
            .map(
                function (service) {

                    return service.name || "";

                }
            )
            .join(" ");


    return [

        motorcycle,

        appointmentNumber,

        reservation.reservation_date || "",

        reservation.status || "",

        serviceNames

    ]
        .join(" ")
        .toLowerCase();

}


/* =========================================================
   VIEW DETAILS
========================================================= */

function viewDetails(
    reservation
) {

    if (
        !reservation ||
        !modalBody
    ) {

        return;

    }


    const motorcycle =
        getMotorcycleName(
            reservation
        );


    const appointmentNumber =
        reservation.appointment_number ||
        generateAppointmentNumber(
            reservation.id
        );


    const serviceDate =
        formatDate(
            reservation.reservation_date
        );


    const duration =
        formatDuration(
            reservation.total_duration
        );


    const services =
        Array.isArray(
            reservation.services
        )
            ? reservation.services
            : [];


    const total =
        Number(
            reservation.total || 0
        );


    let servicesHTML = "";


    if (services.length === 0) {

        servicesHTML = `

            <div class="modal-service">

                <span>
                    No service details recorded
                </span>

                <span>
                    —
                </span>

            </div>

        `;

    } else {

        servicesHTML =
            services
                .map(
                    function (service) {

                        return `

                            <div class="modal-service">

                                <span>

                                    ${escapeHTML(
                                        service.name ||
                                        "Service"
                                    )}

                                </span>


                                <span>

                                    ${formatCurrency(
                                        Number(
                                            service.price ||
                                            0
                                        )
                                    )}

                                </span>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    modalBody.innerHTML = `

        <div class="modal-row">

            <span class="modal-label">

                Appointment ID

            </span>


            <span class="modal-value">

                ${escapeHTML(
                    appointmentNumber
                )}

            </span>

        </div>


        <div class="modal-row">

            <span class="modal-label">

                Motorcycle

            </span>


            <span class="modal-value">

                ${escapeHTML(
                    motorcycle
                )}

            </span>

        </div>


        <div class="modal-row">

            <span class="modal-label">

                Service Date

            </span>


            <span class="modal-value">

                ${escapeHTML(
                    serviceDate
                )}

            </span>

        </div>


        <div class="modal-row">

            <span class="modal-label">

                Mechanic

            </span>


            <span class="modal-value">

                Not recorded

            </span>

        </div>


        <div class="modal-row">

            <span class="modal-label">

                Duration

            </span>


            <span class="modal-value">

                ${escapeHTML(
                    duration
                )}

            </span>

        </div>


        <div class="modal-row">

            <span class="modal-label">

                Payment Status

            </span>


            <span class="modal-value">

                Not recorded

            </span>

        </div>


        <div class="modal-services">

            <h4>

                Services Performed

            </h4>


            ${servicesHTML}

        </div>


        <div class="modal-total">

            <span>

                Total Cost

            </span>


            <span>

                ${formatCurrency(
                    total
                )}

            </span>

        </div>

    `;


    if (detailsModal) {

        detailsModal.classList.add(
            "show"
        );

    }

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!detailsModal) {
        return;
    }


    detailsModal.classList.remove(
        "show"
    );

}


/* =========================================================
   SEARCH + FILTER
========================================================= */

function filterHistory() {

    const search =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const motorcycle =
        motorcycleFilter
            ? motorcycleFilter.value
            : "all";


    const year =
        yearFilter
            ? yearFilter.value
            : "all";


    filteredHistory =
        serviceHistory.filter(
            function (reservation) {

                const motorcycleName =
                    getMotorcycleName(
                        reservation
                    );


                const reservationYear =
                    String(
                        getReservationYear(
                            reservation
                        )
                    );


                const appointmentNumber =
                    reservation.appointment_number ||
                    generateAppointmentNumber(
                        reservation.id
                    );


                const services =
                    Array.isArray(
                        reservation.services
                    )
                        ? reservation.services
                        : [];


                const searchText =
                    buildSearchText(
                        reservation,
                        motorcycleName,
                        appointmentNumber,
                        services
                    );


                const matchesSearch =
                    searchText.includes(
                        search
                    );


                const matchesMotorcycle =
                    motorcycle === "all" ||
                    motorcycleName ===
                        motorcycle;


                const matchesYear =
                    year === "all" ||
                    reservationYear ===
                        year;


                return (
                    matchesSearch &&
                    matchesMotorcycle &&
                    matchesYear
                );

            }
        );


    renderServiceHistory();

}


/* =========================================================
   GET MOTORCYCLE NAME
========================================================= */

function getMotorcycleName(
    reservation
) {

    if (
        reservation.motorcycle_brand &&
        reservation.motorcycle_model
    ) {

        return `${reservation.motorcycle_brand} ${reservation.motorcycle_model}`;

    }


    if (
        reservation.brand &&
        reservation.model
    ) {

        return `${reservation.brand} ${reservation.model}`;

    }


    if (
        reservation.motorcycle
    ) {

        return reservation.motorcycle;

    }


    return "Not recorded";

}


/* =========================================================
   GET YEAR
========================================================= */

function getReservationYear(
    reservation
) {

    const motorcycleYear =
        reservation.motorcycle_year ||
        reservation.year;


    if (motorcycleYear) {

        return Number(
            motorcycleYear
        );

    }


    if (
        reservation.reservation_date
    ) {

        const match =
            String(
                reservation.reservation_date
            )
            .match(
                /(\d{4})/
            );


        if (match) {

            return Number(
                match[1]
            );

        }

    }


    return "";

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "Not recorded";

    }


    /*
     * Avoid timezone shifting for
     * YYYY-MM-DD database dates.
     */
    const raw =
        String(
            dateValue
        );


    const dateOnlyMatch =
        raw.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    let date;


    if (dateOnlyMatch) {

        date =
            new Date(
                Number(
                    dateOnlyMatch[1]
                ),
                Number(
                    dateOnlyMatch[2]
                ) - 1,
                Number(
                    dateOnlyMatch[3]
                )
            );

    } else {

        date =
            new Date(
                dateValue
            );

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return raw;

    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );

}


/* =========================================================
   FORMAT DURATION
========================================================= */

function formatDuration(
    minutes
) {

    const totalMinutes =
        Number(
            minutes || 0
        );


    if (
        !Number.isFinite(
            totalMinutes
        ) ||
        totalMinutes <= 0
    ) {

        return "Not recorded";

    }


    const hours =
        Math.floor(
            totalMinutes / 60
        );


    const remainingMinutes =
        totalMinutes % 60;


    const parts = [];


    if (hours > 0) {

        parts.push(
            `${hours} ${
                hours === 1
                    ? "hour"
                    : "hours"
            }`
        );

    }


    if (
        remainingMinutes > 0
    ) {

        parts.push(
            `${remainingMinutes} ${
                remainingMinutes === 1
                    ? "minute"
                    : "minutes"
            }`
        );

    }


    return parts.join(
        " "
    );

}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(
    amount
) {

    const value =
        Number(
            amount || 0
        );


    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(
        value
    );

}


/* =========================================================
   APPOINTMENT NUMBER FALLBACK
========================================================= */

function generateAppointmentNumber(
    id
) {

    if (!id) {

        return "Not recorded";

    }


    return `ADD-${String(
        id
    ).padStart(
        6,
        "0"
    )}`;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value == null
            ? ""
            : String(
                value
            );


    return div.innerHTML;

}


/* =========================================================
   EVENTS
========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        filterHistory
    );

}


if (motorcycleFilter) {

    motorcycleFilter.addEventListener(
        "change",
        filterHistory
    );

}


if (yearFilter) {

    yearFilter.addEventListener(
        "change",
        filterHistory
    );

}


if (detailsModal) {

    detailsModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                detailsModal
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.viewDetails =
    viewDetails;


window.closeModal =
    closeModal;