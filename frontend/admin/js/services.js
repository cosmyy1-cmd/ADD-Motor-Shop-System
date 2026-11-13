
/* =========================================================
   ADD MOTOR SHOP
   ADMIN SERVICES MANAGEMENT
========================================================= */

const ADMIN_API_BASE =
    "http://localhost:3000";


/* =========================================================
   STATE
========================================================= */

let services = [];

let filteredServices = [];

let editingServiceId = null;

let deletingServiceId = null;

let pendingServiceUpdate = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const servicesGrid =
    document.getElementById("servicesGrid");

const servicesLoading =
    document.getElementById("servicesLoading");

const servicesError =
    document.getElementById("servicesError");

const servicesErrorMessage =
    document.getElementById("servicesErrorMessage");

const servicesEmpty =
    document.getElementById("servicesEmpty");

const totalServices =
    document.getElementById("totalServices");

const activeServices =
    document.getElementById("activeServices");

const averagePrice =
    document.getElementById("averagePrice");

const displayedServices =
    document.getElementById("displayedServices");

const refreshServices =
    document.getElementById("refreshServices");

const retryServices =
    document.getElementById("retryServices");

const serviceSearch =
    document.getElementById("serviceSearch");

const serviceStatusFilter =
    document.getElementById("serviceStatusFilter");

const clearServiceFilters =
    document.getElementById("clearServiceFilters");


/* =========================================================
   SERVICE DETAILS MODAL
========================================================= */

const serviceModal =
    document.getElementById("serviceModal");

const closeServiceModal =
    document.getElementById("closeServiceModal");

const serviceDetails =
    document.getElementById("serviceDetails");


/* =========================================================
   ADD / EDIT FORM MODAL
========================================================= */

const serviceFormModal =
    document.getElementById("serviceFormModal");

const serviceForm =
    document.getElementById("serviceForm");

const closeServiceFormModal =
    document.getElementById("closeServiceFormModal");

const cancelServiceForm =
    document.getElementById("cancelServiceForm");

const submitServiceButton =
    document.getElementById("submitServiceButton");

const serviceFormTitle =
    document.getElementById("serviceFormTitle");

const serviceFormSubtitle =
    document.getElementById("serviceFormSubtitle");

const serviceIdInput =
    document.getElementById("serviceId");

const serviceNameInput =
    document.getElementById("serviceName");

const serviceCategoryInput =
    document.getElementById("serviceCategory");

const servicePriceInput =
    document.getElementById("servicePrice");

const serviceDurationInput =
    document.getElementById("serviceDuration");

const serviceDescriptionInput =
    document.getElementById("serviceDescription");

const serviceStatusInput =
    document.getElementById("serviceStatus");


/* =========================================================
   DELETE MODAL
========================================================= */

const deleteModal =
    document.getElementById("deleteModal");

const closeDeleteModalButton =
    document.getElementById("closeDeleteModal");

const cancelDeleteButton =
    document.getElementById("cancelDelete");

const confirmDeleteButton =
    document.getElementById("confirmDelete");

const deleteServiceName =
    document.getElementById("deleteServiceName");


/* =========================================================
   TOAST
========================================================= */

const toast =
    document.getElementById("toast");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");

const toastClose =
    document.getElementById("toastClose");


/* =========================================================
   ADD SERVICE CONFIRMATION
========================================================= */

let addServiceConfirmationModal = null;

let confirmAddServiceButton = null;

let cancelAddServiceButton = null;

let closeAddServiceConfirmationButton = null;


/* =========================================================
   UPDATE SERVICE CONFIRMATION
========================================================= */

let updateServiceConfirmationModal = null;

let confirmUpdateServiceButton = null;

let cancelUpdateServiceButton = null;

let closeUpdateServiceConfirmationButton = null;


/* =========================================================
   ADMIN USER
========================================================= */

function getAdminUser() {

    const possibleKeys = [
        "adminUser",
        "addMotorUser",
        "user"
    ];

    for (const key of possibleKeys) {

        const stored =
            localStorage.getItem(key);

        if (!stored) {
            continue;
        }

        try {

            const parsed =
                JSON.parse(stored);

            if (parsed) {
                return parsed;
            }

        } catch (error) {

            console.warn(
                `Unable to parse ${key}.`
            );

        }

    }

    return null;
}


/* =========================================================
   ADMIN ID
========================================================= */

function getAdminId() {

    const admin =
        getAdminUser();

    if (!admin) {
        return null;
    }

    return (
        admin.id ||
        admin.user_id ||
        admin.userId
    );

}


/* =========================================================
   AUTH CHECK
========================================================= */

function checkAdminLogin() {

    const admin =
        getAdminUser();

    const adminId =
        getAdminId();

    if (!admin || !adminId) {

        console.warn(
            "No admin account found."
        );

        return false;
    }

    return true;
}


/* =========================================================
   REQUEST HEADERS
========================================================= */

function getAdminHeaders() {

    const adminId =
        getAdminId();

    return {
        "Content-Type": "application/json",
        "x-admin-id": String(adminId || "")
    };

}


/* =========================================================
   ADMIN PROFILE
========================================================= */

function loadAdminProfile() {

    const admin =
        getAdminUser();

    const adminName =
        document.getElementById("adminName");

    const adminAvatar =
        document.getElementById("adminAvatar");

    if (!admin) {
        return;
    }

    const name =
        admin.name ||
        admin.full_name ||
        admin.username ||
        "Administrator";

    if (adminName) {
        adminName.textContent = name;
    }

    if (adminAvatar) {

        adminAvatar.textContent =
            name.charAt(0).toUpperCase();

    }

}



/* =========================================================
   SHARED CONFIRMATION MODAL STYLES
   Compatible with ADD Motor Shop light and dark themes
========================================================= */

