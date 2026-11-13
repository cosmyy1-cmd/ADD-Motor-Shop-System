/* =========================================
   ADD MOTOR SHOP - APPOINTMENTS
   ADMIN APPOINTMENT MANAGEMENT
   Forward-Only Appointment Status Workflow
   Confirmation Card Before Saving Changes
========================================= */

const ADMIN_API_BASE = "http://localhost:3000";

/* =========================================
   ELEMENTS
========================================= */

const sidebar = document.getElementById("sidebar");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const logoutButton = document.getElementById("logoutButton");
const adminAvatar = document.getElementById("adminAvatar");
const adminName = document.getElementById("adminName");

const refreshButton = document.getElementById("refreshButton");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const dateFilter = document.getElementById("dateFilter");
const clearFiltersButton = document.getElementById("clearFiltersButton");

const appointmentCount = document.getElementById("appointmentCount");
const appointmentsLoading = document.getElementById("appointmentsLoading");
const appointmentsError = document.getElementById("appointmentsError");
const appointmentsErrorMessage = document.getElementById("appointmentsErrorMessage");
const retryButton = document.getElementById("retryButton");
const appointmentsEmpty = document.getElementById("appointmentsEmpty");
const appointmentsList = document.getElementById("appointmentsList");

const appointmentModal = document.getElementById("appointmentModal");
const closeAppointmentModal = document.getElementById("closeAppointmentModal");
const appointmentDetails = document.getElementById("appointmentDetails");

const statusModal = document.getElementById("statusModal");
const closeStatusModal = document.getElementById("cancelStatusButton");
const cancelStatusButton2 = document.getElementById("cancelStatusButton2");
const statusModalMessage = document.getElementById("statusModalMessage");
const confirmStatusButton = document.getElementById("confirmStatusButton");

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");
const toastClose = document.getElementById("toastClose");

const pendingCount = document.getElementById("pendingCount");
const confirmedCount = document.getElementById("confirmedCount");
const inServiceCount = document.getElementById("inServiceCount");
const completedCount = document.getElementById("completedCount");
const cancelledCount = document.getElementById("cancelledCount");

/* =========================================
   STATE
========================================= */

let allAppointments = [];
let selectedAppointment = null;
let pendingStatusChange = null;
let toastTimer = null;
let isSavingStatus = false;

/* =========================================
   ALLOWED APPOINTMENT STATUS TRANSITIONS
=========================================

   Pending    -> Confirmed or Cancelled
   Confirmed  -> In Service or Cancelled
   In Service -> Completed
   Completed  -> No further changes
   Cancelled  -> No further changes

   Pending is NOT offered as a next status.
   Previous statuses cannot be selected.

========================================= */

const APPOINTMENT_STATUS_TRANSITIONS = {
    "Pending": [
        "Confirmed",
        "Cancelled"
    ],

    "Confirmed": [
        "In Service",
        "Cancelled"
    ],

    "In Service": [
        "Completed"
    ],

    "Completed": [],

    "Cancelled": []
};

function getAllowedAppointmentStatuses(currentStatus) {
    const normalized = normalizeStatus(currentStatus);

    return [
        ...(APPOINTMENT_STATUS_TRANSITIONS[normalized] || [])
    ];
}

function isAllowedStatusTransition(currentStatus, nextStatus) {
    const current = normalizeStatus(currentStatus);
    const next = normalizeStatus(nextStatus);

    if (!current || !next || current === next) {
        return false;
    }

    const allowedStatuses =
        APPOINTMENT_STATUS_TRANSITIONS[current] || [];

    return allowedStatuses.includes(next);
}

/* =========================================
   ADMIN ACCOUNT
========================================= */

function getAdminUser() {
    const keys = ["adminUser", "addMotorUser", "user"];

    for (const key of keys) {
        try {
            const value = localStorage.getItem(key);

            if (value) {
                const user = JSON.parse(value);

                if (user) {
                    return user;
                }
            }
        } catch (error) {
            console.error("Unable to read " + key + ":", error);
        }
    }

    return null;
}

const adminUser = getAdminUser();

function checkAdminLogin() {
    if (!adminUser) {
        window.location.href = "login.html";
        return false;
    }

    if (String(adminUser.role || "").toLowerCase() !== "admin") {
        window.location.href = "login.html";
        return false;
    }

    if (!adminUser.id) {
        showToast(
            "Authentication Error",
            "The administrator ID is missing.",
            "error"
        );

        return false;
    }

    return true;
}

function loadAdminProfile() {
    if (!adminUser) return;

    const name =
        adminUser.name ||
        adminUser.full_name ||
        adminUser.username ||
        "Administrator";

    if (adminName) {
        adminName.textContent = name;
    }

    if (adminAvatar) {
        adminAvatar.textContent =
            name.trim().charAt(0).toUpperCase() || "A";
    }
}

function getAdminHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    if (adminUser && adminUser.id) {
        headers["x-admin-id"] = String(adminUser.id);
    }

    return headers;
}

/* =========================================
   THEME
========================================= */

function initializeTheme() {
    const savedTheme = localStorage.getItem("addMotorTheme");

    document.body.classList.toggle(
        "dark-mode",
        savedTheme === "dark"
    );

    ensureAppointmentStatusThemeStyles();
}

/* =========================================
   STATUS MODAL AND CONFIRMATION CARD STYLES
========================================= */

