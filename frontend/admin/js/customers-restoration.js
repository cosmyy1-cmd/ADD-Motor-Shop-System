
/* =========================================================
   ADD MOTOR SHOP - CUSTOMER ACCOUNT RESTORATION
   LOCKED ACCOUNT MANAGEMENT

   Backend:
   GET  /api/admin/customers/locked
   POST /api/admin/customers/:id/restore

   Dependencies:
   - customers.js
   - Admin authentication
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const API_BASE = "http://localhost:3000";


    /* =====================================================
       ELEMENTS AND STATE
    ===================================================== */

    let lockedCustomers = [];

    let restorationModal = null;

    let restorationButton = null;

    let restorationContainer = null;

    let isLoading = false;

    let isRestoring = false;


    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    function getRestorationHeaders() {

        if (typeof getAdminHeaders === "function") {
            return getAdminHeaders();
        }

        const storedUser =
            localStorage.getItem("adminUser") ||
            localStorage.getItem("addMotorUser") ||
            localStorage.getItem("user");

        let user = null;

        try {
            user = storedUser
                ? JSON.parse(storedUser)
                : null;
        } catch (error) {
            console.error(
                "Unable to read admin account:",
                error
            );
        }

        return {
            "Content-Type": "application/json",
            "x-admin-id": user
                ? String(user.id)
                : ""
        };
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function escapeRestorationHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function showRestorationToast(message, type = "success") {

        if (typeof showToast === "function") {

            showToast(message, type);

            return;
        }

        console.log(
            "[Account Restoration]",
            message
        );
    }


    function getCustomerName(customer) {

        return customer.name || "Unnamed Customer";
    }


    function getCustomerEmail(customer) {

        return customer.email || "No email provided";
    }


    function getCustomerPhone(customer) {

        return customer.phone || "Not provided";
    }


    function getFailedAttempts(customer) {

        return Number(
            customer.failed_login_attempts || 5
        );
    }


    /* =====================================================
       CREATE RESTORATION CONTAINER
    ===================================================== */

    function initializeRestorationContainer() {

        restorationContainer = document.getElementById(
            "customerRestorationActions"
        );

        if (restorationContainer) {
            return restorationContainer;
        }


        const customersList = document.getElementById(
            "customersList"
        );

        if (!customersList) {

            console.error(
                "Customer list was not found. Account restoration could not initialize."
            );

            return null;
        }


        restorationContainer = document.createElement("div");

        restorationContainer.id =
            "customerRestorationActions";

        restorationContainer.className =
            "customer-restoration-actions";


        /*
            If pagination already exists, place the
            restoration button inside it.

            Otherwise, place it immediately after
            the customer list.
        */

        const paginationContainer =
            document.getElementById(
                "customerPaginationContainer"
            );


        if (paginationContainer) {

            paginationContainer.appendChild(
                restorationContainer
            );

        } else {

            customersList.insertAdjacentElement(
                "afterend",
                restorationContainer
            );
        }


        return restorationContainer;
    }


    /* =====================================================
       CREATE LOCKED ACCOUNTS BUTTON
    ===================================================== */

    function initializeRestorationButton() {

        const container =
            initializeRestorationContainer();

        if (!container) {
            return;
        }


        if (
            document.getElementById(
                "lockedAccountsButton"
            )
        ) {
            restorationButton =
                document.getElementById(
                    "lockedAccountsButton"
                );

            return;
        }


        restorationButton =
            document.createElement("button");

        restorationButton.type = "button";

        restorationButton.id =
            "lockedAccountsButton";

        restorationButton.className =
            "locked-accounts-button";


        restorationButton.innerHTML = `
            <span class="locked-button-icon">
                <i class="fa-solid fa-lock"></i>
            </span>

            <span class="locked-button-text">
                Locked Accounts
            </span>

            <span
                class="locked-count-badge"
                id="lockedAccountsCount"
            >
                0
            </span>
        `;


        restorationButton.addEventListener(
            "click",
            openLockedAccounts
        );


        container.appendChild(
            restorationButton
        );


        createRestorationModal();

        loadLockedAccountCount();
    }


    /* =====================================================
       CREATE RESTORATION MODAL
    ===================================================== */

    function createRestorationModal() {

        if (
            document.getElementById(
                "lockedAccountsModal"
            )
        ) {

            restorationModal =
                document.getElementById(
                    "lockedAccountsModal"
                );

            return;
        }


        restorationModal =
            document.createElement("div");

        restorationModal.id =
            "lockedAccountsModal";

        restorationModal.className =
            "restoration-modal-overlay";


        restorationModal.innerHTML = `

            <div
                class="restoration-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lockedAccountsTitle"
            >

                <div class="restoration-modal-header">

                    <div>

                        <span class="restoration-eyebrow">
                            ACCOUNT SECURITY
                        </span>

                        <h2 id="lockedAccountsTitle">
                            Locked Customer Accounts
                        </h2>

                        <p>
                            Review accounts locked after repeated
                            incorrect password attempts.
                        </p>

                    </div>


                    <button
                        type="button"
                        class="restoration-close-button"
                        id="closeLockedAccountsModal"
                        aria-label="Close"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>


                <div class="restoration-summary">

                    <div class="restoration-summary-icon">
                        <i class="fa-solid fa-lock"></i>
                    </div>

                    <div>

                        <strong id="lockedModalCount">
                            0
                        </strong>

                        <span>
                            Locked customer accounts
                        </span>

                    </div>

                </div>


                <div
                    class="restoration-list"
                    id="lockedAccountsList"
                >

                    <div class="restoration-loading">

                        <i class="fa-solid fa-spinner fa-spin"></i>

                        <p>
                            Loading locked accounts...
                        </p>

                    </div>

                </div>


                <div class="restoration-modal-footer">

                    <button
                        type="button"
                        class="restoration-footer-button"
                        id="refreshLockedAccounts"
                    >
                        <i class="fa-solid fa-rotate-right"></i>
                        Refresh
                    </button>

                    <button
                        type="button"
                        class="restoration-footer-button secondary"
                        id="closeLockedAccountsFooter"
                    >
                        Close
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            restorationModal
        );


        const closeButton =
            document.getElementById(
                "closeLockedAccountsModal"
            );

        const footerClose =
            document.getElementById(
                "closeLockedAccountsFooter"
            );

        const refreshButton =
            document.getElementById(
                "refreshLockedAccounts"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeLockedAccounts
            );
        }


        if (footerClose) {

            footerClose.addEventListener(
                "click",
                closeLockedAccounts
            );
        }


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                loadLockedAccounts
            );
        }


        restorationModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    restorationModal
                ) {

                    closeLockedAccounts();
                }
            }
        );
    }


    /* =====================================================
       LOAD LOCKED ACCOUNT COUNT
    ===================================================== */

    async function loadLockedAccountCount() {

        try {

            const response = await fetch(
                API_BASE +
                "/api/admin/customers/locked",
                {
                    method: "GET",
                    headers: getRestorationHeaders(),
                    cache: "no-store"
                }
            );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to retrieve locked account count."
                );
            }


            const count =
                Number(
                    data.count ??
                    (
                        Array.isArray(data.customers)
                            ? data.customers.length
                            : 0
                    )
                );


            updateLockedAccountCount(
                count
            );


        } catch (error) {

            console.error(
                "Locked account count error:",
                error
            );
        }
    }


    /* =====================================================
       UPDATE LOCKED ACCOUNT COUNT
    ===================================================== */

    function updateLockedAccountCount(count) {

        const badge = document.getElementById(
            "lockedAccountsCount"
        );

        const modalCount = document.getElementById(
            "lockedModalCount"
        );


        if (badge) {

            badge.textContent =
                count > 99
                    ? "99+"
                    : String(count);

            badge.style.display =
                count > 0
                    ? "inline-flex"
                    : "none";
        }


        if (modalCount) {

            modalCount.textContent =
                String(count);
        }
    }


    /* =====================================================
       OPEN LOCKED ACCOUNTS
    ===================================================== */

    async function openLockedAccounts() {

        if (!restorationModal) {
            createRestorationModal();
        }

        if (!restorationModal) {
            return;
        }


        restorationModal.classList.add("show");

        await loadLockedAccounts();
    }


    /* =====================================================
       CLOSE LOCKED ACCOUNTS
    ===================================================== */

    function closeLockedAccounts() {

        if (!restorationModal) {
            return;
        }

        restorationModal.classList.remove(
            "show"
        );
    }


    /* =====================================================
       LOAD LOCKED ACCOUNTS
    ===================================================== */

    async function loadLockedAccounts() {

        const list = document.getElementById(
            "lockedAccountsList"
        );

        if (!list || isLoading) {
            return;
        }


        isLoading = true;


        list.innerHTML = `

            <div class="restoration-loading">

                <i class="fa-solid fa-spinner fa-spin"></i>

                <p>
                    Loading locked accounts...
                </p>

            </div>

        `;


        try {

            const response = await fetch(
                API_BASE +
                "/api/admin/customers/locked",
                {
                    method: "GET",
                    headers: getRestorationHeaders(),
                    cache: "no-store"
                }
            );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to load locked customer accounts."
                );
            }


            lockedCustomers =
                Array.isArray(data.customers)
                    ? data.customers
                    : (
                        Array.isArray(data.lockedAccounts)
                            ? data.lockedAccounts
                            : []
                    );


            updateLockedAccountCount(
                Number(
                    data.count ??
                    lockedCustomers.length
                )
            );


            renderLockedAccounts();


        } catch (error) {

            console.error(
                "Load locked accounts error:",
                error
            );


            list.innerHTML = `

                <div class="restoration-empty restoration-error">

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <h3>
                        Unable to Load Accounts
                    </h3>

                    <p>
                        ${escapeRestorationHtml(
                            error.message
                        )}
                    </p>

                    <button
                        type="button"
                        class="restoration-retry-button"
                        id="retryLockedAccounts"
                    >
                        <i class="fa-solid fa-rotate-right"></i>
                        Try Again
                    </button>

                </div>

            `;


            const retryButton =
                document.getElementById(
                    "retryLockedAccounts"
                );

            if (retryButton) {

                retryButton.addEventListener(
                    "click",
                    loadLockedAccounts
                );
            }

        } finally {

            isLoading = false;
        }
    }


    /* =====================================================
       RENDER LOCKED ACCOUNTS
    ===================================================== */

    function renderLockedAccounts() {

        const list = document.getElementById(
            "lockedAccountsList"
        );

        if (!list) {
            return;
        }


        updateLockedAccountCount(
            lockedCustomers.length
        );


        if (!lockedCustomers.length) {

            list.innerHTML = `

                <div class="restoration-empty">

                    <div class="restoration-empty-icon">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>

                    <h3>
                        No Locked Accounts
                    </h3>

                    <p>
                        There are currently no customer accounts
                        waiting for restoration.
                    </p>

                </div>

            `;

            return;
        }


        list.innerHTML =
            lockedCustomers.map(
                function (customer) {

                    const id =
                        customer.id;


                    const name =
                        getCustomerName(customer);


                    const email =
                        getCustomerEmail(customer);


                    const phone =
                        getCustomerPhone(customer);


                    const attempts =
                        getFailedAttempts(customer);


                    return `

                        <article
                            class="locked-customer-card"
                            data-locked-customer-id="${escapeRestorationHtml(
                                String(id)
                            )}"
                        >

                            <div class="locked-customer-top">

                                <div class="locked-customer-profile">

                                    <div class="locked-customer-avatar">
                                        <i class="fa-solid fa-user"></i>
                                    </div>

                                    <div class="locked-customer-name">

                                        <strong>
                                            ${escapeRestorationHtml(name)}
                                        </strong>

                                        <span>
                                            Customer #${escapeRestorationHtml(
                                                String(id)
                                            )}
                                        </span>

                                    </div>

                                </div>


                                <span class="locked-status-badge">

                                    <i class="fa-solid fa-lock"></i>

                                    Locked

                                </span>

                            </div>


                            <div class="locked-customer-information">

                                <div>
                                    <i class="fa-solid fa-envelope"></i>
                                    <span>
                                        ${escapeRestorationHtml(email)}
                                    </span>
                                </div>

                                <div>
                                    <i class="fa-solid fa-phone"></i>
                                    <span>
                                        ${escapeRestorationHtml(phone)}
                                    </span>
                                </div>

                                <div>
                                    <i class="fa-solid fa-shield-halved"></i>
                                    <span>
                                        Failed login attempts:
                                        ${escapeRestorationHtml(
                                            String(attempts)
                                        )}
                                    </span>
                                </div>

                            </div>


                            <div class="locked-customer-actions">

                                <button
                                    type="button"
                                    class="restore-account-button"
                                    data-restore-id="${escapeRestorationHtml(
                                        String(id)
                                    )}"
                                >

                                    <i class="fa-solid fa-unlock"></i>

                                    Restore Account

                                </button>

                            </div>

                        </article>

                    `;
                }
            ).join("");


        list.querySelectorAll(
            "[data-restore-id]"
        ).forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        restoreCustomerAccount(
                            button.dataset.restoreId,
                            button
                        );
                    }
                );
            }
        );
    }


    /* =====================================================
       RESTORE CUSTOMER ACCOUNT
    ===================================================== */

    async function restoreCustomerAccount(
        customerId,
        button
    ) {

        if (isRestoring) {
            return;
        }


        const customer =
            lockedCustomers.find(
                function (item) {

                    return (
                        String(item.id) ===
                        String(customerId)
                    );
                }
            );


        if (!customer) {

            showRestorationToast(
                "The locked customer account could not be found.",
                "error"
            );

            return;
        }


        const confirmed =
            window.confirm(
                "Restore the account of " +
                getCustomerName(customer) +
                "?\n\nThis will reset the failed login attempts and allow the customer to log in again."
            );


        if (!confirmed) {
            return;
        }


        isRestoring = true;


        if (button) {

            button.disabled = true;

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Restoring...
            `;
        }


        try {

            const response = await fetch(
                API_BASE +
                "/api/admin/customers/" +
                encodeURIComponent(customerId) +
                "/restore",
                {
                    method: "POST",
                    headers: getRestorationHeaders(),
                    body: JSON.stringify({})
                }
            );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to restore this customer account."
                );
            }


            showRestorationToast(
                data.message ||
                "Customer account restored successfully.",
                "success"
            );


            /*
                Refresh locked accounts first.
                The restored account should no longer
                appear in this list.
            */

            await loadLockedAccounts();


            /*
                Refresh the regular customer list
                without changing the existing
                customer management workflow.
            */

            if (typeof loadCustomers === "function") {

                await loadCustomers();
            }


            /*
                Refresh the notification count.
            */

            await loadLockedAccountCount();


        } catch (error) {

            console.error(
                "Restore customer account error:",
                error
            );


            showRestorationToast(
                error.message ||
                "Unable to restore customer account.",
                "error"
            );


            if (button) {

                button.disabled = false;

                button.innerHTML = `
                    <i class="fa-solid fa-unlock"></i>
                    Restore Account
                `;
            }

        } finally {

            isRestoring = false;
        }
    }


    /* =====================================================
       KEYBOARD SUPPORT
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                restorationModal &&
                restorationModal.classList.contains("show")
            ) {

                closeLockedAccounts();
            }
        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        initializeRestorationButton();

        console.log(
            "ADD Motor Shop Customer Account Restoration loaded."
        );
    }


    initialize();


})();
