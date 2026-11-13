
/* =========================================================
   ADD MOTOR SHOP - ADMIN DASHBOARD
   dashboard.js

   Uses:
   - Main server: http://localhost:3000
   - GET /api/admin/dashboard
   - GET /api/admin/reservations

   Weekly dashboard:
   - Monday to Saturday
   - Sunday excluded
   - Weekly appointment status pie chart
   - Daily appointment breakdown
========================================================= */

const ADMIN_API_BASE = "http://localhost:3000";


/* =========================================================
   GLOBAL STATE
========================================================= */

let appointments = [];
let currentAdmin = null;
let dashboardSummary = null;
let weeklyDashboard = null;
let toastTimer = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const dashboardDate =
    document.getElementById("dashboardDate");

const welcomeTitle =
    document.getElementById("welcomeTitle");

const adminName =
    document.getElementById("adminName");

const adminInitial =
    document.getElementById("adminInitial") ||
    document.getElementById("adminAvatarInitial");

const totalAppointments =
    document.getElementById("totalAppointments");

const pendingAppointments =
    document.getElementById("pendingAppointments");

const confirmedAppointments =
    document.getElementById("confirmedAppointments");

const inServiceAppointments =
    document.getElementById("inServiceAppointments");

const completedAppointments =
    document.getElementById("completedAppointments");

const cancelledAppointments =
    document.getElementById("cancelledAppointments");

const todayAppointments =
    document.getElementById("todayAppointments");

const upcomingAppointments =
    document.getElementById("upcomingAppointments");

const todayProgress =
    document.getElementById("todayProgress");

const todayProgressText =
    document.getElementById("todayProgressText");

const recentAppointments =
    document.getElementById("recentAppointments");

const recentLoading =
    document.getElementById("recentLoading");

const recentEmpty =
    document.getElementById("recentEmpty");

const themeToggle =
    document.getElementById("themeToggle");

const themeIcon =
    document.getElementById("themeIcon");

const themeText =
    document.getElementById("themeText");

const logoutButton =
    document.getElementById("logoutButton");

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const dashboardToast =
    document.getElementById("dashboardToast");

const toastIcon =
    document.getElementById("toastIcon");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");

const systemStatusText =
    document.getElementById("systemStatusText");

const systemStatusBadge =
    document.getElementById("systemStatusBadge");


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /*
       Theme initialization is handled centrally
       by admin-theme.js.
    */

    initializeAdmin();

    updateDashboardDate();

    initializeNavigation();

    loadDashboard();

});


/* =========================================================
   INITIALIZE ADMIN
========================================================= */

function initializeAdmin() {

    const possibleKeys = [
        "adminUser",
        "addMotorUser",
        "user"
    ];

    let storedUser = null;

    for (const key of possibleKeys) {

        const stored =
            localStorage.getItem(key);

        if (!stored) {
            continue;
        }

        try {

            const parsed =
                JSON.parse(stored);

            if (
                parsed &&
                typeof parsed === "object"
            ) {

                storedUser = parsed;
                break;

            }

        } catch (error) {

            console.warn(
                `Unable to parse localStorage key: ${key}`
            );

        }

    }

    if (
        !storedUser ||
        String(storedUser.role || "").toLowerCase() !== "admin"
    ) {

        console.warn(
            "No valid administrator session found."
        );

        showToast(
            "Access Notice",
            "Administrator session was not found.",
            "error"
        );

        setTimeout(() => {

            window.location.href = "login.html";

        }, 1200);

        return;

    }

    currentAdmin = storedUser;

    displayAdminInformation();

}


/* =========================================================
   DISPLAY ADMIN INFORMATION
========================================================= */

function displayAdminInformation() {

    if (!currentAdmin) {
        return;
    }

    const name =
        getAdminDisplayName(currentAdmin);

    if (adminName) {
        adminName.textContent = name;
    }

    if (welcomeTitle) {
        welcomeTitle.textContent =
            `Welcome back, ${getFirstName(name)}`;
    }

    if (adminInitial) {
        adminInitial.textContent =
            getInitials(name);
    }

}


/* =========================================================
   ADMIN NAME HELPERS
========================================================= */

function getAdminDisplayName(user) {

    if (!user) {
        return "Administrator";
    }

    const fullName =
        user.full_name ||
        user.fullName ||
        user.name ||
        user.username;

    if (fullName) {
        return String(fullName).trim();
    }

    const firstName =
        user.first_name ||
        user.firstName ||
        "";

    const lastName =
        user.last_name ||
        user.lastName ||
        "";

    const combined =
        `${firstName} ${lastName}`.trim();

    return combined || "Administrator";

}


