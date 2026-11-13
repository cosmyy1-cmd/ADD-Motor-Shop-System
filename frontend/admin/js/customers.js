/* =========================================================
   ADD MOTOR SHOP - ADMIN CUSTOMERS
   CUSTOMER CARD VERSION
========================================================= */

const ADMIN_API_BASE = "http://localhost:3000";


/* =========================================================
   ELEMENTS
========================================================= */

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");
const logoutButton = document.getElementById("logoutButton");
const adminName = document.getElementById("adminName");
const adminAvatar = document.getElementById("adminAvatar");
const refreshButton = document.getElementById("refreshCustomers");
const customerSearch = document.getElementById("customerSearch");
const customerStatusFilter = document.getElementById("customerStatusFilter");
const clearCustomerFilters = document.getElementById("clearCustomerFilters");
const customersLoading = document.getElementById("customersLoading");
const customersError = document.getElementById("customersError");
const customersErrorMessage = document.getElementById("customersErrorMessage");
const retryCustomers = document.getElementById("retryCustomers");
const customersEmpty = document.getElementById("customersEmpty");
const customersList = document.getElementById("customersList");
const totalCustomers = document.getElementById("totalCustomers");
const totalMotorcycles = document.getElementById("totalMotorcycles");
const customersWithAppointments = document.getElementById("customersWithAppointments");
const activeCustomers = document.getElementById("activeCustomers");
const newCustomers = document.getElementById("newCustomers");
const displayedCustomers = document.getElementById("displayedCustomers");
const customerModal = document.getElementById("customerModal");
const closeCustomerModal = document.getElementById("closeCustomerModal");
const customerDetails = document.getElementById("customerDetails");
const toast = document.getElementById("toast");
const toastIcon = document.getElementById("toastIcon");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");
const toastClose = document.getElementById("toastClose");


/* =========================================================
   DATA
========================================================= */

let customers = [];
let toastTimer = null;


/* =========================================================
   CUSTOMER PAGINATION
========================================================= */

const CUSTOMER_INITIAL_LIMIT = 10;
const CUSTOMER_LOAD_MORE = 50;

let customerVisibleLimit = CUSTOMER_INITIAL_LIMIT;
let customerPaginationContainer = null;
let customerSeeMoreButton = null;
let customerHideButton = null;


/* =========================================================
   PENDING CUSTOMER DATA
========================================================= */

let pendingCustomers = [];
let pendingCountInterval = null;


/* =========================================================
   PENDING ID IMAGE STATE
========================================================= */

let pendingIdentityObjectUrl = null;
let pendingIdentityRequestToken = 0;


/* =========================================================
   ADMIN USER
========================================================= */

function getAdminUser() {

    const storedUser =
        localStorage.getItem("adminUser") ||
        localStorage.getItem("addMotorUser") ||
        localStorage.getItem("user");

    if (!storedUser) {
        return null;
    }

    try {

        const user = JSON.parse(storedUser);

        if (
            !user ||
            String(user.role).toLowerCase() !== "admin"
        ) {
            return null;
        }

        return user;

    } catch (error) {

        console.error("Unable to read admin user:", error);
        return null;
    }
}


/* =========================================================
   INITIALIZE ADMIN
========================================================= */

function initializeAdmin() {

    const user = getAdminUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (adminName) {
        adminName.textContent = user.name || "Administrator";
    }

    if (adminAvatar) {

        const name = user.name || "Administrator";
        adminAvatar.textContent = getInitials(name);
    }
}


/* =========================================================
   ADMIN HEADERS
========================================================= */

function getAdminHeaders() {

    const user = getAdminUser();

    return {
        "Content-Type": "application/json",
        "x-admin-id": user ? String(user.id) : ""
    };
}


/* =========================================================
   CUSTOMER PAGINATION UI
========================================================= */

