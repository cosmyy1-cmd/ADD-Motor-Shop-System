/* =========================================================
   ADD MOTOR SHOP
   ADMIN - MOTORCYCLES
   motorcycle-details.js

   COMPLETE UPDATED VERSION

   FEATURES:
   - Loads motorcycles from API
   - Keeps search functionality
   - Keeps brand filtering
   - Keeps summary cards
   - Keeps motorcycle list cards
   - Keeps View button
   - Keeps table-style motorcycle details
   - Keeps owner information
   - Keeps registration information
   - View modal has a scrollable body
   - Modal header remains visible while scrolling
   - Keeps Close button
   - Keeps Escape key
   - Keeps backdrop close
   - Keeps toast functionality
========================================================= */

const ADMIN_API_BASE = "http://localhost:3000";


// =========================================================
// DATA
// =========================================================

let motorcycles = [];
let currentMotorcycle = null;
let toastTimer = null;
let initialized = false;


// =========================================================
// DOM ELEMENTS
// =========================================================

let adminNameElement;
let adminAvatarElement;

let refreshButton;
let searchInput;
let brandFilter;

let motorcyclesLoading;
let motorcyclesError;
let motorcyclesErrorMessage;
let motorcyclesEmpty;
let motorcyclesList;

let totalMotorcyclesElement;
let primaryMotorcyclesElement;
let uniqueOwnersElement;
let registeredMotorcyclesElement;
let recentMotorcyclesElement;

let displayedMotorcyclesElement;

let motorcycleModal;
let motorcycleModalBody;
let closeMotorcycleModalButton;

let toast;


// =========================================================
// DOM HELPER
// =========================================================

function findElement(ids = [], selectors = []) {

    for (const id of ids) {

        const element = document.getElementById(id);

        if (element) {
            return element;
        }

    }


    for (const selector of selectors) {

        const element = document.querySelector(selector);

        if (element) {
            return element;
        }

    }


    return null;

}


// =========================================================
// INITIALIZE DOM ELEMENTS
// =========================================================

function initializeElements() {

    adminNameElement =
        findElement([
            "adminName"
        ]);


    adminAvatarElement =
        findElement([
            "adminAvatar"
        ]);


    refreshButton =
        findElement(
            [
                "refreshMotorcycles",
                "refreshMotorcycle",
                "refreshButton"
            ],
            [
                ".refresh-button",
                ".refresh-btn"
            ]
        );


    searchInput =
        findElement(
            [
                "motorcycleSearch",
                "searchMotorcycles",
                "motorcycleSearchInput"
            ],
            [
                ".motorcycle-search input",
                ".search-box input"
            ]
        );


    brandFilter =
        findElement(
            [
                "brandFilter",
                "motorcycleBrandFilter"
            ]
        );


    motorcyclesLoading =
        findElement(
            [
                "motorcyclesLoading",
                "loadingMotorcycles",
                "motorcycleLoading",
                "loadingState"
            ],
            [
                ".motorcycles-loading",
                ".customers-loading",
                ".loading-state"
            ]
        );


    motorcyclesError =
        findElement(
            [
                "motorcyclesError",
                "motorcycleError",
                "errorState"
            ],
            [
                ".motorcycles-error",
                ".customers-error",
                ".error-state"
            ]
        );


    motorcyclesErrorMessage =
        findElement(
            [
                "motorcyclesErrorMessage",
                "motorcycleErrorMessage",
                "errorMessage"
            ],
            [
                ".motorcycles-error p",
                ".customers-error p",
                ".error-state p"
            ]
        );


    motorcyclesEmpty =
        findElement(
            [
                "motorcyclesEmpty",
                "motorcycleEmpty",
                "emptyState"
            ],
            [
                ".motorcycles-empty",
                ".customers-empty",
                ".empty-state"
            ]
        );


    motorcyclesList =
        findElement(
            [
                "motorcyclesList",
                "motorcyclesGrid",
                "motorcyclesContainer",
                "motorcycleList",
                "motorcycleGrid"
            ],
            [
                ".motorcycles-list",
                ".motorcycles-grid",
                ".customers-list",
                ".customers-grid"
            ]
        );


    totalMotorcyclesElement =
        findElement([
            "totalMotorcycles",
            "totalMotorcycle"
        ]);


    primaryMotorcyclesElement =
        findElement([
            "primaryMotorcycles",
            "primaryMotorcycle"
        ]);


    uniqueOwnersElement =
        findElement([
            "uniqueOwners",
            "motorcycleOwners",
            "totalOwners",
            "registeredOwners"
        ]);


    registeredMotorcyclesElement =
        findElement([
            "registeredMotorcycles",
            "registeredMotorcycle",
            "motorcyclesWithPlates"
        ]);


    recentMotorcyclesElement =
        findElement([
            "recentMotorcycles",
            "recentMotorcycle",
            "newMotorcycles"
        ]);


    displayedMotorcyclesElement =
        findElement([
            "displayedMotorcycles",
            "motorcycleCount",
            "displayedMotorcycle"
        ]);


    motorcycleModal =
        findElement(
            [
                "motorcycleModal",
                "motorcycleDetailsModal"
            ],
            [
                ".motorcycle-modal",
                ".modal-overlay"
            ]
        );


    motorcycleModalBody =
        findElement(
            [
                "motorcycleModalBody",
                "motorcycleDetails",
                "motorcycleDetail"
            ],
            [
                "#motorcycleModal .modal-body",
                "#motorcycleDetailsModal .modal-body"
            ]
        );


    closeMotorcycleModalButton =
        findElement(
            [
                "closeMotorcycleModal",
                "closeMotorcycleDetails",
                "closeMotorcycleModalButton"
            ],
            [
                "#motorcycleModal .modal-close",
                "#motorcycleModal .close-button",
                "#motorcycleModal .modal-close-button"
            ]
        );


    toast =
        findElement([
            "toast"
        ]);

}


