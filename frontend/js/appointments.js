
/* =========================================
   ADD MOTOR SHOP - REAL APPOINTMENTS
========================================= */

let currentUser = null;

let appointmentGroups = [];

let currentFilter = "all";


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeUser();

        initializeLogout();

        initializeModalEvents();


        if (!currentUser) {

            alert(
                "Please log in first."
            );

            window.location.href =
                "login.html";

            return;

        }


        await loadAppointments();

    }
);


/* =========================================
   USER
========================================= */

function initializeUser() {

    const storedUser =
        localStorage.getItem("user");

    const legacyUser =
        localStorage.getItem(
            "addMotorUser"
        );


    try {

        currentUser =
            storedUser

                ? JSON.parse(
                    storedUser
                )

                : legacyUser

                    ? JSON.parse(
                        legacyUser
                    )

                    : null;

    } catch (error) {

        console.error(
            "Unable to read stored user:",
            error
        );

        currentUser = null;

    }

}


function getUserId() {

    const localUserId =
        localStorage.getItem(
            "userId"
        );


    return Number(

        currentUser?.id ||

        currentUser?.user_id ||

        currentUser?.userId ||

        localUserId ||

        0

    );

}


/* =========================================
   LOAD APPOINTMENTS
========================================= */

async function loadAppointments() {

    const userId =
        getUserId();


    if (!userId) {

        alert(
            "Your account information is incomplete. Please log in again."
        );

        clearLoginStorage();

        window.location.href =
            "login.html";

        return;

    }


    const container =
        document.getElementById(
            "appointmentsContainer"
        );


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    container.innerHTML = `

        <div class="loading-state">

            <div class="loading-spinner"></div>

            <p>
                Loading your appointments...
            </p>

        </div>

    `;


    emptyState.style.display =
        "none";


    try {

        const response =
            await fetch(
                `/api/reservations/user/${userId}`
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load appointments."
            );

        }


        const reservations =
            Array.isArray(
                data.reservations
            )
                ? data.reservations
                : [];


        appointmentGroups =
            reservations.map(
                normalizeReservation
            );


        renderAppointments();


    } catch (error) {

        console.error(
            "Appointment loading error:",
            error
        );


        container.innerHTML = `

            <div class="appointment-error">

                <h3>
                    Unable to Load Appointments
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Please refresh the page and try again."
                    )}
                </p>

                <button
                    class="view-button"
                    type="button"
                    onclick="loadAppointments()"
                >
                    Try Again
                </button>

            </div>

        `;


        emptyState.style.display =
            "none";

    }

}


/* =========================================
   NORMALIZE BACKEND RESERVATION
========================================= */

function normalizeReservation(
    reservation
) {

    let services = [];


    if (
        Array.isArray(
            reservation.services
        )
    ) {

        services =
            reservation.services.map(
                service => ({

                    id:
                        Number(
                            service.id ||
                            service.service_id ||
                            0
                        ),

                    name:
                        service.name ||
                        "Service",

                    price:
                        Number(
                            service.price
                        ) || 0,

                    duration:
                        Number(
                            service.duration
                        ) || 0

                })
            );

    }


    /*
     * Backward compatibility
     */

    if (
        services.length === 0 &&
        reservation.service_id
    ) {

        services = [

            {

                id:
                    Number(
                        reservation.service_id
                    ),

                name:
                    reservation.service_name ||
                    "Service",

                price:
                    Number(
                        reservation.service_price
                    ) || 0,

                duration:
                    Number(
                        reservation.duration
                    ) || 0

            }

        ];

    }


    const totalFromServices =
        services.reduce(

            (
                sum,
                service
            ) =>

                sum +
                Number(
                    service.price || 0
                ),

            0

        );


    return {

        id:
            Number(
                reservation.id
            ),


        appointment_number:

            reservation.appointment_number ||

            `ADD-${
                String(
                    reservation.id
                ).padStart(
                    6,
                    "0"
                )
            }`,


        user_id:
            Number(
                reservation.user_id
            ),


        motorcycle_id:
            reservation.motorcycle_id
                ? Number(
                    reservation.motorcycle_id
                )
                : null,


        brand:
            reservation.brand ||
            "",


        model:
            reservation.model ||
            "",


        year:
            reservation.year ||
            "",


        engine_cc:
            reservation.engine_cc ||
            "",


        plate:
            reservation.plate_number ||
            "No plate number",


        color:
            reservation.color ||
            "",


        date:
            reservation.reservation_date,


        time:
            formatTime(
                reservation.reservation_time
            ),


        notes:
            reservation.notes ||
            "",


        status:
            reservation.status ||
            "Pending",


        created_at:
            reservation.created_at,


        services:
            services,


        total:
            Number(
                reservation.total
            ) ||
            totalFromServices,


        total_duration:
            Number(
                reservation.total_duration
            ) || 0

    };

}