function initializeCustomerPagination() {

    if (!customersList) {
        return;
    }

    // Hide the old centered customer count.
    if (displayedCustomers) {
        displayedCustomers.textContent = "";
        displayedCustomers.style.display = "none";
        displayedCustomers.hidden = true;
    }

    // Reuse an existing pagination container when available.
    customerPaginationContainer = document.getElementById(
        "customerPaginationContainer"
    );

    if (!customerPaginationContainer) {

        customerPaginationContainer = document.createElement("div");
        customerPaginationContainer.id = "customerPaginationContainer";
        customerPaginationContainer.className = "customer-pagination-container";

        customersList.insertAdjacentElement(
            "afterend",
            customerPaginationContainer
        );
    }

    // Reuse or create the See More button.
    customerSeeMoreButton = document.getElementById(
        "customerSeeMoreButton"
    );

    if (!customerSeeMoreButton) {

        customerSeeMoreButton = document.createElement("button");

        customerSeeMoreButton.type = "button";
        customerSeeMoreButton.id = "customerSeeMoreButton";
        customerSeeMoreButton.className = "customer-see-more-button";

        customerSeeMoreButton.innerHTML = `
            <span>See More</span>
            <i class="fa-solid fa-chevron-down"></i>
        `;

        customerPaginationContainer.appendChild(
            customerSeeMoreButton
        );
    }

    // Ensure the See More button is inside the pagination container.
    if (
        !customerPaginationContainer.contains(
            customerSeeMoreButton
        )
    ) {
        customerPaginationContainer.appendChild(
            customerSeeMoreButton
        );
    }

    // See More: display the next 50 customers.
    customerSeeMoreButton.addEventListener("click", function () {

        customerVisibleLimit += CUSTOMER_LOAD_MORE;

        renderCustomers(getFilteredCustomers());
    });

    // Reuse or create the Hide button.
    customerHideButton = document.getElementById(
        "customerHideButton"
    );

    if (!customerHideButton) {

        customerHideButton = document.createElement("button");

        customerHideButton.type = "button";
        customerHideButton.id = "customerHideButton";
        customerHideButton.className = "customer-hide-button";

        customerHideButton.innerHTML = `
            <span>Hide</span>
            <i class="fa-solid fa-chevron-up"></i>
        `;

        customerHideButton.hidden = true;

        customerPaginationContainer.appendChild(
            customerHideButton
        );
    }

    // Ensure the Hide button is inside the pagination container.
    if (
        !customerPaginationContainer.contains(
            customerHideButton
        )
    ) {
        customerPaginationContainer.appendChild(
            customerHideButton
        );
    }

    // Hide: collapse the list back to the first 10 customers.
    customerHideButton.addEventListener("click", function () {

        resetCustomerPagination();

        renderCustomers(getFilteredCustomers());

        if (customersList) {
            customersList.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });

    updateCustomerPagination(0);
}


/* =========================================================
   UPDATE CUSTOMER PAGINATION
========================================================= */

function updateCustomerPagination(totalFilteredCustomers) {

    if (!customerSeeMoreButton || !customerHideButton) {
        return;
    }

    const hasMoreCustomers =
        totalFilteredCustomers > customerVisibleLimit;

    const hasExpandedList =
        customerVisibleLimit > CUSTOMER_INITIAL_LIMIT;

    // See More appears only when additional customers are available.
    customerSeeMoreButton.hidden = !hasMoreCustomers;

    customerSeeMoreButton.style.display =
        hasMoreCustomers ? "inline-flex" : "none";

    customerSeeMoreButton.disabled = !hasMoreCustomers;

    // Hide appears whenever the list has been expanded.
    customerHideButton.hidden = !hasExpandedList;

    customerHideButton.style.display =
        hasExpandedList ? "inline-flex" : "none";
}


/* =========================================================
   RESET CUSTOMER PAGINATION
========================================================= */

function resetCustomerPagination() {

    customerVisibleLimit = CUSTOMER_INITIAL_LIMIT;
}


/* =========================================================
   LOAD CUSTOMERS
========================================================= */

async function loadCustomers() {

    resetCustomerPagination();

    showLoadingState();
    setRefreshLoading(true);

    try {

        const response = await fetch(
            ADMIN_API_BASE + "/api/admin/customers",
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        let data;

        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error(
                "The admin server returned an invalid response."
            );
        }

        console.log("Admin customers response:", data);

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to load customers."
            );
        }

        customers = Array.isArray(data.customers)
            ? data.customers
            : [];

        updateSummary();

        renderCustomers(getFilteredCustomers());

        hideLoadingState();

        if (customers.length > 0) {
            showToast(
                "Customers loaded successfully.",
                "success"
            );
        }

    } catch (error) {

        console.error("Load customers error:", error);

        showErrorState(
            error.message || "Unable to load customers."
        );

        showToast(
            error.message || "Unable to load customers.",
            "error"
        );

    } finally {

        setRefreshLoading(false);
    }
}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    const customerCount = customers.length;

    if (totalCustomers) {
        totalCustomers.textContent = customerCount;
    }

    let motorcycleCount = 0;
    let appointmentCustomerCount = 0;
    let activeCustomerCount = 0;

    customers.forEach(function (customer) {

        const motorcycleValue =
            customer.motorcycle_count ??
            customer.motorcycles_count ??
            (
                Array.isArray(customer.motorcycles)
                    ? customer.motorcycles.length
                    : 0
            );

        motorcycleCount += Number(motorcycleValue) || 0;

        const appointmentValue =
            customer.appointment_count ??
            customer.reservation_count ??
            0;

        if (
            Number(appointmentValue) > 0 ||
            customer.has_appointments === true
        ) {
            appointmentCustomerCount++;
        }

        if (
            String(customer.status || "").toLowerCase() === "active"
        ) {
            activeCustomerCount++;
        }
    });

    if (totalMotorcycles) {
        totalMotorcycles.textContent = motorcycleCount;
    }

    if (customersWithAppointments) {
        customersWithAppointments.textContent =
            appointmentCustomerCount;
    }

    if (activeCustomers) {
        activeCustomers.textContent = activeCustomerCount;
    }

    // New Customers = customers created within the last 30 days.
    const now = new Date();

    const thirtyDaysAgo = new Date(
        now.getTime() - (30 * 24 * 60 * 60 * 1000)
    );

    const recentCustomers = customers.filter(function (customer) {

        if (!customer.created_at) {
            return false;
        }

        const created = new Date(customer.created_at);

        return (
            !Number.isNaN(created.getTime()) &&
            created >= thirtyDaysAgo
        );
    });

    if (newCustomers) {
        newCustomers.textContent = recentCustomers.length;
    }
}


/* =========================================================
   FILTER CUSTOMERS
========================================================= */

function getFilteredCustomers() {

    const search = customerSearch
        ? customerSearch.value.trim().toLowerCase()
        : "";

    const status = customerStatusFilter
        ? customerStatusFilter.value
        : "all";

    return customers.filter(function (customer) {

        const name = String(customer.name || "").toLowerCase();
        const email = String(customer.email || "").toLowerCase();
        const phone = String(customer.phone || "").toLowerCase();
        const address = String(customer.address || "").toLowerCase();

        const matchesSearch =
            !search ||
            name.includes(search) ||
            email.includes(search) ||
            phone.includes(search) ||
            address.includes(search);

        const customerStatus = String(
            customer.status || "Inactive"
        ).toLowerCase();

        const isActive = customerStatus === "active";

        const matchesStatus =
            status === "all" ||
            (status === "active" && isActive) ||
            (status === "inactive" && !isActive);

        return matchesSearch && matchesStatus;
    });
}