function addConfirmationModalStyles() {

    if (
        document.getElementById(
            "serviceConfirmationModalStyles"
        )
    ) {
        return;
    }

    const style = document.createElement("style");

    style.id = "serviceConfirmationModalStyles";

    style.textContent = `
        /* ---------------------------------------------
           THEME COLORS
        --------------------------------------------- */

        .add-service-confirmation-modal,
        .update-service-confirmation-modal {
            --confirm-bg: #ffffff;
            --confirm-text: #222222;
            --confirm-muted: #6b7280;
            --confirm-border: #e5e7eb;
            --confirm-surface: #f5f6f8;
            --confirm-accent: #e63946;
            --confirm-accent-hover: #c92f3b;
            --confirm-shadow: rgba(0, 0, 0, 0.25);

            position: fixed;
            inset: 0;
            z-index: 10050;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color-scheme: light;
        }

        /* ---------------------------------------------
           DARK THEME DETECTION
           Supports common project theme classes.
        --------------------------------------------- */

        body.dark-mode .add-service-confirmation-modal,
        body.dark-mode .update-service-confirmation-modal,
        html.dark-mode .add-service-confirmation-modal,
        html.dark-mode .update-service-confirmation-modal,
        body[data-theme="dark"] .add-service-confirmation-modal,
        body[data-theme="dark"] .update-service-confirmation-modal,
        html[data-theme="dark"] .add-service-confirmation-modal,
        html[data-theme="dark"] .update-service-confirmation-modal,
        body[data-theme="dark"] .add-service-confirmation-modal,
        body[data-theme="dark"] .update-service-confirmation-modal {
            --confirm-bg: #1b1b1b;
            --confirm-text: #f5f5f5;
            --confirm-muted: #b5b5b5;
            --confirm-border: #383838;
            --confirm-surface: #252525;
            --confirm-accent: #e63946;
            --confirm-accent-hover: #ff5360;
            --confirm-shadow: rgba(0, 0, 0, 0.55);

            color-scheme: dark;
        }

        /* Also support dark mode when the theme class is on a parent. */

        body.dark-mode .add-service-confirmation-dialog,
        body.dark-mode .update-service-confirmation-dialog {
            color: var(--confirm-text);
        }

        /* ---------------------------------------------
           MODAL VISIBILITY
        --------------------------------------------- */

        .add-service-confirmation-modal.show,
        .update-service-confirmation-modal.show {
            display: flex;
        }

        .add-service-confirmation-overlay,
        .update-service-confirmation-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.62);
            backdrop-filter: blur(4px);
        }

        /* ---------------------------------------------
           CONFIRMATION CARD
        --------------------------------------------- */

        .add-service-confirmation-dialog,
        .update-service-confirmation-dialog {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 460px;
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            padding: 30px;
            border: 1px solid var(--confirm-border);
            border-radius: 16px;
            background: var(--confirm-bg);
            color: var(--confirm-text);
            box-shadow: 0 20px 60px var(--confirm-shadow);
            animation: serviceConfirmationEnter 0.2s ease-out;
            transition:
                background-color 0.2s ease,
                color 0.2s ease,
                border-color 0.2s ease;
        }

        /* ---------------------------------------------
           CLOSE BUTTON
        --------------------------------------------- */

        .add-service-confirmation-close,
        .update-service-confirmation-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            border-radius: 50%;
            background: transparent;
            color: var(--confirm-muted);
            cursor: pointer;
            font-size: 17px;
        }

        .add-service-confirmation-close:hover,
        .update-service-confirmation-close:hover {
            background: var(--confirm-surface);
            color: var(--confirm-text);
        }

        /* ---------------------------------------------
           ICON
        --------------------------------------------- */

        .add-service-confirmation-icon,
        .update-service-confirmation-icon {
            width: 58px;
            height: 58px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px;
            border-radius: 50%;
            background: rgba(230, 57, 70, 0.14);
            color: var(--confirm-accent);
            font-size: 25px;
        }

        /* ---------------------------------------------
           TEXT
        --------------------------------------------- */

        .add-service-confirmation-content,
        .update-service-confirmation-content {
            text-align: center;
        }

        .add-service-confirmation-eyebrow,
        .update-service-confirmation-eyebrow {
            display: block;
            margin-bottom: 8px;
            color: var(--confirm-accent);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
        }

        .add-service-confirmation-content h3,
        .update-service-confirmation-content h3 {
            margin: 0 0 10px;
            color: var(--confirm-text);
            font-size: 22px;
            line-height: 1.35;
        }

        .add-service-confirmation-content p,
        .update-service-confirmation-content p {
            margin: 0 0 18px;
            color: var(--confirm-muted);
            font-size: 14px;
            line-height: 1.6;
        }

        /* ---------------------------------------------
           SERVICE NAME
        --------------------------------------------- */

        .add-service-confirmation-service-name,
        .update-service-confirmation-service-name {
            margin: 0 0 22px;
            padding: 13px 15px;
            overflow-wrap: anywhere;
            border: 1px solid var(--confirm-border);
            border-radius: 10px;
            background: var(--confirm-surface);
            color: var(--confirm-text);
            font-weight: 700;
            text-align: left;
        }

        /* ---------------------------------------------
           UPDATE SERVICE DETAILS
        --------------------------------------------- */

        .update-service-confirmation-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 0 0 22px;
            text-align: left;
        }

        .update-service-confirmation-summary > div {
            min-width: 0;
            padding: 12px;
            border: 1px solid var(--confirm-border);
            border-radius: 10px;
            background: var(--confirm-surface);
        }

        .update-service-confirmation-summary span {
            display: block;
            margin-bottom: 5px;
            color: var(--confirm-muted);
            font-size: 12px;
        }

        .update-service-confirmation-summary strong {
            display: block;
            overflow-wrap: anywhere;
            color: var(--confirm-text);
            font-size: 14px;
        }

        /* ---------------------------------------------
           ACTION BUTTONS
        --------------------------------------------- */

        .add-service-confirmation-actions,
        .update-service-confirmation-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 10px;
        }

        .add-service-confirmation-actions button,
        .update-service-confirmation-actions button {
            min-height: 42px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 15px;
            border: 1px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
            font-weight: 700;
            transition:
                background-color 0.2s ease,
                color 0.2s ease,
                transform 0.2s ease,
                opacity 0.2s ease;
        }

        .add-service-confirmation-actions button:hover,
        .update-service-confirmation-actions button:hover {
            transform: translateY(-1px);
        }

        .add-service-confirmation-actions button:disabled,
        .update-service-confirmation-actions button:disabled {
            cursor: not-allowed;
            opacity: 0.65;
            transform: none;
        }

        .add-service-confirmation-cancel,
        .update-service-confirmation-cancel {
            background: var(--confirm-bg);
            border-color: var(--confirm-border) !important;
            color: var(--confirm-text);
        }

        .add-service-confirmation-cancel:hover,
        .update-service-confirmation-cancel:hover {
            background: var(--confirm-surface);
        }

        .add-service-confirmation-confirm,
        .update-service-confirmation-confirm {
            background: var(--confirm-accent);
            color: #ffffff;
        }

        .add-service-confirmation-confirm:hover,
        .update-service-confirmation-confirm:hover {
            background: var(--confirm-accent-hover);
        }

        /* ---------------------------------------------
           ANIMATION
        --------------------------------------------- */

        @keyframes serviceConfirmationEnter {
            from {
                opacity: 0;
                transform: translateY(8px) scale(0.98);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* ---------------------------------------------
           MOBILE
        --------------------------------------------- */

        @media (max-width: 480px) {
            .add-service-confirmation-dialog,
            .update-service-confirmation-dialog {
                padding: 25px 18px;
            }

            .add-service-confirmation-actions,
            .update-service-confirmation-actions {
                flex-direction: column-reverse;
            }

            .add-service-confirmation-actions button,
            .update-service-confirmation-actions button {
                width: 100%;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .add-service-confirmation-dialog,
            .update-service-confirmation-dialog {
                animation: none;
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);

}


/* =========================================================
   ADD SERVICE CONFIRMATION MODAL
========================================================= */

function createAddServiceConfirmation() {

    addConfirmationModalStyles();

    if (
        document.getElementById(
            "addServiceConfirmationModal"
        )
    ) {

        addServiceConfirmationModal =
            document.getElementById(
                "addServiceConfirmationModal"
            );

        confirmAddServiceButton =
            document.getElementById(
                "confirmAddServiceConfirmation"
            );

        cancelAddServiceButton =
            document.getElementById(
                "cancelAddServiceConfirmation"
            );

        closeAddServiceConfirmationButton =
            document.getElementById(
                "closeAddServiceConfirmation"
            );

        return;

    }

    const modal =
        document.createElement("div");

    modal.id =
        "addServiceConfirmationModal";

    modal.className =
        "add-service-confirmation-modal";

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.innerHTML = `
        <div
            class="add-service-confirmation-overlay"
            data-add-service-close
        ></div>

        <div
            class="add-service-confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="addServiceConfirmationTitle"
        >
            <button
                type="button"
                class="add-service-confirmation-close"
                id="closeAddServiceConfirmation"
                aria-label="Close"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="add-service-confirmation-icon">
                <i class="fa-solid fa-circle-question"></i>
            </div>

            <div class="add-service-confirmation-content">
                <span class="add-service-confirmation-eyebrow">
                    ADD SERVICE
                </span>

                <h3 id="addServiceConfirmationTitle">
                    Confirm New Service
                </h3>

                <p>
                    Are you sure you want to add this service?
                </p>

                <div
                    class="add-service-confirmation-service-name"
                    id="addServiceConfirmationServiceName"
                ></div>
            </div>

            <div class="add-service-confirmation-actions">
                <button
                    type="button"
                    class="add-service-confirmation-cancel"
                    id="cancelAddServiceConfirmation"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    No, Go Back
                </button>

                <button
                    type="button"
                    class="add-service-confirmation-confirm"
                    id="confirmAddServiceConfirmation"
                >
                    <i class="fa-solid fa-check"></i>
                    Yes, Add Service
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    addServiceConfirmationModal = modal;

    confirmAddServiceButton =
        document.getElementById(
            "confirmAddServiceConfirmation"
        );

    cancelAddServiceButton =
        document.getElementById(
            "cancelAddServiceConfirmation"
        );

    closeAddServiceConfirmationButton =
        document.getElementById(
            "closeAddServiceConfirmation"
        );

    confirmAddServiceButton?.addEventListener(
        "click",
        confirmAddService
    );

    cancelAddServiceButton?.addEventListener(
        "click",
        closeAddServiceConfirmation
    );

    closeAddServiceConfirmationButton?.addEventListener(
        "click",
        closeAddServiceConfirmation
    );

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "[data-add-service-close]"
                )
            ) {
                closeAddServiceConfirmation();
            }

        }
    );

}


