
/* =========================================================
   ADD MOTOR SHOP
   BOOK SERVICE - PAGE-SPECIFIC THEME
   CONNECTED TO SHARED CUSTOMER HEADER
========================================================= */

(function () {

    "use strict";

    // Separate from the admin theme preference.
    const STORAGE_KEY = "addMotorCustomerTheme";

    const THEME_ATTRIBUTE = "data-book-service-theme";


    /* =====================================================
       APPLY THEME
    ===================================================== */

    function applyTheme(theme) {

        if (theme !== "dark" && theme !== "light") {
            theme = "light";
        }

        document.documentElement.setAttribute(
            THEME_ATTRIBUTE,
            theme
        );

        localStorage.setItem(
            STORAGE_KEY,
            theme
        );
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
       TOGGLE THEME
       AVAILABLE FOR SHARED HEADER
    ===================================================== */

    function toggleTheme() {

        const current = getCurrentTheme();

        const next =
            current === "dark"
                ? "light"
                : "dark";

        applyTheme(next);
    }


    /* =====================================================
       PAGE-SPECIFIC CSS
    ===================================================== */

    function injectStyles() {

        if (
            document.getElementById(
                "book-service-theme-style"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id = "book-service-theme-style";

        style.textContent = `

/* =========================================================
   BOOK SERVICE THEME VARIABLES
========================================================= */

html[data-book-service-theme="light"] {

    --book-bg: #f7f7f7;
    --book-card: #ffffff;
    --book-card-soft: #fafafa;
    --book-text: #171717;
    --book-text-secondary: #333333;
    --book-muted: #737373;
    --book-border: #d9d9d9;
    --book-red: #dc2626;
    --book-red-light: #ef4444;
}


html[data-book-service-theme="dark"] {

    --book-bg: #080808;
    --book-card: #111111;
    --book-card-soft: #171717;
    --book-text: #f5f5f5;
    --book-text-secondary: #d4d4d4;
    --book-muted: #a3a3a3;
    --book-border: #292929;
    --book-red: #dc2626;
    --book-red-light: #ef4444;
}


/* =========================================================
   LIGHT MODE
========================================================= */

html[data-book-service-theme="light"] body {

    color: var(--book-text) !important;

    background:
        radial-gradient(
            circle at 10% 20%,
            rgba(220,38,38,0.08),
            transparent 30%
        ),
        radial-gradient(
            circle at 90% 80%,
            rgba(220,38,38,0.05),
            transparent 30%
        ),
        var(--book-bg) !important;
}


/* NAVBAR */

html[data-book-service-theme="light"] .navbar {

    background: #ffffff !important;

    border-bottom: 1px solid #e5e5e5 !important;
}


html[data-book-service-theme="light"] .logo {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .logo span {

    color: #dc2626 !important;
}


html[data-book-service-theme="light"] .nav-links a {

    color: #555555 !important;
}


html[data-book-service-theme="light"] .nav-links a:hover {

    color: #dc2626 !important;

    background: rgba(220,38,38,0.06) !important;
}


html[data-book-service-theme="light"] .nav-links a.active {

    color: #dc2626 !important;

    background: rgba(220,38,38,0.08) !important;
}


html[data-book-service-theme="light"] .nav-links .logout {

    color: #b91c1c !important;
}


/* PAGE HEADER */

html[data-book-service-theme="light"] .page-header h1 {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .page-header h1 span {

    color: #dc2626 !important;
}


html[data-book-service-theme="light"] .page-header p {

    color: #737373 !important;
}


/* CARDS */

html[data-book-service-theme="light"] .card {

    background:
        linear-gradient(
            145deg,
            #ffffff,
            #fffafa
        ) !important;

    border-color: #e5e5e5 !important;

    box-shadow:
        0 15px 35px
        rgba(0,0,0,0.10) !important;
}


/* STEPS */

html[data-book-service-theme="light"] .steps {

    border-bottom-color: #d4d4d4 !important;
}


html[data-book-service-theme="light"] .step {

    color: #737373 !important;
}


html[data-book-service-theme="light"] .step.active {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .step-number {

    border-color: #d4d4d4 !important;
}


/* FORM LABELS */

html[data-book-service-theme="light"] .form-group label {

    color: #555555 !important;
}


/* INPUTS */

html[data-book-service-theme="light"] .form-group input,
html[data-book-service-theme="light"] .form-group select,
html[data-book-service-theme="light"] .form-group textarea {

    background: #ffffff !important;

    color: #171717 !important;

    border-color: #d4d4d4 !important;
}


html[data-book-service-theme="light"] .form-group input::placeholder,
html[data-book-service-theme="light"] .form-group textarea::placeholder {

    color: #999999 !important;
}


html[data-book-service-theme="light"] .form-group select option {

    background: #ffffff !important;

    color: #171717 !important;
}


/* MOTORCYCLE */

html[data-book-service-theme="light"] .motorcycle-box {

    background: #fafafa !important;

    border-color: #d4d4d4 !important;
}


html[data-book-service-theme="light"] .bike-info strong {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .bike-info span {

    color: #737373 !important;
}


html[data-book-service-theme="light"] .change-bike {

    color: #b91c1c !important;
}


html[data-book-service-theme="light"] .change-bike:hover {

    color: #dc2626 !important;
}


/* SERVICES */

html[data-book-service-theme="light"] .service-label {

    background: #ffffff !important;

    border-color: #d4d4d4 !important;
}


html[data-book-service-theme="light"] .service-label:hover {

    border-color: rgba(220,38,38,0.5) !important;
}


html[data-book-service-theme="light"] .service-option input:checked + .service-label {

    background: rgba(220,38,38,0.08) !important;

    border-color: #dc2626 !important;
}


html[data-book-service-theme="light"] .service-name {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .service-description {

    color: #737373 !important;
}


html[data-book-service-theme="light"] .service-price {

    color: #b91c1c !important;
}


html[data-book-service-theme="light"] .check-mark {

    color: #ffffff !important;
}


/* SCHEDULE */

html[data-book-service-theme="light"] .schedule-info {

    color: #166534 !important;

    background: rgba(34,197,94,0.08) !important;

    border-color: rgba(34,197,94,0.18) !important;
}


/* SUMMARY */

html[data-book-service-theme="light"] .summary-card {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .summary-title {

    color: #171717 !important;

    border-bottom-color: #d4d4d4 !important;
}


html[data-book-service-theme="light"] .summary-label {

    color: #737373 !important;
}


html[data-book-service-theme="light"] .summary-value {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .summary-services li {

    color: #333333 !important;

    border-bottom-color: #e5e5e5 !important;
}


html[data-book-service-theme="light"] .summary-services li span:last-child {

    color: #b91c1c !important;
}


html[data-book-service-theme="light"] .summary-empty {

    color: #737373 !important;
}


html[data-book-service-theme="light"] .summary-total {

    border-top-color: #d4d4d4 !important;
}


html[data-book-service-theme="light"] .summary-total span:first-child {

    color: #737373 !important;
}


html[data-book-service-theme="light"] .summary-total span:last-child {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .notice {

    color: #555555 !important;

    background: rgba(220,38,38,0.06) !important;

    border-color: rgba(220,38,38,0.18) !important;
}


/* SUCCESS MODAL */

html[data-book-service-theme="light"] .modal {

    background: rgba(0,0,0,0.55) !important;
}


html[data-book-service-theme="light"] .success-modal {

    background: #ffffff !important;

    color: #171717 !important;

    border-color: #fecaca !important;

    box-shadow:
        0 25px 70px
        rgba(0,0,0,0.25) !important;
}


html[data-book-service-theme="light"] .success-modal h2 {

    color: #171717 !important;
}


html[data-book-service-theme="light"] .success-modal p {

    color: #737373 !important;
}


html[data-book-service-theme="light"] .appointment-number {

    color: #b91c1c !important;

    background: rgba(220,38,38,0.08) !important;

    border-color: rgba(220,38,38,0.18) !important;
}


/* =========================================================
   DARK MODE
========================================================= */

html[data-book-service-theme="dark"] body {

    color: var(--book-text) !important;

    background:
        radial-gradient(
            circle at 10% 20%,
            rgba(220,38,38,0.15),
            transparent 30%
        ),
        radial-gradient(
            circle at 90% 80%,
            rgba(220,38,38,0.10),
            transparent 30%
        ),
        #080808 !important;
}


/* NAVBAR */

html[data-book-service-theme="dark"] .navbar {

    background:
        linear-gradient(
            90deg,
            #090909,
            #170707,
            #090909
        ) !important;

    border-bottom: 1px solid #2b1111 !important;
}


html[data-book-service-theme="dark"] .logo {

    color: #ffffff !important;
}


html[data-book-service-theme="dark"] .logo span {

    color: #ef4444 !important;
}


html[data-book-service-theme="dark"] .nav-links a {

    color: #a3a3a3 !important;
}


html[data-book-service-theme="dark"] .nav-links a:hover {

    color: #ffffff !important;
}


html[data-book-service-theme="dark"] .nav-links a.active {

    color: #ffffff !important;
}


html[data-book-service-theme="dark"] .nav-links .logout {

    color: #fecaca !important;
}


/* PAGE HEADER */

html[data-book-service-theme="dark"] .page-header h1 {

    color: #f5f5f5 !important;
}


html[data-book-service-theme="dark"] .page-header h1 span {

    color: #ef4444 !important;
}


html[data-book-service-theme="dark"] .page-header p {

    color: #a3a3a3 !important;
}


/* CARDS */

html[data-book-service-theme="dark"] .card {

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,0.025),
            rgba(220,38,38,0.04)
        ) !important;

    border-color: #292929 !important;
}


/* STEPS */

html[data-book-service-theme="dark"] .steps {

    border-bottom-color: #292929 !important;
}


html[data-book-service-theme="dark"] .step {

    color: #737373 !important;
}


html[data-book-service-theme="dark"] .step.active {

    color: #ffffff !important;
}


html[data-book-service-theme="dark"] .step-number {

    border-color: #404040 !important;
}


/* FORM */

html[data-book-service-theme="dark"] .form-group label {

    color: #a3a3a3 !important;
}


html[data-book-service-theme="dark"] .form-group input,
html[data-book-service-theme="dark"] .form-group select,
html[data-book-service-theme="dark"] .form-group textarea {

    background: #0b0b0b !important;

    color: #ffffff !important;

    border-color: #292929 !important;
}


html[data-book-service-theme="dark"] .form-group input::placeholder,
html[data-book-service-theme="dark"] .form-group textarea::placeholder {

    color: #737373 !important;
}


html[data-book-service-theme="dark"] .form-group select option {

    background: #0b0b0b !important;

    color: #ffffff !important;
}


/* MOTORCYCLE */

html[data-book-service-theme="dark"] .motorcycle-box {

    background: rgba(0,0,0,0.2) !important;

    border-color: #292929 !important;
}


html[data-book-service-theme="dark"] .bike-info strong {

    color: #f5f5f5 !important;
}


html[data-book-service-theme="dark"] .bike-info span {

    color: #a3a3a3 !important;
}


html[data-book-service-theme="dark"] .change-bike {

    color: #fca5a5 !important;
}


html[data-book-service-theme="dark"] .change-bike:hover {

    color: #ffffff !important;
}


/* SERVICES */

html[data-book-service-theme="dark"] .service-label {

    background: #0b0b0b !important;

    border-color: #292929 !important;
}


html[data-book-service-theme="dark"] .service-option input:checked + .service-label {

    background: rgba(220,38,38,0.10) !important;

    border-color: #dc2626 !important;
}


html[data-book-service-theme="dark"] .service-name {

    color: #f5f5f5 !important;
}


html[data-book-service-theme="dark"] .service-description {

    color: #a3a3a3 !important;
}


html[data-book-service-theme="dark"] .service-price {

    color: #fca5a5 !important;
}


html[data-book-service-theme="dark"] .check-mark {

    color: #ffffff !important;
}


/* SCHEDULE */

html[data-book-service-theme="dark"] .schedule-info {

    color: #bbf7d0 !important;
}


/* SUMMARY */

html[data-book-service-theme="dark"] .summary-card {

    color: #f5f5f5 !important;
}


html[data-book-service-theme="dark"] .summary-title {

    color: #f5f5f5 !important;

    border-bottom-color: #292929 !important;
}


html[data-book-service-theme="dark"] .summary-label {

    color: #a3a3a3 !important;
}


html[data-book-service-theme="dark"] .summary-value {

    color: #f5f5f5 !important;
}


html[data-book-service-theme="dark"] .summary-services li {

    color: #f5f5f5 !important;

    border-bottom-color: #202020 !important;
}


html[data-book-service-theme="dark"] .summary-services li span:last-child {

    color: #fca5a5 !important;
}


html[data-book-service-theme="dark"] .summary-empty {

    color: #737373 !important;
}


html[data-book-service-theme="dark"] .summary-total {

    border-top-color: #404040 !important;
}


html[data-book-service-theme="dark"] .summary-total span:first-child {

    color: #a3a3a3 !important;
}


html[data-book-service-theme="dark"] .summary-total span:last-child {

    color: #ffffff !important;
}


html[data-book-service-theme="dark"] .notice {

    color: #a3a3a3 !important;
}


/* SUCCESS MODAL */

html[data-book-service-theme="dark"] .success-modal {

    background:
        linear-gradient(
            145deg,
            #171717,
            #090909
        ) !important;

    color: #f5f5f5 !important;

    border-color: #3a1717 !important;
}


html[data-book-service-theme="dark"] .success-modal h2 {

    color: #ffffff !important;
}


html[data-book-service-theme="dark"] .success-modal p {

    color: #a3a3a3 !important;
}

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        const saved =
            localStorage.getItem(STORAGE_KEY) || "light";

        applyTheme(saved);

        injectStyles();
    }


    /* =====================================================
       GLOBAL FUNCTIONS
       SHARED CUSTOMER HEADER CAN USE THESE
    ===================================================== */

    window.bookServiceToggleTheme = toggleTheme;

    window.bookServiceSetTheme = applyTheme;


    /* =====================================================
       START
    ===================================================== */

    initialize();

})();