/* =========================================================
   RENDER CUSTOMERS
   PAGINATED CUSTOMER DISPLAY
========================================================= */

function renderCustomers(list) {

    if (!customersList) {
        return;
    }

    // Keep the old centered customer count completely hidden.
    if (displayedCustomers) {
        displayedCustomers.textContent = "";
        displayedCustomers.style.display = "none";
        displayedCustomers.hidden = true;
    }

    hideLoadingState();
    hideErrorState();

    if (!list.length) {

        customersList.innerHTML = "";

        updateCustomerPagination(0);

        showEmptyState();

        return;
    }

    hideEmptyState();

    const visibleCustomers = list.slice(
        0,
        customerVisibleLimit
    );

    customersList.innerHTML = visibleCustomers.map(
        function (customer) {
            return createCustomerCard(customer);
        }
    ).join("");

    updateCustomerPagination(list.length);
}


/* =========================================================
   CREATE CUSTOMER CARD
========================================================= */

function createCustomerCard(customer) {

    const id = customer.id != null ? customer.id : "";
    const name = customer.name || "Unnamed Customer";
    const email = customer.email || "No email provided";
    const phone = customer.phone || "Not provided";
    const address = customer.address || "Not provided";

    const motorcycleCount = Number(
        customer.motorcycle_count ??
        customer.motorcycles_count ??
        0
    ) || 0;

    const appointmentCount = Number(
        customer.appointment_count ??
        customer.reservation_count ??
        0
    ) || 0;

    const joined = formatDate(customer.created_at);
    const initials = getInitials(name);
    const status = String(customer.status || "Inactive");
    const normalizedStatus = status.toLowerCase();
    const isActive = normalizedStatus === "active";

    const statusClass = isActive
        ? "status-active"
        : "status-inactive";

    const statusIcon = isActive
        ? "fa-circle-check"
        : "fa-circle-xmark";

    return `
        <article
            class="customer-card"
            data-customer-id="${escapeHtml(String(id))}"
        >

            <div class="customer-main">
                <div class="customer-profile">
                    <div class="customer-avatar">
                        ${escapeHtml(initials)}
                    </div>

                    <div>
                        <div class="customer-name">
                            ${escapeHtml(name)}
                        </div>

                        <div class="customer-reference">
                            Customer #${escapeHtml(String(id))}
                        </div>
                    </div>
                </div>
            </div>

            <div class="customer-info">
                <div class="info-label">Contact</div>

                <div
                    class="info-value"
                    title="${escapeHtml(email)}"
                >
                    <i class="fa-solid fa-envelope"></i>
                    ${escapeHtml(email)}
                </div>

                <div
                    class="info-value"
                    title="${escapeHtml(phone)}"
                    style="margin-top: 4px;"
                >
                    <i class="fa-solid fa-phone"></i>
                    ${escapeHtml(phone)}
                </div>
            </div>

            <div class="status-wrapper">
                <span class="status-label">Account</span>

                <span class="status-badge ${statusClass}">
                    <i class="fa-solid ${statusIcon}"></i>
                    ${escapeHtml(status)}
                </span>
            </div>

            <div class="customer-actions">
                <button
                    type="button"
                    class="action-button"
                    title="View customer"
                    aria-label="View customer"
                    onclick="viewCustomer(${Number(id)})"
                >
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>

        </article>
    `;
}


/* =========================================================
   VIEW CUSTOMER
========================================================= */

function viewCustomer(id) {

    const customer = customers.find(function (item) {
        return Number(item.id) === Number(id);
    });

    if (!customer) {
        return;
    }

    const name = customer.name || "Unnamed Customer";
    const email = customer.email || "Not provided";
    const phone = customer.phone || "Not provided";
    const address = customer.address || "Not provided";
    const joined = formatDate(customer.created_at);

    const motorcycleCount = Number(
        customer.motorcycle_count ??
        customer.motorcycles_count ??
        0
    ) || 0;

    const appointmentCount = Number(
        customer.appointment_count ??
        customer.reservation_count ??
        0
    ) || 0;

    const status = String(customer.status || "Inactive");
    const normalizedStatus = status.toLowerCase();
    const isActive = normalizedStatus === "active";

    const statusIcon = isActive
        ? "fa-circle-check"
        : "fa-circle-xmark";

    if (!customerDetails) {
        return;
    }

    customerDetails.innerHTML = `
        <div
            class="customer-profile"
            style="margin-bottom: 20px;"
        >
            <div
                class="customer-avatar"
                style="width: 48px; height: 48px;"
            >
                ${escapeHtml(getInitials(name))}
            </div>

            <div>
                <div
                    class="customer-name"
                    style="font-size: 15px;"
                >
                    ${escapeHtml(name)}
                </div>

                <div
                    class="customer-reference"
                    style="margin-top: 4px;"
                >
                    Customer #${escapeHtml(String(customer.id))}
                </div>
            </div>
        </div>

        <div class="details-grid">

            <div class="detail-box">
                <div class="detail-label">Email</div>
                <div class="detail-value">
                    <i class="fa-solid fa-envelope"></i>
                    ${escapeHtml(email)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Phone</div>
                <div class="detail-value">
                    <i class="fa-solid fa-phone"></i>
                    ${escapeHtml(phone)}
                </div>
            </div>

            <div class="detail-box full">
                <div class="detail-label">Address</div>
                <div class="detail-value">
                    <i class="fa-solid fa-location-dot"></i>
                    ${escapeHtml(address)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Date Joined</div>
                <div class="detail-value">
                    <i class="fa-regular fa-calendar"></i>
                    ${escapeHtml(joined)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Account Status</div>
                <div class="detail-value">
                    <i class="fa-solid ${statusIcon}"></i>
                    ${escapeHtml(status)}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Motorcycles</div>
                <div class="detail-value">
                    <i class="fa-solid fa-motorcycle"></i>
                    ${escapeHtml(String(motorcycleCount))}
                </div>
            </div>

            <div class="detail-box">
                <div class="detail-label">Appointments</div>
                <div class="detail-value">
                    <i class="fa-regular fa-calendar-check"></i>
                    ${escapeHtml(String(appointmentCount))}
                </div>
            </div>

        </div>
    `;

    if (customerModal) {
        customerModal.classList.add("show");
    }
}


