/* =========================================================
   ADD MOTOR SHOP
   ADMIN - MOTORCYCLES
   motorcycles.js

   UPDATED VERSION

   MAIN MOTORCYCLE LIST
   - Proper column and row layout
   - Dedicated motorcycle table classes
   - Does NOT use customer-card layout
   - Keeps View button
   - Keeps search
   - Keeps brand filter
   - Keeps summary cards

   MOTORCYCLE DETAILS MODAL
   - Table-style information
   - Motorcycle information table
   - Owner information
   - Registration information
   - Primary status
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
        findElement([
            "brandFilter",
            "motorcycleBrandFilter"
        ]);


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
// INITIALIZE ADMIN
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
        <option value="all">All Brands</option>
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
                    motorcycle.plateNumber ||
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
// MOTORCYCLE LIST TABLE CSS
// =========================================================

function injectMotorcycleListStyles() {

    if (
        document.getElementById(
            "motorcycle-list-table-styles"
        )
    ) {
        return;
    }


    const style =
        document.createElement("style");


    style.id =
        "motorcycle-list-table-styles";


    style.textContent = `

        /* =================================================
           MOTORCYCLE LIST TABLE
        ================================================= */

        #motorcyclesList.motorcycle-table-list {

            display: block !important;

            width: 100%;

            margin: 0;

            padding: 0;

            overflow: visible;

        }


        .motorcycle-list-table {

            width: 100%;

            border: 1px solid #2d3138;

            border-radius: 12px;

            overflow: hidden;

            background: #191c20;

        }


        /* =================================================
           TABLE HEADER
        ================================================= */

        .motorcycle-list-header {

            display: grid;

            grid-template-columns:
                minmax(220px, 1.5fr)
                minmax(140px, 1fr)
                minmax(170px, 1.2fr)
                minmax(120px, .8fr)
                minmax(130px, .9fr)
                minmax(100px, .7fr)
                100px;

            align-items: center;

            min-height: 48px;

            background: #20242a;

            border-bottom: 1px solid #30343b;

        }


        .motorcycle-list-header-cell {

            padding: 13px 16px;

            color: #8f98a5;

            font-size: 10px;

            font-weight: 800;

            text-transform: uppercase;

            letter-spacing: .07em;

            white-space: nowrap;

        }


        /* =================================================
           TABLE ROW
        ================================================= */

        .motorcycle-list-row {

            display: grid;

            grid-template-columns:
                minmax(220px, 1.5fr)
                minmax(140px, 1fr)
                minmax(170px, 1.2fr)
                minmax(120px, .8fr)
                minmax(130px, .9fr)
                minmax(100px, .7fr)
                100px;

            align-items: center;

            min-height: 86px;

            background: #191c20;

            border-bottom: 1px solid #2b2f35;

            transition:
                background .18s ease,
                border-color .18s ease;

        }


        .motorcycle-list-row:last-child {

            border-bottom: none;

        }


        .motorcycle-list-row:hover {

            background: #20242a;

        }


        .motorcycle-list-cell {

            min-width: 0;

            padding: 14px 16px;

        }


        /* =================================================
           MOTORCYCLE COLUMN
        ================================================= */

        .motorcycle-list-bike {

            display: flex;

            align-items: center;

            gap: 12px;

            min-width: 0;

        }


        .motorcycle-list-bike-icon {

            width: 42px;

            height: 42px;

            min-width: 42px;

            border-radius: 10px;

            display: flex;

            align-items: center;

            justify-content: center;

            background: #272c33;

            color: #f2f4f7;

            font-size: 17px;

        }


        .motorcycle-list-bike-info {

            min-width: 0;

        }


        .motorcycle-list-bike-brand {

            display: block;

            color: #f3f4f6;

            font-size: 15px;

            font-weight: 800;

            line-height: 1.2;

            white-space: nowrap;

            overflow: hidden;

            text-overflow: ellipsis;

        }


        .motorcycle-list-bike-model {

            display: block;

            margin-top: 3px;

            color: #aeb5bf;

            font-size: 13px;

            line-height: 1.2;

            white-space: nowrap;

            overflow: hidden;

            text-overflow: ellipsis;

        }


        /* =================================================
           NORMAL CELLS
        ================================================= */

        .motorcycle-list-primary-text {

            color: #f1f3f5;

            font-size: 13px;

            font-weight: 700;

            line-height: 1.35;

            word-break: break-word;

        }


        .motorcycle-list-secondary-text {

            color: #929aa6;

            font-size: 11px;

            margin-top: 2px;

        }


        .motorcycle-list-cell-icon {

            width: 18px;

            margin-right: 6px;

            color: #b8bec7;

            text-align: center;

        }


        /* =================================================
           PRIMARY BADGE
        ================================================= */

        .motorcycle-list-primary-badge {

            display: inline-flex;

            align-items: center;

            gap: 5px;

            margin-top: 6px;

            padding: 4px 7px;

            border-radius: 5px;

            background: rgba(255, 255, 255, .08);

            color: #e8eaed;

            font-size: 9px;

            font-weight: 800;

            text-transform: uppercase;

            letter-spacing: .04em;

        }


        .motorcycle-list-primary-badge i {

            font-size: 8px;

        }


        /* =================================================
           PLATE
        ================================================= */

        .motorcycle-list-plate {

            display: inline-flex;

            align-items: center;

            gap: 7px;

            color: #f0f2f4;

            font-size: 13px;

            font-weight: 750;

        }


        .motorcycle-list-plate i {

            color: #b9c0c9;

            font-size: 13px;

        }


        /* =================================================
           OWNER
        ================================================= */

        .motorcycle-list-owner {

            display: flex;

            align-items: center;

            gap: 8px;

            min-width: 0;

        }


        .motorcycle-list-owner-icon {

            width: 28px;

            height: 28px;

            min-width: 28px;

            border-radius: 50%;

            display: flex;

            align-items: center;

            justify-content: center;

            background: #292e35;

            color: #dce0e5;

            font-size: 11px;

        }


        .motorcycle-list-owner-name {

            color: #f0f2f4;

            font-size: 13px;

            font-weight: 700;

            white-space: nowrap;

            overflow: hidden;

            text-overflow: ellipsis;

        }


        /* =================================================
           ENGINE / COLOR
        ================================================= */

        .motorcycle-list-detail {

            display: flex;

            align-items: center;

            gap: 7px;

            color: #e4e7eb;

            font-size: 13px;

            font-weight: 650;

        }


        .motorcycle-list-detail i {

            width: 17px;

            color: #aeb5bf;

            text-align: center;

        }


        /* =================================================
           YEAR
        ================================================= */

        .motorcycle-list-year {

            color: #e8eaed;

            font-size: 13px;

            font-weight: 700;

        }


        /* =================================================
           VIEW BUTTON
        ================================================= */

        .motorcycle-list-action {

            display: flex;

            align-items: center;

            justify-content: flex-end;

        }


        .motorcycle-list-view {

            display: inline-flex !important;

            align-items: center !important;

            justify-content: center !important;

            gap: 6px !important;

            width: 76px !important;

            min-width: 76px !important;

            height: 34px !important;

            padding: 0 10px !important;

            margin: 0 !important;

            border: 1px solid #363b43 !important;

            border-radius: 7px !important;

            background: #1f2328 !important;

            color: #dfe3e8 !important;

            font-size: 11px !important;

            font-weight: 700 !important;

            line-height: 1 !important;

            white-space: nowrap !important;

            cursor: pointer !important;

            box-sizing: border-box !important;

        }


        .motorcycle-list-view:hover {

            background: #292e35 !important;

            border-color: #4a515b !important;

            color: #ffffff !important;

        }


        .motorcycle-list-view i {

            font-size: 11px !important;

            flex-shrink: 0 !important;

        }


        /* =================================================
           LIGHT MODE
        ================================================= */

        body:not(.dark-mode) .motorcycle-list-table {

            background: #ffffff;

            border-color: #e1e5ea;

        }


        body:not(.dark-mode) .motorcycle-list-header {

            background: #f7f8fa;

            border-bottom-color: #e1e5ea;

        }


        body:not(.dark-mode) .motorcycle-list-header-cell {

            color: #737b87;

        }


        body:not(.dark-mode) .motorcycle-list-row {

            background: #ffffff;

            border-bottom-color: #e8ebef;

        }


        body:not(.dark-mode) .motorcycle-list-row:hover {

            background: #f8f9fb;

        }


        body:not(.dark-mode) .motorcycle-list-bike-icon {

            background: #f0f2f5;

            color: #31363d;

        }


        body:not(.dark-mode) .motorcycle-list-bike-brand,

        body:not(.dark-mode) .motorcycle-list-primary-text,

        body:not(.dark-mode) .motorcycle-list-plate,

        body:not(.dark-mode) .motorcycle-list-owner-name,

        body:not(.dark-mode) .motorcycle-list-detail,

        body:not(.dark-mode) .motorcycle-list-year {

            color: #252a31;

        }


        body:not(.dark-mode) .motorcycle-list-bike-model,

        body:not(.dark-mode) .motorcycle-list-secondary-text {

            color: #727a85;

        }


        body:not(.dark-mode) .motorcycle-list-owner-icon {

            background: #f0f2f5;

            color: #4b535d;

        }


        body:not(.dark-mode) .motorcycle-list-view {

            background: #ffffff !important;

            border-color: #d8dde4 !important;

            color: #414852 !important;

        }


        body:not(.dark-mode) .motorcycle-list-view:hover {

            background: #f3f5f7 !important;

        }


        /* =================================================
           RESPONSIVE
        ================================================= */

        @media (max-width: 1150px) {

            .motorcycle-list-header,
            .motorcycle-list-row {

                grid-template-columns:
                    minmax(190px, 1.4fr)
                    minmax(125px, .9fr)
                    minmax(150px, 1fr)
                    minmax(100px, .7fr)
                    minmax(115px, .8fr)
                    85px;

            }


            .motorcycle-list-header-cell:nth-child(6),
            .motorcycle-list-cell:nth-child(6) {

                display: none;

            }

        }


        @media (max-width: 850px) {

            .motorcycle-list-table {

                overflow-x: auto;

            }


            .motorcycle-list-header,
            .motorcycle-list-row {

                min-width: 850px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


// =========================================================
// RENDER MOTORCYCLES
// =========================================================

function renderMotorcycles() {

    clearStates();


    injectMotorcycleListStyles();


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


    motorcyclesList.innerHTML = `

        <div class="motorcycle-list-table">

            ${createMotorcycleTableHeader()}

            <div class="motorcycle-list-body">

                ${filtered
                    .map(
                        motorcycle =>
                            createMotorcycleCard(
                                motorcycle
                            )
                    )
                    .join("")
                }

            </div>

        </div>

    `;


    motorcyclesList.classList.add(
        "motorcycle-table-list"
    );


    motorcyclesList.style.setProperty(
        "display",
        "block",
        "important"
    );

}


// =========================================================
// MOTORCYCLE TABLE HEADER
// =========================================================

function createMotorcycleTableHeader() {

    return `

        <div class="motorcycle-list-header">

            <div class="motorcycle-list-header-cell">
                Motorcycle
            </div>


            <div class="motorcycle-list-header-cell">
                Plate Number
            </div>


            <div class="motorcycle-list-header-cell">
                Owner
            </div>


            <div class="motorcycle-list-header-cell">
                Year
            </div>


            <div class="motorcycle-list-header-cell">
                Engine
            </div>


            <div class="motorcycle-list-header-cell">
                Color
            </div>


            <div class="motorcycle-list-header-cell">
                Action
            </div>

        </div>

    `;

}


// =========================================================
// CREATE MOTORCYCLE ROW
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
        motorcycle.plateNumber ||
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


    const year =
        motorcycle.year ||
        motorcycle.model_year ||
        "—";


    const primary =
        isPrimaryMotorcycle(
            motorcycle
        );


    return `

        <div
            class="motorcycle-list-row"
            data-motorcycle-id="${escapeHtml(id)}"
        >


            <!-- MOTORCYCLE -->

            <div class="motorcycle-list-cell">

                <div class="motorcycle-list-bike">

                    <div class="motorcycle-list-bike-icon">

                        <i class="fa-solid fa-motorcycle"></i>

                    </div>


                    <div class="motorcycle-list-bike-info">

                        <span class="motorcycle-list-bike-brand">
                            ${escapeHtml(brand)}
                        </span>


                        <span class="motorcycle-list-bike-model">
                            ${escapeHtml(model)}
                        </span>


                        ${
                            primary
                                ? `
                                    <span class="motorcycle-list-primary-badge">

                                        <i class="fa-solid fa-star"></i>

                                        Primary

                                    </span>
                                  `
                                : ""
                        }

                    </div>

                </div>

            </div>


            <!-- PLATE -->

            <div class="motorcycle-list-cell">

                <div class="motorcycle-list-plate">

                    <i class="fa-solid fa-id-card"></i>

                    <span>
                        ${escapeHtml(plate)}
                    </span>

                </div>

            </div>


            <!-- OWNER -->

            <div class="motorcycle-list-cell">

                <div class="motorcycle-list-owner">

                    <div class="motorcycle-list-owner-icon">

                        <i class="fa-solid fa-user"></i>

                    </div>


                    <span class="motorcycle-list-owner-name">

                        ${escapeHtml(owner)}

                    </span>

                </div>

            </div>


            <!-- YEAR -->

            <div class="motorcycle-list-cell">

                <span class="motorcycle-list-year">

                    ${escapeHtml(year)}

                </span>

            </div>


            <!-- ENGINE -->

            <div class="motorcycle-list-cell">

                <div class="motorcycle-list-detail">

                    <i class="fa-solid fa-gauge-high"></i>

                    <span>
                        ${escapeHtml(formatEngine(engine))}
                    </span>

                </div>

            </div>


            <!-- COLOR -->

            <div class="motorcycle-list-cell">

                <div class="motorcycle-list-detail">

                    <i class="fa-solid fa-palette"></i>

                    <span>
                        ${escapeHtml(color)}
                    </span>

                </div>

            </div>


            <!-- ACTION -->

            <div class="motorcycle-list-cell">

                <div class="motorcycle-list-action">

                    <button
                        type="button"
                        class="motorcycle-list-view"
                        data-action="view"
                        data-motorcycle-id="${escapeHtml(id)}"
                    >

                        <i class="fa-solid fa-eye"></i>

                        <span>
                            View
                        </span>

                    </button>

                </div>

            </div>


        </div>

    `;

}


// =========================================================
// FORMAT ENGINE
// =========================================================

function formatEngine(value) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return "—";

    }


    const text =
        String(value).trim();


    if (
        /^\d+(\.\d+)?$/.test(text)
    ) {

        return `${text} cc`;

    }


    return text;

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
        motorcycle.primary,
        motorcycle.isPrimary
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
        motorcycle.model_year ||
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


    const owner =
        motorcycle.owner ||
        motorcycle.customer ||
        {};


    const ownerName =
        motorcycle.owner_name ||
        motorcycle.customer_name ||
        motorcycle.full_name ||
        owner.name ||
        owner.full_name ||
        owner.fullName ||
        "No owner assigned";


    const ownerEmail =
        motorcycle.owner_email ||
        motorcycle.email ||
        owner.email ||
        "No email provided";


    const ownerPhone =
        motorcycle.owner_phone ||
        motorcycle.phone ||
        motorcycle.contact_number ||
        owner.phone ||
        owner.contact_number ||
        "No phone provided";


    const ownerAddress =
        motorcycle.owner_address ||
        motorcycle.address ||
        owner.address ||
        "No address provided";


    const primary =
        isPrimaryMotorcycle(
            motorcycle
        );


    injectMotorcycleModalStyles();


    const modal =
        motorcycleModal.querySelector(
            ".modal"
        );


    if (modal) {

        modal.classList.add(
            "motorcycle-detail-modal"
        );

    }


    motorcycleModalBody.classList.add(
        "motorcycle-detail-modal-body"
    );


    motorcycleModalBody.innerHTML = `

        <div class="motorcycle-detail-view">


            <!-- =================================================
                 HERO
            ================================================= -->

            <div class="motorcycle-detail-hero">

                <div class="motorcycle-detail-hero-left">

                    <div class="motorcycle-detail-bike-icon">

                        <i class="fa-solid fa-motorcycle"></i>

                    </div>


                    <div class="motorcycle-detail-hero-info">

                        <div class="motorcycle-detail-brand">
                            ${escapeHtml(brand)}
                        </div>


                        <div class="motorcycle-detail-model">
                            ${escapeHtml(model)}
                        </div>


                        <div class="motorcycle-detail-meta">

                            <span>
                                <i class="fa-solid fa-hashtag"></i>
                                Motorcycle ID ${escapeHtml(motorcycleId)}
                            </span>


                            <span class="motorcycle-detail-dot">
                                •
                            </span>


                            <span>
                                <i class="fa-regular fa-calendar"></i>
                                ${escapeHtml(year)}
                            </span>

                        </div>

                    </div>

                </div>


                <div class="motorcycle-detail-status ${
                    primary
                        ? "primary"
                        : "registered"
                }">

                    <i class="fa-solid ${
                        primary
                            ? "fa-star"
                            : "fa-circle-check"
                    }"></i>

                    ${primary ? "PRIMARY" : "REGISTERED"}

                </div>

            </div>


            <!-- =================================================
                 MOTORCYCLE INFORMATION
            ================================================= -->

            <section class="motorcycle-detail-section">

                <div class="motorcycle-detail-section-heading">

                    <div class="motorcycle-detail-section-icon">

                        <i class="fa-solid fa-motorcycle"></i>

                    </div>


                    <div>

                        <span>
                            VEHICLE
                        </span>

                        <h3>
                            Motorcycle Information
                        </h3>

                    </div>

                </div>


                <div class="motorcycle-detail-table">

                    <div class="motorcycle-detail-row">

                        <div class="motorcycle-detail-cell">

                            <span class="motorcycle-detail-label">
                                BRAND
                            </span>

                            <strong>
                                ${escapeHtml(brand)}
                            </strong>

                        </div>


                        <div class="motorcycle-detail-cell">

                            <span class="motorcycle-detail-label">
                                MODEL
                            </span>

                            <strong>
                                ${escapeHtml(model)}
                            </strong>

                        </div>

                    </div>


                    <div class="motorcycle-detail-row">

                        <div class="motorcycle-detail-cell">

                            <span class="motorcycle-detail-label">
                                YEAR
                            </span>

                            <strong>
                                ${escapeHtml(year)}
                            </strong>

                        </div>


                        <div class="motorcycle-detail-cell">

                            <span class="motorcycle-detail-label">
                                ENGINE
                            </span>

                            <strong>
                                ${escapeHtml(formatEngine(engine))}
                            </strong>

                        </div>

                    </div>


                    <div class="motorcycle-detail-row">

                        <div class="motorcycle-detail-cell">

                            <span class="motorcycle-detail-label">
                                PLATE
                            </span>

                            <strong>
                                ${escapeHtml(plate)}
                            </strong>

                        </div>


                        <div class="motorcycle-detail-cell">

                            <span class="motorcycle-detail-label">
                                COLOR
                            </span>

                            <strong>
                                ${escapeHtml(color)}
                            </strong>

                        </div>

                    </div>

                </div>

            </section>


            <!-- =================================================
                 OWNER INFORMATION
            ================================================= -->

            <section class="motorcycle-detail-section">

                <div class="motorcycle-detail-section-heading">

                    <div class="motorcycle-detail-section-icon">

                        <i class="fa-solid fa-user"></i>

                    </div>


                    <div>

                        <span>
                            CUSTOMER
                        </span>

                        <h3>
                            Owner Information
                        </h3>

                    </div>

                </div>


                <div class="motorcycle-detail-owner-table">

                    <div class="motorcycle-detail-owner-main">

                        <div class="motorcycle-detail-owner-icon">

                            <i class="fa-solid fa-user"></i>

                        </div>


                        <div class="motorcycle-detail-owner-content">

                            <strong>
                                ${escapeHtml(ownerName)}
                            </strong>


                            <div class="motorcycle-detail-contact">

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


                    <div class="motorcycle-detail-owner-address">

                        <i class="fa-solid fa-location-dot"></i>

                        <span>
                            Owner Address
                        </span>

                        <strong>
                            ${escapeHtml(ownerAddress)}
                        </strong>

                    </div>

                </div>

            </section>

        </div>

    `;


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
// MOTORCYCLE MODAL STYLES
// =========================================================