function getFirstName(name) {

    if (!name) {
        return "Administrator";
    }

    return String(name)
        .trim()
        .split(/\s+/)[0];

}


function getInitials(name) {

    if (!name) {
        return "A";
    }

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 1) {

        return parts[0]
            .charAt(0)
            .toUpperCase();

    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();

}


/* =========================================================
   AUTH HEADERS
========================================================= */

function getAuthHeaders() {

    const headers = {
        "Content-Type": "application/json"
    };

    if (!currentAdmin) {
        return headers;
    }

    const adminId =
        currentAdmin.id ||
        currentAdmin.user_id ||
        currentAdmin.userId;

    if (
        adminId !== undefined &&
        adminId !== null
    ) {

        headers["x-admin-id"] =
            String(adminId);

    }

    return headers;

}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    setRecentLoading(true);

    setSystemStatus(
        "checking",
        "Connecting to the ADD Motor Shop server...",
        "Checking"
    );

    try {

        const results = await Promise.allSettled([

            fetchAdminAPI("/api/admin/dashboard"),

            fetchAdminAPI("/api/admin/reservations")

        ]);


        const dashboardResult = results[0];
        const reservationsResult = results[1];


        let dashboardLoaded = false;
        let reservationsLoaded = false;


        /* =====================================
           DASHBOARD SUMMARY
        ===================================== */

        if (
            dashboardResult.status === "fulfilled"
        ) {

            const data =
                dashboardResult.value;

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Unable to load dashboard summary."
                );
            }

            dashboardSummary =
                data.summary || {};

            weeklyDashboard =
                data.weekly || null;

            dashboardLoaded = true;

        } else {

            console.error(
                "Dashboard summary request failed:",
                dashboardResult.reason
            );

        }


        /* =====================================
           RESERVATIONS
        ===================================== */

        if (
            reservationsResult.status === "fulfilled"
        ) {

            const data =
                reservationsResult.value;

            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load reservations."
                );

            }

            appointments =
                extractAppointments(data);

            reservationsLoaded = true;

        } else {

            console.error(
                "Reservations request failed:",
                reservationsResult.reason
            );

        }


        /* =====================================
           HANDLE FAILED REQUESTS
        ===================================== */

        if (
            !dashboardLoaded &&
            !reservationsLoaded
        ) {

            throw new Error(
                "Unable to retrieve dashboard information and reservations."
            );

        }


        /* =====================================
           UPDATE DASHBOARD
        ===================================== */

        updateSummaryCards();

        renderAppointmentAnalytics();


        if (
            dashboardLoaded &&
            reservationsLoaded
        ) {

            updateSystemStatusOnline();

        } else {

            setSystemStatus(
                "offline",
                "Some dashboard information could not be loaded.",
                "Partial"
            );

        }


        if (
            !dashboardLoaded ||
            !reservationsLoaded
        ) {

            showToast(
                "Dashboard Notice",
                "Some dashboard information could not be loaded. Please refresh.",
                "error"
            );

        }

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        appointments = [];
        dashboardSummary = null;
        weeklyDashboard = null;

        updateSummaryCards();

        showDashboardError();

        setSystemStatus(
            "offline",
            "Unable to connect to the ADD Motor Shop server.",
            "Offline"
        );

        showToast(
            "Dashboard Error",
            error.message ||
            "Unable to load dashboard data.",
            "error"
        );

    } finally {

        setRecentLoading(false);

    }

}


/* =========================================================
   ADMIN API REQUEST
========================================================= */