/* =========================================================
   CLOSE CUSTOMER MODAL
========================================================= */

function closeModal() {

    if (!customerModal) {
        return;
    }

    customerModal.classList.remove("show");
}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoadingState() {

    if (customersLoading) {
        customersLoading.style.display = "flex";
    }

    if (customersError) {
        customersError.style.display = "none";
    }

    if (customersEmpty) {
        customersEmpty.style.display = "none";
    }

    if (customersList) {
        customersList.innerHTML = "";
    }

    updateCustomerPagination(0);
}


function hideLoadingState() {

    if (customersLoading) {
        customersLoading.style.display = "none";
    }
}


/* =========================================================
   ERROR STATE
========================================================= */

function showErrorState(message) {

    hideLoadingState();
    hideEmptyState();

    if (customersList) {
        customersList.innerHTML = "";
    }

    updateCustomerPagination(0);

    if (customersErrorMessage) {
        customersErrorMessage.textContent =
            message || "Unable to load customers.";
    }

    if (customersError) {
        customersError.style.display = "flex";
    }

    if (displayedCustomers) {
        displayedCustomers.textContent = "";
        displayedCustomers.style.display = "none";
        displayedCustomers.hidden = true;
    }
}


function hideErrorState() {

    if (customersError) {
        customersError.style.display = "none";
    }
}


/* =========================================================
   EMPTY STATE
========================================================= */

function showEmptyState() {

    hideLoadingState();
    hideErrorState();

    if (customersEmpty) {
        customersEmpty.style.display = "flex";
    }
}


function hideEmptyState() {

    if (customersEmpty) {
        customersEmpty.style.display = "none";
    }
}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function setRefreshLoading(loading) {

    if (!refreshButton) {
        return;
    }

    refreshButton.disabled = loading;

    if (loading) {

        refreshButton.classList.add("loading");

        const icon = refreshButton.querySelector("i");

        if (icon) {
            icon.classList.add("fa-spin");
        }

    } else {

        refreshButton.classList.remove("loading");

        const icon = refreshButton.querySelector("i");

        if (icon) {
            icon.classList.remove("fa-spin");
        }
    }
}


/* =========================================================
   SEARCH
========================================================= */

function filterCustomers() {

    resetCustomerPagination();

    const filtered = getFilteredCustomers();

    renderCustomers(filtered);
}


/* =========================================================
   CLEAR FILTERS
========================================================= */

function clearFilters() {

    if (customerSearch) {
        customerSearch.value = "";
    }

    if (customerStatusFilter) {
        customerStatusFilter.value = "all";
    }

    resetCustomerPagination();

    renderCustomers(customers);
}


/* =========================================================
   THEME
   Theme handling is centralized in admin-theme.js.
========================================================= */

function applySavedTheme() {

    const savedTheme =
        localStorage.getItem("addMotorTheme") ||
        localStorage.getItem("adminTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
}


/* =========================================================
   SIDEBAR
========================================================= */

function openSidebar() {

    if (sidebar) {
        sidebar.classList.add("mobile-open");
    }

    if (sidebarOverlay) {
        sidebarOverlay.classList.add("show");
    }
}


function closeSidebar() {

    if (sidebar) {
        sidebar.classList.remove("mobile-open");
    }

    if (sidebarOverlay) {
        sidebarOverlay.classList.remove("show");
    }
}


function toggleSidebar() {

    if (!sidebar) {
        return;
    }

    if (sidebar.classList.contains("mobile-open")) {
        closeSidebar();
    } else {
        openSidebar();
    }
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminId");
    localStorage.removeItem("addMotorUser");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");

    window.location.href = "login.html";
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "success") {

    if (!toast) {
        return;
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    if (toastTitle) {
        toastTitle.textContent =
            type === "error" ? "Error" : "Success";
    }

    if (toastIcon) {
        toastIcon.className =
            type === "error"
                ? "fa-solid fa-circle-exclamation"
                : "fa-solid fa-check";
    }

    toast.className = "toast show " + type;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(function () {
        toast.classList.remove("show");
    }, 3000);
}


function closeToast() {

    if (!toast) {
        return;
    }

    toast.classList.remove("show");
}


/* =========================================================
   HELPERS
========================================================= */

function getInitials(name) {

    return String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(function (part) {
            return part.charAt(0);
        })
        .join("")
        .toUpperCase() || "C";
}


function formatDate(value) {

    if (!value) {
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}


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

if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", toggleSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
}

/*
   Theme toggle is intentionally NOT handled here.
   admin-theme.js is the single source of truth.
*/

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

if (refreshButton) {
    refreshButton.addEventListener("click", loadCustomers);
}

if (customerSearch) {
    customerSearch.addEventListener("input", filterCustomers);
}

if (customerStatusFilter) {
    customerStatusFilter.addEventListener("change", filterCustomers);
}

if (clearCustomerFilters) {
    clearCustomerFilters.addEventListener("click", clearFilters);
}

if (retryCustomers) {
    retryCustomers.addEventListener("click", loadCustomers);
}

if (closeCustomerModal) {
    closeCustomerModal.addEventListener("click", closeModal);
}

if (customerModal) {

    customerModal.addEventListener("click", function (event) {

        if (event.target === customerModal) {
            closeModal();
        }
    });
}

if (toastClose) {
    toastClose.addEventListener("click", closeToast);
}


/* =========================================================
   CLOSE SIDEBAR WHEN NAV ITEM IS CLICKED
========================================================= */

document.querySelectorAll(".nav-item").forEach(function (item) {

    item.addEventListener("click", closeSidebar);
});


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
        closeModal();
        closeToast();
        closeSidebar();
        closePendingAccounts();
        closePendingCustomerDetails();
        closeIdentityImagePreview();
    }
});


