document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_API_BASE = "http://localhost:3000";

    const loginForm = document.getElementById("adminLoginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const passwordIcon = document.getElementById("passwordIcon");
    const loginButton = document.getElementById("loginButton");
    const loginButtonText = document.getElementById("loginButtonText");
    const loginButtonIcon = document.getElementById("loginButtonIcon");
    const loginMessage = document.getElementById("loginMessage");

    if (!loginForm) return;

    function showMessage(message, type = "error") {
        if (!loginMessage) return;

        loginMessage.textContent = message;
        loginMessage.style.display = "block";

        loginMessage.classList.remove("error", "success");
        loginMessage.classList.add(type);
    }

    function hideMessage() {
        if (!loginMessage) return;

        loginMessage.textContent = "";
        loginMessage.style.display = "none";
        loginMessage.classList.remove("error", "success");
    }

    function setLoading(loading) {
        if (!loginButton) return;

        loginButton.disabled = loading;

        if (loginButtonText) {
            loginButtonText.textContent = loading
                ? "Signing in..."
                : "Sign In";
        }

        if (loginButtonIcon) {
            loginButtonIcon.className = loading
                ? "fas fa-spinner fa-spin"
                : "fas fa-arrow-right";
        }
    }

    // Show / hide password
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";

            passwordInput.type = isPassword ? "text" : "password";

            if (passwordIcon) {
                passwordIcon.className = isPassword
                    ? "fas fa-eye-slash"
                    : "fas fa-eye";
            }
        });
    }

    // Shared authentication endpoint
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideMessage();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage("Please enter your email and password.");
            return;
        }

        if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
            showMessage("Please use your registered Gmail account.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${ADMIN_API_BASE}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success || !data.user) {
                showMessage(data.message || "Invalid email or password.");
                setLoading(false);
                return;
            }

            const user = data.user;
            const role = String(user.role || "").toLowerCase();

            // This page is strictly for administrator accounts.
            if (role !== "admin") {
                showMessage("Access denied. This account is not an administrator.");
                setLoading(false);
                return;
            }

            const userId = user.id || user.user_id || user.userId;

            if (!userId) {
                showMessage("Login failed because the account ID is missing.");
                setLoading(false);
                return;
            }

            // Preserve the existing admin storage keys.
            localStorage.setItem("adminUser", JSON.stringify(user));
            localStorage.setItem("addMotorUser", JSON.stringify(user));
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("adminId", String(userId));

            showMessage("Login successful! Redirecting...", "success");

            setLoading(true);

            setTimeout(() => {
                window.location.href = "/frontend/admin/dashboard.html";
            }, 500);

        } catch (error) {
            console.error("Admin login error:", error);

            showMessage(
                "Unable to connect to the login server. Please make sure the customer server is running on port 3000."
            );

            setLoading(false);
        }
    });
});