// =========================================================
// GET ADMIN USER
// =========================================================

function getAdminUser() {

    const keys = [
        "adminUser",
        "addMotorUser",
        "user"
    ];


    for (const key of keys) {

        try {

            const raw =
                localStorage.getItem(key);


            if (!raw) {
                continue;
            }


            const user =
                JSON.parse(raw);


            if (!user) {
                continue;
            }


            if (
                user.role === "admin" ||
                user.role === "administrator"
            ) {

                return user;

            }

        }
        catch (error) {

            console.warn(
                `Could not read ${key}.`,
                error
            );

        }

    }


    return null;

}


// =========================================================
// ADMIN HEADERS
// =========================================================

function getAdminHeaders() {

    const user =
        getAdminUser();


    const headers = {
        "Accept": "application/json"
    };


    if (
        user &&
        user.id !== undefined &&
        user.id !== null
    ) {

        headers["x-admin-id"] =
            String(user.id);

    }


    return headers;

}


// =========================================================
// INITIALIZE ADMIN PROFILE
// =========================================================

function initializeAdmin() {

    const user =
        getAdminUser();


    if (!user) {

        if (adminNameElement) {

            adminNameElement.textContent =
                "Administrator";

        }


        if (adminAvatarElement) {

            adminAvatarElement.textContent =
                "A";

        }


        return;

    }


    const name =
        user.name ||
        user.full_name ||
        user.username ||
        "Administrator";


    if (adminNameElement) {

        adminNameElement.textContent =
            name;

    }


    if (adminAvatarElement) {

        adminAvatarElement.textContent =
            getInitials(name);

    }

}


// =========================================================
// GET INITIALS
// =========================================================

function getInitials(name) {

    const value =
        String(name || "").trim();


    if (!value) {
        return "A";
    }


    const parts =
        value.split(/\s+/);


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();

}


// =========================================================
// FORCE HIDE
// =========================================================

function forceHide(element) {

    if (!element) {
        return;
    }


    element.hidden = true;


    element.style.setProperty(
        "display",
        "none",
        "important"
    );

}


// =========================================================
// FORCE SHOW
// =========================================================

function forceShow(
    element,
    display = "block"
) {

    if (!element) {
        return;
    }


    element.hidden = false;


    element.style.setProperty(
        "display",
        display,
        "important"
    );

}


// =========================================================
// LOADING STATE
// =========================================================

function showLoadingState() {

    forceShow(
        motorcyclesLoading,
        "flex"
    );


    forceHide(
        motorcyclesError
    );


    forceHide(
        motorcyclesEmpty
    );

}


function hideLoadingState() {

    forceHide(
        motorcyclesLoading
    );

}


// =========================================================
// ERROR STATE
// =========================================================

function showErrorState(message) {

    hideLoadingState();


    forceHide(
        motorcyclesEmpty
    );


    if (motorcyclesList) {

        motorcyclesList.style.setProperty(
            "display",
            "none",
            "important"
        );

    }


    forceShow(
        motorcyclesError,
        "flex"
    );


    if (motorcyclesErrorMessage) {

        motorcyclesErrorMessage.textContent =
            message ||
            "Unable to load motorcycles.";

    }

}


// =========================================================
// EMPTY STATE
// =========================================================

function showEmptyState() {

    hideLoadingState();


    forceHide(
        motorcyclesError
    );


    if (motorcyclesList) {

        motorcyclesList.style.setProperty(
            "display",
            "none",
            "important"
        );

    }


    forceShow(
        motorcyclesEmpty,
        "flex"
    );

}


// =========================================================
// CLEAR STATES
// =========================================================

function clearStates() {

    hideLoadingState();


    forceHide(
        motorcyclesError
    );


    forceHide(
        motorcyclesEmpty
    );

}


// =========================================================
// FETCH WITH TIMEOUT
// =========================================================

async function fetchWithTimeout(
    url,
    options = {},
    timeout = 10000
) {

    const controller =
        new AbortController();


    const timeoutId =
        setTimeout(
            () => {

                controller.abort();

            },
            timeout
        );


    try {

        const response =
            await fetch(
                url,
                {
                    ...options,
                    signal:
                        controller.signal
                }
            );


        return response;

    }
    catch (error) {

        if (
            error &&
            error.name === "AbortError"
        ) {

            throw new Error(
                "The motorcycle API did not respond within 10 seconds."
            );

        }


        throw error;

    }
    finally {

        clearTimeout(
            timeoutId
        );

    }

}


// =========================================================
// LOAD MOTORCYCLES
// =========================================================

