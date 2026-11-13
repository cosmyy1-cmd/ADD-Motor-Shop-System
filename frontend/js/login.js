
document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        console.error("Login form not found.");
        return;
    }

    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    /* =========================================
       LOGIN BUTTON HELPERS
    ========================================= */

    function setLoginButtonLoading(isLoading) {

        if (!submitButton) return;

        submitButton.disabled = isLoading;

        submitButton.textContent = isLoading
            ? "Authenticating..."
            : "Log In";
    }

    function showLoginError(message) {

        if (successMessage) {
            successMessage.style.display = "none";
            successMessage.textContent = "";
        }

        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = "block";
        } else {
            alert(message);
        }
    }

    function clearLoginMessages() {

        if (errorMessage) {
            errorMessage.textContent = "";
            errorMessage.style.display = "none";
        }

        if (successMessage) {
            successMessage.textContent = "";
            successMessage.style.display = "none";
        }
    }

    /* =========================================
       ACCOUNT LOCKOUT POPUP
    ========================================= */

    function showAccountLockedPopup() {

        // Prevent duplicate popups.
        if (document.getElementById("accountLockedPopup")) {
            return;
        }

        // Hide ordinary login error messages.
        if (errorMessage) {
            errorMessage.style.display = "none";
            errorMessage.textContent = "";
        }

        if (successMessage) {
            successMessage.style.display = "none";
            successMessage.textContent = "";
        }

        // Add popup styles once.
        if (!document.getElementById("accountLockedPopupStyles")) {

            const style = document.createElement("style");

            style.id = "accountLockedPopupStyles";

            style.textContent = `
                .account-locked-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    background: rgba(15, 15, 15, 0.65);
                    backdrop-filter: blur(5px);
                    animation: lockedOverlayFade 0.2s ease;
                }

                .account-locked-modal {
                    width: 100%;
                    max-width: 430px;
                    padding: 35px 30px;
                    background: #ffffff;
                    border-radius: 18px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
                    animation: lockedModalAppear 0.25s ease;
                }

                .account-locked-icon {
                    width: 75px;
                    height: 75px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: #fff0f0;
                    color: #e63946;
                    font-size: 34px;
                    font-weight: 700;
                }

                .account-locked-modal h2 {
                    margin: 0 0 12px;
                    color: #222222;
                    font-size: 23px;
                    font-weight: 700;
                }

                .account-locked-modal p {
                    margin: 0 0 12px;
                    color: #555555;
                    font-size: 14px;
                    line-height: 1.7;
                }

                .account-locked-notice {
                    margin: 18px 0 22px;
                    padding: 13px;
                    border-radius: 9px;
                    background: #fff4f4;
                    color: #b4232d;
                    font-size: 13px;
                    font-weight: 600;
                    line-height: 1.6;
                }

                .account-locked-done {
                    width: 100%;
                    min-height: 46px;
                    border: none;
                    border-radius: 9px;
                    background: #e63946;
                    color: #ffffff;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }

                .account-locked-done:hover {
                    background: #c92f3b;
                }

                .account-locked-done:focus-visible {
                    outline: 3px solid rgba(230, 57, 70, 0.3);
                    outline-offset: 3px;
                }

                @keyframes lockedOverlayFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes lockedModalAppear {
                    from {
                        opacity: 0;
                        transform: translateY(15px) scale(0.97);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @media (max-width: 480px) {
                    .account-locked-modal {
                        padding: 28px 22px;
                    }

                    .account-locked-modal h2 {
                        font-size: 20px;
                    }
                }
            `;

            document.head.appendChild(style);
        }

        // Create popup overlay.
        const overlay = document.createElement("div");

        overlay.id = "accountLockedPopup";
        overlay.className = "account-locked-overlay";

        overlay.setAttribute("role", "presentation");

        // Create popup.
        const modal = document.createElement("div");

        modal.className = "account-locked-modal";

        modal.setAttribute("role", "alertdialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "accountLockedTitle");
        modal.setAttribute("aria-describedby", "accountLockedDescription");

        // Lock icon.
        const icon = document.createElement("div");

        icon.className = "account-locked-icon";
        icon.textContent = "🔒";

        // Popup heading.
        const heading = document.createElement("h2");

        heading.id = "accountLockedTitle";
        heading.textContent = "Account Locked";

        // Main explanation.
        const description = document.createElement("p");

        description.id = "accountLockedDescription";

        description.textContent =
            "Your account has been locked because you entered an incorrect password five consecutive times.";

        // Restoration notice.
        const notice = document.createElement("div");

        notice.className = "account-locked-notice";

        notice.textContent =
            "Please contact ADD Motor Shop for account restoration.";

        // Done button.
        const doneButton = document.createElement("button");

        doneButton.type = "button";
        doneButton.className = "account-locked-done";
        doneButton.textContent = "Done";

        // Close popup.
        function closePopup() {

            overlay.remove();

            document.removeEventListener(
                "keydown",
                handleEscape
            );

        }

        function handleEscape(event) {

            if (event.key === "Escape") {
                closePopup();
            }

        }

        doneButton.addEventListener("click", closePopup);

        document.addEventListener(
            "keydown",
            handleEscape
        );

        // Assemble popup.
        modal.appendChild(icon);
        modal.appendChild(heading);
        modal.appendChild(description);
        modal.appendChild(notice);
        modal.appendChild(doneButton);

        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        // Focus Done button for accessibility.
        doneButton.focus();

    }

    /* =========================================
       LOGIN FORM
    ========================================= */

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");

        if (!emailInput || !passwordInput) {

            showLoginError(
                "Login form fields were not found."
            );

            return;
        }

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        /* REQUIRED FIELDS */

        if (!email || !password) {

            showLoginError(
                "Please enter your email and password."
            );

            return;
        }

        /* GMAIL VALIDATION */

        if (!email.endsWith("@gmail.com")) {

            showLoginError(
                "Please use a valid Gmail address."
            );

            return;
        }

        clearLoginMessages();

        /* DISABLE BUTTON WHILE AUTHENTICATING */

        setLoginButtonLoading(true);

        let loginSuccessful = false;

        try {

            /* SEND LOGIN REQUEST */

            const response = await fetch("/api/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            /* READ SERVER RESPONSE */

            const data = await response.json();

            console.log(
                "Login API response:",
                data
            );

            /* =====================================
               ACCOUNT LOCKED
            ===================================== */

            if (
                data.code === "ACCOUNT_LOCKED" ||
                data.account_locked === true
            ) {

                showAccountLockedPopup();

                return;
            }

            /* =====================================
               OTHER LOGIN FAILURES
            ===================================== */

            if (!response.ok || !data.success) {

                showLoginError(
                    data.message ||
                    "Invalid email or password."
                );

                return;
            }

            /* CHECK USER DATA */

            if (!data.user) {

                console.error(
                    "Login succeeded, but no user data was returned:",
                    data
                );

                showLoginError(
                    "Login failed because the server did not return your user information."
                );

                return;
            }

            /* CHECK USER ROLE */

            const role = String(
                data.user.role || ""
            ).toLowerCase();

            if (
                role !== "admin" &&
                role !== "customer"
            ) {

                console.error(
                    "Invalid or missing user role:",
                    data.user
                );

                showLoginError(
                    "Access denied. Your account has an invalid role."
                );

                return;
            }

            /* GET USER ID */

            const userId =
                data.user.id ??
                data.user.user_id ??
                data.user.userId;

            if (!userId) {

                console.error(
                    "User ID was not found in login response:",
                    data.user
                );

                showLoginError(
                    "Login failed because your user ID was not returned by the server."
                );

                return;
            }

            /* SAVE USER SESSION */

            const userData = JSON.stringify(data.user);

            localStorage.setItem("user", userData);

            localStorage.setItem(
                "userId",
                String(userId)
            );

            localStorage.setItem(
                "addMotorUser",
                userData
            );

            /* VERIFY SESSION */

            console.log(
                "User session saved successfully."
            );

            console.log(
                "Logged-in role:",
                role
            );

            console.log(
                "Saved user:",
                localStorage.getItem("user")
            );

            console.log(
                "Saved userId:",
                localStorage.getItem("userId")
            );

            console.log(
                "Saved addMotorUser:",
                localStorage.getItem("addMotorUser")
            );

            /* START LOGIN TRANSITION */

            loginSuccessful = true;

            startLoginTransition(role);

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            showLoginError(
                "Unable to connect to the server. Please make sure the ADD Motor Shop server is running."
            );

        } finally {

            // Restore button after every failed login.
            // Keep it disabled only after successful login.

            if (!loginSuccessful) {
                setLoginButtonLoading(false);
            }

        }

    });

    /* =========================================
       SHOW / HIDE PASSWORD
    ========================================= */

    const showPasswordButton = document.getElementById(
        "showPassword"
    );

    const passwordInput = document.getElementById(
        "password"
    );

    if (showPasswordButton && passwordInput) {

        showPasswordButton.addEventListener("click", () => {

            if (passwordInput.type === "password") {

                passwordInput.type = "text";

                showPasswordButton.textContent = "Hide";

            } else {

                passwordInput.type = "password";

                showPasswordButton.textContent = "Show";

            }

        });

    }

    /* =========================================
       FORGOT PASSWORD
    ========================================= */

    const forgotPassword = document.getElementById(
        "forgotPassword"
    );

    if (forgotPassword) {

        forgotPassword.addEventListener("click", (event) => {

            event.preventDefault();

            alert(
                "Please contact ADD Motor Shop support to reset your password."
            );

        });

    }

    /* =========================================
       LOGIN SUCCESS TRANSITION
    ========================================= */

    function startLoginTransition(role) {

        const transition = document.getElementById(
            "loginTransition"
        );

        let dashboardUrl = "";

        if (role === "admin") {

            dashboardUrl =
                "/frontend/admin/dashboard.html";

        } else if (role === "customer") {

            dashboardUrl =
                "/frontend/dashboard.html";

        } else {

            showLoginError(
                "Access denied. Your account has an invalid role."
            );

            return;
        }

        if (!transition) {

            console.error(
                "Login transition element not found."
            );

            window.location.href = dashboardUrl;

            return;
        }

        /* SHOW TRANSITION */

        transition.classList.add("active");

        /* PREVENT INTERACTION DURING TRANSITION */

        document.body.style.overflow = "hidden";

        /* REDIRECT AFTER ANIMATION */

        setTimeout(() => {

            window.location.href = dashboardUrl;

        }, 3000);

    }

});