/* =========================================================
   GLOBAL VIEW FUNCTION
========================================================= */

window.viewCustomer = viewCustomer;


/* =========================================================
   INITIALIZE
========================================================= */

initializeAdmin();

applySavedTheme();

initializeCustomerPagination();

loadCustomers();


console.log("ADD Motor Shop Admin Customers loaded.");
console.log("Admin API:", ADMIN_API_BASE);


/* =========================================================
   PENDING CUSTOMER ACCOUNTS
   ACCOUNT APPROVAL MANAGEMENT
========================================================= */


/* =========================================================
   INITIALIZE PENDING ACCOUNTS UI
========================================================= */

function initializePendingAccounts() {

    const customerHeader = document.querySelector(
        ".content-card-header"
    );

    if (!customerHeader) {
        console.error("Customer list header was not found.");
        return;
    }

    // Prevent duplicate button creation.
    if (document.getElementById("pendingAccountsButton")) {
        return;
    }

    const pendingButton = document.createElement("button");

    pendingButton.type = "button";
    pendingButton.id = "pendingAccountsButton";
    pendingButton.className = "pending-accounts-button";

    pendingButton.innerHTML = `
        <i class="fa-solid fa-user-clock"></i>
        <span>Pending Accounts</span>
        <span class="pending-count-badge" id="pendingAccountsCount">0</span>
    `;

    customerHeader.appendChild(pendingButton);

    pendingButton.addEventListener("click", openPendingAccounts);

    // Create the pending accounts modal.
    const modal = document.createElement("div");

    modal.id = "pendingAccountsModal";
    modal.className = "pending-modal-overlay";

    modal.innerHTML = `
        <div class="pending-modal">

            <div class="pending-modal-header">
                <div>
                    <span class="pending-modal-eyebrow">
                        ACCOUNT MANAGEMENT
                    </span>

                    <h2>Pending Customer Accounts</h2>

                    <p>
                        Review customer information before approving registrations.
                    </p>
                </div>

                <button
                    type="button"
                    class="pending-modal-close"
                    id="closePendingAccountsModal"
                    aria-label="Close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="pending-modal-summary">
                <div class="pending-summary-icon">
                    <i class="fa-solid fa-user-clock"></i>
                </div>

                <div>
                    <strong id="pendingModalCount">0</strong>
                    <span>Accounts waiting for approval</span>
                </div>
            </div>

            <div class="pending-list" id="pendingAccountsList">
                <div class="pending-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <p>Loading pending accounts...</p>
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById(
        "closePendingAccountsModal"
    ).addEventListener("click", closePendingAccounts);

    modal.addEventListener("click", function (event) {

        if (event.target === modal) {
            closePendingAccounts();
        }
    });

    loadPendingAccountCount();

    // Refresh the count every 30 seconds.
    pendingCountInterval = setInterval(
        loadPendingAccountCount,
        30000
    );
}


/* =========================================================
   LOAD PENDING ACCOUNT COUNT
========================================================= */

async function loadPendingAccountCount() {

    const badge = document.getElementById(
        "pendingAccountsCount"
    );

    try {

        const response = await fetch(
            ADMIN_API_BASE + "/api/admin/customers/pending/count",
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Unable to retrieve pending account count."
            );
        }

        const count = Number(data.count || 0);

        if (badge) {

            badge.textContent = count > 99 ? "99+" : count;

            badge.style.display =
                count > 0 ? "inline-flex" : "none";
        }

        const modalCount = document.getElementById(
            "pendingModalCount"
        );

        if (modalCount) {
            modalCount.textContent = count;
        }

    } catch (error) {

        console.error("Pending account count error:", error);
    }
}


/* =========================================================
   OPEN PENDING ACCOUNTS
========================================================= */

async function openPendingAccounts() {

    const modal = document.getElementById(
        "pendingAccountsModal"
    );

    if (!modal) {
        return;
    }

    modal.classList.add("show");

    await loadPendingAccounts();
}


/* =========================================================
   CLOSE PENDING ACCOUNTS
========================================================= */

function closePendingAccounts() {

    const modal = document.getElementById(
        "pendingAccountsModal"
    );

    if (modal) {
        modal.classList.remove("show");
    }
}


/* =========================================================
   LOAD PENDING ACCOUNTS
========================================================= */

async function loadPendingAccounts() {

    const list = document.getElementById(
        "pendingAccountsList"
    );

    if (!list) {
        return;
    }

    list.innerHTML = `
        <div class="pending-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Loading pending accounts...</p>
        </div>
    `;

    try {

        const response = await fetch(
            ADMIN_API_BASE + "/api/admin/customers/pending",
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to load pending accounts."
            );
        }

        pendingCustomers = Array.isArray(data.customers)
            ? data.customers
            : [];

        renderPendingAccounts();

        await loadPendingAccountCount();

    } catch (error) {

        console.error("Load pending accounts error:", error);

        list.innerHTML = `
            <div class="pending-empty pending-error">
                <i class="fa-solid fa-circle-exclamation"></i>

                <h3>Unable to Load Accounts</h3>

                <p>${escapeHtml(error.message)}</p>

                <button
                    type="button"
                    class="pending-retry-button"
                    onclick="loadPendingAccounts()"
                >
                    <i class="fa-solid fa-rotate-right"></i>
                    Try Again
                </button>
            </div>
        `;
    }
}


/* =========================================================
   RENDER PENDING ACCOUNTS
========================================================= */

function renderPendingAccounts() {

    const list = document.getElementById(
        "pendingAccountsList"
    );

    if (!list) {
        return;
    }

    const modalCount = document.getElementById(
        "pendingModalCount"
    );

    if (modalCount) {
        modalCount.textContent = pendingCustomers.length;
    }

    if (pendingCustomers.length === 0) {

        list.innerHTML = `
            <div class="pending-empty">
                <div class="pending-empty-icon">
                    <i class="fa-solid fa-circle-check"></i>
                </div>

                <h3>No Pending Accounts</h3>

                <p>
                    There are currently no customer registrations waiting for approval.
                </p>
            </div>
        `;

        return;
    }

    list.innerHTML = pendingCustomers.map(function (customer) {

        const name = customer.name || "Unnamed Customer";
        const email = customer.email || "No email provided";
        const phone = customer.phone || "Not provided";
        const address = customer.address || "Not provided";
        const date = formatDate(customer.created_at);

        return `
            <article
                class="pending-customer-card"
                data-pending-id="${escapeHtml(String(customer.id))}"
            >

                <div class="pending-customer-top">
                    <div class="pending-customer-profile">
                        <div class="pending-customer-avatar">
                            ${escapeHtml(getInitials(name))}
                        </div>

                        <div class="pending-customer-name">
                            <strong>${escapeHtml(name)}</strong>

                            <span>
                                Customer #${escapeHtml(String(customer.id))}
                            </span>
                        </div>
                    </div>

                    <span class="pending-status-badge">
                        <i class="fa-solid fa-clock"></i>
                        Pending
                    </span>
                </div>

                <div class="pending-customer-information">
                    <div>
                        <i class="fa-solid fa-envelope"></i>
                        <span>${escapeHtml(email)}</span>
                    </div>

                    <div>
                        <i class="fa-solid fa-phone"></i>
                        <span>${escapeHtml(phone)}</span>
                    </div>

                    <div>
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeHtml(address)}</span>
                    </div>

                    <div>
                        <i class="fa-regular fa-calendar"></i>
                        <span>Registered: ${escapeHtml(date)}</span>
                    </div>
                </div>

                <div class="pending-customer-actions">
                    <button
                        type="button"
                        class="pending-view-button"
                        onclick="viewPendingCustomer(${Number(customer.id)})"
                    >
                        <i class="fa-solid fa-eye"></i>
                        View
                    </button>

                    <button
                        type="button"
                        class="pending-reject-button"
                        onclick="updatePendingCustomerStatus(
                            ${Number(customer.id)},
                            'rejected'
                        )"
                    >
                        <i class="fa-solid fa-xmark"></i>
                        Reject
                    </button>

                    <button
                        type="button"
                        class="pending-accept-button"
                        onclick="updatePendingCustomerStatus(
                            ${Number(customer.id)},
                            'approved'
                        )"
                    >
                        <i class="fa-solid fa-check"></i>
                        Accept
                    </button>
                </div>

            </article>
        `;
    }).join("");
}


/* =========================================================
   VIEW PENDING CUSTOMER DETAILS
========================================================= */

function viewPendingCustomer(id) {

    const customer = pendingCustomers.find(function (item) {
        return Number(item.id) === Number(id);
    });

    if (!customer) {
        return;
    }

    const name = customer.name || "Unnamed Customer";
    const email = customer.email || "Not provided";
    const phone = customer.phone || "Not provided";
    const address = customer.address || "Not provided";
    const date = formatDate(customer.created_at);

    let detailsModal = document.getElementById(
        "pendingCustomerDetailsModal"
    );

    if (!detailsModal) {

        detailsModal = document.createElement("div");
        detailsModal.id = "pendingCustomerDetailsModal";
        detailsModal.className = "pending-details-overlay";

        document.body.appendChild(detailsModal);
    }

    detailsModal.innerHTML = `
        <div class="pending-details-modal">

            <div class="pending-details-header">
                <div>
                    <span class="pending-modal-eyebrow">
                        CUSTOMER INFORMATION
                    </span>

                    <h2>Registration Details</h2>
                </div>

                <button
                    type="button"
                    class="pending-modal-close"
                    onclick="closePendingCustomerDetails()"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="pending-details-body">

                <div class="pending-details-profile">
                    <div class="pending-customer-avatar">
                        ${escapeHtml(getInitials(name))}
                    </div>

                    <div>
                        <strong>${escapeHtml(name)}</strong>
                        <span>
                            Customer #${escapeHtml(String(customer.id))}
                        </span>
                    </div>
                </div>

                <div class="pending-detail-item">
                    <span>Email Address</span>
                    <strong>${escapeHtml(email)}</strong>
                </div>

                <div class="pending-detail-item">
                    <span>Phone Number</span>
                    <strong>${escapeHtml(phone)}</strong>
                </div>

                <div class="pending-detail-item">
                    <span>Complete Address</span>
                    <strong>${escapeHtml(address)}</strong>
                </div>

                <div class="pending-detail-item">
                    <span>Registration Date</span>
                    <strong>${escapeHtml(date)}</strong>
                </div>

                <div class="pending-detail-item">
                    <span>Account Approval Status</span>
                    <strong class="pending-detail-status">
                        Pending Approval
                    </strong>
                </div>

                <div
                    class="pending-identity-section"
                    style="
                        margin-top: 22px;
                        padding-top: 20px;
                        border-top: 1px solid var(--border-color, #e5e7eb);
                    "
                >

                    <div
                        style="
                            display: flex;
                            align-items: center;
                            gap: 9px;
                            margin-bottom: 12px;
                        "
                    >
                        <i class="fa-solid fa-id-card"></i>
                        <strong>Submitted Valid ID</strong>
                    </div>

                    <div
                        id="pendingIdentityLoading"
                        style="
                            padding: 25px 15px;
                            text-align: center;
                            color: var(--text-secondary, #777);
                        "
                    >
                        <i class="fa-solid fa-spinner fa-spin"></i>

                        <p style="margin-top: 8px;">
                            Loading submitted ID image...
                        </p>
                    </div>

                    <div
                        id="pendingIdentityError"
                        style="
                            display: none;
                            padding: 20px;
                            text-align: center;
                            border: 1px dashed var(--border-color, #ddd);
                            border-radius: 10px;
                            color: var(--text-secondary, #777);
                        "
                    >
                        <i class="fa-solid fa-image"></i>

                        <p
                            id="pendingIdentityErrorMessage"
                            style="margin-top: 8px;"
                        >
                            No ID image is available.
                        </p>
                    </div>

                    <div
                        id="pendingIdentityImageContainer"
                        style="
                            display: none;
                            text-align: center;
                        "
                    >
                        <img
                            id="pendingIdentityImage"
                            alt="Customer submitted identification document"
                            style="
                                display: block;
                                width: 100%;
                                max-width: 440px;
                                max-height: 380px;
                                object-fit: contain;
                                margin: 0 auto;
                                border: 1px solid var(--border-color, #ddd);
                                border-radius: 10px;
                                background: #fff;
                                padding: 6px;
                                cursor: zoom-in;
                            "
                            title="Click to enlarge"
                        >

                        <p
                            style="
                                margin-top: 9px;
                                font-size: 12px;
                                color: var(--text-secondary, #777);
                            "
                        >
                            Click the image to view it larger.
                        </p>
                    </div>

                </div>

            </div>

            <div class="pending-details-footer">
                <button
                    type="button"
                    class="pending-view-close-button"
                    onclick="closePendingCustomerDetails()"
                >
                    Close
                </button>
            </div>

        </div>
    `;

    detailsModal.classList.add("show");

    loadPendingCustomerIdentityDocument(customer.id);
}


/* =========================================================
   LOAD CUSTOMER ID IMAGE
========================================================= */

async function loadPendingCustomerIdentityDocument(customerId) {

    const loading = document.getElementById("pendingIdentityLoading");
    const errorContainer = document.getElementById("pendingIdentityError");
    const errorMessage = document.getElementById("pendingIdentityErrorMessage");
    const imageContainer = document.getElementById("pendingIdentityImageContainer");
    const image = document.getElementById("pendingIdentityImage");

    if (!loading || !errorContainer || !imageContainer || !image) {
        return;
    }

    pendingIdentityRequestToken++;

    const requestToken = pendingIdentityRequestToken;

    releasePendingIdentityObjectUrl();

    loading.style.display = "block";
    errorContainer.style.display = "none";
    imageContainer.style.display = "none";

    image.removeAttribute("src");

    try {

        const currentAdmin = getAdminUser();

        const response = await fetch(
            ADMIN_API_BASE +
            "/api/admin/customers/" +
            encodeURIComponent(customerId) +
            "/identity-document",
            {
                method: "GET",
                headers: {
                    "x-admin-id": currentAdmin
                        ? String(currentAdmin.id)
                        : ""
                },
                cache: "no-store"
            }
        );

        if (requestToken !== pendingIdentityRequestToken) {
            return;
        }

        if (!response.ok) {

            if (response.status === 404) {
                throw new Error(
                    "No ID image was uploaded for this registration."
                );
            }

            if (response.status === 401 || response.status === 403) {
                throw new Error(
                    "You are not authorized to view this ID image. Please check your admin login."
                );
            }

            throw new Error(
                "Unable to retrieve the customer's ID image."
            );
        }

        const contentType = String(
            response.headers.get("Content-Type") || ""
        ).toLowerCase();

        if (
            !contentType.includes("image/jpeg") &&
            !contentType.includes("image/png")
        ) {
            throw new Error(
                "The uploaded document is not a supported image."
            );
        }

        const imageBlob = await response.blob();

        if (requestToken !== pendingIdentityRequestToken) {
            return;
        }

        if (!imageBlob.size) {
            throw new Error("The uploaded ID image is empty.");
        }

        pendingIdentityObjectUrl = URL.createObjectURL(imageBlob);

        image.onload = function () {

            if (requestToken !== pendingIdentityRequestToken) {
                return;
            }

            loading.style.display = "none";
            errorContainer.style.display = "none";
            imageContainer.style.display = "block";
        };

        image.onerror = function () {

            if (requestToken !== pendingIdentityRequestToken) {
                return;
            }

            releasePendingIdentityObjectUrl();

            showPendingIdentityError(
                "The ID image could not be displayed. The uploaded file may be damaged."
            );
        };

        image.src = pendingIdentityObjectUrl;

    } catch (error) {

        if (requestToken !== pendingIdentityRequestToken) {
            return;
        }

        console.error("Load customer ID image error:", error);

        showPendingIdentityError(
            error.message ||
            "Unable to load the customer's ID image."
        );
    }
}


/* =========================================================
   SHOW ID IMAGE ERROR
========================================================= */

function showPendingIdentityError(message) {

    const loading = document.getElementById("pendingIdentityLoading");
    const errorContainer = document.getElementById("pendingIdentityError");
    const errorMessage = document.getElementById("pendingIdentityErrorMessage");
    const imageContainer = document.getElementById("pendingIdentityImageContainer");

    if (loading) {
        loading.style.display = "none";
    }

    if (imageContainer) {
        imageContainer.style.display = "none";
    }

    if (errorMessage) {
        errorMessage.textContent = message;
    }

    if (errorContainer) {
        errorContainer.style.display = "block";
    }
}


/* =========================================================
   RELEASE ID IMAGE OBJECT URL
========================================================= */

function releasePendingIdentityObjectUrl() {

    if (pendingIdentityObjectUrl) {

        URL.revokeObjectURL(pendingIdentityObjectUrl);

        pendingIdentityObjectUrl = null;
    }
}


/* =========================================================
   ID IMAGE PREVIEW
========================================================= */

function openIdentityImagePreview() {

    const image = document.getElementById("pendingIdentityImage");

    if (!image || !image.src) {
        return;
    }

    let preview = document.getElementById("pendingIdentityPreview");

    if (!preview) {

        preview = document.createElement("div");
        preview.id = "pendingIdentityPreview";

        preview.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 10050;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 25px;
            background: rgba(0, 0, 0, 0.88);
            cursor: zoom-out;
        `;

        preview.innerHTML = `
            <button
                type="button"
                aria-label="Close image preview"
                style="
                    position: absolute;
                    top: 20px;
                    right: 25px;
                    width: 42px;
                    height: 42px;
                    border: 0;
                    border-radius: 50%;
                    background: #fff;
                    color: #111;
                    font-size: 22px;
                    cursor: pointer;
                "
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <img
                id="pendingIdentityPreviewImage"
                alt="Enlarged customer identification document"
                style="
                    max-width: 95%;
                    max-height: 90vh;
                    object-fit: contain;
                    border-radius: 8px;
                    background: #fff;
                "
            >
        `;

        document.body.appendChild(preview);

        preview.addEventListener("click", function (event) {

            if (
                event.target === preview ||
                event.target.closest("button")
            ) {
                closeIdentityImagePreview();
            }
        });
    }

    const previewImage = document.getElementById(
        "pendingIdentityPreviewImage"
    );

    if (previewImage) {
        previewImage.src = image.src;
    }

    preview.style.display = "flex";
}


/* =========================================================
   CLOSE ID IMAGE PREVIEW
========================================================= */

function closeIdentityImagePreview() {

    const preview = document.getElementById(
        "pendingIdentityPreview"
    );

    if (preview) {
        preview.style.display = "none";
    }
}


/* =========================================================
   ID IMAGE CLICK EVENT
========================================================= */

document.addEventListener("click", function (event) {

    if (
        event.target &&
        event.target.id === "pendingIdentityImage"
    ) {
        openIdentityImagePreview();
    }
});


/* =========================================================
   CLOSE PENDING CUSTOMER DETAILS
========================================================= */

function closePendingCustomerDetails() {

    const modal = document.getElementById(
        "pendingCustomerDetailsModal"
    );

    if (modal) {
        modal.classList.remove("show");
    }

    pendingIdentityRequestToken++;

    releasePendingIdentityObjectUrl();

    closeIdentityImagePreview();
}


/* =========================================================
   ACCEPT OR REJECT CUSTOMER ACCOUNT
========================================================= */

async function updatePendingCustomerStatus(customerId, accountStatus) {

    if (!["approved", "rejected"].includes(accountStatus)) {
        return;
    }

    const customer = pendingCustomers.find(function (item) {
        return Number(item.id) === Number(customerId);
    });

    if (!customer) {

        showToast(
            "This pending account could not be found.",
            "error"
        );

        return;
    }

    const actionText = accountStatus === "approved"
        ? "approve"
        : "reject";

    const confirmed = window.confirm(
        `Are you sure you want to ${actionText} the account of ${customer.name}?`
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            ADMIN_API_BASE +
            "/api/admin/customers/" +
            encodeURIComponent(customerId) +
            "/account-status",
            {
                method: "PUT",
                headers: getAdminHeaders(),
                body: JSON.stringify({
                    account_status: accountStatus,
                    status: accountStatus
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to update customer account."
            );
        }

        showToast(
            accountStatus === "approved"
                ? "Customer account approved successfully."
                : "Customer account rejected successfully.",
            "success"
        );

        closePendingCustomerDetails();

        await loadPendingAccounts();

        await loadCustomers();

    } catch (error) {

        console.error(
            "Update customer account status error:",
            error
        );

        showToast(
            error.message || "Unable to update customer account.",
            "error"
        );
    }
}


/* =========================================================
   PENDING ACCOUNTS KEYBOARD SUPPORT
========================================================= */

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
        closePendingAccounts();
        closePendingCustomerDetails();
        closeIdentityImagePreview();
    }
});


/* =========================================================
   START PENDING ACCOUNTS
========================================================= */

initializePendingAccounts();