/* =========================================
   RENDER APPOINTMENTS
========================================= */

function renderAppointments() {

    const container =
        document.getElementById(
            "appointmentsContainer"
        );


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    container.innerHTML =
        "";


    const filtered =
        appointmentGroups.filter(
            appointment => {

                if (
                    currentFilter ===
                    "all"
                ) {

                    return true;

                }


                return (
                    normalizeStatus(
                        appointment.status
                    ) ===
                    currentFilter
                );

            }
        );


    if (
        filtered.length === 0
    ) {

        emptyState.style.display =
            "block";

        return;

    }


    emptyState.style.display =
        "none";


    filtered.forEach(
        appointment => {

            container.appendChild(
                createAppointmentCard(
                    appointment
                )
            );

        }
    );

}


/* =========================================
   CREATE APPOINTMENT CARD
========================================= */

function createAppointmentCard(
    appointment
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "appointment-card";


    card.dataset.status =
        normalizeStatus(
            appointment.status
        );


    const motorcycle = [

        `${appointment.brand} ${appointment.model}`.trim(),

        appointment.plate

    ]
        .filter(Boolean)
        .join("<br>");


    const serviceTags =
        appointment.services.length > 0

            ?

            appointment.services

                .map(
                    service =>

                        `

                        <span
                            class="service-tag"
                        >

                            ${escapeHtml(
                                service.name
                            )}

                        </span>

                        `
                )

                .join("")

            :

            `

            <span
                class="service-tag"
            >
                Service
            </span>

            `;


    const statusClass =
        normalizeStatus(
            appointment.status
        );


    card.innerHTML = `

        <div class="appointment-top">

            <div>

                <div class="appointment-id">

                    Appointment #

                    ${escapeHtml(
                        appointment.appointment_number
                    )}

                </div>


                <div class="appointment-title">

                    Motorcycle Service Appointment

                </div>

            </div>


            <span
                class="status ${statusClass}"
            >

                ${escapeHtml(
                    appointment.status
                )}

            </span>

        </div>


        <div class="appointment-details">


            <div>

                <div class="detail-label">
                    Motorcycle
                </div>

                <div class="detail-value">

                    ${
                        motorcycle ||
                        "Motorcycle"
                    }

                </div>

            </div>


            <div>

                <div class="detail-label">
                    Date
                </div>

                <div class="detail-value">

                    ${escapeHtml(
                        formatDate(
                            appointment.date
                        )
                    )}

                </div>

            </div>


            <div>

                <div class="detail-label">
                    Time
                </div>

                <div class="detail-value">

                    ${escapeHtml(
                        appointment.time
                    )}

                </div>

            </div>


            <div>

                <div class="detail-label">
                    Mechanic
                </div>

                <div class="detail-value">

                    Not Assigned

                </div>

            </div>


        </div>


        <div class="services-section">

            <div class="services-label">

                Selected Services

            </div>


            <div class="service-tags">

                ${serviceTags}

            </div>

        </div>


        <div class="appointment-bottom">

            <div class="estimated-cost">

                Estimated Cost:

                <strong>

                    ₱${formatMoney(
                        appointment.total
                    )}

                </strong>

            </div>


            <button
                class="view-button"
                type="button"
                onclick="viewAppointment(
                    ${appointment.id}
                )"
            >

                View Details

            </button>

        </div>

    `;


    return card;

}


