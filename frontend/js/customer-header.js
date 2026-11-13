/* =====================================================
   ADD MOTOR SHOP - SHARED CUSTOMER HEADER
   Applies to:
   dashboard.html
   book-service.html
   appointments.html
   service-history.html
   motorcycles.html
   profile.html
===================================================== */

(function () {
    "use strict";

    const CUSTOMER_THEME_KEY = "addMotorCustomerTheme";

    const pages = {
        "dashboard.html": {
            label: "Dashboard",
            themeAttribute: "data-dashboard-theme",
            defaultTheme: "light"
        },
        "book-service.html": {
            label: "Book Service",
            themeAttribute: "data-book-service-theme",
            defaultTheme: "dark"
        },
        "appointments.html": {
            label: "Appointments",
            themeAttribute: "data-appointments-theme",
            defaultTheme: "dark"
        },
        "service-history.html": {
            label: "Service History",
            themeAttribute: "data-service-history-theme",
            defaultTheme: "dark"
        },
        "motorcycles.html": {
            label: "Motorcycles",
            themeAttribute: "data-motorcycles-theme",
            defaultTheme: "dark"
        },
        "profile.html": {
            label: "Profile",
            themeAttribute: "data-profile-theme",
            defaultTheme: "dark"
        }
    };

    const navigation = [
        {
            label: "Dashboard",
            href: "dashboard.html"
        },
        {
            label: "Book Service",
            href: "book-service.html"
        },
        {
            label: "Appointments",
            href: "appointments.html"
        },
        {
            label: "Service History",
            href: "service-history.html"
        },
        {
            label: "Motorcycles",
            href: "motorcycles.html"
        },
        {
            label: "Profile",
            href: "profile.html"
        }
    ];

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase() || "dashboard.html";

    const pageConfig =
        pages[currentPage] || pages["dashboard.html"];

    const root = document.documentElement;


    /* =====================================================
       REMOVE OLD THEME BUTTONS
       The shared header now owns the customer theme button.
    ===================================================== */

    function removeOldThemeButtons() {
        const oldButtons = document.querySelectorAll(
            [
                "#dashboardThemeToggle",
                "#bookServiceThemeToggle",
                "#appointmentsThemeToggle",
                "#serviceHistoryThemeToggle",
                "#motorcyclesThemeToggle",
                "#profileThemeToggle",
                ".dashboard-theme-toggle",
                ".book-service-theme-toggle",
                ".appointments-theme-toggle",
                ".service-history-theme-toggle",
                ".motorcycles-theme-toggle",
                ".profile-theme-toggle"
            ].join(",")
        );

        oldButtons.forEach(function (button) {
            button.remove();
        });
    }


    /* =====================================================
       CREATE NAVIGATION LINKS
    ===================================================== */

    function createNavigationLinks() {
        return navigation.map(function (item) {
            const isActive =
                item.href.toLowerCase() === currentPage;

            return `
                <a
                    href="${item.href}"
                    class="${isActive ? "active" : ""}"
                    ${isActive ? 'aria-current="page"' : ""}
                >
                    ${item.label}
                </a>
            `;
        }).join("");
    }


    /* =====================================================
       SHARED HEADER MARKUP
    ===================================================== */

    function createHeader() {
        const header = document.createElement("div");

        header.id = "customerHeader";

        header.innerHTML = `
            <nav
                class="navbar customer-navbar"
                aria-label="Customer navigation"
            >

                <a
                    href="dashboard.html"
                    class="logo customer-logo"
                    aria-label="ADD Motor Shop Dashboard"
                >
                    ADD <span>MOTOR</span>
                </a>


                <button
                    type="button"
                    class="customer-menu-toggle"
                    id="customerMenuToggle"
                    aria-label="Open navigation menu"
                    aria-expanded="false"
                    aria-controls="customerNavLinks"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>


                <div
                    class="nav-links customer-nav-links"
                    id="customerNavLinks"
                >

                    ${createNavigationLinks()}


                    <button
                        type="button"
                        class="customer-theme-toggle"
                        id="customerThemeToggle"
                        aria-label="Toggle light and dark mode"
                        title="Toggle light and dark mode"
                    >

                        <svg
                            class="theme-icon theme-icon-moon"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                d="M20.9 13.1A8.5 8.5 0 0 1 10.9 3.1a8.6 8.6 0 1 0 10 10Z"
                            ></path>
                        </svg>


                        <svg
                            class="theme-icon theme-icon-sun"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="4"></circle>
                            <path
                                d="M12 2v2
                                   M12 20v2
                                   M4.93 4.93l1.42 1.42
                                   M17.65 17.65l1.42 1.42
                                   M2 12h2
                                   M20 12h2
                                   M4.93 19.07l1.42-1.42
                                   M17.65 6.35l1.42-1.42"
                            ></path>
                        </svg>


                        <span id="customerThemeText">
                            Dark Mode
                        </span>

                    </button>


                    <a
                        href="login.html"
                        class="logout logout-btn customer-logout"
                        id="customerLogout"
                    >
                        Logout
                    </a>

                </div>

            </nav>
        `;

        return header;
    }


    /* =====================================================
       INSERT SHARED HEADER
    ===================================================== */

    function insertHeader() {
        removeOldThemeButtons();

        const header = createHeader();

        const placeholder =
            document.getElementById("customerHeader");

        const existingNavbar =
            document.querySelector("nav.navbar");

        if (placeholder) {
            placeholder.replaceWith(header);
        } else if (existingNavbar) {
            existingNavbar.replaceWith(header);
        } else {
            const main =
                document.querySelector("main");

            if (main) {
                document.body.insertBefore(header, main);
            } else {
                document.body.prepend(header);
            }
        }
    }


    /* =====================================================
       CUSTOMER THEME
       Separate from the admin theme preference.
    ===================================================== */

    function getInitialTheme() {
        const customerTheme =
            localStorage.getItem(CUSTOMER_THEME_KEY);

        if (
            customerTheme === "dark" ||
            customerTheme === "light"
        ) {
            return customerTheme;
        }

        const existingPageTheme =
            root.getAttribute(pageConfig.themeAttribute);

        if (
            existingPageTheme === "dark" ||
            existingPageTheme === "light"
        ) {
            return existingPageTheme;
        }

        // Backward compatibility with the previous
        // customer theme setting.
        const previousTheme =
            localStorage.getItem("addMotorTheme");

        if (
            previousTheme === "dark" ||
            previousTheme === "light"
        ) {
            return previousTheme;
        }

        return pageConfig.defaultTheme;
    }


    function applyTheme(theme, savePreference) {
        const normalizedTheme =
            theme === "dark" ? "dark" : "light";

        /*
         * Update the attributes used by the customer
         * pages' individual theme stylesheets.
         */
        Object.values(pages).forEach(function (page) {
            root.setAttribute(
                page.themeAttribute,
                normalizedTheme
            );
        });

        // Compatibility with pages using body.dark-mode.
        document.body.classList.toggle(
            "dark-mode",
            normalizedTheme === "dark"
        );

        if (savePreference) {
            localStorage.setItem(
                CUSTOMER_THEME_KEY,
                normalizedTheme
            );
        }

        updateThemeButton(normalizedTheme);
    }


    function updateThemeButton(theme) {
        const button =
            document.getElementById("customerThemeToggle");

        const text =
            document.getElementById("customerThemeText");

        if (!button || !text) {
            return;
        }

        if (theme === "dark") {
            text.textContent = "Light Mode";

            button.setAttribute(
                "aria-label",
                "Switch to light mode"
            );

            button.setAttribute(
                "title",
                "Switch to light mode"
            );
        } else {
            text.textContent = "Dark Mode";

            button.setAttribute(
                "aria-label",
                "Switch to dark mode"
            );

            button.setAttribute(
                "title",
                "Switch to dark mode"
            );
        }
    }


    function initializeTheme() {
        applyTheme(getInitialTheme(), false);

        const themeButton =
            document.getElementById("customerThemeToggle");

        if (themeButton) {
            themeButton.addEventListener(
                "click",
                function () {
                    const currentTheme =
                        localStorage.getItem(CUSTOMER_THEME_KEY) ||
                        getInitialTheme();

                    const nextTheme =
                        currentTheme === "dark"
                            ? "light"
                            : "dark";

                    applyTheme(nextTheme, true);
                }
            );
        }

        /*
         * Existing page theme scripts may initialize
         * on DOMContentLoaded. Reapply the customer
         * preference after those scripts finish.
         */
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                function () {
                    window.setTimeout(function () {
                        const savedCustomerTheme =
                            localStorage.getItem(CUSTOMER_THEME_KEY);

                        if (savedCustomerTheme) {
                            applyTheme(
                                savedCustomerTheme,
                                false
                            );
                        } else {
                            const existingTheme =
                                root.getAttribute(
                                    pageConfig.themeAttribute
                                );

                            const initialTheme =
                                existingTheme === "dark" ||
                                existingTheme === "light"
                                    ? existingTheme
                                    : getInitialTheme();

                            applyTheme(initialTheme, true);
                        }
                    }, 0);
                },
                { once: true }
            );
        }
    }


    /* =====================================================
       MOBILE NAVIGATION
    ===================================================== */

    function initializeMobileNavigation() {
        const menuButton =
            document.getElementById("customerMenuToggle");

        const navLinks =
            document.getElementById("customerNavLinks");

        if (!menuButton || !navLinks) {
            return;
        }

        menuButton.addEventListener(
            "click",
            function () {
                const isOpen =
                    navLinks.classList.toggle("is-open");

                menuButton.classList.toggle(
                    "is-open",
                    isOpen
                );

                menuButton.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );

                menuButton.setAttribute(
                    "aria-label",
                    isOpen
                        ? "Close navigation menu"
                        : "Open navigation menu"
                );
            }
        );

        navLinks.querySelectorAll("a").forEach(
            function (link) {
                link.addEventListener(
                    "click",
                    function () {
                        navLinks.classList.remove("is-open");
                        menuButton.classList.remove("is-open");

                        menuButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                        menuButton.setAttribute(
                            "aria-label",
                            "Open navigation menu"
                        );
                    }
                );
            }
        );

        document.addEventListener(
            "click",
            function (event) {
                if (
                    !headerContainsTarget(event.target)
                ) {
                    navLinks.classList.remove("is-open");
                    menuButton.classList.remove("is-open");

                    menuButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            }
        );
    }


    function headerContainsTarget(target) {
        const header =
            document.getElementById("customerHeader");

        return header && header.contains(target);
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function initializeLogout() {
        const logoutButton =
            document.getElementById("customerLogout");

        if (!logoutButton) {
            return;
        }

        logoutButton.addEventListener(
            "click",
            function () {
                localStorage.removeItem("user");
                localStorage.removeItem("userId");
                localStorage.removeItem("addMotorUser");
                localStorage.removeItem("token");
            }
        );
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    insertHeader();

    initializeTheme();

    initializeMobileNavigation();

    initializeLogout();

})();