function ensureAppointmentStatusThemeStyles() {
    let style = document.getElementById(
        "appointmentStatusThemeStyles"
    );

    if (!style) {
        style = document.createElement("style");
        style.id = "appointmentStatusThemeStyles";
        document.head.appendChild(style);
    }

    style.textContent = `
        /* =================================
           STATUS MODAL - LIGHT MODE
        ================================= */

        #statusModal .modal-content,
        #statusModal .modal-card,
        #statusModal .modal-box,
        #statusModal .confirmation-card,
        #statusModal .status-modal-content,
        #statusModal .modal-dialog {
            background-color: #ffffff;
            color: #1f2937;
            border-color: #e5e7eb;
        }

        #statusModal #statusModalMessage {
            color: #374151;
            line-height: 1.6;
        }

        #statusModal #appointmentStatusField label {
            color: #374151;
        }

        #statusModal #appointmentStatusSelect {
            display: block;
            width: 100%;
            box-sizing: border-box;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background-color: #ffffff;
            color: #111827;
            color-scheme: light;
            font: inherit;
            cursor: pointer;
        }

        #statusModal #appointmentStatusSelect:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }

        #statusModal #appointmentStatusSelect option {
            background-color: #ffffff;
            color: #111827;
        }

        #statusModal #appointmentStatusSelect:focus {
            outline: 2px solid #e63946;
            outline-offset: 2px;
            border-color: #e63946;
        }

        /* =================================
           SAVE CONFIRMATION CARD
        ================================= */

        #appointmentSaveConfirmation {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 10050;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            background: rgba(0, 0, 0, 0.58);
            backdrop-filter: blur(3px);
        }

        #appointmentSaveConfirmation.show {
            display: flex;
            animation: appointmentConfirmationFadeIn 0.18s ease-out;
        }

        #appointmentSaveConfirmation .save-confirmation-card {
            width: 100%;
            max-width: 430px;
            box-sizing: border-box;
            padding: 28px;
            border-radius: 16px;
            background: #ffffff;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
            animation: appointmentConfirmationSlideIn 0.2s ease-out;
        }

        #appointmentSaveConfirmation .save-confirmation-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 58px;
            height: 58px;
            margin: 0 auto 18px;
            border-radius: 50%;
            background: #fff0f1;
            color: #e63946;
            font-size: 25px;
        }

        #appointmentSaveConfirmation .save-confirmation-title {
            margin: 0 0 10px;
            color: #111827;
            font-size: 21px;
            font-weight: 700;
            text-align: center;
        }

        #appointmentSaveConfirmation .save-confirmation-description {
            margin: 0 0 22px;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.65;
            text-align: center;
        }

        #appointmentSaveConfirmation .save-status-comparison {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 10px;
            margin-bottom: 24px;
            padding: 16px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #f9fafb;
        }

        #appointmentSaveConfirmation .save-status-column {
            min-width: 0;
            text-align: center;
        }

        #appointmentSaveConfirmation .save-status-label {
            display: block;
            margin-bottom: 8px;
            color: #6b7280;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        #appointmentSaveConfirmation .save-status-value {
            display: inline-block;
            max-width: 100%;
            padding: 7px 10px;
            border-radius: 7px;
            background: #e5e7eb;
            color: #374151;
            font-size: 12px;
            font-weight: 700;
            overflow-wrap: anywhere;
        }

        #appointmentSaveConfirmation .save-status-value.next {
            background: #fff0f1;
            color: #c62835;
        }

        #appointmentSaveConfirmation .save-status-arrow {
            color: #9ca3af;
            font-size: 17px;
        }

        #appointmentSaveConfirmation .save-confirmation-actions {
            display: flex;
            gap: 12px;
        }

        #appointmentSaveConfirmation .save-confirmation-actions button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex: 1;
            min-height: 44px;
            padding: 11px 14px;
            border: 1px solid transparent;
            border-radius: 9px;
            font: inherit;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.18s ease, transform 0.18s ease;
        }

        #appointmentSaveConfirmation .save-confirmation-actions button:hover:not(:disabled) {
            transform: translateY(-1px);
        }

        #appointmentSaveConfirmation #cancelSaveStatusButton {
            background: #ffffff;
            color: #374151;
            border-color: #d1d5db;
        }

        #appointmentSaveConfirmation #cancelSaveStatusButton:hover:not(:disabled) {
            background: #f3f4f6;
        }

        #appointmentSaveConfirmation #confirmSaveStatusButton {
            background: #e63946;
            color: #ffffff;
        }

        #appointmentSaveConfirmation #confirmSaveStatusButton:hover:not(:disabled) {
            background: #cc2936;
        }

        #appointmentSaveConfirmation .save-confirmation-actions button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* =================================
           STATUS MODAL - DARK MODE
        ================================= */

        body.dark-mode #statusModal .modal-content,
        body.dark-mode #statusModal .modal-card,
        body.dark-mode #statusModal .modal-box,
        body.dark-mode #statusModal .confirmation-card,
        body.dark-mode #statusModal .status-modal-content,
        body.dark-mode #statusModal .modal-dialog {
            background-color: #1f2937;
            color: #f9fafb;
            border-color: #374151;
        }

        body.dark-mode #statusModal #statusModalMessage {
            color: #f3f4f6;
        }

        body.dark-mode #statusModal #appointmentStatusField label {
            color: #f9fafb;
        }

        body.dark-mode #statusModal #appointmentStatusSelect {
            background-color: #111827;
            color: #f9fafb;
            color-scheme: dark;
            border-color: #4b5563;
        }

        body.dark-mode #statusModal #appointmentStatusSelect option {
            background-color: #111827;
            color: #f9fafb;
        }

        body.dark-mode #statusModal #appointmentStatusSelect:focus {
            outline: 2px solid #e63946;
            outline-offset: 2px;
            border-color: #e63946;
        }

        body.dark-mode #statusModal {
            color-scheme: dark;
        }

        #statusModal {
            color-scheme: light;
        }

        body.dark-mode #statusModal h1,
        body.dark-mode #statusModal h2,
        body.dark-mode #statusModal h3,
        body.dark-mode #statusModal p,
        body.dark-mode #statusModal span {
            color: inherit;
        }

        #statusModal #confirmStatusButton {
            background-color: #e63946;
            color: #ffffff;
        }

        #statusModal #cancelStatusButton,
        #statusModal #cancelStatusButton2 {
            color: inherit;
        }

        #statusModal button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
        }

        /* =================================
           CONFIRMATION CARD - DARK MODE
        ================================= */

        body.dark-mode #appointmentSaveConfirmation .save-confirmation-card {
            background: #1f2937;
            color: #f9fafb;
            border-color: #374151;
        }

        body.dark-mode #appointmentSaveConfirmation .save-confirmation-title {
            color: #f9fafb;
        }

        body.dark-mode #appointmentSaveConfirmation .save-confirmation-description {
            color: #d1d5db;
        }

        body.dark-mode #appointmentSaveConfirmation .save-status-comparison {
            background: #111827;
            border-color: #374151;
        }

        body.dark-mode #appointmentSaveConfirmation .save-status-label {
            color: #9ca3af;
        }

        body.dark-mode #appointmentSaveConfirmation .save-status-value {
            background: #374151;
            color: #f3f4f6;
        }

        body.dark-mode #appointmentSaveConfirmation .save-status-value.next {
            background: #4b2027;
            color: #ffb4ba;
        }

        body.dark-mode #appointmentSaveConfirmation #cancelSaveStatusButton {
            background: #374151;
            color: #f9fafb;
            border-color: #4b5563;
        }

        body.dark-mode #appointmentSaveConfirmation #cancelSaveStatusButton:hover:not(:disabled) {
            background: #4b5563;
        }

        @keyframes appointmentConfirmationFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes appointmentConfirmationSlideIn {
            from {
                opacity: 0;
                transform: translateY(8px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @media (max-width: 420px) {
            #appointmentSaveConfirmation .save-confirmation-card {
                padding: 22px 18px;
            }

            #appointmentSaveConfirmation .save-confirmation-actions {
                flex-direction: column-reverse;
            }

            #appointmentSaveConfirmation .save-status-comparison {
                gap: 6px;
                padding: 13px 8px;
            }
        }
    `;

    ensureSaveConfirmationCard();
}