/* =========================================================
   OPEN ADD SERVICE CONFIRMATION
========================================================= */

function openAddServiceConfirmation() {

    createAddServiceConfirmation();

    const name =
        String(
            serviceNameInput?.value || ""
        ).trim();

    const nameElement =
        document.getElementById(
            "addServiceConfirmationServiceName"
        );

    if (nameElement) {
        nameElement.textContent = name;
    }

    if (addServiceConfirmationModal) {

        addServiceConfirmationModal.classList.add("show");

        addServiceConfirmationModal.setAttribute(
            "aria-hidden",
            "false"
        );

    }

}


/* =========================================================
   CLOSE ADD SERVICE CONFIRMATION
========================================================= */

function closeAddServiceConfirmation() {

    if (!addServiceConfirmationModal) {
        return;
    }

    addServiceConfirmationModal.classList.remove("show");

    addServiceConfirmationModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   CONFIRM ADD SERVICE
========================================================= */

function confirmAddService() {

    closeAddServiceConfirmation();

    if (serviceForm) {

        serviceForm.dataset.confirmedAdd = "true";

        serviceForm.requestSubmit();

    }

}


/* =========================================================
   UPDATE SERVICE CONFIRMATION MODAL
========================================================= */

function createUpdateServiceConfirmation() {

    addConfirmationModalStyles();

    if (
        document.getElementById(
            "updateServiceConfirmationModal"
        )
    ) {

        updateServiceConfirmationModal =
            document.getElementById(
                "updateServiceConfirmationModal"
            );

        confirmUpdateServiceButton =
            document.getElementById(
                "confirmUpdateServiceConfirmation"
            );

        cancelUpdateServiceButton =
            document.getElementById(
                "cancelUpdateServiceConfirmation"
            );

        closeUpdateServiceConfirmationButton =
            document.getElementById(
                "closeUpdateServiceConfirmation"
            );

        return;

    }

    const modal =
        document.createElement("div");

    modal.id =
        "updateServiceConfirmationModal";

    modal.className =
        "update-service-confirmation-modal";

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.innerHTML = `
        <div
            class="update-service-confirmation-overlay"
            data-update-service-close
        ></div>

        <div
            class="update-service-confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="updateServiceConfirmationTitle"
        >
            <button
                type="button"
                class="update-service-confirmation-close"
                id="closeUpdateServiceConfirmation"
                aria-label="Close confirmation"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="update-service-confirmation-icon">
                <i class="fa-solid fa-pen-to-square"></i>
            </div>

            <div class="update-service-confirmation-content">
                <span class="update-service-confirmation-eyebrow">
                    UPDATE SERVICE
                </span>

                <h3 id="updateServiceConfirmationTitle">
                    Confirm Service Changes
                </h3>

                <p>
                    Please review the information below.
                    Do you want to save these changes?
                </p>

                <div
                    class="update-service-confirmation-service-name"
                    id="updateServiceConfirmationServiceName"
                ></div>

                <div class="update-service-confirmation-summary">
                    <div>
                        <span>Category</span>
                        <strong id="updateServiceConfirmationCategory"></strong>
                    </div>

                    <div>
                        <span>Price</span>
                        <strong id="updateServiceConfirmationPrice"></strong>
                    </div>

                    <div>
                        <span>Duration</span>
                        <strong id="updateServiceConfirmationDuration"></strong>
                    </div>

                    <div>
                        <span>Status</span>
                        <strong id="updateServiceConfirmationStatus"></strong>
                    </div>
                </div>
            </div>

            <div class="update-service-confirmation-actions">
                <button
                    type="button"
                    class="update-service-confirmation-cancel"
                    id="cancelUpdateServiceConfirmation"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    No, Go Back
                </button>

                <button
                    type="button"
                    class="update-service-confirmation-confirm"
                    id="confirmUpdateServiceConfirmation"
                >
                    <i class="fa-solid fa-check"></i>
                    Confirm Update
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    updateServiceConfirmationModal = modal;

    confirmUpdateServiceButton =
        document.getElementById(
            "confirmUpdateServiceConfirmation"
        );

    cancelUpdateServiceButton =
        document.getElementById(
            "cancelUpdateServiceConfirmation"
        );

    closeUpdateServiceConfirmationButton =
        document.getElementById(
            "closeUpdateServiceConfirmation"
        );

    confirmUpdateServiceButton?.addEventListener(
        "click",
        confirmUpdateService
    );

    cancelUpdateServiceButton?.addEventListener(
        "click",
        closeUpdateServiceConfirmation
    );

    closeUpdateServiceConfirmationButton?.addEventListener(
        "click",
        closeUpdateServiceConfirmation
    );

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "[data-update-service-close]"
                )
            ) {
                closeUpdateServiceConfirmation();
            }

        }
    );

}


/* =========================================================
   OPEN UPDATE SERVICE CONFIRMATION
========================================================= */

function openUpdateServiceConfirmation(payload) {

    createUpdateServiceConfirmation();

    pendingServiceUpdate = {
        serviceId: editingServiceId,
        payload: { ...payload }
    };

    const nameElement =
        document.getElementById(
            "updateServiceConfirmationServiceName"
        );

    const categoryElement =
        document.getElementById(
            "updateServiceConfirmationCategory"
        );

    const priceElement =
        document.getElementById(
            "updateServiceConfirmationPrice"
        );

    const durationElement =
        document.getElementById(
            "updateServiceConfirmationDuration"
        );

    const statusElement =
        document.getElementById(
            "updateServiceConfirmationStatus"
        );

    if (nameElement) {
        nameElement.textContent = payload.name;
    }

    if (categoryElement) {
        categoryElement.textContent =
            getCategoryLabel(payload.category);
    }

    if (priceElement) {
        priceElement.textContent =
            `₱${Number(payload.price).toFixed(2)}`;
    }

    if (durationElement) {
        durationElement.textContent =
            payload.duration === null
                ? "Not specified"
                : `${payload.duration} minutes`;
    }

    if (statusElement) {
        statusElement.textContent =
            payload.status === "unavailable"
                ? "Unavailable"
                : "Available";
    }

    if (updateServiceConfirmationModal) {

        updateServiceConfirmationModal.classList.add("show");

        updateServiceConfirmationModal.setAttribute(
            "aria-hidden",
            "false"
        );

    }

}


/* =========================================================
   CLOSE UPDATE SERVICE CONFIRMATION
========================================================= */

function closeUpdateServiceConfirmation() {

    if (!updateServiceConfirmationModal) {
        return;
    }

    updateServiceConfirmationModal.classList.remove("show");

    updateServiceConfirmationModal.setAttribute(
        "aria-hidden",
        "true"
    );

    pendingServiceUpdate = null;

}


/* =========================================================
   CONFIRM UPDATE SERVICE
   The PUT request starts only after confirmation.
========================================================= */

async function confirmUpdateService() {

    if (
        !pendingServiceUpdate ||
        pendingServiceUpdate.serviceId === null
    ) {
        return;
    }

    const pending =
        pendingServiceUpdate;

    if (confirmUpdateServiceButton) {

        confirmUpdateServiceButton.disabled = true;

        confirmUpdateServiceButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Updating...
        `;

    }

    if (cancelUpdateServiceButton) {
        cancelUpdateServiceButton.disabled = true;
    }

    if (closeUpdateServiceConfirmationButton) {
        closeUpdateServiceConfirmationButton.disabled = true;
    }

    try {

        await saveServiceRequest(
            pending.serviceId,
            pending.payload,
            true
        );

    } finally {

        if (confirmUpdateServiceButton) {

            confirmUpdateServiceButton.disabled = false;

            confirmUpdateServiceButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Confirm Update
            `;

        }

        if (cancelUpdateServiceButton) {
            cancelUpdateServiceButton.disabled = false;
        }

        if (closeUpdateServiceConfirmationButton) {
            closeUpdateServiceConfirmationButton.disabled = false;
        }

    }

}


/* =========================================================
   LOAD SERVICES
========================================================= */

async function loadServices() {

    if (servicesLoading) {
        servicesLoading.style.display = "flex";
    }

    if (servicesError) {
        servicesError.style.display = "none";
    }

    if (servicesEmpty) {
        servicesEmpty.style.display = "none";
    }

    try {

        const response =
            await fetch(
                `${ADMIN_API_BASE}/api/admin/services`,
                {
                    method: "GET",
                    headers: getAdminHeaders()
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to load services."
            );

        }

        services =
            Array.isArray(data.services)
                ? data.services
                : [];

        updateSummary();

        applyFilters();

    } catch (error) {

        console.error(
            "Load services error:",
            error
        );

        if (servicesLoading) {
            servicesLoading.style.display = "none";
        }

        if (servicesError) {
            servicesError.style.display = "flex";
        }

        if (servicesErrorMessage) {
            servicesErrorMessage.textContent =
                error.message ||
                "Unable to load services.";
        }

    }

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    const total =
        services.length;

    const active =
        services.filter(
            service => isServiceActive(service)
        ).length;

    const average =
        total > 0
            ? services.reduce(
                (sum, service) => {
                    return sum + Number(service.price || 0);
                },
                0
            ) / total
            : 0;

    if (totalServices) {
        totalServices.textContent = total;
    }

    if (activeServices) {
        activeServices.textContent = active;
    }

    if (averagePrice) {
        averagePrice.textContent =
            `₱${average.toFixed(2)}`;
    }

}


/* =========================================================
   SERVICE STATUS
========================================================= */

function isServiceActive(service) {

    const status =
        String(service.status || "").toLowerCase();

    return (
        status === "available" ||
        status === "active" ||
        Number(service.is_active) === 1
    );

}


/* =========================================================
   NORMALIZE CATEGORY
========================================================= */

function normalizeCategory(category) {

    const value =
        String(category || "maintenance")
            .trim()
            .toLowerCase();

    if (value === "repair") {
        return "repair";
    }

    if (value === "upgrade") {
        return "upgrade";
    }

    return "maintenance";

}


/* =========================================================
   CATEGORY LABEL
========================================================= */

function getCategoryLabel(category) {

    const normalized =
        normalizeCategory(category);

    if (normalized === "repair") {
        return "Repair";
    }

    if (normalized === "upgrade") {
        return "Upgrade";
    }

    return "Maintenance";

}


/* =========================================================
   FILTERS
========================================================= */

function applyFilters() {

    const search =
        String(serviceSearch?.value || "")
            .trim()
            .toLowerCase();

    const status =
        String(serviceStatusFilter?.value || "all")
            .toLowerCase();

    filteredServices =
        services.filter(service => {

            const name =
                String(service.name || "").toLowerCase();

            const description =
                String(service.description || "").toLowerCase();

            const category =
                normalizeCategory(service.category);

            const matchesSearch =
                !search ||
                name.includes(search) ||
                description.includes(search) ||
                category.includes(search);

            let matchesStatus = true;

            if (status === "active") {
                matchesStatus = isServiceActive(service);
            }

            if (status === "inactive") {
                matchesStatus = !isServiceActive(service);
            }

            return matchesSearch && matchesStatus;

        });

    renderServices();

}


/* =========================================================
   RENDER SERVICES
========================================================= */

function renderServices() {

    if (servicesLoading) {
        servicesLoading.style.display = "none";
    }

    if (displayedServices) {

        displayedServices.textContent =
            `${filteredServices.length} ${
                filteredServices.length === 1
                    ? "service"
                    : "services"
            }`;

    }

    if (!servicesGrid) {
        return;
    }

    if (filteredServices.length === 0) {

        servicesGrid.innerHTML = "";

        if (servicesEmpty) {
            servicesEmpty.style.display = "block";
        }

        return;

    }

    if (servicesEmpty) {
        servicesEmpty.style.display = "none";
    }

    servicesGrid.innerHTML =
        filteredServices.map(createServiceCard).join("");

}


/* =========================================================
   CREATE SERVICE CARD
========================================================= */

function createServiceCard(service) {

    const id =
        Number(service.id);

    const name =
        service.name || "Unnamed Service";

    const category =
        normalizeCategory(service.category);

    const categoryLabel =
        getCategoryLabel(category);

    const description =
        service.description || "No description provided.";

    const price =
        Number(service.price || 0);

    const duration =
        service.duration !== null &&
        service.duration !== undefined &&
        service.duration !== ""
            ? `${service.duration} min`
            : "Not specified";

    const active =
        isServiceActive(service);

    const statusText =
        active ? "Available" : "Unavailable";

    return `
        <article
            class="service-card"
            data-service-id="${id}"
        >
            <div class="service-header">
                <div>
                    <span class="service-category-tag">
                        ${escapeHtml(categoryLabel)}
                    </span>

                    <h3 class="service-name">
                        ${escapeHtml(name)}
                    </h3>
                </div>

                <span class="status-badge ${active ? "active" : "inactive"}">
                    ${escapeHtml(statusText)}
                </span>
            </div>

            <div class="service-card-body">
                <p class="service-description">
                    ${escapeHtml(description)}
                </p>

                <div class="service-meta-grid">
                    <div class="meta-item">
                        <span>Price</span>
                        <strong>₱${price.toFixed(2)}</strong>
                    </div>

                    <div class="meta-item">
                        <span>Duration</span>
                        <strong>${escapeHtml(duration)}</strong>
                    </div>
                </div>

                <div class="service-actions">
                    <button
                        type="button"
                        class="action-button edit"
                        data-action="edit"
                        data-service-id="${id}"
                    >
                        <i class="fa-solid fa-pen"></i>
                        Edit
                    </button>

                    <button
                        type="button"
                        class="action-button delete"
                        data-action="delete"
                        data-service-id="${id}"
                    >
                        <i class="fa-solid fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        </article>
    `;

}


/* =========================================================
   CLOSE SERVICE FORM COMPLETELY
========================================================= */

function closeServiceForm() {

    editingServiceId = null;

    if (serviceForm) {
        delete serviceForm.dataset.confirmedAdd;
    }

    if (serviceFormModal) {

        serviceFormModal.classList.remove("show");

        serviceFormModal.style.display = "none";

    }

    if (serviceForm) {
        serviceForm.reset();
    }

    if (serviceIdInput) {
        serviceIdInput.value = "";
    }

    const serviceListCard =
        document.getElementById("serviceListCard");

    if (serviceListCard) {
        serviceListCard.style.display = "";
    }

}


/* =========================================================
   OPEN SERVICE DETAILS
========================================================= */

function openServiceDetails(id) {

    const service =
        services.find(
            item => Number(item.id) === Number(id)
        );

    if (!service || !serviceModal || !serviceDetails) {
        return;
    }

    const active =
        isServiceActive(service);

    const category =
        getCategoryLabel(service.category);

    const price =
        Number(service.price || 0);

    const duration =
        service.duration !== null &&
        service.duration !== undefined &&
        service.duration !== ""
            ? `${service.duration} minutes`
            : "Not specified";

    serviceDetails.innerHTML = `
        <div class="service-detail-content">
            <div class="detail-section">
                <span class="detail-label">Service Name</span>
                <strong>
                    ${escapeHtml(service.name || "Unnamed Service")}
                </strong>
            </div>

            <div class="detail-section">
                <span class="detail-label">Category</span>
                <strong>${escapeHtml(category)}</strong>
            </div>

            <div class="detail-section">
                <span class="detail-label">Description</span>
                <p>
                    ${escapeHtml(
                        service.description || "No description provided."
                    )}
                </p>
            </div>

            <div class="detail-grid">
                <div>
                    <span class="detail-label">Price</span>
                    <strong>₱${price.toFixed(2)}</strong>
                </div>

                <div>
                    <span class="detail-label">Duration</span>
                    <strong>${escapeHtml(duration)}</strong>
                </div>

                <div>
                    <span class="detail-label">Status</span>
                    <strong>${active ? "Available" : "Unavailable"}</strong>
                </div>
            </div>
        </div>
    `;

    serviceModal.classList.add("show");

}


/* =========================================================
   CLOSE SERVICE DETAILS
========================================================= */

function closeServiceDetails() {

    if (!serviceModal) {
        return;
    }

    serviceModal.classList.remove("show");

}


/* =========================================================
   OPEN ADD SERVICE
========================================================= */

function openAddModal() {

    editingServiceId = null;

    if (serviceForm) {

        serviceForm.reset();

        delete serviceForm.dataset.confirmedAdd;

    }

    if (serviceIdInput) {
        serviceIdInput.value = "";
    }

    setCategorySelect();

    if (serviceFormTitle) {
        serviceFormTitle.textContent = "Add Service";
    }

    if (serviceFormSubtitle) {
        serviceFormSubtitle.textContent =
            "Create a new motorcycle service.";
    }

    if (submitServiceButton) {

        submitServiceButton.innerHTML = `
            <i class="fa-solid fa-plus"></i>
            Add Service
        `;

    }

    if (serviceStatusInput) {
        serviceStatusInput.value = "available";
    }

    if (serviceFormModal) {

        serviceFormModal.classList.add("show");

        serviceFormModal.style.display = "flex";

    }

}


/* =========================================================
   OPEN EDIT SERVICE
========================================================= */

function openEditModal(id) {

    const service =
        services.find(
            item => Number(item.id) === Number(id)
        );

    if (!service) {

        showToast(
            "Error",
            "Service could not be found.",
            "error"
        );

        return;

    }

    editingServiceId = Number(service.id);

    if (serviceForm) {
        delete serviceForm.dataset.confirmedAdd;
    }

    if (serviceIdInput) {
        serviceIdInput.value = service.id;
    }

    if (serviceNameInput) {
        serviceNameInput.value = service.name || "";
    }

    setCategorySelect(service.category);

    if (servicePriceInput) {
        servicePriceInput.value = service.price ?? "";
    }

    if (serviceDurationInput) {
        serviceDurationInput.value = service.duration ?? "";
    }

    if (serviceDescriptionInput) {
        serviceDescriptionInput.value = service.description || "";
    }

    if (serviceStatusInput) {

        let status =
            String(service.status || "").toLowerCase();

        if (status === "active") {
            status = "available";
        }

        if (status === "inactive") {
            status = "unavailable";
        }

        serviceStatusInput.value =
            status === "unavailable"
                ? "unavailable"
                : "available";

    }

    if (serviceFormTitle) {
        serviceFormTitle.textContent = "Edit Service";
    }

    if (serviceFormSubtitle) {
        serviceFormSubtitle.textContent =
            "Update the service information.";
    }

    if (submitServiceButton) {

        submitServiceButton.innerHTML = `
            <i class="fa-solid fa-floppy-disk"></i>
            Update Service
        `;

    }

    if (serviceFormModal) {

        serviceFormModal.classList.add("show");

        serviceFormModal.style.display = "flex";

    }

}


/* =========================================================
   CATEGORY SELECT
========================================================= */

function setCategorySelect(selectedValue) {

    const currentField =
        document.getElementById("serviceCategory");

    if (!currentField) {
        return;
    }

    if (currentField.tagName.toLowerCase() === "select") {

        currentField.innerHTML = `
            <option value="repair">Repair</option>
            <option value="maintenance">Maintenance</option>
            <option value="upgrade">Upgrade</option>
        `;

        currentField.value =
            normalizeCategory(selectedValue);

        return;

    }

    const select =
        document.createElement("select");

    select.id = currentField.id;

    select.name =
        currentField.name || "category";

    select.className =
        currentField.className;

    select.required = true;

    select.innerHTML = `
        <option value="repair">Repair</option>
        <option value="maintenance">Maintenance</option>
        <option value="upgrade">Upgrade</option>
    `;

    select.value =
        normalizeCategory(selectedValue);

    currentField.replaceWith(select);

}


/* =========================================================
   GET CURRENT CATEGORY FIELD
========================================================= */

function getCategoryField() {

    return (
        document.getElementById("serviceCategory") ||
        null
    );

}


/* =========================================================
   SUBMIT ADD / EDIT FORM
========================================================= */

async function handleServiceSubmit(event) {

    event.preventDefault();

    if (submitServiceButton?.disabled) {
        return;
    }

    const name =
        String(serviceNameInput?.value || "").trim();

    const categoryField =
        getCategoryField();

    const category =
        normalizeCategory(categoryField?.value);

    const price =
        Number(servicePriceInput?.value);

    const durationValue =
        String(serviceDurationInput?.value || "").trim();

    const duration =
        durationValue === ""
            ? null
            : Number(durationValue);

    const description =
        String(serviceDescriptionInput?.value || "").trim();

    let status =
        String(serviceStatusInput?.value || "available")
            .toLowerCase();

    if (status === "active") {
        status = "available";
    }

    if (status === "inactive") {
        status = "unavailable";
    }


    /* ---------------------------------------------
       VALIDATION
    --------------------------------------------- */

    if (!name) {

        showToast(
            "Validation Error",
            "Please enter a service name.",
            "error"
        );

        serviceNameInput?.focus();

        return;

    }

    if (!Number.isFinite(price) || price < 0) {

        showToast(
            "Validation Error",
            "Please enter a valid service price.",
            "error"
        );

        servicePriceInput?.focus();

        return;

    }

    if (
        duration !== null &&
        (
            !Number.isInteger(duration) ||
            duration < 0
        )
    ) {

        showToast(
            "Validation Error",
            "Duration must be a whole number of minutes.",
            "error"
        );

        serviceDurationInput?.focus();

        return;

    }


    /* ---------------------------------------------
       PREPARE PAYLOAD
    --------------------------------------------- */

    const payload = {

        name: name,

        category: category,

        description: description || null,

        price: price,

        duration: duration,

        status:
            status === "unavailable"
                ? "unavailable"
                : "available"

    };


    /* ---------------------------------------------
       ADD SERVICE CONFIRMATION
    --------------------------------------------- */

    if (
        editingServiceId === null &&
        serviceForm?.dataset.confirmedAdd !== "true"
    ) {

        openAddServiceConfirmation();

        return;

    }


    /* ---------------------------------------------
       UPDATE SERVICE CONFIRMATION
    --------------------------------------------- */

    if (editingServiceId !== null) {

        openUpdateServiceConfirmation(payload);

        return;

    }


    /* ---------------------------------------------
       REMOVE ADD CONFIRMATION FLAG
    --------------------------------------------- */

    if (serviceForm) {
        delete serviceForm.dataset.confirmedAdd;
    }


    /* ---------------------------------------------
       ADD SERVICE REQUEST
    --------------------------------------------- */

    await saveServiceRequest(
        null,
        payload,
        false
    );

}


/* =========================================================
   SAVE SERVICE REQUEST
   Handles the existing POST and PUT API requests.
========================================================= */

async function saveServiceRequest(
    serviceId,
    payload,
    isEditing
) {

    if (submitServiceButton) {

        submitServiceButton.disabled = true;

        submitServiceButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            ${isEditing ? "Updating..." : "Adding..."}
        `;

    }

    try {

        const url =
            isEditing
                ? `${ADMIN_API_BASE}/api/admin/services/${serviceId}`
                : `${ADMIN_API_BASE}/api/admin/services`;

        const method =
            isEditing ? "PUT" : "POST";

        const response =
            await fetch(
                url,
                {
                    method: method,
                    headers: getAdminHeaders(),
                    body: JSON.stringify(payload)
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                (
                    isEditing
                        ? "Unable to update service."
                        : "Unable to create service."
                )
            );

        }


        /* ---------------------------------------------
           SUCCESS
        --------------------------------------------- */

        closeAddServiceConfirmation();

        closeUpdateServiceConfirmation();

        closeServiceForm();

        showToast(
            "Success",
            isEditing
                ? "Service updated successfully."
                : "Service added successfully.",
            "success"
        );

        await loadServices();

        return true;

    } catch (error) {

        console.error(
            "Save service error:",
            error
        );

        showToast(
            "Error",
            error.message || "Unable to save service.",
            "error"
        );

        return false;

    } finally {

        if (submitServiceButton) {

            submitServiceButton.disabled = false;

            submitServiceButton.innerHTML = `
                <i class="fa-solid ${
                    editingServiceId !== null
                        ? "fa-floppy-disk"
                        : "fa-plus"
                }"></i>
                ${
                    editingServiceId !== null
                        ? "Update Service"
                        : "Add Service"
                }
            `;

        }

    }

}


/* =========================================================
   OPEN DELETE CONFIRMATION
========================================================= */

function openDeleteModal(id) {

    const service =
        services.find(
            item => Number(item.id) === Number(id)
        );

    if (!service) {

        showToast(
            "Error",
            "Service could not be found.",
            "error"
        );

        return;

    }

    deletingServiceId = Number(service.id);

    if (deleteServiceName) {
        deleteServiceName.textContent =
            service.name || "this service";
    }

    if (deleteModal) {
        deleteModal.classList.add("show");
    }

}


/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

function closeDeleteModal() {

    deletingServiceId = null;

    if (deleteModal) {
        deleteModal.classList.remove("show");
    }

}


/* =========================================================
   DELETE SERVICE
========================================================= */

async function deleteService() {

    if (deletingServiceId === null) {
        return;
    }

    const id =
        deletingServiceId;

    if (confirmDeleteButton) {

        confirmDeleteButton.disabled = true;

        confirmDeleteButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Deleting...
        `;

    }

    try {

        const response =
            await fetch(
                `${ADMIN_API_BASE}/api/admin/services/${id}`,
                {
                    method: "DELETE",
                    headers: getAdminHeaders()
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message || "Unable to delete service."
            );

        }

        closeDeleteModal();

        showToast(
            "Success",
            "Service deleted successfully.",
            "success"
        );

        await loadServices();

    } catch (error) {

        console.error(
            "Delete service error:",
            error
        );

        showToast(
            "Error",
            error.message || "Unable to delete service.",
            "error"
        );

    } finally {

        if (confirmDeleteButton) {

            confirmDeleteButton.disabled = false;

            confirmDeleteButton.innerHTML = `
                <i class="fa-solid fa-trash"></i>
                Delete Service
            `;

        }

    }

}


/* =========================================================
   CARD BUTTON HANDLING
========================================================= */

function handleServiceCardClick(event) {

    const button =
        event.target.closest("[data-action]");

    if (!button) {
        return;
    }

    const action =
        button.dataset.action;

    const id =
        Number(button.dataset.serviceId);

    if (!Number.isInteger(id)) {
        return;
    }

    event.preventDefault();

    event.stopPropagation();

    if (action === "edit") {

        openEditModal(id);

        return;

    }

    if (action === "delete") {

        openDeleteModal(id);

        return;

    }

}


/* =========================================================
   SERVICE CARD DETAILS
========================================================= */

function handleServiceCardDetails(event) {

    if (event.target.closest("[data-action]")) {
        return;
    }

    const card =
        event.target.closest(".service-card");

    if (!card) {
        return;
    }

    const id =
        Number(card.dataset.serviceId);

    if (Number.isInteger(id)) {
        openServiceDetails(id);
    }

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(
    title,
    message,
    type = "success"
) {

    if (!toast) {

        alert(`${title}\n${message}`);

        return;

    }

    if (toastTitle) {
        toastTitle.textContent = title;
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    toast.classList.remove("success", "error");

    toast.classList.add(type);

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove("show");
            },
            4000
        );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

if (refreshServices) {

    refreshServices.addEventListener(
        "click",
        loadServices
    );

}

if (retryServices) {

    retryServices.addEventListener(
        "click",
        loadServices
    );

}

if (serviceSearch) {

    serviceSearch.addEventListener(
        "input",
        applyFilters
    );

}

if (serviceStatusFilter) {

    serviceStatusFilter.addEventListener(
        "change",
        applyFilters
    );

}

if (clearServiceFilters) {

    clearServiceFilters.addEventListener(
        "click",
        () => {

            if (serviceSearch) {
                serviceSearch.value = "";
            }

            if (serviceStatusFilter) {
                serviceStatusFilter.value = "all";
            }

            applyFilters();

        }
    );

}


/* ---------------------------------------------
   SERVICE CARD ACTIONS
--------------------------------------------- */

if (servicesGrid) {

    servicesGrid.addEventListener(
        "click",
        handleServiceCardClick
    );

    servicesGrid.addEventListener(
        "click",
        handleServiceCardDetails
    );

}


/* ---------------------------------------------
   DETAILS MODAL
--------------------------------------------- */

if (closeServiceModal) {

    closeServiceModal.addEventListener(
        "click",
        closeServiceDetails
    );

}

if (serviceModal) {

    serviceModal.addEventListener(
        "click",
        event => {

            if (event.target === serviceModal) {
                closeServiceDetails();
            }

        }
    );

}


/* ---------------------------------------------
   FORM MODAL
--------------------------------------------- */

if (serviceForm) {

    serviceForm.addEventListener(
        "submit",
        handleServiceSubmit
    );

}

if (closeServiceFormModal) {

    closeServiceFormModal.addEventListener(
        "click",
        closeServiceForm
    );

}

if (cancelServiceForm) {

    cancelServiceForm.addEventListener(
        "click",
        closeServiceForm
    );

}

if (serviceFormModal) {

    serviceFormModal.addEventListener(
        "click",
        event => {

            if (event.target === serviceFormModal) {
                closeServiceForm();
            }

        }
    );

}


/* ---------------------------------------------
   DELETE MODAL
--------------------------------------------- */

if (closeDeleteModalButton) {

    closeDeleteModalButton.addEventListener(
        "click",
        closeDeleteModal
    );

}

if (cancelDeleteButton) {

    cancelDeleteButton.addEventListener(
        "click",
        closeDeleteModal
    );

}

if (confirmDeleteButton) {

    confirmDeleteButton.addEventListener(
        "click",
        deleteService
    );

}

if (deleteModal) {

    deleteModal.addEventListener(
        "click",
        event => {

            if (event.target === deleteModal) {
                closeDeleteModal();
            }

        }
    );

}


/* ---------------------------------------------
   TOAST
--------------------------------------------- */

if (toastClose) {

    toastClose.addEventListener(
        "click",
        () => {
            toast?.classList.remove("show");
        }
    );

}


/* ---------------------------------------------
   ESCAPE KEY
--------------------------------------------- */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }

        closeServiceDetails();

        closeServiceForm();

        closeDeleteModal();

        closeAddServiceConfirmation();

        closeUpdateServiceConfirmation();

    }
);


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.openAddModal =
    openAddModal;

window.openEditModal =
    openEditModal;

window.openDeleteModal =
    openDeleteModal;

window.loadServices =
    loadServices;


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadAdminProfile();

        setCategorySelect();

        createAddServiceConfirmation();

        createUpdateServiceConfirmation();

        if (serviceFormModal) {

            serviceFormModal.classList.remove("show");

            serviceFormModal.style.display = "none";

        }

        if (checkAdminLogin()) {
            loadServices();
        }

    }
);