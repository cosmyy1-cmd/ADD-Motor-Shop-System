/* =========================================================
   ADD MOTOR SHOP - SHARED ADMIN THEME
   Dark / Light Mode for All Admin Pages
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE_KEY = "addMotorTheme";


    /* =====================================================
       ELEMENT HELPERS
    ===================================================== */

    function getThemeToggle() {

        return (
            document.getElementById("themeToggle") ||
            document.getElementById("dashboardThemeToggle")
        );

    }


    function getThemeIcon() {

        return (
            document.getElementById("themeIcon") ||
            document.getElementById("dashboardThemeIcon")
        );

    }


    function getThemeText() {

        return (
            document.getElementById("themeText") ||
            document.getElementById("dashboardThemeText")
        );

    }


    /* =====================================================
       APPLY THEME
    ===================================================== */

    function applyTheme(theme) {

        const isDark =
            theme === "dark";


        document.body.classList.toggle(
            "dark-mode",
            isDark
        );


        /* =================================================
           UPDATE ICON
        ================================================== */

        const themeIcon =
            getThemeIcon();


        if (themeIcon) {

            themeIcon.className =
                isDark
                    ? "fa-solid fa-sun"
                    : "fa-solid fa-moon";

        }


        /* =================================================
           UPDATE TEXT
        ================================================== */

        const themeText =
            getThemeText();


        if (themeText) {

            themeText.textContent =
                isDark
                    ? "Light Mode"
                    : "Dark Mode";

        }


        /* =================================================
           UPDATE BUTTON
        ================================================== */

        const themeToggle =
            getThemeToggle();


        if (themeToggle) {

            themeToggle.setAttribute(
                "aria-label",
                isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );


            themeToggle.setAttribute(
                "title",
                isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );

        }


        /* =================================================
           SAVE THEME
        ================================================== */

        localStorage.setItem(
            STORAGE_KEY,
            isDark
                ? "dark"
                : "light"
        );

    }


    /* =====================================================
       GET SAVED THEME
    ===================================================== */

    function getSavedTheme() {

        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (
            savedTheme === "dark" ||
            savedTheme === "light"
        ) {

            return savedTheme;

        }


        /* Default theme */

        return "light";

    }


    /* =====================================================
       TOGGLE THEME
    ===================================================== */

    function toggleTheme(event) {

        if (event) {
            event.preventDefault();
        }


        const isCurrentlyDark =
            document.body.classList.contains(
                "dark-mode"
            );


        applyTheme(
            isCurrentlyDark
                ? "light"
                : "dark"
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeTheme() {

        /* Apply saved theme */

        applyTheme(
            getSavedTheme()
        );


        /* Get toggle button */

        const themeToggle =
            getThemeToggle();


        if (!themeToggle) {
            return;
        }


        /* Prevent duplicate listeners */

        if (
            themeToggle.dataset.themeInitialized ===
            "true"
        ) {

            return;

        }


        themeToggle.addEventListener(
            "click",
            toggleTheme
        );


        themeToggle.dataset.themeInitialized =
            "true";

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
            initializeTheme
        );

    } else {

        initializeTheme();

    }

})();