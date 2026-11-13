(function () {
    "use strict";

    const STORAGE_KEY = "addMotorTheme";

    const ROOT_ATTRIBUTE =
        "data-index-theme";

    const BUTTON_ID =
        "indexThemeToggle";

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


    function getCurrentTheme() {

        return (
            document.documentElement.getAttribute(
                ROOT_ATTRIBUTE
            ) || "light"
        );

    }


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


    function initialize() {

        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            );


        const initialTheme =
            savedTheme === "dark"
                ? "dark"
                : "light";


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


    window.indexToggleTheme =
        toggleTheme;


    window.indexSetTheme =
        applyTheme;


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