async function fetchAdminAPI(endpoint) {

    const response = await fetch(
        `${ADMIN_API_BASE}${endpoint}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
            credentials: "include"
        }
    );

    if (!response.ok) {

        throw new Error(
            `Server returned HTTP ${response.status} for ${endpoint}`
        );

    }

    return await response.json();

}


/* =========================================================
   EXTRACT APPOINTMENTS
========================================================= */

function extractAppointments(data) {

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data.reservations)) {
        return data.reservations;
    }

    if (Array.isArray(data.appointments)) {
        return data.appointments;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    if (
        data.data &&
        Array.isArray(data.data.reservations)
    ) {
        return data.data.reservations;
    }

    if (
        data.data &&
        Array.isArray(data.data.appointments)
    ) {
        return data.data.appointments;
    }

    return [];

}


/* =========================================================
   UPDATE SUMMARY CARDS
========================================================= */

function updateSummaryCards() {

    const total =
        dashboardSummary
            ? Number(
                dashboardSummary.total_appointments || 0
            )
            : appointments.length;


    const pending =
        dashboardSummary
            ? Number(dashboardSummary.pending || 0)
            : countByStatus("pending");


    const confirmed =
        dashboardSummary
            ? Number(dashboardSummary.confirmed || 0)
            : countByStatus("confirmed");


    const inService =
        dashboardSummary
            ? Number(dashboardSummary.in_service || 0)
            : countByStatus(
                "in service",
                "in-service",
                "in_service",
                "inservice"
            );


    const completed =
        dashboardSummary
            ? Number(dashboardSummary.completed || 0)
            : countByStatus("completed");


    const cancelled =
        dashboardSummary
            ? Number(dashboardSummary.cancelled || 0)
            : countByStatus(
                "cancelled",
                "canceled"
            );


    const today =
        getTodayAppointments();


    const upcoming =
        getUpcomingAppointments();


    if (totalAppointments) {
        totalAppointments.textContent = total;
    }

    if (pendingAppointments) {
        pendingAppointments.textContent = pending;
    }

    if (confirmedAppointments) {
        confirmedAppointments.textContent = confirmed;
    }

    if (inServiceAppointments) {
        inServiceAppointments.textContent = inService;
    }

    if (completedAppointments) {
        completedAppointments.textContent = completed;
    }

    if (cancelledAppointments) {
        cancelledAppointments.textContent = cancelled;
    }

    if (todayAppointments) {
        todayAppointments.textContent = today.length;
    }

    if (upcomingAppointments) {
        upcomingAppointments.textContent = upcoming.length;
    }

    updateTodayProgress(today);

}


/* =========================================================
   COUNT BY STATUS
========================================================= */

function countByStatus(...statuses) {

    const normalizedStatuses =
        statuses.map(normalizeStatus);

    return appointments.filter(
        appointment => {

            const status =
                normalizeStatus(
                    getAppointmentStatus(appointment)
                );

            return normalizedStatuses.includes(status);

        }
    ).length;

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(status) {

    return String(status || "")
        .trim()
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ");

}


/* =========================================================
   GET APPOINTMENT STATUS
========================================================= */

function getAppointmentStatus(appointment) {

    return (
        appointment.status ||
        appointment.reservation_status ||
        appointment.appointment_status ||
        "pending"
    );

}


/* =========================================================
   GET APPOINTMENT DATE
========================================================= */

function getAppointmentDate(appointment) {

    return (
        appointment.date ||
        appointment.appointment_date ||
        appointment.reservation_date ||
        appointment.booking_date ||
        appointment.scheduled_date ||
        null
    );

}


/* =========================================================
   GET APPOINTMENT TIME
========================================================= */

function getAppointmentTime(appointment) {

    return (
        appointment.time ||
        appointment.appointment_time ||
        appointment.reservation_time ||
        appointment.booking_time ||
        appointment.scheduled_time ||
        ""
    );

}


/* =========================================================
   GET TODAY APPOINTMENTS
========================================================= */

function getTodayAppointments() {

    const today =
        getDateOnly(new Date());

    return appointments.filter(
        appointment => {

            const date =
                getAppointmentDate(appointment);

            if (!date) {
                return false;
            }

            return (
                getDateOnly(parseDate(date)) === today
            );

        }
    );

}


/* =========================================================
   GET UPCOMING APPOINTMENTS
========================================================= */

function getUpcomingAppointments() {

    const now = new Date();

    return appointments.filter(
        appointment => {

            const date =
                getAppointmentDate(appointment);

            if (!date) {
                return false;
            }

            const appointmentDate =
                parseDate(date);

            if (
                Number.isNaN(
                    appointmentDate.getTime()
                )
            ) {
                return false;
            }

            const status =
                normalizeStatus(
                    getAppointmentStatus(appointment)
                );

            return (
                appointmentDate > now &&
                status !== "cancelled" &&
                status !== "canceled"
            );

        }
    );

}


/* =========================================================
   UPDATE TODAY PROGRESS
========================================================= */

function updateTodayProgress(todayList) {

    if (
        !todayProgress ||
        !todayProgressText
    ) {
        return;
    }

    const total =
        todayList.length;

    const completed =
        todayList.filter(
            appointment => {

                const status =
                    normalizeStatus(
                        getAppointmentStatus(appointment)
                    );

                return status === "completed";

            }
        ).length;

    let percentage = 0;

    if (total > 0) {

        percentage =
            Math.round(
                (completed / total) * 100
            );

    }

    todayProgress.style.width =
        `${percentage}%`;

    todayProgressText.textContent =
        `${completed} / ${total}`;

}


/* =========================================================
   WEEKLY APPOINTMENT ANALYTICS

   Displays:
   - Weekly appointment total
   - Busiest day
   - Completed appointments
   - Appointment status pie chart
   - Daily Monday-Saturday breakdown

   Sunday is intentionally excluded.
========================================================= */

function renderAppointmentAnalytics() {

    if (!recentAppointments) {
        return;
    }

    if (recentLoading) {
        recentLoading.style.display = "none";
    }


    const recentCard =
        recentAppointments.closest(".recent-card");


    if (recentCard) {

        const heading =
            recentCard.querySelector(".content-heading");


        if (heading) {

            const headingIcon =
                heading.querySelector(
                    ".content-heading-icon i"
                );

            if (headingIcon) {
                headingIcon.className =
                    "fa-solid fa-chart-pie";
            }

            const title =
                heading.querySelector("h3");

            const description =
                heading.querySelector("p");

            if (title) {
                title.textContent =
                    "Weekly Appointment Analytics";
            }

            if (description) {
                description.textContent =
                    "Appointment status distribution and daily activity";
            }

        }


        const tableHead =
            recentCard.querySelector(
                ".appointment-table-head"
            );

        if (tableHead) {
            tableHead.style.display = "none";
        }


        const viewAllButton =
            recentCard.querySelector(
                ".view-all-button"
            );

        if (viewAllButton) {

            viewAllButton.innerHTML = `
                View Appointments
                <i class="fa-solid fa-arrow-right"></i>
            `;

        }

    }


    recentAppointments.innerHTML = "";


    const weeklyData =
        getWeeklyAppointmentData();


    const weeklyTotal =
        weeklyData.reduce(
            (sum, day) => sum + day.total,
            0
        );


    const completedTotal =
        weeklyData.reduce(
            (sum, day) => sum + day.completed,
            0
        );


    const busiestDay =
        getBusiestDay(weeklyData);


    const dateRange =
        getWeeklyDateRange(weeklyData);


    const statusTotals =
        getWeeklyStatusTotals(weeklyData);


    const pieChart =
        createWeeklyStatusPie(statusTotals);


    const dailyRows =
        createDailyAppointmentRows(weeklyData);


    const chart =
        document.createElement("div");


    chart.className =
        "appointment-analytics";


    chart.innerHTML = `

        <div class="analytics-summary">

            <div class="analytics-summary-item">

                <span class="analytics-summary-label">
                    THIS WEEK'S APPOINTMENTS
                </span>

                <strong>
                    ${weeklyTotal}
                </strong>

            </div>


            <div class="analytics-summary-item">

                <span class="analytics-summary-label">
                    BUSIEST DAY
                </span>

                <strong>
                    ${escapeHTML(busiestDay)}
                </strong>

            </div>


            <div class="analytics-summary-item">

                <span class="analytics-summary-label">
                    COMPLETED THIS WEEK
                </span>

                <strong>
                    ${completedTotal}
                </strong>

            </div>

        </div>


        <div class="analytics-week-range">
            <i class="fa-regular fa-calendar"></i>
            ${escapeHTML(dateRange)}
        </div>


        <div class="analytics-weekly-layout">


            <!-- WEEKLY STATUS PIE CHART -->

            <section class="analytics-status-panel">

                <div class="analytics-panel-heading">

                    <div>
                        <h4>Appointment Status</h4>

                        <p>
                            Distribution of this week's appointments
                        </p>
                    </div>

                </div>


                <div class="analytics-pie-wrapper">

                    <div
                        class="analytics-pie"
                        style="background: ${pieChart.gradient};"
                        role="img"
                        aria-label="${escapeHTML(pieChart.description)}"
                    >

                        <div class="analytics-pie-center">

                            <strong>
                                ${pieChart.total}
                            </strong>

                            <span>
                                Appointments
                            </span>

                        </div>

                    </div>

                </div>


                <div class="analytics-status-list">

                    ${pieChart.legend}

                </div>


                ${
                    weeklyTotal === 0
                        ? `
                            <div class="analytics-empty-note">
                                No appointments recorded for this week.
                            </div>
                        `
                        : pieChart.total === 0
                            ? `
                                <div class="analytics-empty-note">
                                    No recognized appointment statuses are available for the pie chart.
                                </div>
                            `
                            : ""
                }

            </section>


            <!-- DAILY APPOINTMENT BREAKDOWN -->

            <section class="analytics-daily-panel">

                <div class="analytics-panel-heading">

                    <div>
                        <h4>Daily Appointments</h4>

                        <p>
                            Appointment count per day
                        </p>
                    </div>

                </div>


                <div class="analytics-daily-list">

                    ${dailyRows}

                </div>


                <div class="analytics-daily-footer">

                    <span>
                        Total appointments
                    </span>

                    <strong>
                        ${weeklyTotal}
                    </strong>

                </div>

            </section>


        </div>


        <div class="analytics-note">

            <i class="fa-solid fa-circle-info"></i>

            <span>
                Analytics are based on actual appointment records from Monday to Saturday. Sunday is excluded. The pie chart includes Pending, Confirmed, In Service, Completed, and Cancelled appointments.
            </span>

        </div>

    `;


    recentAppointments.appendChild(chart);

}


/* =========================================================
   GET WEEKLY STATUS TOTALS
========================================================= */

function getWeeklyStatusTotals(weeklyData) {

    return {

        pending:
            weeklyData.reduce(
                (sum, day) => sum + Number(day.pending || 0),
                0
            ),

        confirmed:
            weeklyData.reduce(
                (sum, day) => sum + Number(day.confirmed || 0),
                0
            ),

        in_service:
            weeklyData.reduce(
                (sum, day) => sum + Number(day.in_service || 0),
                0
            ),

        completed:
            weeklyData.reduce(
                (sum, day) => sum + Number(day.completed || 0),
                0
            ),

        cancelled:
            weeklyData.reduce(
                (sum, day) => sum + Number(day.cancelled || 0),
                0
            )

    };

}


/* =========================================================
   CREATE WEEKLY STATUS PIE CHART
========================================================= */

function createWeeklyStatusPie(statusTotals) {

    const statuses = [

        {
            key: "pending",
            label: "Pending",
            color: "#f59e0b"
        },

        {
            key: "confirmed",
            label: "Confirmed",
            color: "#3b82f6"
        },

        {
            key: "in_service",
            label: "In Service",
            color: "#8b5cf6"
        },

        {
            key: "completed",
            label: "Completed",
            color: "#10b981"
        },

        {
            key: "cancelled",
            label: "Cancelled",
            color: "#ef4444"
        }

    ];


    const total =
        statuses.reduce(
            (sum, status) => {

                return sum +
                    Math.max(
                        0,
                        Number(statusTotals[status.key] || 0)
                    );

            },
            0
        );


    let currentPercentage = 0;


    const gradientParts = [];


    const legend = statuses.map(status => {

        const count =
            Math.max(
                0,
                Number(statusTotals[status.key] || 0)
            );


        const percentage =
            total > 0
                ? (count / total) * 100
                : 0;


        const start =
            currentPercentage;


        currentPercentage += percentage;


        if (percentage > 0) {

            gradientParts.push(
                `${status.color} ${start}% ${currentPercentage}%`
            );

        }


        return `

            <div class="analytics-status-row">

                <div class="analytics-status-name">

                    <span
                        class="analytics-status-dot"
                        style="background-color: ${status.color};"
                    ></span>

                    <span>
                        ${status.label}
                    </span>

                </div>


                <div class="analytics-status-values">

                    <strong>
                        ${count}
                    </strong>

                    <span>
                        ${percentage.toFixed(1)}%
                    </span>

                </div>

            </div>

        `;

    }).join("");


    const gradient =
        total > 0
            ? `conic-gradient(${gradientParts.join(", ")})`
            : "#e5e7eb";


    return {

        total,

        gradient,

        legend,

        description:
            statuses.map(status => {
                return `${status.label}: ${statusTotals[status.key] || 0}`;
            }).join(", ")

    };

}


/* =========================================================
   CREATE DAILY APPOINTMENT ROWS
========================================================= */

function createDailyAppointmentRows(weeklyData) {

    const maxValue =
        Math.max(
            ...weeklyData.map(day => day.total),
            1
        );


    return weeklyData.map(day => {

        const percentage =
            day.total > 0
                ? (day.total / maxValue) * 100
                : 0;


        const shortDate =
            day.date
                ? formatShortDate(day.date)
                : "";


        return `

            <div class="analytics-daily-row">

                <div class="analytics-daily-label">

                    <strong>
                        ${escapeHTML(day.day)}
                    </strong>

                    <span>
                        ${escapeHTML(shortDate)}
                    </span>

                </div>


                <div class="analytics-daily-track">

                    <div
                        class="analytics-daily-fill"
                        style="width: ${percentage}%;"
                    ></div>

                </div>


                <strong class="analytics-daily-count">
                    ${day.total}
                </strong>

            </div>

        `;

    }).join("");

}


/* =========================================================
   GET WEEKLY APPOINTMENT DATA
========================================================= */

function getWeeklyAppointmentData() {

    const backendDays =
        weeklyDashboard &&
        Array.isArray(weeklyDashboard.days)
            ? weeklyDashboard.days
            : null;


    if (
        backendDays &&
        backendDays.length === 6
    ) {

        return backendDays.map((day, index) => ({

            day:
                day.day || getDayName(index),

            date:
                day.date || "",

            total:
                Number(day.total || 0),

            pending:
                Number(day.pending || 0),

            confirmed:
                Number(day.confirmed || 0),

            in_service:
                Number(day.in_service || 0),

            completed:
                Number(day.completed || 0),

            cancelled:
                Number(day.cancelled || 0)

        }));

    }


    return calculateWeeklyAppointmentData();

}


/* =========================================================
   FALLBACK WEEKLY CALCULATION
========================================================= */

function calculateWeeklyAppointmentData() {

    const today =
        new Date();


    const monday =
        new Date(today);


    const dayOfWeek =
        monday.getDay();


    const difference =
        dayOfWeek === 0
            ? -6
            : 1 - dayOfWeek;


    monday.setDate(
        monday.getDate() + difference
    );

    monday.setHours(0, 0, 0, 0);


    const days = [];


    for (let index = 0; index < 6; index++) {

        const currentDate =
            new Date(monday);


        currentDate.setDate(
            monday.getDate() + index
        );


        const dateKey =
            getDateOnly(currentDate);


        days.push({

            day:
                getDayName(index),

            date:
                dateKey,

            total: 0,

            pending: 0,

            confirmed: 0,

            in_service: 0,

            completed: 0,

            cancelled: 0

        });

    }


    const daysByDate = {};

    days.forEach(day => {
        daysByDate[day.date] = day;
    });


    appointments.forEach(appointment => {

        const dateValue =
            getAppointmentDate(appointment);

        if (!dateValue) {
            return;
        }


        const dateKey =
            getDateOnly(parseDate(dateValue));


        const day =
            daysByDate[dateKey];


        if (!day) {
            return;
        }


        day.total++;


        const status =
            normalizeStatus(
                getAppointmentStatus(appointment)
            );


        if (status === "pending") {
            day.pending++;
        }

        else if (status === "confirmed") {
            day.confirmed++;
        }

        else if (status === "in service") {
            day.in_service++;
        }

        else if (status === "completed") {
            day.completed++;
        }

        else if (
            status === "cancelled" ||
            status === "canceled"
        ) {
            day.cancelled++;
        }

    });


    return days;

}


/* =========================================================
   DAY NAME
========================================================= */

function getDayName(index) {

    const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    return days[index] || "";

}


/* =========================================================
   CREATE WEEKLY CHART BAR

   Retained for compatibility with existing code.
   The new weekly analytics uses a pie chart and
   daily appointment breakdown instead.
========================================================= */

function createWeeklyChartBar(
    item,
    maxValue
) {

    const height =
        item.total === 0
            ? 0
            : Math.max(
                5,
                Math.round(
                    (item.total / maxValue) * 100
                )
            );


    const shortDay =
        String(item.day || "")
            .substring(0, 3);


    const tooltip =
        `${item.day}: ${item.total} appointments`;


    return `

        <div
            class="chart-bar-column"
            title="${escapeHTML(tooltip)}"
        >

            <div class="chart-value">
                ${item.total}
            </div>


            <div class="chart-bar-track">

                <div
                    class="chart-bar"
                    style="height: ${height}%"
                ></div>

            </div>


            <span class="chart-month">
                ${escapeHTML(shortDay)}
            </span>

        </div>

    `;

}


/* =========================================================
   CREATE Y AXIS LABELS

   Retained for compatibility.
========================================================= */

function createYAxisLabels(maxValue) {

    const steps = 4;
    const labels = [];


    for (
        let index = steps;
        index >= 0;
        index--
    ) {

        const value =
            Math.ceil(
                (maxValue / steps) * index
            );


        labels.push(`
            <span>${value}</span>
        `);

    }


    return labels.join("");

}


/* =========================================================
   CREATE CHART GRID

   Retained for compatibility.
========================================================= */

function createGridLines(maxValue) {

    const steps = 4;
    const lines = [];


    for (
        let index = 0;
        index <= steps;
        index++
    ) {

        const value =
            Math.ceil(
                (maxValue / steps) * index
            );


        lines.push(`
            <div
                class="chart-grid-line"
                data-value="${value}"
            ></div>
        `);

    }


    return lines.join("");

}


/* =========================================================
   GET BUSIEST DAY
========================================================= */

function getBusiestDay(weeklyData) {

    if (!weeklyData.length) {
        return "N/A";
    }


    const busiest =
        weeklyData.reduce(
            (highest, current) => {

                return current.total > highest.total
                    ? current
                    : highest;

            },
            weeklyData[0]
        );


    if (busiest.total === 0) {
        return "N/A";
    }


    return busiest.day;

}


/* =========================================================
   GET WEEKLY DATE RANGE
========================================================= */

function getWeeklyDateRange(weeklyData) {

    if (
        !weeklyData.length ||
        !weeklyData[0].date ||
        !weeklyData[5].date
    ) {
        return "Current Monday-Saturday week";
    }


    const start =
        parseDate(weeklyData[0].date);

    const end =
        parseDate(weeklyData[5].date);


    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return "Current Monday-Saturday week";
    }


    const startText =
        start.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric"
            }
        );


    const endText =
        end.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );


    return `${startText} - ${endText}`;

}


/* =========================================================
   DATE HELPERS
========================================================= */

function parseDate(value) {

    if (value instanceof Date) {
        return value;
    }

    if (!value) {
        return new Date(NaN);
    }

    const stringValue =
        String(value).trim();


    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {

        const [
            year,
            month,
            day
        ] = stringValue
            .split("-")
            .map(Number);


        return new Date(
            year,
            month - 1,
            day
        );

    }


    const parsed =
        new Date(stringValue);


    return parsed;

}


function getDateOnly(date) {

    if (
        !(date instanceof Date) ||
        Number.isNaN(date.getTime())
    ) {
        return "";
    }


    const year =
        date.getFullYear();


    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");


    const day =
        String(date.getDate())
            .padStart(2, "0");


    return `${year}-${month}-${day}`;

}


function getAppointmentTimestamp(appointment) {

    const date =
        getAppointmentDate(appointment);

    if (!date) {
        return 0;
    }


    const parsedDate =
        parseDate(date);


    if (
        Number.isNaN(parsedDate.getTime())
    ) {
        return 0;
    }


    const time =
        getAppointmentTime(appointment);


    if (time) {

        const timeMatch =
            String(time).match(
                /(\d{1,2}):(\d{2})/
            );


        if (timeMatch) {

            parsedDate.setHours(
                Number(timeMatch[1]),
                Number(timeMatch[2]),
                0,
                0
            );

        }

    }


    return parsedDate.getTime();

}


function formatShortDate(dateValue) {

    if (!dateValue) {
        return "No date";
    }


    const date =
        parseDate(dateValue);


    if (
        Number.isNaN(date.getTime())
    ) {
        return "No date";
    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric"
        }
    );

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(timeValue) {

    if (!timeValue) {
        return "Time not set";
    }


    const value =
        String(timeValue).trim();


    const match =
        value.match(
            /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );


    if (!match) {
        return value;
    }


    let hours =
        Number(match[1]);


    const minutes =
        match[2];


    const period =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12 || 12;


    return `${hours}:${minutes} ${period}`;

}


/* =========================================================
   UPDATE DASHBOARD DATE
========================================================= */

function updateDashboardDate() {

    if (!dashboardDate) {
        return;
    }


    const now = new Date();


    dashboardDate.textContent =
        now.toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

}


/* =========================================================
   THEME COMPATIBILITY

   Theme is controlled centrally by admin-theme.js.
========================================================= */

function toggleTheme() {

    const themeButton =
        document.getElementById("themeToggle") ||
        document.getElementById("dashboardThemeToggle");


    if (!themeButton) {
        return;
    }


    themeButton.click();

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
            "click",
            openMobileSidebar
        );

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


    document
        .querySelectorAll(".sidebar .nav-item")
        .forEach(link => {

            link.addEventListener(
                "click",
                closeMobileSidebar
            );

        });


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleLogout
        );

    }


    window.addEventListener(
        "resize",
        () => {

            if (window.innerWidth > 768) {
                closeMobileSidebar();
            }

        }
    );

}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function openMobileSidebar() {

    if (sidebar) {
        sidebar.classList.add("open");
    }


    if (sidebarOverlay) {
        sidebarOverlay.classList.add("active");
    }


    document.body.style.overflow = "hidden";

}


function closeMobileSidebar() {

    if (sidebar) {
        sidebar.classList.remove("open");
    }


    if (sidebarOverlay) {
        sidebarOverlay.classList.remove("active");
    }


    document.body.style.overflow = "";

}


/* =========================================================
   LOGOUT
========================================================= */

function handleLogout() {

    const confirmed =
        window.confirm(
            "Are you sure you want to log out?"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem("adminUser");

    localStorage.removeItem("addMotorUser");

    localStorage.removeItem("user");


    fetch(
        `${ADMIN_API_BASE}/api/admin/logout`,
        {
            method: "POST",
            credentials: "include"
        }
    ).catch(error => {

        console.warn(
            "Unable to contact logout endpoint:",
            error
        );

    }).finally(() => {

        window.location.href = "login.html";

    });

}


/* =========================================================
   LOADING STATE
========================================================= */

function setRecentLoading(loading) {

    if (!recentLoading) {
        return;
    }


    recentLoading.style.display =
        loading ? "flex" : "none";

}


/* =========================================================
   DASHBOARD ERROR
========================================================= */

function showDashboardError() {

    if (recentLoading) {
        recentLoading.style.display = "none";
    }


    if (recentAppointments) {

        recentAppointments.innerHTML = `

            <div class="analytics-error">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <div>

                    <strong>
                        Unable to load analytics
                    </strong>

                    <p>
                        Check that the ADD Motor Shop server is running on port 3000.
                    </p>

                </div>

            </div>

        `;

    }

}


/* =========================================================
   SYSTEM STATUS
========================================================= */

function updateSystemStatusOnline() {

    setSystemStatus(
        "online",
        "ADD Motor Shop server is connected and responding normally.",
        "Online"
    );

}


function setSystemStatus(
    state,
    message,
    label
) {

    if (systemStatusText) {
        systemStatusText.textContent = message;
    }


    if (!systemStatusBadge) {
        return;
    }


    systemStatusBadge.classList.remove(
        "online",
        "offline"
    );


    if (state === "online") {
        systemStatusBadge.classList.add("online");
    }


    if (state === "offline") {
        systemStatusBadge.classList.add("offline");
    }


    systemStatusBadge.innerHTML = `
        <span class="status-dot"></span>
        ${escapeHTML(label)}
    `;

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    title,
    message,
    type = "success"
) {

    if (
        !dashboardToast ||
        !toastTitle ||
        !toastMessage
    ) {
        return;
    }


    clearTimeout(toastTimer);


    toastTitle.textContent = title;

    toastMessage.textContent = message;


    dashboardToast.classList.remove("error");


    if (type === "error") {

        dashboardToast.classList.add("error");


        if (toastIcon) {
            toastIcon.className =
                "fa-solid fa-circle-exclamation";
        }

    } else {

        if (toastIcon) {
            toastIcon.className =
                "fa-solid fa-circle-check";
        }

    }


    dashboardToast.classList.add("show");


    toastTimer = setTimeout(
        () => {

            dashboardToast.classList.remove("show");

        },
        3500
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");


    div.textContent =
        String(value ?? "");


    return div.innerHTML;

}


/* =========================================================
   GLOBAL HELPERS
========================================================= */

window.loadDashboard =
    loadDashboard;


window.toggleDashboardTheme =
    toggleTheme;


window.openMobileSidebar =
    openMobileSidebar;


window.closeMobileSidebar =
    closeMobileSidebar;


window.handleAdminLogout =
    handleLogout;