/* =========================================
   ADD MOTOR SHOP
   SERVICE HISTORY THEME
========================================= */

(function () {

    const STORAGE_KEY = "addMotorTheme";

    const ROOT_ATTRIBUTE = "data-service-history-theme";

    const BUTTON_ID = "serviceHistoryThemeToggle";


    /* =========================================
       APPLY THEME
    ========================================= */

    function applyTheme(theme) {

        if (theme !== "dark" && theme !== "light") {
            theme = "light";
        }


        document.documentElement.setAttribute(
            ROOT_ATTRIBUTE,
            theme
        );


        localStorage.setItem(
            STORAGE_KEY,
            theme
        );


        updateButton(theme);

    }


    /* =========================================
       GET CURRENT THEME
    ========================================= */

    function getCurrentTheme() {

        return (
            document.documentElement.getAttribute(
                ROOT_ATTRIBUTE
            ) || "light"
        );

    }


    /* =========================================
       TOGGLE THEME
    ========================================= */

    function toggleTheme() {

        const currentTheme =
            getCurrentTheme();


        const newTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";


        applyTheme(newTheme);

    }


    /* =========================================
       UPDATE BUTTON
    ========================================= */

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

            button.setAttribute(
                "aria-label",
                "Switch to light mode"
            );

        }

        else {

            button.textContent =
                "🌙 Dark";

            button.setAttribute(
                "aria-label",
                "Switch to dark mode"
            );

        }

    }


    /* =========================================
       CREATE BUTTON
    ========================================= */

    function createButton() {

        if (
            document.getElementById(
                BUTTON_ID
            )
        ) {
            return;
        }


        const navLinks =
            document.querySelector(
                ".nav-links"
            );


        if (!navLinks) {
            return;
        }


        const button =
            document.createElement(
                "button"
            );


        button.id =
            BUTTON_ID;


        button.className =
            "service-history-theme-toggle";


        button.type =
            "button";


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


    /* =========================================
       THEME BUTTON STYLES
    ========================================= */

    function injectStyles() {

        if (
            document.getElementById(
                "serviceHistoryThemeStyles"
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "serviceHistoryThemeStyles";


        style.textContent = `

            .service-history-theme-toggle {

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


            .service-history-theme-toggle:hover {

                background: #dc2626 !important;

                color: #ffffff !important;

            }


            html[data-service-history-theme="dark"]
            .service-history-theme-toggle {

                background: #ffffff !important;

                color: #dc2626 !important;

            }


            html[data-service-history-theme="dark"]
            .service-history-theme-toggle:hover {

                background: #dc2626 !important;

                color: #ffffff !important;

            }


            @media (max-width: 700px) {

                .service-history-theme-toggle {

                    min-width: 82px !important;

                    padding: 8px 11px !important;

                    font-size: 0.76rem !important;

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =========================================
       INITIALIZE
    ========================================= */

    function initialize() {

        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            );


        const theme =
            savedTheme === "dark"
                ? "dark"
                : "light";


        document.documentElement.setAttribute(
            ROOT_ATTRIBUTE,
            theme
        );


        injectStyles();

        createButton();

        updateButton(theme);

    }


    /* =========================================
       GLOBAL FUNCTIONS
    ========================================= */

    window.serviceHistoryToggleTheme =
        toggleTheme;


    window.serviceHistorySetTheme =
        applyTheme;


    /* =========================================
       START
    ========================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }

    else {

        initialize();

    }

})();
