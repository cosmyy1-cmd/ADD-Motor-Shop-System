/* =========================================================
ADD MOTOR SHOP
CENTRALIZED ADMIN NAVIGATION

SINGLE SOURCE OF TRUTH FOR ALL ADMIN SIDEBARS
========================================================= */

(function () {

"use strict";


/* =====================================================
   CENTRAL NAVIGATION
===================================================== */

const NAVIGATION = [

    {
        title: "MAIN",

        items: [

            {
                label: "Dashboard",
                icon: "fa-solid fa-gauge-high",
                page: "dashboard.html"
            },

            {
                label: "Appointments",
                icon: "fa-solid fa-calendar-check",
                page: "appointments.html"
            },

            {
                label: "Customers",
                icon: "fa-solid fa-users",
                page: "customers.html"
            },

            {
                label: "Motorcycles",
                icon: "fa-solid fa-motorcycle",
                page: "motorcycles.html"
            }

        ]

    },


    {
        title: "MANAGEMENT",

        items: [

            {
                label: "Services",
                icon: "fa-solid fa-screwdriver-wrench",
                page: "services.html"
            },

            {
                label: "Inventory",
                icon: "fa-solid fa-boxes-stacked",
                page: "inventory.html"
            },

            {
                label: "Sales",
                icon: "fa-solid fa-chart-line",
                page: "sales.html"
            }

        ]

    },


    {
        title: "BUSINESS",

        items: [

            {
                label: "Suppliers",
                icon: "fa-solid fa-truck-field",
                page: "suppliers.html"
            },

            {
                label: "Purchases",
                icon: "fa-solid fa-cart-shopping",
                page: "purchases.html"
            },

            {
                label: "Reports",
                icon: "fa-solid fa-chart-pie",
                page: "reports.html"
            }

        ]

    }

];


/* =====================================================
   CURRENT PAGE
===================================================== */

function getCurrentPage() {

    let page =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    if (!page) {
        page = "dashboard.html";
    }


    return page;

}


/* =====================================================
   CREATE SIDEBAR
===================================================== */

function getOrCreateSidebar() {

    let sidebar =
        document.getElementById("sidebar");


    if (sidebar) {
        return sidebar;
    }


    sidebar =
        document.createElement("aside");


    sidebar.id = "sidebar";

    sidebar.className =
        "sidebar";


    document.body.insertBefore(
        sidebar,
        document.body.firstChild
    );


    return sidebar;

}


/* =====================================================
   CREATE BRAND
===================================================== */

function renderBrand(sidebar) {

    let brand =
        sidebar.querySelector(
            ".sidebar-brand"
        );


    if (!brand) {

        brand =
            document.createElement("div");

        brand.className =
            "sidebar-brand";

        sidebar.appendChild(
            brand
        );

    }


    brand.innerHTML = `

        <div class="brand-icon">

            <i class="fa-solid fa-motorcycle"></i>

        </div>

        <div class="brand-text">

            <h1>
                ADD MOTOR SHOP
            </h1>

            <span>
                ADMIN PORTAL
            </span>

        </div>

    `;

}


/* =====================================================
   RENDER NAVIGATION
===================================================== */

function renderNavigation() {

    const sidebar =
        getOrCreateSidebar();


    renderBrand(sidebar);


    let nav =
        sidebar.querySelector(
            ".sidebar-nav"
        );


    if (!nav) {

        nav =
            document.createElement("nav");

        nav.className =
            "sidebar-nav";

        nav.setAttribute(
            "aria-label",
            "Admin navigation"
        );

        sidebar.appendChild(
            nav
        );

    }


    /*
       Clear ONLY the navigation.

       Nothing else in the sidebar is touched.
    */

    nav.innerHTML = "";


    const currentPage =
        getCurrentPage();


    NAVIGATION.forEach(
        function (section) {


            const sectionTitle =
                document.createElement("div");


            sectionTitle.className =
                "nav-section-title";


            sectionTitle.textContent =
                section.title;


            nav.appendChild(
                sectionTitle
            );


            section.items.forEach(
                function (item) {


                    const link =
                        document.createElement("a");


                    link.href =
                        item.page;


                    link.className =
                        "nav-item";


                    link.setAttribute(
                        "data-page",
                        item.page
                    );


                    link.innerHTML = `

                        <i class="${item.icon}"></i>

                        <span>
                            ${item.label}
                        </span>

                    `;


                    if (
                        currentPage ===
                        item.page.toLowerCase()
                    ) {

                        link.classList.add(
                            "active"
                        );

                        link.setAttribute(
                            "aria-current",
                            "page"
                        );

                    }


                    link.addEventListener(
                        "click",
                        function () {

                            closeSidebar();

                        }
                    );


                    nav.appendChild(
                        link
                    );

                }
            );

        }
    );


    renderLogout(sidebar);

}


/* =====================================================
   LOGOUT
===================================================== */

function renderLogout(sidebar) {

    let bottom =
        sidebar.querySelector(
            ".sidebar-bottom"
        );


    if (!bottom) {

        bottom =
            document.createElement("div");

        bottom.className =
            "sidebar-bottom";

        sidebar.appendChild(
            bottom
        );

    }


    bottom.innerHTML = "";


    const button =
        document.createElement("button");


    button.type = "button";

    button.className =
        "logout-button";

    button.id =
        "adminLogoutButton";


    button.innerHTML = `

        <i class="fa-solid fa-right-from-bracket"></i>

        <span>
            Logout
        </span>

    `;


    button.addEventListener(
        "click",
        handleLogout
    );


    bottom.appendChild(
        button
    );

}


/* =====================================================
   LOGOUT FUNCTION
===================================================== */

function handleLogout() {

    const confirmed =
        window.confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmed) {
        return;
    }


    const keys = [

        "adminUser",
        "user",
        "adminId",
        "userId",
        "addMotorUser"

    ];


    keys.forEach(
        function (key) {

            localStorage.removeItem(
                key
            );

        }
    );


    sessionStorage.removeItem(
        "adminUser"
    );

    sessionStorage.removeItem(
        "adminId"
    );


    window.location.href =
        "login.html";

}


/* =====================================================
   OVERLAY
===================================================== */

function getOrCreateOverlay() {

    let overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    if (overlay) {
        return overlay;
    }


    overlay =
        document.createElement("div");


    overlay.id =
        "sidebarOverlay";


    overlay.className =
        "sidebar-overlay";


    overlay.addEventListener(
        "click",
        closeSidebar
    );


    document.body.appendChild(
        overlay
    );


    return overlay;

}


/* =====================================================
   OPEN SIDEBAR
===================================================== */

function openSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    if (sidebar) {

        sidebar.classList.add(
            "mobile-open"
        );

    }


    if (overlay) {

        overlay.classList.add(
            "show"
        );

    }

}