async function loadMotorcycles() {

    showLoadingState();


    if (refreshButton) {

        refreshButton.disabled =
            true;


        const icon =
            refreshButton.querySelector("i");


        if (icon) {

            icon.classList.add(
                "fa-spin"
            );

        }

    }


    try {

        const response =
            await fetchWithTimeout(
                `${ADMIN_API_BASE}/api/admin/motorcycles`,
                {
                    method: "GET",
                    headers: getAdminHeaders(),
                    cache: "no-store"
                },
                10000
            );


        const text =
            await response.text();


        let data = null;


        try {

            data =
                text
                    ? JSON.parse(text)
                    : null;

        }
        catch (error) {

            throw new Error(
                "The motorcycles API returned an invalid response."
            );

        }


        if (!response.ok) {

            if (response.status === 401) {

                throw new Error(
                    "Admin authentication is required."
                );

            }


            if (response.status === 403) {

                throw new Error(
                    "You are not authorized to view motorcycles."
                );

            }


            if (response.status === 404) {

                throw new Error(
                    "Admin motorcycle API endpoint not found."
                );

            }


            throw new Error(
                data?.message ||
                data?.error ||
                `Unable to load motorcycles. HTTP ${response.status}.`
            );

        }


        let result = [];


        if (Array.isArray(data)) {

            result = data;

        }
        else if (
            data &&
            Array.isArray(data.motorcycles)
        ) {

            result =
                data.motorcycles;

        }
        else if (
            data &&
            data.data &&
            Array.isArray(data.data.motorcycles)
        ) {

            result =
                data.data.motorcycles;

        }
        else if (
            data &&
            data.data &&
            Array.isArray(data.data)
        ) {

            result =
                data.data;

        }
        else if (
            data &&
            Array.isArray(data.result)
        ) {

            result =
                data.result;

        }


        motorcycles =
            Array.isArray(result)
                ? result
                : [];


        updateBrandFilter();

        updateSummary();

        renderMotorcycles();

    }
    catch (error) {

        console.error(
            "Failed to load motorcycles:",
            error
        );


        motorcycles = [];


        showErrorState(
            error?.message ||
            "Unable to load motorcycles."
        );

    }
    finally {

        hideLoadingState();


        if (refreshButton) {

            refreshButton.disabled =
                false;


            const icon =
                refreshButton.querySelector("i");


            if (icon) {

                icon.classList.remove(
                    "fa-spin"
                );

            }

        }

    }

}


// =========================================================
// UPDATE BRAND FILTER
// =========================================================

