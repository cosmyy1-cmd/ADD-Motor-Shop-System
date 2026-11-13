/* =========================================
   ADD MOTOR SHOP - PROFILE
   js/profile.js
========================================= */

const PROFILE_API_BASE = "http://localhost:3000";

let currentUser = null;
let originalProfileData = null;

/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const yearElement = document.getElementById("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    initializeProfileEvents();
    loadProfile();
});

/* =========================================
   USER INFORMATION
========================================= */

function getLoggedInUser() {
    try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            return JSON.parse(storedUser);
        }

        const storedAddMotorUser = localStorage.getItem("addMotorUser");

        if (storedAddMotorUser) {
            return JSON.parse(storedAddMotorUser);
        }

    } catch (error) {
        console.error("Error reading logged-in user:", error);
    }

    return null;
}

function getUserId() {
    const user = currentUser || getLoggedInUser();

    if (user) {
        return (
            user.id ||
            user.user_id ||
            user.userId ||
            user.customer_id ||
            null
        );
    }

    return (
        localStorage.getItem("userId") ||
        null
    );
}

/* =========================================
   PROFILE EVENT LISTENERS
========================================= */

function initializeProfileEvents() {
    const profileForm = document.getElementById("profileForm");
    const cancelProfile = document.getElementById("cancelProfile");
    const passwordForm = document.getElementById("passwordForm");

    if (profileForm) {
        profileForm.addEventListener("submit", handleProfileSubmit);
    }

    if (cancelProfile) {
        cancelProfile.addEventListener("click", handleCancelProfile);
    }

    if (passwordForm) {
        passwordForm.addEventListener("submit", handlePasswordSubmit);
    }

    // Logout is handled by the shared customer-header.js.
    // Do not add another logout listener here.
}

/* =========================================
   LOAD PROFILE
========================================= */