/* =========================================
   FILTERS
========================================= */

function filterAppointments(
    status,
    button
) {

    currentFilter =
        status;


    document
        .querySelectorAll(
            ".filter-button"
        )
        .forEach(
            btn =>
                btn.classList.remove(
                    "active"
                )
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }


    renderAppointments();

}


/* =========================================
   VIEW DETAILS
========================================= */

function viewAppointment(
    id
) {

    const appointment =
        appointmentGroups.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(id)
        );


    if (!appointment) {

        alert(
            "Appointment details could not be found."
        );

        return;

    }


    document.getElementById(
        "modalAppointmentNumber"
    ).textContent =
        appointment.appointment_number;


    document.getElementById(
        "modalStatus"
    ).textContent =
        appointment.status;


    document.getElementById(
        "modalMotorcycle"
    ).textContent =

        `${appointment.brand} ${appointment.model}`
            .trim() ||

        "Motorcycle";


    document.getElementById(
        "modalPlate"
    ).textContent =
        appointment.plate;


    document.getElementById(
        "modalSchedule"
    ).textContent =

        `${formatDate(
            appointment.date
        )} • ${appointment.time}`;


    document.getElementById(
        "modalMechanic"
    ).textContent =
        "Not Assigned";


    document.getElementById(
        "modalCost"
    ).textContent =

        `₱${formatMoney(
            appointment.total
        )}`;


    const servicesContainer =
        document.getElementById(
            "modalServices"
        );


    servicesContainer.innerHTML =
        "";


    appointment.services.forEach(
        service => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "modal-service";


            element.innerHTML = `

                <span>

                    ${escapeHtml(
                        service.name
                    )}

                </span>


                <span
                    class="modal-service-price"
                >

                    ₱${formatMoney(
                        service.price
                    )}

                </span>

            `;


            servicesContainer.appendChild(
                element
            );

        }
    );


    document
        .getElementById(
            "appointmentModal"
        )
        .classList.add(
            "show"
        );

}


function closeModal() {

    document
        .getElementById(
            "appointmentModal"
        )
        .classList.remove(
            "show"
        );

}


/* =========================================
   MODAL EVENTS
========================================= */

function initializeModalEvents() {

    document.addEventListener(
        "click",
        event => {

            const modal =
                document.getElementById(
                    "appointmentModal"
                );


            if (
                event.target ===
                modal
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================
   LOGOUT
========================================= */

function initializeLogout() {

    document.addEventListener(
        "click",
        event => {

            const logoutLink =
                event.target.closest(
                    'a[href="login.html"].logout'
                );


            if (!logoutLink) {

                return;

            }


            event.preventDefault();


            clearLoginStorage();


            window.location.href =
                "login.html";

        }
    );

}


function clearLoginStorage() {

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

}


/* =========================================
   HELPERS
========================================= */

function normalizeStatus(
    status
) {

    return String(
        status ||
        "pending"
    )
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );

}


function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "Date not available";

    }


    const cleanDate =
        String(
            dateValue
        ).slice(
            0,
            10
        );


    const date =
        new Date(
            `${cleanDate}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            dateValue
        );

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


function formatTime(
    timeValue
) {

    if (!timeValue) {

        return "Time not available";

    }


    const value =
        String(
            timeValue
        ).trim();


    const match =
        value.match(
            /^(\d{1,2}):(\d{2})(?::\d{2})?$/
        );


    if (!match) {

        return value;

    }


    let hour =
        Number(
            match[1]
        );


    const minute =
        match[2];


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    if (
        hour === 0
    ) {

        hour = 12;

    } else if (
        hour > 12
    ) {

        hour -= 12;

    }


    return `${hour}:${minute} ${period}`;

}


function formatMoney(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-PH",
        {

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2

        }
    );

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
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


/* =========================================
   GLOBAL FUNCTIONS
========================================= */

window.filterAppointments =
    filterAppointments;

window.viewAppointment =
    viewAppointment;

window.closeModal =
    closeModal;

window.loadAppointments =
    loadAppointments;