/* =====================================================
   CLOSE SIDEBAR
===================================================== */

function closeSidebar() {

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
   TOGGLE SIDEBAR
===================================================== */

function toggleSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    if (!sidebar) {
        return;
    }


    if (
        sidebar.classList.contains(
            "mobile-open"
        )
    ) {

        closeSidebar();

    } else {

        openSidebar();

    }

}


/* =====================================================
   MOBILE MENU
===================================================== */

function initializeMobileMenu() {

    const button =
        document.getElementById(
            "mobileMenuButton"
        );


    if (!button) {
        return;
    }


    /*
       Remove previous handler reference by
       replacing the button's onclick property.
    */

    button.onclick =
        toggleSidebar;

}


/* =====================================================
   INITIALIZE
===================================================== */

function initialize() {

    /*
       Body must exist before creating sidebar.
    */

    if (!document.body) {
        return;
    }


    renderNavigation();


    getOrCreateOverlay();


    initializeMobileMenu();

}


/* =====================================================
   PUBLIC API
===================================================== */

window.ADDAdminNavigation = {

    initialize: initialize,

    renderNavigation:
        renderNavigation,

    createNavigation:
        renderNavigation,

    getCurrentPage:
        getCurrentPage,

    openSidebar:
        openSidebar,

    closeSidebar:
        closeSidebar,

    toggleSidebar:
        toggleSidebar,

    handleLogout:
        handleLogout

};


/* =====================================================
   IMPORTANT:

   This script may be dynamically loaded by
   admin-layout.js AFTER DOMContentLoaded.

   Therefore we check readyState instead of relying
   only on DOMContentLoaded.
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        {
            once: true
        }
    );

} else {

    initialize();

}
})();