async function loadProfile() {
    currentUser = getLoggedInUser();

    const userId = getUserId();

    if (!userId) {
        showProfileLoadError(
            "Unable to identify your account. Please log in again."
        );
        return;
    }

    try {
        const response = await fetch(
            `${PROFILE_API_BASE}/api/user/${encodeURIComponent(userId)}`
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load profile. Server returned ${response.status}.`
            );
        }

        const result = await response.json();

        if (result.success === false) {
            throw new Error(
                result.message || "Unable to load your profile."
            );
        }

        const userData =
            result.user ||
            result.data ||
            result;

        if (!userData || typeof userData !== "object") {
            throw new Error("Invalid profile information received.");
        }

        currentUser = {
            ...(currentUser || {}),
            ...userData
        };

        populateProfile(currentUser);
        updateLocalStorageUser(currentUser);

        await Promise.all([
            loadProfileStats(userId),
            loadRecentActivity(userId)
        ]);

    } catch (error) {
        console.error("Error loading profile:", error);

        showProfileLoadError(
            error.message || "Unable to load your profile. Please try again."
        );
    }
}

/* =========================================
   POPULATE PROFILE INFORMATION
========================================= */

function populateProfile(user) {
    if (!user) return;

    const fullName =
        user.name ||
        user.full_name ||
        user.fullName ||
        "";

    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);

    const firstName =
        user.first_name ||
        user.firstName ||
        nameParts.shift() ||
        "";

    const lastName =
        user.last_name ||
        user.lastName ||
        nameParts.join(" ") ||
        "";

    const email = user.email || "";
    const phone =
        user.phone ||
        user.phone_number ||
        user.contact_number ||
        "";

    const address = user.address || "";

    const birthdate =
        user.birthdate ||
        user.birth_date ||
        "";

    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const birthdateInput = document.getElementById("birthdate");
    const addressInput = document.getElementById("address");

    if (firstNameInput) firstNameInput.value = firstName;
    if (lastNameInput) lastNameInput.value = lastName;
    if (emailInput) emailInput.value = email;
    if (phoneInput) phoneInput.value = phone;
    if (birthdateInput) {
        birthdateInput.value = formatDateInput(birthdate);
    }
    if (addressInput) addressInput.value = address;

    const displayName =
        `${firstName} ${lastName}`.trim() ||
        fullName ||
        "Customer";

    const initials = getInitials(displayName);

    setText("profileName", displayName);
    setText("profileEmail", email || "No email available");
    setText("summaryPhone", phone || "Not provided");
    setText("profileAvatar", initials);
    setText("profileAvatarLarge", initials);

    setText(
        "summaryMemberSince",
        formatMemberSince(
            user.created_at ||
            user.createdAt ||
            user.date_registered ||
            user.registration_date
        )
    );

    originalProfileData = {
        firstName,
        lastName,
        email,
        phone,
        birthdate: formatDateInput(birthdate),
        address
    };
}

/* =========================================
   PROFILE STATISTICS
========================================= */

async function loadProfileStats(userId) {
    try {
        const [motorcycleResponse, reservationResponse] =
            await Promise.all([
                fetch(
                    `${PROFILE_API_BASE}/api/customer-motorcycles/${encodeURIComponent(userId)}`
                ),
                fetch(
                    `${PROFILE_API_BASE}/api/reservations/user/${encodeURIComponent(userId)}`
                )
            ]);

        let motorcycles = [];
        let reservations = [];

        if (motorcycleResponse.ok) {
            const motorcycleResult = await motorcycleResponse.json();

            motorcycles = extractArray(
                motorcycleResult,
                ["motorcycles", "data", "results"]
            );
        }

        if (reservationResponse.ok) {
            const reservationResult = await reservationResponse.json();

            reservations = extractArray(
                reservationResult,
                ["reservations", "data", "results"]
            );
        }

        setText("summaryMotorcycles", motorcycles.length);

        const completedServices = reservations.filter(reservation => {
            const status = String(
                reservation.status ||
                reservation.reservation_status ||
                ""
            ).toLowerCase().trim();

            return status === "completed";
        }).length;

        setText("summaryServices", completedServices);

    } catch (error) {
        console.error("Error loading profile statistics:", error);

        setText("summaryMotorcycles", "—");
        setText("summaryServices", "—");
    }
}

/* =========================================
   LOAD RECENT ACTIVITY
========================================= */

async function loadRecentActivity(userId) {
    const activityList = document.getElementById("activityList");

    if (!activityList) return;

    activityList.innerHTML = `
        <p class="activity-empty">Loading recent activity...</p>
    `;

    try {
        const [reservationResponse, motorcycleResponse] =
            await Promise.all([
                fetch(
                    `${PROFILE_API_BASE}/api/reservations/user/${encodeURIComponent(userId)}`
                ),
                fetch(
                    `${PROFILE_API_BASE}/api/customer-motorcycles/${encodeURIComponent(userId)}`
                )
            ]);

        let reservations = [];
        let motorcycles = [];

        if (reservationResponse.ok) {
            const reservationResult = await reservationResponse.json();

            reservations = extractArray(
                reservationResult,
                ["reservations", "data", "results"]
            );
        }

        if (motorcycleResponse.ok) {
            const motorcycleResult = await motorcycleResponse.json();

            motorcycles = extractArray(
                motorcycleResult,
                ["motorcycles", "data", "results"]
            );
        }

        const activities = [];

        reservations.forEach(reservation => {
            const date =
                reservation.created_at ||
                reservation.createdAt ||
                reservation.reservation_date ||
                reservation.date ||
                null;

            const reference =
                reservation.reference_number ||
                reservation.reservation_code ||
                reservation.booking_reference ||
                reservation.id ||
                "";

            const status =
                reservation.status ||
                reservation.reservation_status ||
                "Pending";

            activities.push({
                type: "service",
                title: "Service Appointment",
                description: reference
                    ? `Reference: ${reference} • ${status}`
                    : `Appointment status: ${status}`,
                date,
                sortDate: getSortableDate(date)
            });
        });

        motorcycles.forEach(motorcycle => {
            const date =
                motorcycle.created_at ||
                motorcycle.createdAt ||
                motorcycle.date_registered ||
                null;

            const motorcycleName = [
                motorcycle.brand,
                motorcycle.model
            ].filter(Boolean).join(" ");

            activities.push({
                type: "motorcycle",
                title: "Motorcycle Registered",
                description: motorcycleName ||
                    motorcycle.plate_number ||
                    motorcycle.license_plate ||
                    "A motorcycle was added to your account.",
                date,
                sortDate: getSortableDate(date)
            });
        });

        renderRecentActivity(activities);

    } catch (error) {
        console.error("Error loading recent activity:", error);

        activityList.innerHTML = `
            <p class="activity-empty">
                Unable to load recent activity.
            </p>
        `;
    }
}

/* =========================================
   RENDER RECENT ACTIVITY
========================================= */

function renderRecentActivity(activities) {
    const activityList = document.getElementById("activityList");

    if (!activityList) return;

    if (!activities.length) {
        activityList.innerHTML = `
            <p class="activity-empty">
                No recent activity found.
            </p>
        `;
        return;
    }

    activities.sort((a, b) => {
        return b.sortDate - a.sortDate;
    });

    const recentActivities = activities.slice(0, 5);

    activityList.innerHTML = recentActivities.map(activity => {
        const icon =
            activity.type === "motorcycle" ? "🏍️" : "🔧";

        return `
            <div class="activity-item">

                <div class="activity-icon">
                    ${icon}
                </div>

                <div class="activity-content">
                    <strong>${escapeHTML(activity.title)}</strong>
                    <span>${escapeHTML(activity.description)}</span>
                </div>

                <span class="activity-time">
                    ${escapeHTML(formatActivityDate(activity.date))}
                </span>

            </div>
        `;
    }).join("");
}

/* =========================================
   PROFILE FORM
========================================= */

function handleProfileSubmit(event) {
    event.preventDefault();

    /*
       The profile update API has not yet been implemented.
       This keeps the existing behavior and does not pretend
       that profile information was saved to the database.
    */

    showProfileMessage(
        "Profile updates are not yet available. Your changes have not been saved.",
        "success"
    );
}

/* =========================================
   CANCEL PROFILE CHANGES
========================================= */

function handleCancelProfile() {
    if (!originalProfileData) return;

    const fields = {
        firstName: originalProfileData.firstName,
        lastName: originalProfileData.lastName,
        email: originalProfileData.email,
        phone: originalProfileData.phone,
        birthdate: originalProfileData.birthdate,
        address: originalProfileData.address
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) {
            element.value = value || "";
        }
    });

    clearProfileMessage();
}

/* =========================================
   PASSWORD FORM
========================================= */

function handlePasswordSubmit(event) {
    event.preventDefault();

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("Please complete all password fields.");
        return;
    }

    if (newPassword.length < 8) {
        alert("Your new password must contain at least 8 characters.");
        return;
    }

    if (!/\d/.test(newPassword)) {
        alert("Your new password must contain at least one number.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("The new password and confirmation do not match.");
        return;
    }

    /*
       The password update API has not yet been implemented.
       Do not clear the form or claim that the password changed.
    */

    alert(
        "Password updating is not yet available. Your password has not been changed."
    );
}

/* =========================================
   LOCAL STORAGE
========================================= */

function updateLocalStorageUser(user) {
    if (!user) return;

    try {
        const existingUser = getLoggedInUser() || {};

        const updatedUser = {
            ...existingUser,
            ...user
        };

        localStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
        );

        if (localStorage.getItem("addMotorUser")) {
            localStorage.setItem(
                "addMotorUser",
                JSON.stringify(updatedUser)
            );
        }

    } catch (error) {
        console.error("Unable to update stored user information:", error);
    }
}

/* =========================================
   HELPER FUNCTIONS
========================================= */

function extractArray(result, possibleKeys = []) {
    if (Array.isArray(result)) {
        return result;
    }

    if (!result || typeof result !== "object") {
        return [];
    }

    for (const key of possibleKeys) {
        if (Array.isArray(result[key])) {
            return result[key];
        }
    }

    return [];
}

function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = value ?? "";
    }
}

function getInitials(name) {
    if (!name) return "CU";

    const parts = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    return (
        parts[0][0] + parts[parts.length - 1][0]
    ).toUpperCase();
}

function formatMemberSince(dateValue) {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });
}

function formatDateInput(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatActivityDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function getSortableDate(dateValue) {
    if (!dateValue) return 0;

    const timestamp = new Date(dateValue).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

/* =========================================
   PROFILE MESSAGES
========================================= */

function showProfileMessage(message, type = "success") {
    const messageElement = document.getElementById("profileMessage");

    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `profile-message ${type}`;
}

function clearProfileMessage() {
    const messageElement = document.getElementById("profileMessage");

    if (!messageElement) return;

    messageElement.textContent = "";
    messageElement.className = "profile-message";
}

function showProfileLoadError(message) {
    setText("profileName", "Unable to load profile");
    setText("profileEmail", message);

    const activityList = document.getElementById("activityList");

    if (activityList) {
        activityList.innerHTML = `
            <p class="activity-empty">
                ${escapeHTML(message)}
            </p>
        `;
    }
}