/* =========================================
   CREATE SAVE CONFIRMATION CARD
========================================= */

function ensureSaveConfirmationCard() {
    let confirmationCard = document.getElementById(
        "appointmentSaveConfirmation"
    );

    if (confirmationCard) {
        return confirmationCard;
    }

    confirmationCard = document.createElement("div");
    confirmationCard.id = "appointmentSaveConfirmation";
    confirmationCard.setAttribute("aria-hidden", "true");

    confirmationCard.innerHTML = `
        <div
            class="save-confirmation-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="saveConfirmationTitle"
            aria-describedby="saveConfirmationDescription"
        >
            <div class="save-confirmation-icon">
                <i class="fa-solid fa-clipboard-check"></i>
            </div>

            <h2
                class="save-confirmation-title"
                id="saveConfirmationTitle"
            >
                Confirm Status Change
            </h2>

            <p
                class="save-confirmation-description"
                id="saveConfirmationDescription"
            >
                Are you sure you want to save this appointment status change?
            </p>

            <div class="save-status-comparison">
                <div class="save-status-column">
                    <span class="save-status-label">Current Status</span>
                    <span
                        class="save-status-value"
                        id="confirmationCurrentStatus"
                    >
                        Pending
                    </span>
                </div>

                <div class="save-status-arrow">
                    <i class="fa-solid fa-arrow-right"></i>
                </div>

                <div class="save-status-column">
                    <span class="save-status-label">New Status</span>
                    <span
                        class="save-status-value next"
                        id="confirmationNextStatus"
                    >
                        Confirmed
                    </span>
                </div>
            </div>

            <div class="save-confirmation-actions">
                <button
                    type="button"
                    id="cancelSaveStatusButton"
                >
                    <i class="fa-solid fa-xmark"></i>
                    Cancel
                </button>

                <button
                    type="button"
                    id="confirmSaveStatusButton"
                >
                    <i class="fa-solid fa-check"></i>
                    Confirm Changes
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmationCard);

    const cancelButton = document.getElementById(
        "cancelSaveStatusButton"
    );

    const confirmButton = document.getElementById(
        "confirmSaveStatusButton"
    );

    if (cancelButton) {
        cancelButton.addEventListener("click", function () {
            if (isSavingStatus) return;
            closeSaveConfirmationCard();
        });
    }

    if (confirmButton) {
        confirmButton.addEventListener("click", function () {
            if (isSavingStatus) return;
            saveConfirmedStatusChange();
        });
    }

    confirmationCard.addEventListener("click", function (event) {
        if (
            event.target === confirmationCard &&
            !isSavingStatus
        ) {
            closeSaveConfirmationCard();
        }
    });

    return confirmationCard;
}

/* =========================================
   OPEN SAVE CONFIRMATION CARD
========================================= */

function openSaveConfirmationCard() {
    if (!pendingStatusChange) {
        return;
    }

    const currentStatus = pendingStatusChange.currentStatus;
    const nextStatus = pendingStatusChange.nextStatus;

    if (
        !nextStatus ||
        !isAllowedStatusTransition(currentStatus, nextStatus)
    ) {
        showToast(
            "Invalid Status Change",
            "Select a valid next status before continuing.",
            "error"
        );

        return;
    }

    const card = ensureSaveConfirmationCard();

    const currentStatusElement = document.getElementById(
        "confirmationCurrentStatus"
    );

    const nextStatusElement = document.getElementById(
        "confirmationNextStatus"
    );

    const descriptionElement = document.getElementById(
        "saveConfirmationDescription"
    );

    if (currentStatusElement) {
        currentStatusElement.textContent = currentStatus;
    }

    if (nextStatusElement) {
        nextStatusElement.textContent = nextStatus;
    }

    if (descriptionElement) {
        descriptionElement.textContent =
            "Please review the change below. The appointment status will be updated only after you confirm.";
    }

    const confirmButton = document.getElementById(
        "confirmSaveStatusButton"
    );

    const cancelButton = document.getElementById(
        "cancelSaveStatusButton"
    );

    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.innerHTML =
            '<i class="fa-solid fa-check"></i> Confirm Changes';
    }

    if (cancelButton) {
        cancelButton.disabled = false;
    }

    card.classList.add("show");
    card.setAttribute("aria-hidden", "false");

    if (confirmButton) {
        confirmButton.focus();
    }
}

/* =========================================
   CLOSE SAVE CONFIRMATION CARD
========================================= */

function closeSaveConfirmationCard() {
    const card = document.getElementById(
        "appointmentSaveConfirmation"
    );

    if (!card || isSavingStatus) {
        return;
    }

    card.classList.remove("show");
    card.setAttribute("aria-hidden", "true");

    const confirmButton = document.getElementById(
        "confirmSaveStatusButton"
    );

    const cancelButton = document.getElementById(
        "cancelSaveStatusButton"
    );

    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.innerHTML =
            '<i class="fa-solid fa-check"></i> Confirm Changes';
    }

    if (cancelButton) {
        cancelButton.disabled = false;
    }
}

/* =========================================
   MOBILE SIDEBAR
========================================= */

if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", function () {
        if (sidebar) {
            sidebar.classList.toggle("mobile-open");
        }
    });
}

document.addEventListener("click", function (event) {
    if (!sidebar || !sidebar.classList.contains("mobile-open")) {
        return;
    }

    const insideSidebar = sidebar.contains(event.target);

    const insideMenuButton =
        mobileMenuButton &&
        mobileMenuButton.contains(event.target);

    if (!insideSidebar && !insideMenuButton) {
        sidebar.classList.remove("mobile-open");
    }
});

/* =========================================
   LOGOUT
========================================= */

if (logoutButton) {
    logoutButton.addEventListener("click", function () {
        if (!window.confirm("Are you sure you want to logout?")) {
            return;
        }

        [
            "adminUser",
            "addMotorUser",
            "user",
            "adminId"
        ].forEach(function (key) {
            localStorage.removeItem(key);
        });

        window.location.href = "login.html";
    });
}

/* =========================================
   TOAST NOTIFICATIONS
========================================= */

function showToast(title, message, type = "success") {
    if (!toast) {
        console.log(title + ": " + message);
        return;
    }

    if (toastTitle) {
        toastTitle.textContent = title;
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    const icon = toast.querySelector(".toast-icon i");

    if (icon) {
        if (type === "error") {
            icon.className = "fa-solid fa-triangle-exclamation";
        } else if (type === "warning") {
            icon.className = "fa-solid fa-circle-exclamation";
        } else {
            icon.className = "fa-solid fa-check";
        }
    }

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(function () {
        toast.classList.remove("show");
    }, 3500);
}

if (toastClose) {
    toastClose.addEventListener("click", function () {
        toast.classList.remove("show");
    });
}

/* =========================================
   HTML ESCAPING
========================================= */

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================
   LOADING / ERROR / EMPTY STATES
========================================= */

function showLoading() {
    if (appointmentsLoading) {
        appointmentsLoading.style.display = "flex";
    }

    if (appointmentsError) {
        appointmentsError.style.display = "none";
    }

    if (appointmentsEmpty) {
        appointmentsEmpty.style.display = "none";
    }

    if (appointmentsList) {
        appointmentsList.innerHTML = "";
        appointmentsList.style.display = "none";
    }
}

function hideLoading() {
    if (appointmentsLoading) {
        appointmentsLoading.style.display = "none";
    }
}

function showError(message) {
    hideLoading();

    if (appointmentsError) {
        appointmentsError.style.display = "flex";
    }

    if (appointmentsErrorMessage) {
        appointmentsErrorMessage.textContent =
            message || "Unable to load appointments.";
    }

    if (appointmentsList) {
        appointmentsList.innerHTML = "";
        appointmentsList.style.display = "none";
    }

    if (appointmentsEmpty) {
        appointmentsEmpty.style.display = "none";
    }
}

function showEmpty() {
    hideLoading();

    if (appointmentsError) {
        appointmentsError.style.display = "none";
    }

    if (appointmentsEmpty) {
        appointmentsEmpty.style.display = "flex";
    }

    if (appointmentsList) {
        appointmentsList.innerHTML = "";
        appointmentsList.style.display = "none";
    }
}

function showAppointmentList() {
    hideLoading();

    if (appointmentsError) {
        appointmentsError.style.display = "none";
    }

    if (appointmentsEmpty) {
        appointmentsEmpty.style.display = "none";
    }

    if (appointmentsList) {
        appointmentsList.style.display = "flex";
    }
}

/* =========================================
   STATUS NORMALIZATION
========================================= */

function normalizeStatus(status) {
    const value = String(status || "Pending")
        .trim()
        .toLowerCase();

    const statuses = {
        "pending": "Pending",
        "confirmed": "Confirmed",
        "in service": "In Service",
        "in_service": "In Service",
        "in-service": "In Service",
        "completed": "Completed",
        "cancelled": "Cancelled",
        "canceled": "Cancelled"
    };

    return statuses[value] || "Pending";
}

function getStatusClass(status) {
    switch (normalizeStatus(status)) {
        case "Pending":
            return "status-pending";
        case "Confirmed":
            return "status-confirmed";
        case "In Service":
            return "status-in-service";
        case "Completed":
            return "status-completed";
        case "Cancelled":
            return "status-cancelled";
        default:
            return "status-pending";
    }
}

function getStatusIcon(status) {
    switch (normalizeStatus(status)) {
        case "Pending":
            return "fa-regular fa-clock";
        case "Confirmed":
            return "fa-solid fa-circle-check";
        case "In Service":
            return "fa-solid fa-screwdriver-wrench";
        case "Completed":
            return "fa-solid fa-check-double";
        case "Cancelled":
            return "fa-solid fa-ban";
        default:
            return "fa-regular fa-clock";
    }
}

/* =========================================
   SUMMARY COUNTS
========================================= */

function updateSummaryCounts() {
    const counts = {
        "Pending": 0,
        "Confirmed": 0,
        "In Service": 0,
        "Completed": 0,
        "Cancelled": 0
    };

    allAppointments.forEach(function (appointment) {
        const status = normalizeStatus(appointment.status);

        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status]++;
        }
    });

    if (pendingCount) pendingCount.textContent = counts.Pending;
    if (confirmedCount) confirmedCount.textContent = counts.Confirmed;
    if (inServiceCount) inServiceCount.textContent = counts["In Service"];
    if (completedCount) completedCount.textContent = counts.Completed;
    if (cancelledCount) cancelledCount.textContent = counts.Cancelled;
}

/* =========================================
   APPOINTMENT FIELD HELPERS
========================================= */

function getAppointmentId(appointment) {
    return appointment.id ?? appointment.reservation_id;
}

function getAppointmentDate(appointment) {
    return appointment.reservation_date || "";
}

function getAppointmentTime(appointment) {
    return (
        appointment.appointment_time ||
        appointment.reservation_time ||
        appointment.time ||
        appointment.booking_time ||
        ""
    );
}

function getCustomerName(appointment) {
    return (
        appointment.customer_name ||
        appointment.name ||
        appointment.user_name ||
        appointment.customer?.name ||
        "Unknown Customer"
    );
}

function getCustomerEmail(appointment) {
    return (
        appointment.customer_email ||
        appointment.email ||
        appointment.user_email ||
        appointment.customer?.email ||
        "No email"
    );
}

function getMotorcycle(appointment) {
    if (appointment.motorcycle_name) {
        return appointment.motorcycle_name;
    }

    if (appointment.motorcycle_brand || appointment.motorcycle_model) {
        return [
            appointment.motorcycle_brand,
            appointment.motorcycle_model
        ].filter(Boolean).join(" ");
    }

    if (appointment.motorcycle) {
        if (typeof appointment.motorcycle === "string") {
            return appointment.motorcycle;
        }

        return [
            appointment.motorcycle.brand,
            appointment.motorcycle.model
        ].filter(Boolean).join(" ");
    }

    return "Motorcycle not specified";
}

function getReference(appointment) {
    return (
        appointment.reference_number ||
        appointment.reservation_reference ||
        appointment.reference ||
        appointment.booking_reference ||
        getAppointmentId(appointment) ||
        "N/A"
    );
}

function getServices(appointment) {
    if (Array.isArray(appointment.services)) {
        return appointment.services;
    }

    if (Array.isArray(appointment.reservation_services)) {
        return appointment.reservation_services;
    }

    return [];
}

function getServiceName(service) {
    if (typeof service === "string") {
        return service;
    }

    return (
        service.service_name ||
        service.name ||
        service.title ||
        "Service"
    );
}

/* =========================================
   DATE AND TIME FORMATTING
========================================= */

function formatDate(dateValue) {
    if (!dateValue) {
        return "Date not specified";
    }

    let date;

    if (
        typeof dateValue === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ) {
        const parts = dateValue.split("-");

        date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );
    } else {
        date = new Date(dateValue);
    }

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatTime(timeValue) {
    if (!timeValue) {
        return "Time not specified";
    }

    const value = String(timeValue);

    if (/am|pm/i.test(value)) {
        return value;
    }

    const parts = value.split(":");

    if (parts.length < 2) {
        return value;
    }

    let hours = Number(parts[0]);
    const minutes = parts[1];

    if (Number.isNaN(hours)) {
        return value;
    }

    const suffix = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return hours + ":" + minutes + " " + suffix;
}

/* =========================================
   SEARCH TEXT
========================================= */

function getSearchText(appointment) {
    const serviceText = getServices(appointment)
        .map(getServiceName)
        .join(" ");

    return [
        getCustomerName(appointment),
        getCustomerEmail(appointment),
        getMotorcycle(appointment),
        getReference(appointment),
        serviceText
    ].join(" ").toLowerCase();
}

/* =========================================
   LOAD APPOINTMENTS
========================================= */

async function loadAppointments() {
    if (!checkAdminLogin()) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(
            ADMIN_API_BASE + "/api/admin/reservations",
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Failed to load appointments."
            );
        }

        if (Array.isArray(data.reservations)) {
            allAppointments = data.reservations;
        } else if (Array.isArray(data.data)) {
            allAppointments = data.data;
        } else {
            allAppointments = [];
        }

        updateSummaryCounts();
        applyFilters();

    } catch (error) {
        console.error("Load appointments error:", error);

        showError(
            error.message ||
            "Unable to connect to the admin server."
        );
    }
}

/* =========================================
   FILTER AND SORT APPOINTMENTS
========================================= */

function applyFilters() {
    const search = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const selectedStatus = statusFilter
        ? statusFilter.value
        : "all";

    const selectedDate = dateFilter
        ? dateFilter.value
        : "";

    const filtered = allAppointments.filter(function (appointment) {
        const status = normalizeStatus(appointment.status);

        if (
            selectedStatus !== "all" &&
            status !== selectedStatus
        ) {
            return false;
        }

        if (selectedDate) {
            const appointmentDate =
                String(getAppointmentDate(appointment)).substring(0, 10);

            if (appointmentDate !== selectedDate) {
                return false;
            }
        }

        if (search && !getSearchText(appointment).includes(search)) {
            return false;
        }

        return true;
    });

    filtered.sort(function (a, b) {
        const dateA = new Date(
            a.created_at || a.createdAt || a.reservation_created_at || 0
        ).getTime();

        const dateB = new Date(
            b.created_at || b.createdAt || b.reservation_created_at || 0
        ).getTime();

        if (Number.isFinite(dateA) && Number.isFinite(dateB)) {
            return dateB - dateA;
        }

        return 0;
    });

    renderAppointments(filtered);
}

/* =========================================
   RENDER APPOINTMENT CARDS
========================================= */

function renderAppointments(appointments) {
    if (!appointments.length) {
        if (appointmentCount) {
            appointmentCount.textContent = "0 appointments";
        }

        showEmpty();
        return;
    }

    showAppointmentList();

    if (appointmentCount) {
        appointmentCount.textContent =
            appointments.length +
            (appointments.length === 1
                ? " appointment"
                : " appointments");
    }

    appointmentsList.innerHTML = appointments
        .map(createAppointmentCard)
        .join("");
}

function createAppointmentCard(appointment) {
    const id = getAppointmentId(appointment);

    const customerName = getCustomerName(appointment);
    const motorcycle = getMotorcycle(appointment);
    const reference = getReference(appointment);

    const date = formatDate(getAppointmentDate(appointment));
    const time = formatTime(getAppointmentTime(appointment));

    const status = normalizeStatus(appointment.status);

    const initial =
        customerName.trim().charAt(0).toUpperCase() || "C";

    return `
        <article
            class="appointment-card"
            data-appointment-id="${escapeHtml(id)}"
        >
            <div class="appointment-main">
                <div class="appointment-customer">
                    <div class="customer-avatar">
                        ${escapeHtml(initial)}
                    </div>

                    <div>
                        <div class="customer-name">
                            ${escapeHtml(customerName)}
                        </div>

                        <div class="customer-reference">
                            ${escapeHtml(reference)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="appointment-info">
                <div class="info-label">Motorcycle</div>

                <div class="info-value">
                    <i class="fa-solid fa-motorcycle"></i>
                    ${escapeHtml(motorcycle)}
                </div>
            </div>

            <div class="appointment-info">
                <div class="info-label">Schedule</div>

                <div class="info-value">
                    <div>
                        <i class="fa-regular fa-calendar"></i>
                        ${escapeHtml(date)}
                    </div>

                    <div style="margin-top: 4px;">
                        <i class="fa-regular fa-clock"></i>
                        ${escapeHtml(time)}
                    </div>
                </div>
            </div>

            <div class="status-wrapper">
                <div class="status-label">Status</div>

                <span class="status-badge ${getStatusClass(status)}">
                    <i class="${getStatusIcon(status)}"></i>
                    ${escapeHtml(status)}
                </span>
            </div>

            <div class="appointment-actions">
                <button
                    type="button"
                    class="action-button"
                    data-appointment-action="edit"
                    title="Edit appointment status"
                    aria-label="Edit appointment status"
                >
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>

                <button
                    type="button"
                    class="action-button"
                    data-appointment-action="view"
                    title="View appointment"
                    aria-label="View appointment"
                >
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
        </article>
    `;
}

/* =========================================
   VIEW AND EDIT BUTTON HANDLERS
========================================= */

if (appointmentsList) {
    appointmentsList.addEventListener("click", function (event) {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const button = target.closest(
            "button[data-appointment-action]"
        );

        if (!button || !appointmentsList.contains(button)) {
            return;
        }

        const card = button.closest("[data-appointment-id]");

        if (!card) {
            showToast(
                "Unable to Open Appointment",
                "The appointment could not be identified. Refresh and try again.",
                "error"
            );

            return;
        }

        const appointmentId = card.dataset.appointmentId;
        const action = button.dataset.appointmentAction;

        if (!appointmentId) {
            showToast(
                "Unable to Open Appointment",
                "The appointment ID is missing.",
                "error"
            );

            return;
        }

        if (action === "view") {
            viewAppointment(appointmentId);
        } else if (action === "edit") {
            openStatusModal(appointmentId);
        }
    });
}

/* =========================================
   VIEW APPOINTMENT DETAILS
========================================= */

async function viewAppointment(appointmentId) {
    if (!appointmentId) {
        return;
    }

    if (!appointmentModal || !appointmentDetails) {
        showToast(
            "Unable to Open Appointment",
            "The appointment details modal was not found.",
            "error"
        );

        return;
    }

    try {
        appointmentDetails.innerHTML = `
            <div class="appointments-loading">
                <div class="loading-spinner">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                </div>
                <p>Loading appointment details...</p>
            </div>
        `;

        appointmentModal.classList.add("show");

        const response = await fetch(
            ADMIN_API_BASE +
            "/api/admin/reservations/" +
            encodeURIComponent(appointmentId),
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to load appointment."
            );
        }

        const appointment =
            data.reservation ||
            data.appointment ||
            data.data;

        if (!appointment) {
            throw new Error(
                "Appointment details were not returned."
            );
        }

        selectedAppointment = appointment;
        renderAppointmentDetails(appointment);

    } catch (error) {
        console.error("Appointment details error:", error);

        appointmentDetails.innerHTML = `
            <div class="appointments-empty">
                <div class="empty-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>

                <h3>Unable to load details</h3>
                <p>${escapeHtml(error.message || "Please try again.")}</p>
            </div>
        `;
    }
}

function renderAppointmentDetails(appointment) {
    const customerName = getCustomerName(appointment);
    const email = getCustomerEmail(appointment);
    const motorcycle = getMotorcycle(appointment);
    const reference = getReference(appointment);

    const date = formatDate(getAppointmentDate(appointment));
    const time = formatTime(getAppointmentTime(appointment));

    const status = normalizeStatus(appointment.status);

    const services = getServices(appointment);

    const instructions =
        appointment.special_instructions ||
        appointment.notes ||
        appointment.instructions ||
        "No special instructions.";

    const servicesHtml = services.length
        ? services.map(function (service) {
            return `
                <span class="status-badge status-confirmed">
                    ${escapeHtml(getServiceName(service))}
                </span>
            `;
        }).join(" ")
        : "No services listed.";

    appointmentDetails.innerHTML = `
        <div class="details-grid">
            <div class="detail-box">
                <div class="detail-label">Customer</div>
                <div class="detail-value">
                    <i class="fa-solid fa-user"></i>
                    ${escapeHtml(customerName)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Email</div>
                <div class="detail-value">
                    <i class="fa-solid fa-envelope"></i>
                    ${escapeHtml(email)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Motorcycle</div>
                <div class="detail-value">
                    <i class="fa-solid fa-motorcycle"></i>
                    ${escapeHtml(motorcycle)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Reference</div>
                <div class="detail-value">
                    <i class="fa-solid fa-hashtag"></i>
                    ${escapeHtml(reference)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Date</div>
                <div class="detail-value">
                    <i class="fa-regular fa-calendar"></i>
                    ${escapeHtml(date)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Time</div>
                <div class="detail-value">
                    <i class="fa-regular fa-clock"></i>
                    ${escapeHtml(time)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Status</div>
                <div>
                    <span class="status-badge ${getStatusClass(status)}">
                        <i class="${getStatusIcon(status)}"></i>
                        ${escapeHtml(status)}
                    </span>
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Services</div>
                <div class="detail-value">${servicesHtml}</div>
            </div>

            <div class="detail-box full">
                <div class="detail-label">Special Instructions</div>
                <div class="detail-value">
                    ${escapeHtml(instructions)}
                </div>
            </div>
        </div>
    `;
}

/* =========================================
   CREATE STATUS DROPDOWN
========================================= */

function ensureStatusSelector() {
    if (!statusModal || !statusModalMessage) {
        return null;
    }

    let selector = document.getElementById(
        "appointmentStatusSelect"
    );

    if (!selector) {
        const wrapper = document.createElement("div");
        wrapper.id = "appointmentStatusField";
        wrapper.style.marginTop = "16px";

        const label = document.createElement("label");
        label.htmlFor = "appointmentStatusSelect";
        label.textContent = "Next appointment status";
        label.style.display = "block";
        label.style.fontWeight = "600";
        label.style.marginBottom = "8px";

        selector = document.createElement("select");
        selector.id = "appointmentStatusSelect";
        selector.name = "appointmentStatus";

        wrapper.appendChild(label);
        wrapper.appendChild(selector);

        statusModalMessage.insertAdjacentElement(
            "afterend",
            wrapper
        );
    }

    if (selector.dataset.transitionHandlerAttached !== "true") {
        selector.addEventListener("change", function () {
            if (!pendingStatusChange) {
                return;
            }

            const chosenStatus = selector.value;

            if (
                chosenStatus &&
                !isAllowedStatusTransition(
                    pendingStatusChange.currentStatus,
                    chosenStatus
                )
            ) {
                showToast(
                    "Invalid Status",
                    "Appointments can only move forward in the workflow.",
                    "error"
                );

                selector.value = "";
                pendingStatusChange.nextStatus = "";

                updateStatusConfirmationMessage();
                updateStatusSaveButton();

                return;
            }

            pendingStatusChange.nextStatus = chosenStatus;

            updateStatusConfirmationMessage();
            updateStatusSaveButton();
        });

        selector.dataset.transitionHandlerAttached = "true";
    }

    ensureAppointmentStatusThemeStyles();

    return selector;
}

/* =========================================
   POPULATE ALLOWED NEXT STATUSES
========================================= */

function populateStatusSelector(selector, currentStatus) {
    if (!selector) {
        return [];
    }

    const allowedStatuses =
        getAllowedAppointmentStatuses(currentStatus);

    selector.innerHTML = "";

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = allowedStatuses.length
        ? "Select next status"
        : "No further status changes allowed";

    placeholder.disabled = true;
    placeholder.selected = true;

    selector.appendChild(placeholder);

    allowedStatuses.forEach(function (status) {
        const option = document.createElement("option");

        option.value = status;
        option.textContent = status;

        selector.appendChild(option);
    });

    selector.value = "";
    selector.disabled = allowedStatuses.length === 0;

    return allowedStatuses;
}

/* =========================================
   STATUS CONFIRMATION MESSAGE
========================================= */

function updateStatusConfirmationMessage() {
    if (!statusModalMessage || !pendingStatusChange) {
        return;
    }

    const currentStatus = pendingStatusChange.currentStatus;
    const nextStatus = pendingStatusChange.nextStatus;

    if (!nextStatus) {
        const allowedStatuses =
            getAllowedAppointmentStatuses(currentStatus);

        if (allowedStatuses.length === 0) {
            statusModalMessage.textContent =
                "This appointment is " +
                currentStatus +
                ". No further status changes are allowed.";
        } else {
            statusModalMessage.textContent =
                "Current status: " +
                currentStatus +
                ". Select one of the available next statuses to continue. " +
                "You cannot return to a previous status.";
        }

        return;
    }

    statusModalMessage.textContent =
        "Selected status: " +
        currentStatus +
        " → " +
        nextStatus +
        ". Click Save Changes to review and confirm the update.";
}

/* =========================================
   SAVE BUTTON STATE
========================================= */

function updateStatusSaveButton() {
    if (!confirmStatusButton || !pendingStatusChange) {
        return;
    }

    const currentStatus = pendingStatusChange.currentStatus;
    const nextStatus = pendingStatusChange.nextStatus;

    const validTransition = isAllowedStatusTransition(
        currentStatus,
        nextStatus
    );

    confirmStatusButton.disabled =
        !validTransition || isSavingStatus;

    confirmStatusButton.innerHTML =
        '<i class="fa-solid fa-check"></i> Save Changes';
}

/* =========================================
   OPEN STATUS MODAL
========================================= */

function openStatusModal(appointmentId) {
    if (isSavingStatus) {
        return;
    }

    const appointment = allAppointments.find(function (item) {
        return String(getAppointmentId(item)) ===
            String(appointmentId);
    });

    if (!appointment) {
        showToast(
            "Appointment Not Found",
            "Refresh the appointment list and try again.",
            "error"
        );

        return;
    }

    const currentStatus = normalizeStatus(appointment.status);
    const selector = ensureStatusSelector();

    if (!selector) {
        showToast(
            "Unable to Edit",
            "The status modal elements could not be found. Check appointments.html.",
            "error"
        );

        return;
    }

    pendingStatusChange = {
        id: getAppointmentId(appointment),
        currentStatus: currentStatus,
        nextStatus: ""
    };

    populateStatusSelector(selector, currentStatus);

    updateStatusConfirmationMessage();
    updateStatusSaveButton();

    ensureAppointmentStatusThemeStyles();

    statusModal.classList.add("show");
}

/* =========================================
   CLOSE STATUS MODAL
========================================= */

function closeStatusConfirmation() {
    if (isSavingStatus) {
        return;
    }

    if (statusModal) {
        statusModal.classList.remove("show");
    }

    closeSaveConfirmationCard();

    pendingStatusChange = null;

    if (confirmStatusButton) {
        confirmStatusButton.disabled = true;

        confirmStatusButton.innerHTML =
            '<i class="fa-solid fa-check"></i> Save Changes';
    }
}

if (closeStatusModal) {
    closeStatusModal.addEventListener(
        "click",
        closeStatusConfirmation
    );
}

if (cancelStatusButton2) {
    cancelStatusButton2.addEventListener(
        "click",
        closeStatusConfirmation
    );
}

/* =========================================
   SAVE STATUS UPDATE
   STEP 1: OPEN CONFIRMATION CARD
========================================= */

async function confirmStatusChange() {
    if (!pendingStatusChange || isSavingStatus) {
        return;
    }

    const currentStatus = pendingStatusChange.currentStatus;
    const nextStatus = pendingStatusChange.nextStatus;

    if (
        !nextStatus ||
        !isAllowedStatusTransition(currentStatus, nextStatus)
    ) {
        showToast(
            "Invalid Status Change",
            "You cannot return to a previous status or skip the allowed workflow.",
            "error"
        );

        updateStatusSaveButton();
        return;
    }

    /*
       Do not update the database here.
       First display the separate confirmation card.
    */

    openSaveConfirmationCard();
}

/* =========================================
   SAVE STATUS UPDATE
   STEP 2: SAVE AFTER CONFIRMATION
========================================= */

async function saveConfirmedStatusChange() {
    if (!pendingStatusChange || isSavingStatus) {
        return;
    }

    const appointmentId = pendingStatusChange.id;
    const currentStatus = pendingStatusChange.currentStatus;
    const nextStatus = pendingStatusChange.nextStatus;

    /*
       Validate the transition again before sending
       the update request.
    */

    if (
        !nextStatus ||
        !isAllowedStatusTransition(currentStatus, nextStatus)
    ) {
        showToast(
            "Invalid Status Change",
            "You cannot return to a previous status or skip the allowed workflow.",
            "error"
        );

        closeSaveConfirmationCard();
        updateStatusSaveButton();

        return;
    }

    isSavingStatus = true;

    const confirmationCard = document.getElementById(
        "appointmentSaveConfirmation"
    );

    const confirmationButton = document.getElementById(
        "confirmSaveStatusButton"
    );

    const cancelConfirmationButton = document.getElementById(
        "cancelSaveStatusButton"
    );

    if (confirmationButton) {
        confirmationButton.disabled = true;

        confirmationButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    if (cancelConfirmationButton) {
        cancelConfirmationButton.disabled = true;
    }

    if (confirmStatusButton) {
        confirmStatusButton.disabled = true;

        confirmStatusButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const response = await fetch(
            ADMIN_API_BASE +
            "/api/admin/reservations/" +
            encodeURIComponent(appointmentId) +
            "/status",
            {
                method: "PUT",
                headers: getAdminHeaders(),
                body: JSON.stringify({
                    status: nextStatus
                })
            }
        );

        let data;

        try {
            data = await response.json();
        } catch (error) {
            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Unable to update appointment status. Check the backend status-update route."
            );
        }

        /*
           The update succeeded. Close both cards and
           refresh the list to show the saved status.
        */

        if (confirmationCard) {
            confirmationCard.classList.remove("show");
            confirmationCard.setAttribute("aria-hidden", "true");
        }

        if (statusModal) {
            statusModal.classList.remove("show");
        }

        pendingStatusChange = null;

        showToast(
            "Status Updated",
            "Appointment status changed from " +
                currentStatus + " to " + nextStatus + ".",
            "success"
        );

        await loadAppointments();

        if (
            appointmentModal &&
            appointmentModal.classList.contains("show") &&
            selectedAppointment &&
            String(getAppointmentId(selectedAppointment)) ===
                String(appointmentId)
        ) {
            selectedAppointment.status = nextStatus;
            renderAppointmentDetails(selectedAppointment);
        }

    } catch (error) {
        console.error("Status update error:", error);

        /*
           Keep the status modal open so the admin can
           review the selection or try saving again.
        */

        if (confirmationCard) {
            confirmationCard.classList.remove("show");
            confirmationCard.setAttribute("aria-hidden", "true");
        }

        showToast(
            "Update Failed",
            error.message || "Unable to update appointment.",
            "error"
        );

    } finally {
        isSavingStatus = false;

        if (confirmationButton) {
            confirmationButton.disabled = false;

            confirmationButton.innerHTML =
                '<i class="fa-solid fa-check"></i> Confirm Changes';
        }

        if (cancelConfirmationButton) {
            cancelConfirmationButton.disabled = false;
        }

        if (confirmStatusButton) {
            confirmStatusButton.innerHTML =
                '<i class="fa-solid fa-check"></i> Save Changes';

            if (
                statusModal &&
                statusModal.classList.contains("show") &&
                pendingStatusChange
            ) {
                updateStatusSaveButton();
            } else {
                confirmStatusButton.disabled = true;
            }
        }
    }
}

if (confirmStatusButton) {
    confirmStatusButton.addEventListener(
        "click",
        confirmStatusChange
    );
}

/* =========================================
   CLOSE APPOINTMENT DETAILS
========================================= */

if (closeAppointmentModal) {
    closeAppointmentModal.addEventListener("click", function () {
        if (appointmentModal) {
            appointmentModal.classList.remove("show");
        }

        selectedAppointment = null;
    });
}

if (appointmentModal) {
    appointmentModal.addEventListener("click", function (event) {
        if (event.target === appointmentModal) {
            appointmentModal.classList.remove("show");
            selectedAppointment = null;
        }
    });
}

if (statusModal) {
    statusModal.addEventListener("click", function (event) {
        if (event.target === statusModal && !isSavingStatus) {
            closeStatusConfirmation();
        }
    });
}

document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
        return;
    }

    if (isSavingStatus) {
        return;
    }

    const confirmationCard = document.getElementById(
        "appointmentSaveConfirmation"
    );

    if (
        confirmationCard &&
        confirmationCard.classList.contains("show")
    ) {
        closeSaveConfirmationCard();
        return;
    }

    if (
        appointmentModal &&
        appointmentModal.classList.contains("show")
    ) {
        appointmentModal.classList.remove("show");
        selectedAppointment = null;
    }

    if (
        statusModal &&
        statusModal.classList.contains("show")
    ) {
        closeStatusConfirmation();
    }
});

/* =========================================
   SEARCH AND FILTERS
========================================= */

if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
}

if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
}

if (dateFilter) {
    dateFilter.addEventListener("change", applyFilters);
}

if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        if (dateFilter) dateFilter.value = "";

        applyFilters();
    });
}

/* =========================================
   REFRESH AND RETRY
========================================= */

if (refreshButton) {
    refreshButton.addEventListener("click", async function () {
        const icon = refreshButton.querySelector("i");

        if (icon) {
            icon.classList.add("fa-spin");
        }

        try {
            await loadAppointments();
        } finally {
            if (icon) {
                icon.classList.remove("fa-spin");
            }
        }
    });
}

if (retryButton) {
    retryButton.addEventListener("click", loadAppointments);
}

/* =========================================
   GLOBAL FUNCTIONS
========================================= */

window.viewAppointment = viewAppointment;
window.openStatusModal = openStatusModal;

/* =========================================
   INITIALIZATION
========================================= */

function initializeAppointments() {
    console.log("ADD MOTOR SHOP APPOINTMENTS");
    console.log("Admin API:", ADMIN_API_BASE);

    initializeTheme();
    loadAdminProfile();
    loadAppointments();
}

initializeAppointments();