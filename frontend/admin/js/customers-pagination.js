
(function () {
    "use strict";

    // =====================================================
    // CUSTOMER LIST PAGINATION
    // Initial display: 10 customers
    // Each See More click: 50 additional customers
    // =====================================================

    const INITIAL_LIMIT = 10;
    const LOAD_INCREMENT = 50;

    let currentCustomers = [];
    let visibleLimit = INITIAL_LIMIT;

    let originalRenderCustomers = null;
    let paginationButton = null;
    let paginationMeta = null;

    let paginationContainer = null;
    let restorationContainer = null;

    // =====================================================
    // CREATE PAGINATION AND RESTORATION CONTAINERS
    // =====================================================

    function createPaginationContainers() {
        const customersList = document.getElementById(
            "customersList"
        );

        if (!customersList) {
            console.error(
                "Customer pagination: customersList was not found."
            );
            return false;
        }

        paginationContainer = document.getElementById(
            "customerPaginationContainer"
        );

        if (!paginationContainer) {
            paginationContainer = document.createElement("div");

            paginationContainer.id =
                "customerPaginationContainer";

            paginationContainer.className =
                "customer-pagination";

            paginationContainer.innerHTML = `
                <span
                    class="customer-pagination-meta"
                    id="customerPaginationMeta"
                ></span>

                <button
                    type="button"
                    class="customer-pagination-button"
                    id="customerSeeMoreButton"
                >
                    <span>See More</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            `;

            customersList.insertAdjacentElement(
                "afterend",
                paginationContainer
            );
        }

        paginationButton = document.getElementById(
            "customerSeeMoreButton"
        );

        paginationMeta = document.getElementById(
            "customerPaginationMeta"
        );

        restorationContainer = document.getElementById(
            "customerRestorationActions"
        );

        if (!restorationContainer) {
            restorationContainer = document.createElement("div");

            restorationContainer.id =
                "customerRestorationActions";

            restorationContainer.className =
                "customer-restoration-actions";

            paginationContainer.insertAdjacentElement(
                "afterend",
                restorationContainer
            );
        }

        return Boolean(
            paginationButton &&
            paginationMeta &&
            restorationContainer
        );
    }

    // =====================================================
    // POSITION LOCKED ACCOUNTS BUTTON
    // Keep it below See More.
    // =====================================================

    function moveLockedAccountsButton() {
        if (!restorationContainer) return;

        const lockedButton = document.getElementById(
            "lockedAccountsButton"
        );

        if (!lockedButton) return;

        if (
            lockedButton.parentElement !==
            restorationContainer
        ) {
            restorationContainer.appendChild(lockedButton);
        }
    }

    function observeRestorationButton() {
        moveLockedAccountsButton();

        const observer = new MutationObserver(() => {
            moveLockedAccountsButton();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // =====================================================
    // UPDATE PAGINATION INFORMATION
    // =====================================================

    function updatePaginationInformation() {
        if (!paginationContainer) return;

        const total = currentCustomers.length;

        const visible = Math.min(
            visibleLimit,
            total
        );

        if (paginationMeta) {
            paginationMeta.textContent =
                total > 0
                    ? `Showing ${visible} of ${total} customers`
                    : "";
        }

        if (paginationButton) {
            const remaining = total - visible;

            paginationContainer.style.display =
                remaining > 0 ? "flex" : "none";

            paginationButton.style.display =
                remaining > 0 ? "inline-flex" : "none";

            paginationButton.disabled =
                remaining <= 0;

            paginationButton.innerHTML = `
                <span>See More</span>
                <i class="fa-solid fa-chevron-down"></i>
            `;
        }

        if (restorationContainer) {
            restorationContainer.style.display = "flex";
        }

        moveLockedAccountsButton();
    }

    // =====================================================
    // RENDER VISIBLE CUSTOMERS
    // =====================================================

    function renderVisibleCustomers() {
        if (!originalRenderCustomers) return;

        const visibleCustomers = currentCustomers.slice(
            0,
            visibleLimit
        );

        originalRenderCustomers(visibleCustomers);

        updatePaginationInformation();
    }

    // =====================================================
    // RESET PAGINATION WHEN LIST CHANGES
    // =====================================================

    function renderPaginatedCustomers(list) {
        currentCustomers = Array.isArray(list)
            ? list.slice()
            : [];

        visibleLimit = INITIAL_LIMIT;

        renderVisibleCustomers();
    }

    // =====================================================
    // SEE MORE
    // =====================================================

    function showMoreCustomers() {
        if (
            visibleLimit >= currentCustomers.length
        ) {
            return;
        }

        visibleLimit = Math.min(
            visibleLimit + LOAD_INCREMENT,
            currentCustomers.length
        );

        renderVisibleCustomers();
    }

    // =====================================================
    // INITIALIZE
    // =====================================================

    function initializeCustomerPagination() {
        if (!createPaginationContainers()) {
            console.error(
                "Customer pagination could not initialize."
            );
            return;
        }

        if (typeof window.renderCustomers !== "function") {
            console.error(
                "Customer pagination could not find the existing renderCustomers function."
            );
            return;
        }

        // Preserve the original customer renderer.
        originalRenderCustomers =
            window.renderCustomers.bind(window);

        // Replace only the rendering entry point.
        window.renderCustomers =
            renderPaginatedCustomers;

        paginationButton.addEventListener(
            "click",
            showMoreCustomers
        );

        // Watch for the restoration module to create its button.
        observeRestorationButton();

        // Re-render in case the original customer request
        // completed before this module initialized.
        if (typeof window.filterCustomers === "function") {
            window.filterCustomers();
        }

        console.log(
            "ADD Motor Shop Customer Pagination loaded."
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeCustomerPagination
        );
    } else {
        initializeCustomerPagination();
    }

})();
