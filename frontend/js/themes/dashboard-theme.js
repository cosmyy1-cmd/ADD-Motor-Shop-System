(function () {

    "use strict";


    /* =========================================
       DASHBOARD THEME SETTINGS
    ========================================== */

    const STORAGE_KEY =
        "addMotorTheme";

    const ROOT_ATTRIBUTE =
        "data-dashboard-theme";

    const BUTTON_ID =
        "dashboardThemeToggle";


    /* =========================================
       APPLY THEME
    ========================================== */

    function applyTheme(theme) {

        const normalizedTheme =
            theme === "dark"
                ? "dark"
                : "light";


        document.documentElement.setAttribute(
            ROOT_ATTRIBUTE,
            normalizedTheme
        );


        localStorage.setItem(
            STORAGE_KEY,
            normalizedTheme
        );


        updateButton(
            normalizedTheme
        );

    }


    /* =========================================
       GET CURRENT THEME
    ========================================== */

    function getCurrentTheme() {

        return (
            document.documentElement.getAttribute(
                ROOT_ATTRIBUTE
            ) || "dark"
        );

    }


    /* =========================================
       TOGGLE THEME
    ========================================== */

    function toggleTheme() {

        const currentTheme =
            getCurrentTheme();


        const newTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";


        applyTheme(
            newTheme
        );

    }


    /* =========================================
       UPDATE BUTTON
    ========================================== */

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


            button.setAttribute(
                "title",
                "Switch to light mode"
            );

        } else {

            button.textContent =
                "🌙 Dark";


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


    /* =========================================
       INITIALIZE
    ========================================== */

    function initialize() {

        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            );


        const initialTheme =
            savedTheme === "light"
                ? "light"
                : "dark";


        document.documentElement.setAttribute(
            ROOT_ATTRIBUTE,
            initialTheme
        );


        const button =
            document.getElementById(
                BUTTON_ID
            );


        if (button) {

            button.addEventListener(
                "click",
                toggleTheme
            );

        }


        updateButton(
            initialTheme
        );

    }


    /* =========================================
       GLOBAL FUNCTIONS
    ========================================== */

    window.dashboardToggleTheme =
        toggleTheme;

    window.dashboardSetTheme =
        applyTheme;


    /* =========================================
       START
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }

})();