function injectMotorcycleModalStyles() {

    if (
        document.getElementById(
            "motorcycle-detail-table-styles"
        )
    ) {
        return;
    }


    const style =
        document.createElement("style");


    style.id =
        "motorcycle-detail-table-styles";


    style.textContent = `

        /* =================================================
           MODAL CONTAINER
        ================================================= */

        #motorcycleModal
        .motorcycle-detail-modal {

            width: min(
                900px,
                calc(100vw - 40px)
            ) !important;

            max-width: 900px !important;

            max-height: calc(100vh - 40px) !important;

            overflow: hidden !important;

        }


        #motorcycleModal
        .motorcycle-detail-modal-body {

            overflow: hidden !important;

            max-height: none !important;

        }


        /* =================================================
           DETAIL WRAPPER
        ================================================= */

        #motorcycleModal
        .motorcycle-detail-view {

            width: 100%;

            box-sizing: border-box;

            color: #edf0f3;

        }


        /* =================================================
           HERO
        ================================================= */

        #motorcycleModal
        .motorcycle-detail-hero {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 20px;

            padding: 4px 0 22px;

            border-bottom: 1px solid #30343b;

        }


        #motorcycleModal
        .motorcycle-detail-hero-left {

            display: flex;

            align-items: center;

            gap: 14px;

            min-width: 0;

        }


        #motorcycleModal
        .motorcycle-detail-bike-icon {

            width: 54px;

            height: 54px;

            min-width: 54px;

            border-radius: 12px;

            display: flex;

            align-items: center;

            justify-content: center;

            background: #252a31;

            color: #f1f3f5;

            font-size: 22px;

        }


        #motorcycleModal
        .motorcycle-detail-hero-info {

            min-width: 0;

        }


        #motorcycleModal
        .motorcycle-detail-brand {

            color: #aeb5bf;

            font-size: 13px;

            font-weight: 650;

            margin-bottom: 1px;

        }


        #motorcycleModal
        .motorcycle-detail-model {

            color: #f5f6f7;

            font-size: 25px;

            font-weight: 800;

            line-height: 1.1;

            margin-bottom: 7px;

        }


        #motorcycleModal
        .motorcycle-detail-meta {

            display: flex;

            align-items: center;

            flex-wrap: wrap;

            gap: 7px;

            color: #929aa6;

            font-size: 12px;

            font-weight: 600;

        }


        #motorcycleModal
        .motorcycle-detail-meta span {

            display: inline-flex;

            align-items: center;

            gap: 4px;

        }


        #motorcycleModal
        .motorcycle-detail-meta i {

            font-size: 11px;

        }


        #motorcycleModal
        .motorcycle-detail-dot {

            color: #59616d;

        }


        #motorcycleModal
        .motorcycle-detail-status {

            display: inline-flex;

            align-items: center;

            gap: 6px;

            flex-shrink: 0;

            padding: 7px 11px;

            border-radius: 7px;

            font-size: 10px;

            font-weight: 800;

            letter-spacing: .05em;

        }


        #motorcycleModal
        .motorcycle-detail-status.primary {

            background: rgba(255,255,255,.08);

            color: #f0f2f4;

        }


        #motorcycleModal
        .motorcycle-detail-status.registered {

            background: rgba(255,255,255,.06);

            color: #cbd0d6;

        }


        /* =================================================
           SECTION
        ================================================= */

        #motorcycleModal
        .motorcycle-detail-section {

            margin-top: 18px;

        }


        #motorcycleModal
        .motorcycle-detail-section-heading {

            display: flex;

            align-items: center;

            gap: 9px;

            margin-bottom: 9px;

        }


        #motorcycleModal
        .motorcycle-detail-section-icon {

            width: 27px;

            height: 27px;

            min-width: 27px;

            border-radius: 6px;

            display: flex;

            align-items: center;

            justify-content: center;

            background: #252a31;

            color: #d9dde2;

            font-size: 11px;

        }


        #motorcycleModal
        .motorcycle-detail-section-heading span {

            display: block;

            color: #858e9a;

            font-size: 8px;

            font-weight: 800;

            letter-spacing: .08em;

        }


        #motorcycleModal
        .motorcycle-detail-section-heading h3 {

            margin: 1px 0 0;

            color: #eef0f2;

            font-size: 13px;

            font-weight: 800;

        }


        /* =================================================
           DETAILS TABLE
        ================================================= */

        #motorcycleModal
        .motorcycle-detail-table {

            width: 100%;

            border: 1px solid #30353d;

            border-radius: 9px;

            overflow: hidden;

            background: #1b1f24;

        }


        #motorcycleModal
        .motorcycle-detail-row {

            display: grid;

            grid-template-columns: 1fr 1fr;

        }


        #motorcycleModal
        .motorcycle-detail-row:not(:last-child) {

            border-bottom: 1px solid #30353d;

        }


        #motorcycleModal
        .motorcycle-detail-cell {

            min-width: 0;

            padding: 11px 14px;

        }


        #motorcycleModal
        .motorcycle-detail-cell:first-child {

            border-right: 1px solid #30353d;

        }


        #motorcycleModal
        .motorcycle-detail-label {

            display: block;

            margin-bottom: 4px;

            color: #7f8894;

            font-size: 8px;

            font-weight: 800;

            letter-spacing: .07em;

        }


        #motorcycleModal
        .motorcycle-detail-cell strong {

            display: block;

            color: #edf0f3;

            font-size: 13px;

            font-weight: 750;

            word-break: break-word;

        }


        /* =================================================
           OWNER TABLE
        ================================================= */

        #motorcycleModal
        .motorcycle-detail-owner-table {

            border: 1px solid #30353d;

            border-radius: 9px;

            overflow: hidden;

            background: #1b1f24;

        }


        #motorcycleModal
        .motorcycle-detail-owner-main {

            display: flex;

            align-items: center;

            gap: 11px;

            padding: 12px 14px;

        }


        #motorcycleModal
        .motorcycle-detail-owner-icon {

            width: 38px;

            height: 38px;

            min-width: 38px;

            border-radius: 50%;

            display: flex;

            align-items: center;

            justify-content: center;

            background: #292e35;

            color: #e2e5e8;

            font-size: 13px;

        }


        #motorcycleModal
        .motorcycle-detail-owner-content {

            min-width: 0;

        }


        #motorcycleModal
        .motorcycle-detail-owner-content > strong {

            display: block;

            margin-bottom: 5px;

            color: #eef0f2;

            font-size: 13px;

            font-weight: 800;

        }


        #motorcycleModal
        .motorcycle-detail-contact {

            display: flex;

            align-items: center;

            flex-wrap: wrap;

            gap: 8px 18px;

        }


        #motorcycleModal
        .motorcycle-detail-contact span {

            display: inline-flex;

            align-items: center;

            gap: 5px;

            color: #9ca5b0;

            font-size: 11px;

        }


        #motorcycleModal
        .motorcycle-detail-contact i {

            color: #c0c6cd;

            font-size: 10px;

        }


        #motorcycleModal
        .motorcycle-detail-owner-address {

            display: flex;

            align-items: center;

            gap: 7px;

            padding: 10px 14px;

            border-top: 1px solid #30353d;

            color: #a4acb6;

            font-size: 11px;

        }


        #motorcycleModal
        .motorcycle-detail-owner-address i {

            color: #c0c6cd;

        }


        #motorcycleModal
        .motorcycle-detail-owner-address strong {

            color: #edf0f3;

            font-weight: 750;

        }


        /* =================================================
           REGISTRATION
        ================================================= */

        #motorcycleModal
        .motorcycle-detail-table.registration {

            margin-bottom: 0;

        }


        /* =================================================
           LIGHT MODE
        ================================================= */

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-view {

            color: #252a31;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-hero {

            border-bottom-color: #e1e5ea;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-bike-icon,

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-section-icon {

            background: #f0f2f5;

            color: #3e454e;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-brand {

            color: #6d7580;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-model,

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-section-heading h3,

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-cell strong,

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-owner-content > strong,

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-owner-address strong {

            color: #252a31;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-table,

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-owner-table {

            background: #ffffff;

            border-color: #dfe3e8;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-row:not(:last-child),

        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-owner-address {

            border-color: #e3e6ea;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-cell:first-child {

            border-color: #e3e6ea;

        }


        body:not(.dark-mode)
        #motorcycleModal
        .motorcycle-detail-owner-icon {

            background: #f0f2f5;

            color: #4c545e;

        }


        /* =================================================
           RESPONSIVE MODAL
        ================================================= */

        @media (max-width: 650px) {

            #motorcycleModal
            .motorcycle-detail-hero {

                align-items: flex-start;

                flex-direction: column;

            }


            #motorcycleModal
            .motorcycle-detail-row {

                grid-template-columns: 1fr;

            }


            #motorcycleModal
            .motorcycle-detail-cell:first-child {

                border-right: none;

            }


            #motorcycleModal
            .motorcycle-detail-row
            .motorcycle-detail-cell:first-child {

                border-bottom: 1px solid #30353d;

            }


            #motorcycleModal
            .motorcycle-detail-owner-main {

                align-items: flex-start;

            }

        }

    `;


    document.head.appendChild(
        style
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


    motorcycleModal.style.setProperty(
        "display",
        "none",
        "important"
    );


    motorcycleModal.hidden =
        true;


    const modal =
        motorcycleModal.querySelector(
            ".modal"
        );


    if (modal) {

        modal.classList.remove(
            "motorcycle-detail-modal"
        );

    }


    if (motorcycleModalBody) {

        motorcycleModalBody.classList.remove(
            "motorcycle-detail-modal-body"
        );

    }


    document.body.classList.remove(
        "modal-open"
    );


    currentMotorcycle =
        null;

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(value) {

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

function escapeHtml(value) {

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

    // SEARCH

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderMotorcycles
        );

    }


    // BRAND FILTER

    if (brandFilter) {

        brandFilter.addEventListener(
            "change",
            renderMotorcycles
        );

    }


    // REFRESH

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadMotorcycles
        );

    }


    // MOTORCYCLE LIST

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


    // CLOSE BUTTON

    if (closeMotorcycleModalButton) {

        closeMotorcycleModalButton.addEventListener(
            "click",
            closeModal
        );

    }


    // MODAL BACKDROP

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


    // ESCAPE

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