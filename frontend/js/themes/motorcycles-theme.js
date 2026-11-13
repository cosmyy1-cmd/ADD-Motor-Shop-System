/* =========================================
   ADD MOTOR SHOP
   MOTORCYCLES PAGE THEME
========================================= */

(function () {
    "use strict";

    const STORAGE_KEY = "addMotorTheme";
    const ROOT_ATTRIBUTE = "data-motorcycles-theme";

    const BUTTON_ID = "motorcyclesThemeToggle";
    const BUTTON_CLASS = "motorcycles-theme-toggle";


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

        updateButton(normalizedTheme);
    }


    /* =========================================
       GET CURRENT THEME
    ========================================== */

    function getCurrentTheme() {

        return (
            document.documentElement.getAttribute(
                ROOT_ATTRIBUTE
            ) || "light"
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

        applyTheme(newTheme);
    }


    /* =========================================
       UPDATE BUTTON
    ========================================== */

    function updateButton(theme) {

        const button =
            document.getElementById(BUTTON_ID);

        if (!button) {
            return;
        }

        if (theme === "dark") {

            button.textContent = "☀️ Light";

            button.setAttribute(
                "aria-label",
                "Switch to light mode"
            );

            button.setAttribute(
                "title",
                "Switch to light mode"
            );

        } else {

            button.textContent = "🌙 Dark";

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
       CREATE THEME BUTTON
    ========================================== */

    function createButton() {

        const navLinks =
            document.querySelector(".nav-links");

        if (!navLinks) {
            return;
        }

        if (
            document.getElementById(BUTTON_ID)
        ) {
            return;
        }


        const button =
            document.createElement("button");

        button.type = "button";

        button.id = BUTTON_ID;

        button.className =
            BUTTON_CLASS;

        button.addEventListener(
            "click",
            toggleTheme
        );


        navLinks.appendChild(button);

        updateButton(
            getCurrentTheme()
        );
    }


    /* =========================================
       INITIALIZE
    ========================================== */

    function initialize() {

        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            );


        /*
         * If a saved theme exists,
         * use it.
         *
         * Otherwise default to light mode.
         */

        const initialTheme =
            savedTheme === "dark"
                ? "dark"
                : "light";


        document.documentElement.setAttribute(
            ROOT_ATTRIBUTE,
            initialTheme
        );


        createButton();

        updateButton(
            initialTheme
        );
    }


    /* =========================================
       GLOBAL FUNCTIONS
       FOR OTHER SCRIPTS IF NEEDED
    ========================================== */

    window.motorcyclesToggleTheme =
        toggleTheme;

    window.motorcyclesSetTheme =
        applyTheme;


    /* =========================================
       START
    ========================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();