
/* =========================================================
   ADD MOTOR SHOP
   APPOINTMENTS - PAGE THEME MANAGER
========================================================= */

(function () {

    "use strict";


    const STORAGE_KEY =
        "addMotorCustomerTheme";

    const THEME_ATTRIBUTE =
        "data-appointments-theme";

    const BUTTON_ID =
        "appointmentsThemeToggle";


    /* =====================================================
       GET SAVED THEME
    ===================================================== */

    function getSavedTheme() {

        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            );

        return (
            savedTheme === "dark" ||
            savedTheme === "light"
        )
            ? savedTheme
            : "light";
    }


    /* =====================================================
       GET CURRENT THEME
    ===================================================== */

    function getCurrentTheme() {

        return (
            document.documentElement.getAttribute(
                THEME_ATTRIBUTE
            ) || "light"
        );
    }


    /* =====================================================
       UPDATE BUTTON
    ===================================================== */

    function updateButton(theme) {

        const button =
            document.getElementById(
                BUTTON_ID
            );


        if (!button) {
            return;
        }


        if (theme === "dark") {

            button.textContent =
                "☀️ Light";

            button.title =
                "Switch to Light Mode";

            button.setAttribute(
                "aria-label",
                "Switch to Light Mode"
            );

        } else {

            button.textContent =
                "🌙 Dark";

            button.title =
                "Switch to Dark Mode";

            button.setAttribute(
                "aria-label",
                "Switch to Dark Mode"
            );

        }
    }


    /* =====================================================
       APPLY THEME
    ===================================================== */

    function applyTheme(
        theme,
        savePreference = true
    ) {

        if (
            theme !== "dark" &&
            theme !== "light"
        ) {

            theme = "light";

        }


        document.documentElement.setAttribute(
            THEME_ATTRIBUTE,
            theme
        );


        if (savePreference) {

            localStorage.setItem(
                STORAGE_KEY,
                theme
            );

        }


        updateButton(theme);
    }


    /* =====================================================
       TOGGLE THEME
    ===================================================== */

    function toggleTheme() {

        const currentTheme =
            getCurrentTheme();


        const nextTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";


        applyTheme(nextTheme);
    }


    /* =====================================================
       CREATE ONE THEME BUTTON
    ===================================================== */

    function createButton() {

        const navLinks =
            document.querySelector(
                ".nav-links"
            );


        if (!navLinks) {
            return;
        }


        /*
         * Reuse an existing appointments button
         * instead of creating another one.
         */

        let button =
            document.getElementById(
                BUTTON_ID
            );


        if (button) {

            updateButton(
                getCurrentTheme()
            );

            return;

        }


        button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.id =
            BUTTON_ID;


        button.className =
            "appointments-theme-toggle";


        button.addEventListener(
            "click",
            toggleTheme
        );


        navLinks.appendChild(
            button
        );


        updateButton(
            getCurrentTheme()
        );
    }


    /* =====================================================
       THEME BUTTON STYLING
       PAGE COLORS ARE HANDLED BY appointments.css
    ===================================================== */

    function injectButtonStyles() {

        if (
            document.getElementById(
                "appointments-theme-button-style"
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "appointments-theme-button-style";


        style.textContent = `

            .appointments-theme-toggle {

                display: inline-flex !important;

                align-items: center !important;

                justify-content: center !important;

                min-width: 88px !important;

                padding: 9px 14px !important;

                margin-left: 8px !important;

                border: 1px solid #dc2626 !important;

                border-radius: 8px !important;

                background: #ffffff !important;

                color: #dc2626 !important;

                font-size: 0.82rem !important;

                font-weight: 700 !important;

                cursor: pointer !important;

                line-height: 1 !important;

                transition: 0.2s ease !important;
            }


            .appointments-theme-toggle:hover {

                background: #dc2626 !important;

                color: #ffffff !important;
            }

        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       SYNC THEME BETWEEN BROWSER TABS
    ===================================================== */

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key !== STORAGE_KEY
            ) {
                return;
            }


            const newTheme =
                event.newValue;


            if (
                newTheme === "dark" ||
                newTheme === "light"
            ) {

                applyTheme(
                    newTheme,
                    false
                );

            }

        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        applyTheme(
            getSavedTheme()
        );


        injectButtonStyles();


        createButton();

    }


    /* =====================================================
       GLOBAL FUNCTIONS
    ===================================================== */

    window.appointmentsToggleTheme =
        toggleTheme;

    window.appointmentsSetTheme =
        applyTheme;


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );

    } else {

        initialize();

    }

})();