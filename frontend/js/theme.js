/* =========================================================
   ADD MOTOR SHOP
   BOOK SERVICE - PAGE-SPECIFIC THEME
   Does NOT affect other pages
========================================================= */

(function () {

    "use strict";

    const STORAGE_KEY = "addMotorTheme";

    /* =====================================================
       APPLY THEME
    ===================================================== */

    function applyTheme(theme) {

        if (theme !== "dark" && theme !== "light") {
            theme = "light";
        }

        document.documentElement.setAttribute(
            "data-book-theme",
            theme
        );

        localStorage.setItem(
            STORAGE_KEY,
            theme
        );

        updateThemeButton(theme);
    }


    /* =====================================================
       GET CURRENT THEME
    ===================================================== */

    function getCurrentTheme() {

        return (
            document.documentElement.getAttribute(
                "data-book-theme"
            ) || "light"
        );
    }


    /* =====================================================
       TOGGLE THEME
    ===================================================== */

    function toggleTheme() {

        const currentTheme = getCurrentTheme();

        const newTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";

        applyTheme(newTheme);
    }


    /* =====================================================
       UPDATE THEME BUTTON
    ===================================================== */

    function updateThemeButton(theme) {

        const button =
            document.getElementById(
                "bookServiceThemeToggle"
            );

        if (!button) {
            return;
        }

        if (theme === "dark") {

            button.innerHTML = "☀️ Light";
            button.title = "Switch to Light Mode";

        } else {

            button.innerHTML = "🌙 Dark";
            button.title = "Switch to Dark Mode";
        }
    }


    /* =====================================================
       CREATE THEME BUTTON
    ===================================================== */

    function createThemeButton() {

        if (
            document.getElementById(
                "bookServiceThemeToggle"
            )
        ) {
            return;
        }

        const navLinks =
            document.querySelector(".nav-links");

        if (!navLinks) {
            return;
        }

        const button =
            document.createElement("button");

        button.type = "button";

        button.id =
            "bookServiceThemeToggle";

        button.className =
            "book-service-theme-toggle";

        button.setAttribute(
            "aria-label",
            "Toggle dark and light mode"
        );

        button.addEventListener(
            "click",
            toggleTheme
        );

        navLinks.appendChild(button);

        updateThemeButton(
            getCurrentTheme()
        );
    }


    /* =====================================================
       PAGE-SPECIFIC THEME CSS
    ===================================================== */

    function injectThemeCSS() {

        if (
            document.getElementById(
                "book-service-theme-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "book-service-theme-style";

        style.textContent = `

/* =========================================================
   BOOK SERVICE - LIGHT MODE
========================================================= */

html[data-book-theme="light"] body {

    background:
        radial-gradient(
            circle at 10% 20%,
            rgba(220, 38, 38, 0.08),
            transparent 30%
        ),
        radial-gradient(
            circle at 90% 80%,
            rgba(220, 38, 38, 0.05),
            transparent 30%
        ),
        #f7f7f7 !important;

    color:
        #171717 !important;
}


/* =========================================================
   NAVIGATION
========================================================= */

html[data-book-theme="light"] .navbar {

    background:
        #ffffff !important;

    border-bottom:
        1px solid #e5e5e5 !important;
}


html[data-book-theme="light"] .logo {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .logo span {

    color:
        #dc2626 !important;
}


html[data-book-theme="light"] .nav-links a {

    color:
        #444444 !important;
}


html[data-book-theme="light"] .nav-links a:hover {

    color:
        #dc2626 !important;

    background:
        rgba(220, 38, 38, 0.06) !important;
}


html[data-book-theme="light"] .nav-links a.active {

    color:
        #dc2626 !important;

    background:
        rgba(220, 38, 38, 0.08) !important;
}


html[data-book-theme="light"] .nav-links a.logout {

    color:
        #b91c1c !important;
}


/* =========================================================
   PAGE HEADER
========================================================= */

html[data-book-theme="light"] .page-header h1 {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .page-header h1 span {

    color:
        #dc2626 !important;
}


html[data-book-theme="light"] .page-header p {

    color:
        #737373 !important;
}


/* =========================================================
   CARDS
========================================================= */

html[data-book-theme="light"] .card {

    background:
        #ffffff !important;

    border-color:
        #e5e5e5 !important;

    color:
        #171717 !important;

    box-shadow:
        0 15px 35px
        rgba(0, 0, 0, 0.08) !important;
}


/* =========================================================
   STEPS
========================================================= */

html[data-book-theme="light"] .steps {

    border-bottom-color:
        #e5e5e5 !important;
}


html[data-book-theme="light"] .step {

    color:
        #737373 !important;
}


html[data-book-theme="light"] .step.active {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .step-number {

    border-color:
        #d4d4d4 !important;
}


/* =========================================================
   FORM
========================================================= */

html[data-book-theme="light"] .form-group label {

    color:
        #444444 !important;
}


html[data-book-theme="light"] .form-group input,
html[data-book-theme="light"] .form-group select,
html[data-book-theme="light"] .form-group textarea {

    background:
        #ffffff !important;

    color:
        #171717 !important;

    border-color:
        #d4d4d4 !important;
}


html[data-book-theme="light"] .form-group input::placeholder,
html[data-book-theme="light"] .form-group textarea::placeholder {

    color:
        #999999 !important;
}


html[data-book-theme="light"] .form-group select option {

    background:
        #ffffff !important;

    color:
        #171717 !important;
}


/* =========================================================
   MOTORCYCLE
========================================================= */

html[data-book-theme="light"] .motorcycle-box {

    background:
        #fafafa !important;

    border-color:
        #d4d4d4 !important;
}


html[data-book-theme="light"] .bike-info strong {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .bike-info span {

    color:
        #737373 !important;
}


html[data-book-theme="light"] .change-bike {

    color:
        #b91c1c !important;
}


html[data-book-theme="light"] .change-bike:hover {

    color:
        #dc2626 !important;
}


/* =========================================================
   SERVICES
========================================================= */

html[data-book-theme="light"] .service-label {

    background:
        #ffffff !important;

    border-color:
        #d4d4d4 !important;

    color:
        #171717 !important;
}


html[data-book-theme="light"] .service-label:hover {

    border-color:
        #dc2626 !important;
}


html[data-book-theme="light"]
.service-option input:checked + .service-label {

    background:
        rgba(220, 38, 38, 0.08) !important;

    border-color:
        #dc2626 !important;
}


html[data-book-theme="light"] .service-name {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .service-description {

    color:
        #737373 !important;
}


html[data-book-theme="light"] .service-price {

    color:
        #b91c1c !important;
}


html[data-book-theme="light"] .check-mark {

    color:
        #ffffff !important;
}


/* =========================================================
   DATE / TIME
========================================================= */

html[data-book-theme="light"] .date-time-grid input,
html[data-book-theme="light"] .date-time-grid select {

    background:
        #ffffff !important;

    color:
        #171717 !important;

    border-color:
        #d4d4d4 !important;
}


html[data-book-theme="light"] .schedule-info {

    color:
        #166534 !important;

    background:
        rgba(34, 197, 94, 0.08) !important;

    border-color:
        rgba(34, 197, 94, 0.18) !important;
}


/* =========================================================
   SUMMARY
========================================================= */

html[data-book-theme="light"] .summary-card {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .summary-title {

    color:
        #171717 !important;

    border-bottom-color:
        #d4d4d4 !important;
}


html[data-book-theme="light"] .summary-label {

    color:
        #737373 !important;
}


html[data-book-theme="light"] .summary-value {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .summary-services li {

    color:
        #333333 !important;

    border-bottom-color:
        #e5e5e5 !important;
}


html[data-book-theme="light"]
.summary-services li span:last-child {

    color:
        #b91c1c !important;
}


html[data-book-theme="light"] .summary-empty {

    color:
        #737373 !important;
}


html[data-book-theme="light"] .summary-total {

    border-top-color:
        #d4d4d4 !important;
}


html[data-book-theme="light"]
.summary-total span:first-child {

    color:
        #737373 !important;
}


html[data-book-theme="light"]
.summary-total span:last-child {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .notice {

    color:
        #555555 !important;

    background:
        rgba(220, 38, 38, 0.06) !important;

    border-color:
        rgba(220, 38, 38, 0.18) !important;
}


/* =========================================================
   SUCCESS MODAL - LIGHT
========================================================= */

html[data-book-theme="light"] .modal {

    background:
        rgba(0, 0, 0, 0.55) !important;
}


html[data-book-theme="light"] .success-modal {

    background:
        #ffffff !important;

    color:
        #171717 !important;

    border-color:
        #fecaca !important;

    box-shadow:
        0 25px 70px
        rgba(0, 0, 0, 0.25) !important;
}


html[data-book-theme="light"] .success-modal h2 {

    color:
        #171717 !important;
}


html[data-book-theme="light"] .success-modal p {

    color:
        #737373 !important;
}


html[data-book-theme="light"] .appointment-number {

    color:
        #b91c1c !important;

    background:
        rgba(220, 38, 38, 0.08) !important;

    border-color:
        rgba(220, 38, 38, 0.18) !important;
}


/* =========================================================
   BOOK SERVICE BUTTON - LIGHT
========================================================= */

.book-service-theme-toggle {

    display:
        inline-flex !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    min-width:
        88px !important;

    padding:
        9px 14px !important;

    margin-left:
        8px !important;

    border:
        1px solid #dc2626 !important;

    border-radius:
        8px !important;

    background:
        #ffffff !important;

    color:
        #dc2626 !important;

    font-size:
        0.82rem !important;

    font-weight:
        700 !important;

    cursor:
        pointer !important;

    line-height:
        1 !important;

    transition:
        0.2s ease !important;
}


.book-service-theme-toggle:hover {

    background:
        #dc2626 !important;

    color:
        #ffffff !important;
}


/* =========================================================
   BOOK SERVICE - DARK MODE
========================================================= */

html[data-book-theme="dark"] body {

    background:
        radial-gradient(
            circle at 10% 20%,
            rgba(220, 38, 38, 0.14),
            transparent 30%
        ),
        radial-gradient(
            circle at 90% 80%,
            rgba(220, 38, 38, 0.09),
            transparent 30%
        ),
        #080808 !important;

    color:
        #f5f5f5 !important;
}


/* =========================================================
   NAVIGATION - DARK
========================================================= */

html[data-book-theme="dark"] .navbar {

    background:
        linear-gradient(
            90deg,
            #090909,
            #170707,
            #090909
        ) !important;

    border-bottom:
        1px solid #2b1111 !important;
}


html[data-book-theme="dark"] .logo {

    color:
        #ffffff !important;
}


html[data-book-theme="dark"] .logo span {

    color:
        #ef4444 !important;
}


html[data-book-theme="dark"] .nav-links a {

    color:
        #a3a3a3 !important;
}


html[data-book-theme="dark"] .nav-links a:hover {

    color:
        #ffffff !important;
}


html[data-book-theme="dark"] .nav-links a.active {

    color:
        #ffffff !important;
}


html[data-book-theme="dark"] .nav-links a.logout {

    color:
        #fecaca !important;
}


/* =========================================================
   PAGE HEADER - DARK
========================================================= */

html[data-book-theme="dark"] .page-header h1 {

    color:
        #f5f5f5 !important;
}


html[data-book-theme="dark"] .page-header h1 span {

    color:
        #ef4444 !important;
}


html[data-book-theme="dark"] .page-header p {

    color:
        #a3a3a3 !important;
}


/* =========================================================
   CARDS - DARK
========================================================= */

html[data-book-theme="dark"] .card {

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,0.025),
            rgba(220,38,38,0.04)
        ) !important;

    border-color:
        #292929 !important;

    color:
        #f5f5f5 !important;
}


/* =========================================================
   STEPS - DARK
========================================================= */

html[data-book-theme="dark"] .steps {

    border-bottom-color:
        #292929 !important;
}


html[data-book-theme="dark"] .step {

    color:
        #737373 !important;
}


html[data-book-theme="dark"] .step.active {

    color:
        #ffffff !important;
}


html[data-book-theme="dark"] .step-number {

    border-color:
        #404040 !important;
}


/* =========================================================
   FORM - DARK
========================================================= */

html[data-book-theme="dark"] .form-group label {

    color:
        #a3a3a3 !important;
}


html[data-book-theme="dark"] .form-group input,
html[data-book-theme="dark"] .form-group select,
html[data-book-theme="dark"] .form-group textarea {

    background:
        #0b0b0b !important;

    color:
        #ffffff !important;

    border-color:
        #292929 !important;
}


html[data-book-theme="dark"] .form-group input::placeholder,
html[data-book-theme="dark"] .form-group textarea::placeholder {

    color:
        #737373 !important;
}


html[data-book-theme="dark"] .form-group select option {

    background:
        #0b0b0b !important;

    color:
        #ffffff !important;
}


/* =========================================================
   MOTORCYCLE - DARK
========================================================= */

html[data-book-theme="dark"] .motorcycle-box {

    background:
        rgba(0, 0, 0, 0.2) !important;

    border-color:
        #292929 !important;
}


html[data-book-theme="dark"] .bike-info strong {

    color:
        #f5f5f5 !important;
}


html[data-book-theme="dark"] .bike-info span {

    color:
        #a3a3a3 !important;
}


html[data-book-theme="dark"] .change-bike {

    color:
        #fca5a5 !important;
}


html[data-book-theme="dark"] .change-bike:hover {

    color:
        #ffffff !important;
}


/* =========================================================
   SERVICES - DARK
========================================================= */

html[data-book-theme="dark"] .service-label {

    background:
        #0b0b0b !important;

    border-color:
        #292929 !important;

    color:
        #f5f5f5 !important;
}


html[data-book-theme="dark"] .service-label:hover {

    border-color:
        #dc2626 !important;
}


html[data-book-theme="dark"]
.service-option input:checked + .service-label {

    background:
        rgba(220, 38, 38, 0.10) !important;

    border-color:
        #dc2626 !important;
}


html[data-book-theme="dark"] .service-name {

    color:
        #f5f5f5 !important;
}


html[data-book-theme="dark"] .service-description {

    color:
        #a3a3a3 !important;
}


html[data-book-theme="dark"] .service-price {

    color:
        #fca5a5 !important;
}


html[data-book-theme="dark"] .check-mark {

    color:
        #ffffff !important;
}


/* =========================================================
   DATE / TIME - DARK
========================================================= */

html[data-book-theme="dark"] .date-time-grid input,
html[data-book-theme="dark"] .date-time-grid select {

    background:
        #0b0b0b !important;

    color:
        #ffffff !important;

    border-color:
        #292929 !important;
}


html[data-book-theme="dark"] .schedule-info {

    color:
        #bbf7d0 !important;

    background:
        rgba(34, 197, 94, 0.06) !important;
}


/* =========================================================
   SUMMARY - DARK
========================================================= */

html[data-book-theme="dark"] .summary-card {

    color:
        #f5f5f5 !important;
}


html[data-book-theme="dark"] .summary-title {

    color:
        #f5f5f5 !important;

    border-bottom-color:
        #292929 !important;
}


html[data-book-theme="dark"] .summary-label {

    color:
        #a3a3a3 !important;
}


html[data-book-theme="dark"] .summary-value {

    color:
        #f5f5f5 !important;
}


html[data-book-theme="dark"] .summary-services li {

    color:
        #f5f5f5 !important;

    border-bottom-color:
        #202020 !important;
}


html[data-book-theme="dark"]
.summary-services li span:last-child {

    color:
        #fca5a5 !important;
}


html[data-book-theme="dark"] .summary-empty {

    color:
        #737373 !important;
}


html[data-book-theme="dark"] .summary-total {

    border-top-color:
        #404040 !important;
}


html[data-book-theme="dark"]
.summary-total span:first-child {

    color:
        #a3a3a3 !important;
}


html[data-book-theme="dark"]
.summary-total span:last-child {

    color:
        #ffffff !important;
}


html[data-book-theme="dark"] .notice {

    color:
        #a3a3a3 !important;
}


/* =========================================================
   SUCCESS MODAL - DARK
========================================================= */

html[data-book-theme="dark"] .modal {

    background:
        rgba(0, 0, 0, 0.72) !important;
}


html[data-book-theme="dark"] .success-modal {

    background:
        linear-gradient(
            145deg,
            #171717,
            #090909
        ) !important;

    color:
        #f5f5f5 !important;

    border-color:
        #3a1717 !important;
}


html[data-book-theme="dark"] .success-modal h2 {

    color:
        #ffffff !important;
}


html[data-book-theme="dark"] .success-modal p {

    color:
        #a3a3a3 !important;
}


html[data-book-theme="dark"] .appointment-number {

    color:
        #fca5a5 !important;

    background:
        rgba(220, 38, 38, 0.10) !important;

    border-color:
        rgba(220, 38, 38, 0.20) !important;
}


/* =========================================================
   THEME BUTTON - DARK
========================================================= */

html[data-book-theme="dark"]
.book-service-theme-toggle {

    background:
        #ffffff !important;

    color:
        #dc2626 !important;

    border-color:
        #ef4444 !important;
}


html[data-book-theme="dark"]
.book-service-theme-toggle:hover {

    background:
        #dc2626 !important;

    color:
        #ffffff !important;
}

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            ) || "light";

        applyTheme(savedTheme);

        injectThemeCSS();

        if (
            document.readyState ===
            "loading"
        ) {

            document.addEventListener(
                "DOMContentLoaded",
                createThemeButton
            );

        } else {

            createThemeButton();
        }
    }


    /* =====================================================
       PAGE-SPECIFIC GLOBAL FUNCTIONS
    ===================================================== */

    window.bookServiceToggleTheme =
        toggleTheme;

    window.bookServiceSetTheme =
        applyTheme;


    /* =====================================================
       START
    ===================================================== */

    initialize();

})();