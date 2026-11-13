(function () {

    "use strict";


    /* =========================================
       SETTINGS
    ========================================== */

    const STORAGE_KEY =
        "addMotorTheme";

    const ROOT_ATTRIBUTE =
        "data-profile-theme";

    const BUTTON_ID =
        "profileThemeToggle";

    const BUTTON_CLASS =
        "profile-theme-toggle";


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
       BUTTON STYLES
    ========================================== */

    function injectStyles() {

        if (
            document.getElementById(
                "profileThemeStyles"
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "profileThemeStyles";


        style.textContent = `

            .profile-theme-toggle {

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


            .profile-theme-toggle:hover {

                background: #dc2626 !important;

                color: #ffffff !important;

            }


            html[data-profile-theme="dark"]
            .profile-theme-toggle {

                background: #ffffff !important;

                color: #dc2626 !important;

            }


            html[data-profile-theme="dark"]
            .profile-theme-toggle:hover {

                background: #dc2626 !important;

                color: #ffffff !important;

            }


            @media (max-width: 700px) {

                .profile-theme-toggle {

                    min-width: 82px !important;

                    padding: 8px 11px !important;

                    font-size: 0.75rem !important;

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =========================================
       CREATE BUTTON
    ========================================== */

    function createButton() {

        const navLinks =
            document.querySelector(
                ".nav-links"
            );


        if (!navLinks) {
            return;
        }


        if (
            document.getElementById(
                BUTTON_ID
            )
        ) {
            return;
        }


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.id =
            BUTTON_ID;


        button.className =
            BUTTON_CLASS;


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
       INITIALIZE
    ========================================== */

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


        injectStyles();


        createButton();


        updateButton(
            initialTheme
        );

    }


    /* =========================================
       GLOBAL FUNCTIONS
    ========================================== */

    window.profileToggleTheme =
        toggleTheme;


    window.profileSetTheme =
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