function updateBrandFilter() {

    if (!brandFilter) {
        return;
    }


    const currentValue =
        brandFilter.value;


    const brands =
        [
            ...new Set(
                motorcycles
                    .map(
                        motorcycle =>
                            motorcycle.brand
                    )
                    .filter(Boolean)
                    .map(
                        brand =>
                            String(brand).trim()
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );


    brandFilter.innerHTML = `
        <option value="all">
            All Brands
        </option>
    `;


    brands.forEach(
        brand => {

            const option =
                document.createElement("option");


            option.value =
                brand;


            option.textContent =
                brand;


            brandFilter.appendChild(
                option
            );

        }
    );


    if (
        currentValue &&
        (
            currentValue === "all" ||
            brands.includes(currentValue)
        )
    ) {

        brandFilter.value =
            currentValue;

    }

}


// =========================================================
// UPDATE SUMMARY
// =========================================================

function updateSummary() {

    const total =
        motorcycles.length;


    const primary =
        motorcycles.filter(
            motorcycle =>
                isPrimaryMotorcycle(motorcycle)
        ).length;


    const ownerSet =
        new Set();


    motorcycles.forEach(
        motorcycle => {

            const ownerId =
                motorcycle.owner_id ??
                motorcycle.user_id ??
                motorcycle.customer_id ??
                motorcycle.ownerId ??
                motorcycle.customerId;


            const ownerEmail =
                motorcycle.owner_email ??
                motorcycle.email;


            if (
                ownerId !== undefined &&
                ownerId !== null &&
                String(ownerId).trim()
            ) {

                ownerSet.add(
                    `id:${ownerId}`
                );

            }
            else if (
                ownerEmail
            ) {

                ownerSet.add(
                    `email:${String(ownerEmail).toLowerCase()}`
                );

            }

        }
    );


    const uniqueOwners =
        ownerSet.size;


    const withPlates =
        motorcycles.filter(
            motorcycle => {

                const plate =
                    motorcycle.plate_number ||
                    motorcycle.plate ||
                    motorcycle.plateNumber;


                return Boolean(
                    String(plate || "").trim()
                );

            }
        ).length;


    const now =
        Date.now();


    const thirtyDays =
        30 *
        24 *
        60 *
        60 *
        1000;


    const recent =
        motorcycles.filter(
            motorcycle => {

                const dateValue =
                    motorcycle.created_at ||
                    motorcycle.registered_at ||
                    motorcycle.registration_date;


                if (!dateValue) {
                    return false;
                }


                const time =
                    new Date(
                        dateValue
                    ).getTime();


                if (
                    Number.isNaN(time)
                ) {

                    return false;

                }


                return (
                    now - time <= thirtyDays &&
                    now - time >= 0
                );

            }
        ).length;


    setText(
        totalMotorcyclesElement,
        total
    );


    setText(
        primaryMotorcyclesElement,
        primary
    );


    setText(
        uniqueOwnersElement,
        uniqueOwners
    );


    setText(
        registeredMotorcyclesElement,
        withPlates
    );


    setText(
        recentMotorcyclesElement,
        recent
    );

}


// =========================================================
// SET TEXT
// =========================================================

function setText(
    element,
    value
) {

    if (!element) {
        return;
    }


    element.textContent =
        String(value);

}


// =========================================================
// FILTER MOTORCYCLES
// =========================================================

function getFilteredMotorcycles() {

    const search =
        String(
            searchInput?.value || ""
        )
        .trim()
        .toLowerCase();


    const selectedBrand =
        brandFilter?.value ||
        "all";


    return motorcycles.filter(
        motorcycle => {

            const brand =
                String(
                    motorcycle.brand || ""
                ).toLowerCase();


            const model =
                String(
                    motorcycle.model || ""
                ).toLowerCase();


            const plate =
                String(
                    motorcycle.plate_number ||
                    motorcycle.plate ||
                    ""
                ).toLowerCase();


            const owner =
                String(
                    motorcycle.owner_name ||
                    motorcycle.customer_name ||
                    motorcycle.full_name ||
                    ""
                ).toLowerCase();


            const email =
                String(
                    motorcycle.owner_email ||
                    motorcycle.email ||
                    ""
                ).toLowerCase();


            const matchesSearch =
                !search ||
                brand.includes(search) ||
                model.includes(search) ||
                plate.includes(search) ||
                owner.includes(search) ||
                email.includes(search);


            const matchesBrand =
                selectedBrand === "all" ||
                brand === selectedBrand.toLowerCase();


            return (
                matchesSearch &&
                matchesBrand
            );

        }
    );

}


// =========================================================
// RENDER MOTORCYCLES
// =========================================================

function renderMotorcycles() {

    clearStates();


    const filtered =
        getFilteredMotorcycles();


    setText(
        displayedMotorcyclesElement,
        `${filtered.length} motorcycle${filtered.length === 1 ? "" : "s"}`
    );


    if (!filtered.length) {

        showEmptyState();

        return;

    }


    if (!motorcyclesList) {
        return;
    }


    motorcyclesList.innerHTML =
        filtered
            .map(
                motorcycle =>
                    createMotorcycleCard(
                        motorcycle
                    )
            )
            .join("");


    motorcyclesList.style.setProperty(
        "display",
        "grid",
        "important"
    );

}


// =========================================================
// CREATE MOTORCYCLE CARD
// =========================================================

function createMotorcycleCard(
    motorcycle
) {

    const id =
        motorcycle.id ??
        motorcycle.motorcycle_id ??
        "";


    const brand =
        motorcycle.brand ||
        "Unknown Brand";


    const model =
        motorcycle.model ||
        "Unknown Model";


    const plate =
        motorcycle.plate_number ||
        motorcycle.plate ||
        "No plate";


    const owner =
        motorcycle.owner_name ||
        motorcycle.customer_name ||
        motorcycle.full_name ||
        "No owner assigned";


    const engine =
        motorcycle.engine ||
        motorcycle.engine_size ||
        motorcycle.displacement ||
        "—";


    const color =
        motorcycle.color ||
        "—";


    const primary =
        isPrimaryMotorcycle(
            motorcycle
        );


    return `
        <article class="customer-card motorcycle-card">

            <div class="customer-card-header">

                <div class="customer-avatar motorcycle-avatar">

                    <i class="fa-solid fa-motorcycle"></i>

                </div>


                <div class="customer-main-info">

                    <h3>
                        ${escapeHtml(brand)}
                    </h3>

                    <p>
                        ${escapeHtml(model)}
                    </p>

                </div>


                ${
                    primary
                        ? `
                            <span class="status-badge active">

                                <i class="fa-solid fa-star"></i>

                                Primary

                            </span>
                          `
                        : ""
                }

            </div>


            <div class="customer-card-body">

                <div class="customer-info-row">

                    <span>

                        <i class="fa-solid fa-id-card"></i>

                        Plate

                    </span>


                    <strong>

                        ${escapeHtml(plate)}

                    </strong>

                </div>


                <div class="customer-info-row">

                    <span>

                        <i class="fa-solid fa-user"></i>

                        Owner

                    </span>


                    <strong>

                        ${escapeHtml(owner)}

                    </strong>

                </div>


                <div class="customer-info-row">

                    <span>

                        <i class="fa-solid fa-gauge-high"></i>

                        Engine

                    </span>


                    <strong>

                        ${escapeHtml(engine)}

                    </strong>

                </div>


                <div class="customer-info-row">

                    <span>

                        <i class="fa-solid fa-palette"></i>

                        Color

                    </span>


                    <strong>

                        ${escapeHtml(color)}

                    </strong>

                </div>

            </div>


            <div class="customer-card-footer">

                <button
                    type="button"
                    class="action-button view"
                    data-action="view"
                    data-motorcycle-id="${escapeHtml(id)}"
                >

                    <i class="fa-solid fa-eye"></i>

                    <span>View</span>

                </button>

            </div>

        </article>
    `;

}


// =========================================================
// CHECK PRIMARY
// =========================================================

function isPrimaryMotorcycle(
    motorcycle
) {

    if (!motorcycle) {
        return false;
    }


    const values = [
        motorcycle.is_primary,
        motorcycle.primary
    ];


    return values.some(
        value =>
            value === true ||
            value === 1 ||
            value === "1" ||
            value === "true"
    );

}


// =========================================================
// VIEW MOTORCYCLE
//
// IMPORTANT:
// The motorcycle details modal uses a real table/grid
// layout. The modal BODY is also independently scrollable.
// =========================================================

function viewMotorcycle(id) {

    const motorcycle =
        motorcycles.find(
            item =>
                String(
                    item.id ??
                    item.motorcycle_id
                ) === String(id)
        );


    if (!motorcycle) {

        showToast(
            "Motorcycle information could not be found.",
            "error"
        );

        return;

    }


    if (!motorcycleModal) {

        console.error(
            "Motorcycle modal was not found."
        );

        return;

    }


    if (!motorcycleModalBody) {

        console.error(
            "Motorcycle modal body was not found."
        );

        return;

    }


    currentMotorcycle =
        motorcycle;


    /* =====================================================
       ADD SPECIAL CLASS TO MODAL

       This class allows the modal itself to have a fixed
       maximum height while only the body scrolls.
    ===================================================== */

    const modalContainer =
        motorcycleModal.querySelector(
            ".modal"
        );


    if (modalContainer) {

        modalContainer.classList.add(
            "motorcycle-detail-modal"
        );

    }


    motorcycleModalBody.classList.add(
        "motorcycle-detail-modal-body"
    );


    const motorcycleId =
        motorcycle.id ??
        motorcycle.motorcycle_id ??
        "—";


    const brand =
        motorcycle.brand ||
        "Unknown Brand";


    const model =
        motorcycle.model ||
        "Unknown Model";


    const year =
        motorcycle.year ||
        "—";


    const engine =
        motorcycle.engine ||
        motorcycle.engine_size ||
        motorcycle.displacement ||
        "—";


    const plate =
        motorcycle.plate_number ||
        motorcycle.plate ||
        motorcycle.plateNumber ||
        "Not provided";


    const color =
        motorcycle.color ||
        "Not provided";


    const ownerName =
        motorcycle.owner_name ||
        motorcycle.customer_name ||
        motorcycle.full_name ||
        motorcycle.owner?.name ||
        motorcycle.customer?.name ||
        "No owner assigned";


    const ownerEmail =
        motorcycle.owner_email ||
        motorcycle.email ||
        motorcycle.owner?.email ||
        motorcycle.customer?.email ||
        "No email provided";


    const ownerPhone =
        motorcycle.owner_phone ||
        motorcycle.phone ||
        motorcycle.owner?.phone ||
        motorcycle.customer?.phone ||
        "No phone provided";


    const ownerAddress =
        motorcycle.owner_address ||
        motorcycle.address ||
        motorcycle.owner?.address ||
        motorcycle.customer?.address ||
        "No address provided";


    const registeredDate =
        motorcycle.created_at ||
        motorcycle.registered_at ||
        motorcycle.registration_date;


    const reference =
        motorcycle.reference ||
        motorcycle.motorcycle_reference ||
        motorcycle.motorcycleReference ||
        motorcycle.reference_number ||
        motorcycleId;


    const primary =
        isPrimaryMotorcycle(
            motorcycle
        );


    motorcycleModalBody.innerHTML = `

        <style>

            /* =================================================
               MOTORCYCLE DETAILS MODAL
            ================================================= */

            #motorcycleModal .motorcycle-detail-modal {

                width:
                    min(
                        920px,
                        calc(100vw - 32px)
                    ) !important;

                max-width:
                    920px !important;

                max-height:
                    calc(100vh - 32px) !important;

                height:
                    auto !important;

                display:
                    flex !important;

                flex-direction:
                    column !important;

                overflow:
                    hidden !important;

                box-sizing:
                    border-box;

            }


            /* =================================================
               FIXED MODAL HEADER
            ================================================= */

            #motorcycleModal
            .motorcycle-detail-modal
            .modal-header {

                flex:
                    0 0 auto !important;

            }


            /* =================================================
               SCROLLABLE MODAL BODY

               This is the important part.
               The header stays fixed.
               The information below can scroll.
            ================================================= */

            #motorcycleModal
            .motorcycle-detail-modal
            .motorcycle-detail-modal-body {

                flex:
                    1 1 auto !important;

                min-height:
                    0 !important;

                max-height:
                    none !important;

                overflow-y:
                    auto !important;

                overflow-x:
                    hidden !important;

                box-sizing:
                    border-box;

                scrollbar-width:
                    thin;

                scrollbar-color:
                    #4b5563 transparent;

            }


            /* =================================================
               CHROME / EDGE SCROLLBAR
            ================================================= */

            #motorcycleModal
            .motorcycle-detail-modal
            .motorcycle-detail-modal-body::-webkit-scrollbar {

                width:
                    8px;

            }


            #motorcycleModal
            .motorcycle-detail-modal
            .motorcycle-detail-modal-body::-webkit-scrollbar-track {

                background:
                    transparent;

            }


            #motorcycleModal
            .motorcycle-detail-modal
            .motorcycle-detail-modal-body::-webkit-scrollbar-thumb {

                background:
                    #4b5563;

                border-radius:
                    10px;

            }


            #motorcycleModal
            .motorcycle-detail-modal
            .motorcycle-detail-modal-body::-webkit-scrollbar-thumb:hover {

                background:
                    #6b7280;

            }


            /* =================================================
               MAIN DETAIL CONTAINER
            ================================================= */

            #motorcycleModal .motorcycle-view {

                width:
                    100%;

                box-sizing:
                    border-box;

                padding-bottom:
                    18px;

            }


            /* =================================================
               TOP INFORMATION
            ================================================= */

            #motorcycleModal
            .motorcycle-details-top {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    20px;

                margin-bottom:
                    26px;

            }


            #motorcycleModal
            .motorcycle-details-top-left {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    16px;

                min-width:
                    0;

            }


            #motorcycleModal
            .motorcycle-details-icon {

                width:
                    58px;

                height:
                    58px;

                min-width:
                    58px;

                border-radius:
                    14px;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                background:
                    rgba(99, 102, 241, 0.12);

                color:
                    #6366f1;

                font-size:
                    24px;

            }


            #motorcycleModal
            .motorcycle-details-heading {

                min-width:
                    0;

            }


            #motorcycleModal
            .motorcycle-details-brand {

                display:
                    block;

                font-size:
                    13px;

                font-weight:
                    700;

                text-transform:
                    uppercase;

                letter-spacing:
                    0.08em;

                color:
                    #6366f1;

                margin-bottom:
                    3px;

            }


            #motorcycleModal
            .motorcycle-details-heading h3 {

                margin:
                    0 0 6px;

                font-size:
                    22px;

                font-weight:
                    800;

                line-height:
                    1.2;

            }


            #motorcycleModal
            .motorcycle-details-meta {

                display:
                    flex;

                align-items:
                    center;

                flex-wrap:
                    wrap;

                gap:
                    10px;

                font-size:
                    13px;

                color:
                    #6b7280;

            }


            #motorcycleModal
            .motorcycle-details-status {

                flex-shrink:
                    0;

                display:
                    inline-flex;

                align-items:
                    center;

                gap:
                    6px;

                padding:
                    7px 11px;

                border-radius:
                    999px;

                background:
                    rgba(245, 158, 11, 0.12);

                color:
                    #d97706;

                font-size:
                    11px;

                font-weight:
                    800;

                letter-spacing:
                    0.05em;

            }


            /* =================================================
               TABLE SECTION
            ================================================= */

            #motorcycleModal
            .motorcycle-table-section {

                margin-top:
                    24px;

            }


            #motorcycleModal
            .motorcycle-table-title {

                margin-bottom:
                    10px;

                font-size:
                    12px;

                font-weight:
                    800;

                letter-spacing:
                    0.08em;

                color:
                    #6b7280;

                text-transform:
                    uppercase;

            }


            /* =================================================
               MOTORCYCLE INFORMATION TABLE
            ================================================= */

            #motorcycleModal
            .motorcycle-info-table {

                width:
                    100%;

                border-collapse:
                    separate;

                border-spacing:
                    0;

                border:
                    1px solid #e5e7eb;

                border-radius:
                    12px;

                overflow:
                    hidden;

                background:
                    #ffffff;

            }


            #motorcycleModal
            .motorcycle-info-table td {

                width:
                    50%;

                padding:
                    14px 16px;

                border-bottom:
                    1px solid #e5e7eb;

                vertical-align:
                    top;

            }


            #motorcycleModal
            .motorcycle-info-table tr:last-child td {

                border-bottom:
                    none;

            }


            #motorcycleModal
            .motorcycle-info-table td:first-child {

                border-right:
                    1px solid #e5e7eb;

            }


            #motorcycleModal
            .motorcycle-table-label {

                display:
                    block;

                margin-bottom:
                    5px;

                font-size:
                    10px;

                font-weight:
                    800;

                letter-spacing:
                    0.07em;

                color:
                    #9ca3af;

                text-transform:
                    uppercase;

            }


            #motorcycleModal
            .motorcycle-table-value {

                display:
                    block;

                font-size:
                    14px;

                font-weight:
                    700;

                color:
                    #1f2937;

                word-break:
                    break-word;

            }


            /* =================================================
               OWNER INFORMATION
            ================================================= */

            #motorcycleModal
            .motorcycle-owner-box {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    14px;

                padding:
                    16px;

                border:
                    1px solid #e5e7eb;

                border-radius:
                    12px;

                background:
                    #ffffff;

            }


            #motorcycleModal
            .motorcycle-owner-icon {

                width:
                    44px;

                height:
                    44px;

                min-width:
                    44px;

                border-radius:
                    50%;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                background:
                    rgba(99, 102, 241, 0.12);

                color:
                    #6366f1;

                font-size:
                    17px;

            }


            #motorcycleModal
            .motorcycle-owner-details {

                min-width:
                    0;

                flex:
                    1;

            }


            #motorcycleModal
            .motorcycle-owner-name {

                display:
                    block;

                margin-bottom:
                    7px;

                font-size:
                    15px;

                font-weight:
                    800;

                color:
                    #1f2937;

            }


            #motorcycleModal
            .motorcycle-owner-contact {

                display:
                    flex;

                flex-wrap:
                    wrap;

                gap:
                    10px 18px;

                color:
                    #6b7280;

                font-size:
                    12px;

            }


            #motorcycleModal
            .motorcycle-owner-contact span {

                display:
                    inline-flex;

                align-items:
                    center;

                gap:
                    6px;

                word-break:
                    break-word;

            }


            /* =================================================
               OWNER ADDRESS
            ================================================= */

            #motorcycleModal
            .motorcycle-owner-address {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    12px;

                margin-top:
                    0;

                padding:
                    14px 16px;

                border:
                    1px solid #e5e7eb;

                border-radius:
                    12px;

                background:
                    #ffffff;

            }


            #motorcycleModal
            .motorcycle-owner-address-icon {

                width:
                    32px;

                height:
                    32px;

                min-width:
                    32px;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                color:
                    #6366f1;

            }


            #motorcycleModal
            .motorcycle-owner-address-text {

                font-size:
                    13px;

                color:
                    #4b5563;

                word-break:
                    break-word;

            }


            #motorcycleModal
            .motorcycle-owner-address-text strong {

                color:
                    #1f2937;

                margin-right:
                    5px;

            }


            /* =================================================
               REGISTRATION TABLE
            ================================================= */

            #motorcycleModal
            .motorcycle-registration-table {

                width:
                    100%;

                border-collapse:
                    separate;

                border-spacing:
                    0;

                border:
                    1px solid #e5e7eb;

                border-radius:
                    12px;

                overflow:
                    hidden;

                background:
                    #ffffff;

            }


            #motorcycleModal
            .motorcycle-registration-table td {

                width:
                    50%;

                padding:
                    14px 16px;

                border-right:
                    1px solid #e5e7eb;

                vertical-align:
                    top;

            }


            #motorcycleModal
            .motorcycle-registration-table td:last-child {

                border-right:
                    none;

            }


            #motorcycleModal
            .motorcycle-registration-label {

                display:
                    block;

                margin-bottom:
                    5px;

                font-size:
                    10px;

                font-weight:
                    800;

                letter-spacing:
                    0.07em;

                color:
                    #9ca3af;

                text-transform:
                    uppercase;

            }


            #motorcycleModal
            .motorcycle-registration-value {

                display:
                    block;

                font-size:
                    13px;

                font-weight:
                    700;

                color:
                    #1f2937;

                word-break:
                    break-word;

            }


            /* =================================================
               MOBILE TABLE
            ================================================= */

            @media (max-width: 650px) {

                #motorcycleModal
                .motorcycle-detail-modal {

                    width:
                        calc(100vw - 20px) !important;

                    max-width:
                        none !important;

                    max-height:
                        calc(100vh - 20px) !important;

                }


                #motorcycleModal
                .motorcycle-details-top {

                    align-items:
                        flex-start;

                    flex-direction:
                        column;

                }


                #motorcycleModal
                .motorcycle-info-table,
                #motorcycleModal
                .motorcycle-info-table tbody,
                #motorcycleModal
                .motorcycle-info-table tr,
                #motorcycleModal
                .motorcycle-info-table td {

                    display:
                        block;

                    width:
                        100%;

                    box-sizing:
                        border-box;

                }


                #motorcycleModal
                .motorcycle-info-table td {

                    border-right:
                        none;

                }


                #motorcycleModal
                .motorcycle-info-table td:not(:last-child) {

                    border-bottom:
                        1px solid #e5e7eb;

                }


                #motorcycleModal
                .motorcycle-registration-table,
                #motorcycleModal
                .motorcycle-registration-table tbody,
                #motorcycleModal
                .motorcycle-registration-table tr,
                #motorcycleModal
                .motorcycle-registration-table td {

                    display:
                        block;

                    width:
                        100%;

                    box-sizing:
                        border-box;

                }


                #motorcycleModal
                .motorcycle-registration-table td {

                    border-right:
                        none;

                }


                #motorcycleModal
                .motorcycle-registration-table td:first-child {

                    border-bottom:
                        1px solid #e5e7eb;

                }


                #motorcycleModal
                .motorcycle-owner-box {

                    align-items:
                        flex-start;

                }


                #motorcycleModal
                .motorcycle-owner-contact {

                    flex-direction:
                        column;

                    gap:
                        8px;

                }

            }

        </style>


        <!-- =================================================
             MOTORCYCLE DETAILS MAIN CONTENT
        ================================================= -->

        <div class="motorcycle-view">


            <!-- =================================================
                 TOP MOTORCYCLE INFORMATION
            ================================================= -->

            <div class="motorcycle-details-top">

                <div class="motorcycle-details-top-left">

                    <div class="motorcycle-details-icon">

                        <i class="fa-solid fa-motorcycle"></i>

                    </div>


                    <div class="motorcycle-details-heading">

                        <span class="motorcycle-details-brand">

                            ${escapeHtml(brand)}

                        </span>


                        <h3>

                            ${escapeHtml(model)}

                        </h3>


                        <div class="motorcycle-details-meta">

                            <span>

                                <i class="fa-solid fa-hashtag"></i>

                                Motorcycle ID ${escapeHtml(motorcycleId)}

                            </span>


                            <span>

                                •

                            </span>


                            <span>

                                <i class="fa-regular fa-calendar"></i>

                                ${escapeHtml(year)}

                            </span>

                        </div>

                    </div>

                </div>


                <div class="motorcycle-details-status">

                    <i class="fa-solid fa-star"></i>

                    ${primary ? "PRIMARY" : "REGISTERED"}

                </div>

            </div>


            <!-- =================================================
                 MOTORCYCLE INFORMATION
            ================================================= -->

            <div class="motorcycle-table-section">

                <div class="motorcycle-table-title">

                    MOTORCYCLE INFORMATION

                </div>


                <table class="motorcycle-info-table">

                    <tbody>

                        <tr>

                            <td>

                                <span class="motorcycle-table-label">

                                    BRAND

                                </span>


                                <span class="motorcycle-table-value">

                                    ${escapeHtml(brand)}

                                </span>

                            </td>


                            <td>

                                <span class="motorcycle-table-label">

                                    MODEL

                                </span>


                                <span class="motorcycle-table-value">

                                    ${escapeHtml(model)}

                                </span>

                            </td>

                        </tr>


                        <tr>

                            <td>

                                <span class="motorcycle-table-label">

                                    YEAR

                                </span>


                                <span class="motorcycle-table-value">

                                    ${escapeHtml(year)}

                                </span>

                            </td>


                            <td>

                                <span class="motorcycle-table-label">

                                    ENGINE

                                </span>


                                <span class="motorcycle-table-value">

                                    ${escapeHtml(engine)}

                                </span>

                            </td>

                        </tr>


                        <tr>

                            <td>

                                <span class="motorcycle-table-label">

                                    PLATE

                                </span>


                                <span class="motorcycle-table-value">

                                    ${escapeHtml(plate)}

                                </span>

                            </td>


                            <td>

                                <span class="motorcycle-table-label">

                                    COLOR

                                </span>


                                <span class="motorcycle-table-value">

                                    ${escapeHtml(color)}

                                </span>

                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>


            <!-- =================================================
                 OWNER INFORMATION
            ================================================= -->

            <div class="motorcycle-table-section">

                <div class="motorcycle-table-title">

                    OWNER INFORMATION

                </div>


                <div class="motorcycle-owner-box">

                    <div class="motorcycle-owner-icon">

                        <i class="fa-solid fa-user"></i>

                    </div>


                    <div class="motorcycle-owner-details">

                        <span class="motorcycle-owner-name">

                            ${escapeHtml(ownerName)}

                        </span>


                        <div class="motorcycle-owner-contact">

                            <span>

                                <i class="fa-regular fa-envelope"></i>

                                ${escapeHtml(ownerEmail)}

                            </span>


                            <span>

                                <i class="fa-solid fa-phone"></i>

                                ${escapeHtml(ownerPhone)}

                            </span>

                        </div>

                    </div>

                </div>


                <!-- OWNER ADDRESS -->

                <div class="motorcycle-owner-address">

                    <div class="motorcycle-owner-address-icon">

                        <i class="fa-solid fa-location-dot"></i>

                    </div>


                    <div class="motorcycle-owner-address-text">

                        <strong>
                            Owner Address
                        </strong>

                        ${escapeHtml(ownerAddress)}

                    </div>

                </div>

            </div>


            <!-- =================================================
                 REGISTRATION INFORMATION
            ================================================= -->

            <div class="motorcycle-table-section">

                <div class="motorcycle-table-title">

                    REGISTRATION INFORMATION

                </div>


                <table class="motorcycle-registration-table">

                    <tbody>

                        <tr>

                            <td>

                                <span class="motorcycle-registration-label">

                                    REGISTERED ON

                                </span>


                                <span class="motorcycle-registration-value">

                                    ${
                                        registeredDate
                                            ? escapeHtml(
                                                formatDate(
                                                    registeredDate
                                                )
                                            )
                                            : "—"
                                    }

                                </span>

                            </td>


                            <td>

                                <span class="motorcycle-registration-label">

                                    MOTORCYCLE REFERENCE

                                </span>


                                <span class="motorcycle-registration-value">

                                    #${escapeHtml(reference)}

                                </span>

                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>


        </div>

    `;


    /* =====================================================
       RESET BODY SCROLL POSITION

       Every time View is clicked, start at the top.
    ===================================================== */

    motorcycleModalBody.scrollTop =
        0;


    /* =====================================================
       SHOW MODAL
    ===================================================== */

    forceShow(
        motorcycleModal,
        "flex"
    );


    motorcycleModal.classList.add(
        "show"
    );


    motorcycleModal.classList.add(
        "active"
    );


    document.body.classList.add(
        "modal-open"
    );

}


// =========================================================
// CLOSE MODAL
// =========================================================

function closeModal() {

    if (!motorcycleModal) {
        return;
    }


    motorcycleModal.classList.remove(
        "show"
    );


    motorcycleModal.classList.remove(
        "active"
    );


    /* =====================================================
       REMOVE SPECIAL MODAL CLASS
    ===================================================== */

    const modalContainer =
        motorcycleModal.querySelector(
            ".modal"
        );


    if (modalContainer) {

        modalContainer.classList.remove(
            "motorcycle-detail-modal"
        );

    }


    if (motorcycleModalBody) {

        motorcycleModalBody.classList.remove(
            "motorcycle-detail-modal-body"
        );


        motorcycleModalBody.scrollTop =
            0;

    }


    motorcycleModal.style.setProperty(
        "display",
        "none",
        "important"
    );


    motorcycleModal.hidden =
        true;


    document.body.classList.remove(
        "modal-open"
    );


    currentMotorcycle =
        null;

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

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


// =========================================================
// ESCAPE HTML
// =========================================================

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


// =========================================================
// TOAST
// =========================================================

function showToast(
    message,
    type = "success"
) {

    if (!toast) {
        return;
    }


    const icon =
        toast.querySelector(
            "#toastIcon"
        );


    const title =
        toast.querySelector(
            "#toastTitle"
        );


    const messageElement =
        toast.querySelector(
            "#toastMessage"
        );


    if (messageElement) {

        messageElement.textContent =
            message;

    }


    if (title) {

        title.textContent =
            type === "error"
                ? "Error"
                : "Success";

    }


    if (icon) {

        icon.className =
            type === "error"
                ? "fa-solid fa-triangle-exclamation"
                : "fa-solid fa-check";

    }


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


// =========================================================
// EVENT INITIALIZATION
// =========================================================

function initializeEvents() {

    /* =====================================================
       SEARCH
    ===================================================== */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderMotorcycles
        );

    }


    /* =====================================================
       BRAND FILTER
    ===================================================== */

    if (brandFilter) {

        brandFilter.addEventListener(
            "change",
            renderMotorcycles
        );

    }


    /* =====================================================
       REFRESH
    ===================================================== */

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadMotorcycles
        );

    }


    /* =====================================================
       MOTORCYCLE LIST
    ===================================================== */

    if (motorcyclesList) {

        motorcyclesList.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        '[data-action="view"]'
                    );


                if (!button) {
                    return;
                }


                const id =
                    button.getAttribute(
                        "data-motorcycle-id"
                    );


                if (id !== null) {

                    viewMotorcycle(id);

                }

            }
        );

    }


    /* =====================================================
       CLOSE BUTTON
    ===================================================== */

    if (closeMotorcycleModalButton) {

        closeMotorcycleModalButton.addEventListener(
            "click",
            closeModal
        );

    }


    /* =====================================================
       MODAL BACKDROP
    ===================================================== */

    if (motorcycleModal) {

        motorcycleModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    motorcycleModal
                ) {

                    closeModal();

                }

            }
        );

    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                motorcycleModal &&
                (
                    motorcycleModal.classList.contains("show") ||
                    motorcycleModal.classList.contains("active")
                )
            ) {

                closeModal();

            }

        }
    );

}


// =========================================================
// INITIALIZE PAGE
// =========================================================

function initializeMotorcyclesPage() {

    if (initialized) {
        return;
    }


    initialized =
        true;


    initializeElements();

    initializeAdmin();

    initializeEvents();

    loadMotorcycles();

}


// =========================================================
// DOM READY
// =========================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeMotorcyclesPage
    );

}
else {

    initializeMotorcyclesPage();

}


// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.loadMotorcycles =
    loadMotorcycles;


window.viewMotorcycle =
    viewMotorcycle;


window.closeMotorcycleModal =
    closeModal;


window.showMotorcycleToast =
    showToast;