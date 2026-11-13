/* =========================================================
   ADD MOTOR SHOP
   CENTRALIZED ADMIN LAYOUT
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       ADMIN CONFIGURATION
    ===================================================== */

    const ADMIN_API_BASE =
        "http://localhost:3000";

    const SHARED_LOGIN_PAGE =
        "http://localhost:3000/frontend/login.html";


    /* =====================================================
       ADMIN NAVIGATION
    ===================================================== */

    const navigation = [

        {
            section: "MAIN",
            items: [

                {
                    label: "Dashboard",
                    icon: "fa-solid fa-chart-line",
                    href: "dashboard.html"
                },

                {
                    label: "Appointments",
                    icon: "fa-regular fa-calendar-check",
                    href: "appointments.html"
                },

                {
                    label: "Customers",
                    icon: "fa-solid fa-users",
                    href: "customers.html"
                },

                {
                    label: "Motorcycles",
                    icon: "fa-solid fa-motorcycle",
                    href: "motorcycles.html"
                }

            ]
        },


        {
            section: "MANAGEMENT",
            items: [

                {
                    label: "Services",
                    icon: "fa-solid fa-screwdriver-wrench",
                    href: "services.html"
                },

                {
                    label: "Inventory",
                    icon: "fa-solid fa-boxes-stacked",
                    href: "inventory.html"
                },

                {
                    label: "Sales",
                    icon: "fa-solid fa-cash-register",
                    href: "sales.html"
                }

            ]
        },


        {
            section: "BUSINESS",
            items: [

                {
                    label: "Suppliers",
                    icon: "fa-solid fa-truck-field",
                    href: "suppliers.html"
                },

                {
                    label: "Purchases",
                    icon: "fa-solid fa-cart-shopping",
                    href: "purchases.html"
                },

                {
                    label: "Reports",
                    icon: "fa-solid fa-chart-pie",
                    href: "reports.html"
                }

            ]
        }

    ];


    /* =====================================================
       DETECT CURRENT PAGE
    ===================================================== */

    function getCurrentPage() {

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

        return path || "dashboard.html";

    }


    /* =====================================================
       ADMIN SESSION HELPERS
    ===================================================== */

    function getStoredAdmin() {

        const storedAdmin =
            localStorage.getItem("adminUser") ||
            localStorage.getItem("addMotorUser") ||
            localStorage.getItem("user");


        if (!storedAdmin) {

            return null;

        }


        try {

            const admin =
                JSON.parse(storedAdmin);


            // Support login responses that store
            // the account inside a "user" property.

            if (
                admin &&
                admin.user &&
                typeof admin.user === "object"
            ) {

                return admin.user;

            }


            return admin;

        }

        catch (error) {

            console.warn(
                "Unable to read saved admin session.",
                error
            );

            return null;

        }

    }


    function getAdminId() {

        const admin =
            getStoredAdmin();


        if (!admin) {

            return (
                localStorage.getItem("adminId") ||
                null
            );

        }


        return (
            admin.id ||
            admin.user_id ||
            admin.admin_id ||
            localStorage.getItem("adminId") ||
            null
        );

    }


    /* =====================================================
       CLEAR ADMIN SESSION
    ===================================================== */

    function clearAdminSession() {

        localStorage.removeItem(
            "adminUser"
        );

        localStorage.removeItem(
            "adminId"
        );

        localStorage.removeItem(
            "addMotorUser"
        );

        localStorage.removeItem(
            "user"
        );

        localStorage.removeItem(
            "userId"
        );


        sessionStorage.removeItem(
            "adminUser"
        );

        sessionStorage.removeItem(
            "adminId"
        );

        sessionStorage.removeItem(
            "addMotorUser"
        );

        sessionStorage.removeItem(
            "user"
        );

        sessionStorage.removeItem(
            "userId"
        );

    }


    /* =====================================================
       REDIRECT TO SHARED LOGIN
    ===================================================== */

    function redirectToLogin() {

        clearAdminSession();

        window.location.replace(
            SHARED_LOGIN_PAGE
        );

    }


    /* =====================================================
       VERIFY ADMIN ACCESS
    ===================================================== */

    async function verifyAdminAccess() {

        const adminId =
            getAdminId();


        const headers = {

            "Content-Type": "application/json"

        };


        if (adminId) {

            headers["x-admin-id"] =
                String(adminId);

        }


        try {

            const response =
                await fetch(
                    `${ADMIN_API_BASE}/api/admin/dashboard`,
                    {
                        method: "GET",

                        headers: headers,

                        credentials: "include",

                        cache: "no-store"
                    }
                );


            /*
                Explicitly rejected or expired session.
                Redirect to the shared login page.
            */

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                redirectToLogin();

                return false;

            }


            /*
                Other server errors should not remove
                the sidebar or navigation.
            */

            if (!response.ok) {

                console.error(
                    "Admin verification failed:",
                    response.status
                );

                return null;

            }


            const result =
                await response.json();


            if (
                result &&
                result.success === false
            ) {

                redirectToLogin();

                return false;

            }


            return true;

        }

        catch (error) {

            /*
                Keep the layout visible if the backend
                is temporarily unavailable.

                Protected backend APIs must still use
                requireAdmin for actual authorization.
            */

            console.error(
                "Unable to verify admin access:",
                error
            );

            return null;

        }

    }


    /* =====================================================
       CREATE SIDEBAR
    ===================================================== */

    function createSidebar() {

        if (
            document.getElementById("sidebar")
        ) {

            return;

        }


        const currentPage =
            getCurrentPage();


        const sidebar =
            document.createElement("aside");

        sidebar.className =
            "sidebar";

        sidebar.id =
            "sidebar";


        /* =================================================
           BRAND
        ================================================= */

        const brand =
            document.createElement("div");

        brand.className =
            "sidebar-brand";


        brand.innerHTML = `

            <div class="brand-icon">

                <i class="fa-solid fa-motorcycle"></i>

            </div>


            <div class="brand-text">

                <strong>
                    ADD MOTOR SHOP
                </strong>

                <span>
                    ADMIN PORTAL
                </span>

            </div>

        `;


        sidebar.appendChild(brand);


        /* =================================================
           NAVIGATION
        ================================================= */

        const nav =
            document.createElement("nav");

        nav.className =
            "sidebar-nav";


        navigation.forEach(function (group) {

            const sectionTitle =
                document.createElement("div");

            sectionTitle.className =
                "nav-section-title";

            sectionTitle.textContent =
                group.section;

            nav.appendChild(sectionTitle);


            group.items.forEach(function (item) {

                const link =
                    document.createElement("a");

                link.href =
                    item.href;

                link.className =
                    "nav-item";


                /* =========================================
                   ACTIVE PAGE
                ========================================= */

                if (
                    currentPage ===
                    item.href.toLowerCase()
                ) {

                    link.classList.add("active");

                }


                link.innerHTML = `

                    <span class="nav-icon">

                        <i class="${item.icon}"></i>

                    </span>

                    <span class="nav-label">
                        ${item.label}
                    </span>

                `;


                link.addEventListener(
                    "click",
                    closeMobileSidebar
                );


                nav.appendChild(link);

            });

        });


        sidebar.appendChild(nav);


        /* =================================================
           LOGOUT
        ================================================= */

        const footer =
            document.createElement("div");

        footer.className =
            "sidebar-footer";


        const logoutButton =
            document.createElement("button");

        logoutButton.type =
            "button";

        logoutButton.className =
            "logout-button";

        logoutButton.id =
            "logoutButton";


        logoutButton.innerHTML = `

            <span class="nav-icon">

                <i class="fa-solid fa-right-from-bracket"></i>

            </span>

            <span class="nav-label">
                Logout
            </span>

        `;


        logoutButton.addEventListener(
            "click",
            logout
        );


        footer.appendChild(logoutButton);

        sidebar.appendChild(footer);


        /* =================================================
           INSERT SIDEBAR
        ================================================= */

        document.body.prepend(sidebar);

    }


    /* =====================================================
       MOBILE OVERLAY
    ===================================================== */

    function createMobileOverlay() {

        if (
            document.getElementById("sidebarOverlay")
        ) {

            return;

        }


        const overlay =
            document.createElement("div");

        overlay.className =
            "sidebar-overlay";

        overlay.id =
            "sidebarOverlay";


        overlay.addEventListener(
            "click",
            closeMobileSidebar
        );


        document.body.appendChild(overlay);

    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    function setupMobileMenu() {

        const menuButton =
            document.getElementById(
                "mobileMenuButton"
            );


        if (!menuButton) {

            return;

        }


        if (
            menuButton.dataset.adminLayoutBound === "true"
        ) {

            return;

        }


        menuButton.dataset.adminLayoutBound =
            "true";


        menuButton.addEventListener(
            "click",
            toggleMobileSidebar
        );

    }


    function toggleMobileSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (!sidebar) {

            return;

        }


        sidebar.classList.toggle(
            "mobile-open"
        );


        if (overlay) {

            overlay.classList.toggle(
                "show"
            );

        }

    }


    function closeMobileSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (sidebar) {

            sidebar.classList.remove(
                "mobile-open"
            );

        }


        if (overlay) {

            overlay.classList.remove(
                "show"
            );

        }

    }


    /* =====================================================
       ADMIN PROFILE
    ===================================================== */

    function loadAdminProfile() {

        const storedAdmin =
            localStorage.getItem(
                "adminUser"
            ) ||
            localStorage.getItem(
                "addMotorUser"
            ) ||
            localStorage.getItem(
                "user"
            );


        if (!storedAdmin) {

            return;

        }


        try {

            const admin =
                JSON.parse(storedAdmin);


            /*
                Get the actual saved name.

                IMPORTANT:
                We do NOT modify or delete the stored
                user information.
            */

            let name =
                String(
                    admin.name ||
                    admin.username ||
                    "Admin"
                );


            /*
                The database/login may return
                "Administrator" as the account name.

                For the admin panel UI, display it as
                "Admin" without changing the stored
                account data.
            */

            if (
                name.trim().toLowerCase() ===
                "administrator"
            ) {

                name = "Admin";

            }


            const nameElement =
                document.getElementById(
                    "adminName"
                );


            const avatarInitial =
                document.getElementById(
                    "adminAvatarInitial"
                );


            const avatarElement =
                document.getElementById(
                    "adminAvatar"
                );


            const roleElement =
                document.getElementById(
                    "adminRole"
                );


            /* =================================================
               ADMIN NAME
            ================================================== */

            if (nameElement) {

                nameElement.textContent =
                    name;

            }


            /* =================================================
               AVATAR INITIAL
            ================================================== */

            if (avatarInitial) {

                avatarInitial.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();

            }


            /*
                Compatibility with older admin pages
                that use #adminAvatar directly.
            */

            if (
                avatarElement &&
                !avatarInitial
            ) {

                avatarElement.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();

            }


            /* =================================================
               ADMIN ROLE
            ================================================== */

            if (roleElement) {

                roleElement.textContent =
                    "Admin";

            }

        }

        catch (error) {

            console.warn(
                "Unable to load admin profile.",
                error
            );

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        const confirmed =
            window.confirm(
                "Are you sure you want to log out?"
            );


        if (!confirmed) {

            return;

        }


        /*
            Ask the backend to clear the admin cookie.
            Local session data is still cleared if the
            backend cannot be reached.
        */

        try {

            await fetch(
                `${ADMIN_API_BASE}/api/admin/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );

        }

        catch (error) {

            console.warn(
                "Unable to contact admin logout endpoint.",
                error
            );

        }


        /* =================================================
           CLEAR LOCAL ADMIN SESSION
        ================================================== */

        clearAdminSession();


        /* =================================================
           REDIRECT TO SHARED LOGIN
        ================================================== */

        window.location.replace(
            SHARED_LOGIN_PAGE
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initializeAdminLayout() {

        /*
            IMPORTANT:
            Create the sidebar first.

            Do not wait for the backend verification
            before displaying the navigation.
        */

        createSidebar();

        createMobileOverlay();

        setupMobileMenu();

        loadAdminProfile();


        /*
            Verify the admin session afterward.

            false = explicitly unauthorized; redirect.
            true  = authorized.
            null  = verification unavailable; keep layout.
        */

        const authorized =
            await verifyAdminAccess();


        if (authorized === false) {

            return;

        }

    }


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeAdminLayout
        );

    }

    else {

        initializeAdminLayout();

    }

})();