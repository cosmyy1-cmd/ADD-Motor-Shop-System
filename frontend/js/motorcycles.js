/* =========================================
   ADD MOTOR SHOP
   CUSTOMER MOTORCYCLES - FRONTEND CRUD
========================================= */

const API_BASE = "";

let currentUser = null;
let motorcycles = [];
let editingId = null;
let isSaving = false;

/* =========================================
   ELEMENTS
========================================= */

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const motorcyclesGrid =
    document.getElementById("motorcyclesGrid");

const motorcycleModal =
    document.getElementById("motorcycleModal");

const modalTitle =
    motorcycleModal
        ? motorcycleModal.querySelector(
            ".modal-header h2"
        )
        : null;

const motorcycleForm =
    document.getElementById("motorcycleForm");

const brandField =
    document.getElementById("brand");

const modelField =
    document.getElementById("model");

const yearField =
    document.getElementById("year");

const engineCcField =
    document.getElementById("engine_cc");

const plateNumberField =
    document.getElementById("plate_number");

const colorField =
    document.getElementById("color");

const isPrimaryField =
    document.getElementById("is_primary");

const formError =
    document.getElementById("formError");

const formSuccess =
    document.getElementById("formSuccess");

const saveButton =
    document.getElementById("saveButton");


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        currentUser = getCurrentUser();

        console.log(
            "Current logged-in user:",
            currentUser
        );

        if (!currentUser) {

            alert(
                "No logged-in user found. Please log in again."
            );

            window.location.href =
                "login.html";

            return;
        }

        setupEvents();

        await loadMotorcycles();
    }
);


/* =========================================
   GET CURRENT USER
========================================= */

function getCurrentUser() {

    try {

        let storedUser =
            localStorage.getItem(
                "addMotorUser"
            );

        if (!storedUser) {

            storedUser =
                localStorage.getItem(
                    "user"
                );
        }

        if (!storedUser) {

            console.warn(
                "No user found in localStorage."
            );

            return null;
        }

        const user =
            JSON.parse(storedUser);

        const id =
            Number(
                user.id ||
                user.user_id ||
                user.userId
            );

        if (!id) {

            console.warn(
                "User exists but no valid ID was found."
            );

            return null;
        }

        return {
            ...user,
            id: id
        };

    } catch (error) {

        console.error(
            "Unable to read logged-in user:",
            error
        );

        return null;
    }
}


/* =========================================
   SETUP EVENTS
========================================= */

function setupEvents() {

    const openAddButton =
        document.getElementById(
            "openAddButton"
        );

    const emptyAddButton =
        document.getElementById(
            "emptyAddButton"
        );

    const closeModalButton =
        document.getElementById(
            "closeModalButton"
        );

    const cancelButton =
        document.getElementById(
            "cancelButton"
        );


    if (openAddButton) {

        openAddButton.addEventListener(
            "click",
            openAddModal
        );
    }


    if (emptyAddButton) {

        emptyAddButton.addEventListener(
            "click",
            openAddModal
        );
    }


    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            closeModal
        );
    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeModal
        );
    }


    if (motorcycleForm) {

        motorcycleForm.addEventListener(
            "submit",
            handleFormSubmit
        );
    }


    if (motorcycleModal) {

        motorcycleModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    motorcycleModal
                ) {

                    closeModal();
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeModal();
            }
        }
    );


    const logoutLink =
        document.querySelector(
            ".nav-links .logout"
        );

    if (logoutLink) {

        logoutLink.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "addMotorUser"
                );

                localStorage.removeItem(
                    "user"
                );
            }
        );
    }
}


/* =========================================
   LOAD MOTORCYCLES
========================================= */

async function loadMotorcycles() {

    showLoading();

    try {

        const response =
            await fetch(
                `${API_BASE}/api/customer-motorcycles/${currentUser.id}`
            );

        const data =
            await response.json();


        console.log(
            "Motorcycle API response:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load motorcycles."
            );
        }


        motorcycles =
            Array.isArray(
                data.motorcycles
            )
                ? data.motorcycles
                : [];


        renderMotorcycles();

    } catch (error) {

        console.error(
            "Load motorcycles error:",
            error
        );


        loadingState.classList.add(
            "hidden"
        );

        emptyState.classList.add(
            "hidden"
        );


        motorcyclesGrid.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ⚠️
                </div>

                <h2>
                    Unable to Load Motorcycles
                </h2>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Something went wrong."
                    )}
                </p>

                <button
                    type="button"
                    class="add-button"
                    onclick="loadMotorcycles()"
                >
                    Try Again
                </button>

            </div>
        `;
    }
}


/* =========================================
   RENDER MOTORCYCLES
========================================= */

function renderMotorcycles() {

    loadingState.classList.add(
        "hidden"
    );


    if (
        motorcycles.length === 0
    ) {

        emptyState.classList.remove(
            "hidden"
        );

        motorcyclesGrid.innerHTML =
            "";

        return;
    }


    emptyState.classList.add(
        "hidden"
    );


    motorcyclesGrid.innerHTML =
        motorcycles
            .map(
                createMotorcycleCard
            )
            .join("");
}


/* =========================================
   CREATE MOTORCYCLE CARD
========================================= */

function createMotorcycleCard(
    motorcycle
) {

    const id =
        Number(
            motorcycle.id
        );


    const isPrimary =
        Number(
            motorcycle.is_primary
        ) === 1;


    const name =
        `${motorcycle.brand || ""} ${motorcycle.model || ""}`
            .trim() ||
        "Motorcycle";


    const yearValue =
        motorcycle.year ||
        "—";


    const engineValue =
        motorcycle.engine_cc
            ? `${motorcycle.engine_cc} cc`
            : "—";


    const plateValue =
        motorcycle.plate_number ||
        "—";


    const colorValue =
        motorcycle.color ||
        "—";


    const addedDate =
        motorcycle.created_at
            ? new Date(
                motorcycle.created_at
            ).toLocaleDateString()
            : "";


    return `
        <article
            class="motorcycle-card"
            data-motorcycle-id="${id}"
        >

            <div class="card-top">

                <div class="bike-icon">
                    🏍️
                </div>

                ${
                    isPrimary
                        ? `
                            <span class="primary-badge">
                                Primary
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="motorcycle-name">
                ${escapeHtml(name)}
            </div>


            <div class="motorcycle-subtitle">
                ${escapeHtml(
                    motorcycle.brand ||
                    "Motorcycle"
                )}
            </div>


            <div class="motorcycle-details">

                <div class="detail">

                    <div class="detail-label">
                        Year
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            String(yearValue)
                        )}
                    </div>

                </div>


                <div class="detail">

                    <div class="detail-label">
                        Engine
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            String(engineValue)
                        )}
                    </div>

                </div>


                <div class="detail">

                    <div class="detail-label">
                        Plate Number
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            String(plateValue)
                        )}
                    </div>

                </div>


                <div class="detail">

                    <div class="detail-label">
                        Color
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            String(colorValue)
                        )}
                    </div>

                </div>

            </div>


            <div class="card-footer">

                <span class="added-date">
                    ${
                        addedDate
                            ? `Added ${addedDate}`
                            : ""
                    }
                </span>


                <div class="card-actions">

                    <button
                        type="button"
                        class="cancel-button"
                        onclick="openEditModal(${id})"
                    >
                        Edit
                    </button>


                    <button
                        type="button"
                        class="save-button"
                        onclick="handleDeleteClick(${id})"
                    >
                        Delete
                    </button>

                </div>

            </div>

        </article>
    `;
}


/* =========================================
   OPEN ADD MODAL
========================================= */

function openAddModal() {

    editingId = null;

    motorcycleForm.reset();

    clearFormMessages();


    if (modalTitle) {

        modalTitle.textContent =
            "Add Motorcycle";
    }


    if (saveButton) {

        saveButton.textContent =
            "Save Motorcycle";
    }


    motorcycleModal.classList.add(
        "show"
    );


    setTimeout(
        () => {

            if (brandField) {

                brandField.focus();
            }

        },
        100
    );
}


/* =========================================
   OPEN EDIT MODAL
========================================= */

function openEditModal(id) {

    const motorcycle =
        motorcycles.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!motorcycle) {

        alert(
            "Motorcycle information could not be found."
        );

        return;
    }


    editingId = id;

    clearFormMessages();


    brandField.value =
        motorcycle.brand ||
        "";


    modelField.value =
        motorcycle.model ||
        "";


    yearField.value =
        motorcycle.year ||
        "";


    engineCcField.value =
        motorcycle.engine_cc ||
        "";


    plateNumberField.value =
        motorcycle.plate_number ||
        "";


    colorField.value =
        motorcycle.color ||
        "";


    isPrimaryField.checked =
        Number(
            motorcycle.is_primary
        ) === 1;


    if (modalTitle) {

        modalTitle.textContent =
            "Edit Motorcycle";
    }


    if (saveButton) {

        saveButton.textContent =
            "Update Motorcycle";
    }


    motorcycleModal.classList.add(
        "show"
    );
}


/* =========================================
   CLOSE MODAL
========================================= */

function closeModal() {

    if (isSaving) {

        return;
    }


    motorcycleModal.classList.remove(
        "show"
    );


    motorcycleForm.reset();

    editingId = null;

    clearFormMessages();
}


/* =========================================
   CLEAR FORM MESSAGES
========================================= */

function clearFormMessages() {

    if (formError) {

        formError.classList.add(
            "hidden"
        );

        formError.textContent =
            "";
    }


    if (formSuccess) {

        formSuccess.classList.add(
            "hidden"
        );

        formSuccess.textContent =
            "";
    }
}


/* =========================================
   SHOW FORM ERROR
========================================= */

function showFormError(message) {

    if (formSuccess) {

        formSuccess.classList.add(
            "hidden"
        );
    }


    if (formError) {

        formError.textContent =
            message;

        formError.classList.remove(
            "hidden"
        );
    }
}


/* =========================================
   HANDLE FORM SUBMIT
========================================= */

async function handleFormSubmit(
    event
) {

    event.preventDefault();


    if (isSaving) {

        return;
    }


    const wasEditing =
        Boolean(editingId);


    const payload = {

        user_id:
            currentUser.id,

        brand:
            brandField.value.trim(),

        model:
            modelField.value.trim(),

        year:
            yearField.value
                ? Number(
                    yearField.value
                )
                : null,

        engine_cc:
            engineCcField.value
                ? Number(
                    engineCcField.value
                )
                : null,

        plate_number:
            plateNumberField.value.trim(),

        color:
            colorField.value.trim(),

        is_primary:
            isPrimaryField.checked
                ? 1
                : 0
    };


    /* =====================================
       VALIDATION
    ===================================== */

    if (!payload.brand) {

        showFormError(
            "Please select a motorcycle brand."
        );

        return;
    }


    if (!payload.model) {

        showFormError(
            "Please enter the motorcycle model."
        );

        return;
    }


    if (
        payload.year &&
        (
            payload.year < 1900 ||
            payload.year > 2100
        )
    ) {

        showFormError(
            "Please enter a valid motorcycle year."
        );

        return;
    }


    if (
        payload.engine_cc &&
        payload.engine_cc <= 0
    ) {

        showFormError(
            "Please enter a valid engine CC."
        );

        return;
    }


    isSaving = true;


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            wasEditing
                ? "Updating..."
                : "Saving...";
    }


    try {

        const url =
            wasEditing
                ? `${API_BASE}/api/customer-motorcycles/${editingId}`
                : `${API_BASE}/api/customer-motorcycles`;


        const method =
            wasEditing
                ? "PUT"
                : "POST";


        const response =
            await fetch(
                url,
                {
                    method: method,

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const data =
            await response.json();


        console.log(
            "Save motorcycle response:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to save motorcycle."
            );
        }


        /*
           Close the add/edit modal first.
        */

        motorcycleModal.classList.remove(
            "show"
        );


        motorcycleForm.reset();


        /*
           Show our custom animated success
           transition.
        */

        showSuccessTransition(
            wasEditing
                ? "Motorcycle Updated!"
                : "Motorcycle Added!",
            wasEditing
                ? "Your motorcycle information has been successfully updated."
                : "Your motorcycle has been successfully registered."
        );


    } catch (error) {

        console.error(
            "Save motorcycle error:",
            error
        );


        showFormError(
            error.message ||
            "Unable to save motorcycle."
        );


    } finally {

        isSaving = false;


        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                wasEditing
                    ? "Update Motorcycle"
                    : "Save Motorcycle";
        }
    }
}


/* =========================================
   SUCCESS TRANSITION
========================================= */

function showSuccessTransition(
    title,
    message
) {

    /*
       Remove any existing transition.
    */

    const existing =
        document.getElementById(
            "motorcycleSuccessTransition"
        );

    if (existing) {
        existing.remove();
    }


    const existingStyle =
        document.getElementById(
            "motorcycleSuccessTransitionStyle"
        );

    if (existingStyle) {
        existingStyle.remove();
    }


    /*
       Create transition overlay.
    */

    const overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "motorcycleSuccessTransition";


    overlay.innerHTML = `

        <div class="success-transition-content">

            <div class="success-bike">
                🏍️
            </div>


            <div class="success-circle">

                <div class="success-check">
                    ✓
                </div>

            </div>


            <h1>
                ${escapeHtml(title)}
            </h1>


            <p>
                ${escapeHtml(message)}
            </p>


            <div class="success-loading">

                <span>
                    Returning to My Motorcycles
                </span>

                <div class="success-progress">

                    <div class="success-progress-bar">
                    </div>

                </div>

            </div>

        </div>
    `;


    /*
       Add transition styles.
    */

    const style =
        document.createElement(
            "style"
        );


    style.id =
        "motorcycleSuccessTransitionStyle";


    style.textContent = `

        #motorcycleSuccessTransition {

            position: fixed;

            inset: 0;

            z-index: 999999;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                radial-gradient(
                    circle at center,
                    rgba(
                        127,
                        29,
                        29,
                        0.30
                    ),
                    rgba(
                        0,
                        0,
                        0,
                        0.98
                    ) 65%
                );

            backdrop-filter:
                blur(10px);

            opacity: 0;

            animation:
                successFadeIn
                0.45s
                ease
                forwards;
        }


        .success-transition-content {

            width: min(
                90%,
                520px
            );

            padding: 50px 35px;

            text-align: center;

            border:
                1px solid
                rgba(
                    239,
                    68,
                    68,
                    0.25
                );

            border-radius: 24px;

            background:
                linear-gradient(
                    145deg,
                    rgba(
                        20,
                        10,
                        10,
                        0.98
                    ),
                    rgba(
                        5,
                        5,
                        5,
                        0.98
                    )
                );

            box-shadow:
                0 30px 100px
                rgba(
                    0,
                    0,
                    0,
                    0.75
                );

            transform:
                translateY(25px)
                scale(0.94);

            animation:
                successCardIn
                0.6s
                cubic-bezier(
                    0.22,
                    1,
                    0.36,
                    1
                )
                0.08s
                forwards;
        }


        .success-bike {

            font-size: 58px;

            margin-bottom: 15px;

            opacity: 0;

            filter:
                drop-shadow(
                    0 0 15px
                    rgba(
                        239,
                        68,
                        68,
                        0.55
                    )
                );

            animation:
                motorcycleRideIn
                0.8s
                ease-out
                0.2s
                forwards;
        }


        .success-circle {

            width: 92px;

            height: 92px;

            margin:
                0 auto 22px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 50%;

            border:
                2px solid
                rgba(
                    239,
                    68,
                    68,
                    0.7
                );

            background:
                rgba(
                    127,
                    29,
                    29,
                    0.18
                );

            box-shadow:
                0 0 0 0
                rgba(
                    239,
                    68,
                    68,
                    0.4
                );

            transform:
                scale(0);

            animation:
                successCircleIn
                0.65s
                cubic-bezier(
                    0.34,
                    1.56,
                    0.64,
                    1
                )
                0.45s
                forwards,

                successGlow
                2s
                ease-in-out
                1.1s
                infinite;
        }


        .success-check {

            color: #ffffff;

            font-size: 48px;

            font-weight: 800;

            line-height: 1;

            opacity: 0;

            transform:
                scale(0.5)
                rotate(-15deg);

            animation:
                successCheckIn
                0.45s
                ease-out
                0.9s
                forwards;
        }


        .success-transition-content h1 {

            margin:
                0 0 12px;

            color: #ffffff;

            font-size: 30px;

            font-weight: 800;

            letter-spacing:
                -0.5px;

            opacity: 0;

            transform:
                translateY(10px);

            animation:
                successTextIn
                0.45s
                ease
                1.05s
                forwards;
        }


        .success-transition-content p {

            margin:
                0 auto;

            max-width: 400px;

            color: #a3a3a3;

            font-size: 15px;

            line-height: 1.6;

            opacity: 0;

            transform:
                translateY(10px);

            animation:
                successTextIn
                0.45s
                ease
                1.15s
                forwards;
        }


        .success-loading {

            margin-top: 30px;

            opacity: 0;

            animation:
                successTextIn
                0.45s
                ease
                1.3s
                forwards;
        }


        .success-loading span {

            display: block;

            margin-bottom: 10px;

            color: #737373;

            font-size: 12px;

            letter-spacing:
                0.4px;
        }


        .success-progress {

            width: 100%;

            height: 4px;

            overflow: hidden;

            border-radius: 10px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.08
                );
        }


        .success-progress-bar {

            width: 0%;

            height: 100%;

            border-radius: 10px;

            background:
                #ef4444;

            box-shadow:
                0 0 12px
                rgba(
                    239,
                    68,
                    68,
                    0.8
                );

            animation:
                successProgress
                2.2s
                linear
                0.35s
                forwards;
        }


        @keyframes successFadeIn {

            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }


        @keyframes successCardIn {

            from {

                opacity: 0;

                transform:
                    translateY(25px)
                    scale(0.94);
            }

            to {

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);
            }
        }


        @keyframes motorcycleRideIn {

            0% {

                opacity: 0;

                transform:
                    translateX(-90px)
                    rotate(-5deg);
            }

            70% {

                opacity: 1;

                transform:
                    translateX(10px)
                    rotate(2deg);
            }

            100% {

                opacity: 1;

                transform:
                    translateX(0)
                    rotate(0);
            }
        }


        @keyframes successCircleIn {

            from {

                transform:
                    scale(0);
            }

            to {

                transform:
                    scale(1);
            }
        }


        @keyframes successCheckIn {

            from {

                opacity: 0;

                transform:
                    scale(0.5)
                    rotate(-15deg);
            }

            to {

                opacity: 1;

                transform:
                    scale(1)
                    rotate(0);
            }
        }


        @keyframes successTextIn {

            from {

                opacity: 0;

                transform:
                    translateY(10px);
            }

            to {

                opacity: 1;

                transform:
                    translateY(0);
            }
        }


        @keyframes successGlow {

            0%,
            100% {

                box-shadow:
                    0 0 0 0
                    rgba(
                        239,
                        68,
                        68,
                        0.3
                    );
            }

            50% {

                box-shadow:
                    0 0 0 15px
                    rgba(
                        239,
                        68,
                        68,
                        0
                    );
            }
        }


        @keyframes successProgress {

            from {
                width: 0%;
            }

            to {
                width: 100%;
            }
        }


        @media (
            max-width: 500px
        ) {

            .success-transition-content {

                padding:
                    40px 25px;
            }


            .success-transition-content h1 {

                font-size: 26px;
            }


            .success-bike {

                font-size: 48px;
            }


            .success-circle {

                width: 80px;

                height: 80px;
            }


            .success-check {

                font-size: 42px;
            }
        }
    `;


    document.head.appendChild(
        style
    );


    document.body.appendChild(
        overlay
    );


    /*
       Return to motorcycles.html
       after the animation.
    */

    setTimeout(
        () => {

            window.location.href =
                "motorcycles.html";

        },
        2700
    );
}


/* =========================================
   DELETE CONFIRMATION
========================================= */

function handleDeleteClick(id) {

    const motorcycle =
        motorcycles.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!motorcycle) {

        alert(
            "Motorcycle information could not be found."
        );

        return;
    }


    const name =
        `${motorcycle.brand || ""} ${motorcycle.model || ""}`
            .trim() ||
        "this motorcycle";


    showDeleteConfirmation(
        id,
        name
    );
}


/* =========================================
   DELETE CONFIRMATION MODAL
========================================= */

function showDeleteConfirmation(
    id,
    motorcycleName
) {

    const existing =
        document.getElementById(
            "motorcycleDeleteConfirmation"
        );

    if (existing) {

        existing.remove();
    }


    const existingStyle =
        document.getElementById(
            "motorcycleDeleteConfirmationStyle"
        );

    if (existingStyle) {

        existingStyle.remove();
    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "motorcycleDeleteConfirmation";


    overlay.innerHTML = `

        <div
            class="delete-confirmation-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deleteConfirmationTitle"
        >

            <button
                type="button"
                class="delete-confirmation-close"
                aria-label="Close"
            >
                ×
            </button>


            <div class="delete-warning-icon">

                <div class="delete-warning-glow">
                </div>

                <div class="delete-trash-icon">

                    <span class="trash-lid">
                    </span>

                    <span class="trash-body">
                    </span>

                    <span class="trash-line line-one">
                    </span>

                    <span class="trash-line line-two">
                    </span>

                    <span class="trash-line line-three">
                    </span>

                </div>

            </div>


            <div class="delete-bike-visual">
                🏍️
            </div>


            <h2
                id="deleteConfirmationTitle"
            >
                Delete
                <span>
                    ${escapeHtml(motorcycleName)}
                </span>?
            </h2>


            <p class="delete-main-message">
                Are you sure you want to remove this motorcycle?
            </p>


            <p class="delete-warning-message">
                <strong>
                    This action cannot be undone.
                </strong>
                The motorcycle will be permanently removed
                from your motorcycle list.
            </p>


            <div class="delete-confirmation-actions">

                <button
                    type="button"
                    class="delete-cancel-button"
                    id="deleteCancelButton"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    class="delete-confirm-button"
                    id="deleteConfirmButton"
                >

                    <span class="delete-button-icon">
                        🗑️
                    </span>

                    <span>
                        Delete Motorcycle
                    </span>

                </button>

            </div>

        </div>
    `;


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "motorcycleDeleteConfirmationStyle";


    style.textContent = `

        #motorcycleDeleteConfirmation {

            position: fixed;

            inset: 0;

            z-index: 999998;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 20px;

            background:
                radial-gradient(
                    circle at center,
                    rgba(
                        127,
                        29,
                        29,
                        0.28
                    ),
                    rgba(
                        0,
                        0,
                        0,
                        0.94
                    ) 70%
                );

            backdrop-filter:
                blur(10px);

            -webkit-backdrop-filter:
                blur(10px);

            opacity: 0;

            animation:
                deleteOverlayIn
                0.3s
                ease
                forwards;
        }


        .delete-confirmation-content {

            position: relative;

            width: min(
                92%,
                500px
            );

            padding:
                42px
                32px
                32px;

            text-align: center;

            border:
                1px solid
                rgba(
                    239,
                    68,
                    68,
                    0.28
                );

            border-radius: 24px;

            background:
                linear-gradient(
                    145deg,
                    rgba(
                        25,
                        10,
                        10,
                        0.99
                    ),
                    rgba(
                        7,
                        7,
                        7,
                        0.99
                    )
                );

            box-shadow:
                0 30px 100px
                rgba(
                    0,
                    0,
                    0,
                    0.85
                ),
                0 0 60px
                rgba(
                    127,
                    29,
                    29,
                    0.18
                );

            transform:
                translateY(25px)
                scale(0.94);

            animation:
                deleteCardIn
                0.45s
                cubic-bezier(
                    0.22,
                    1,
                    0.36,
                    1
                )
                0.04s
                forwards;
        }


        .delete-confirmation-close {

            position: absolute;

            top: 15px;

            right: 17px;

            width: 34px;

            height: 34px;

            display: flex;

            align-items: center;

            justify-content: center;

            border: 1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.08
                );

            border-radius: 50%;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.04
                );

            color: #8a8a8a;

            font-size: 24px;

            line-height: 1;

            cursor: pointer;

            transition:
                color 0.2s ease,
                background 0.2s ease,
                border-color 0.2s ease,
                transform 0.2s ease;
        }


        .delete-confirmation-close:hover {

            color: #ffffff;

            background:
                rgba(
                    239,
                    68,
                    68,
                    0.12
                );

            border-color:
                rgba(
                    239,
                    68,
                    68,
                    0.35
                );

            transform:
                rotate(90deg);
        }


        .delete-warning-icon {

            position: relative;

            width: 84px;

            height: 84px;

            margin:
                0 auto 13px;

            display: flex;

            align-items: center;

            justify-content: center;
        }


        .delete-warning-glow {

            position: absolute;

            width: 84px;

            height: 84px;

            border-radius: 50%;

            background:
                rgba(
                    239,
                    68,
                    68,
                    0.12
                );

            filter:
                blur(8px);

            animation:
                deleteIconGlow
                1.8s
                ease-in-out
                infinite;
        }


        .delete-trash-icon {

            position: relative;

            z-index: 2;

            width: 46px;

            height: 52px;

            filter:
                drop-shadow(
                    0 0 10px
                    rgba(
                        239,
                        68,
                        68,
                        0.65
                    )
                );

            animation:
                deleteTrashFloat
                2s
                ease-in-out
                infinite;
        }


        .trash-lid {

            position: absolute;

            top: 4px;

            left: 3px;

            width: 40px;

            height: 7px;

            border-radius: 4px;

            background:
                #ef4444;
        }


        .trash-lid::before {

            content: "";

            position: absolute;

            top: -5px;

            left: 12px;

            width: 16px;

            height: 5px;

            border-radius:
                4px 4px 0 0;

            background:
                #f87171;
        }


        .trash-body {

            position: absolute;

            top: 13px;

            left: 7px;

            width: 32px;

            height: 35px;

            border-radius:
                2px 2px 8px 8px;

            background:
                linear-gradient(
                    180deg,
                    #ef4444,
                    #b91c1c
                );

            clip-path:
                polygon(
                    4% 0,
                    96% 0,
                    88% 100%,
                    12% 100%
                );
        }


        .trash-line {

            position: absolute;

            z-index: 3;

            top: 19px;

            width: 3px;

            height: 23px;

            border-radius: 3px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.55
                );
        }


        .line-one {
            left: 16px;
        }


        .line-two {
            left: 23px;
        }


        .line-three {
            left: 30px;
        }


        .delete-bike-visual {

            margin-bottom: 12px;

            font-size: 38px;

            opacity: 0.9;

            filter:
                drop-shadow(
                    0 0 12px
                    rgba(
                        239,
                        68,
                        68,
                        0.35
                    )
                );

            animation:
                deleteBikeIn
                0.6s
                ease-out
                0.18s
                both;
        }


        .delete-confirmation-content h2 {

            margin:
                0 0 12px;

            color:
                #ffffff;

            font-size:
                27px;

            font-weight:
                800;

            line-height:
                1.3;

            letter-spacing:
                -0.4px;

            opacity: 0;

            animation:
                deleteTextIn
                0.4s
                ease
                0.2s
                forwards;
        }


        .delete-confirmation-content h2 span {

            color:
                #ef4444;

            text-shadow:
                0 0 15px
                rgba(
                    239,
                    68,
                    68,
                    0.3
                );
        }


        .delete-main-message {

            margin:
                0 auto 10px;

            max-width:
                400px;

            color:
                #d4d4d4;

            font-size:
                15px;

            line-height:
                1.6;

            opacity: 0;

            animation:
                deleteTextIn
                0.4s
                ease
                0.3s
                forwards;
        }


        .delete-warning-message {

            margin:
                0 auto;

            padding:
                12px 15px;

            max-width:
                410px;

            border:
                1px solid
                rgba(
                    239,
                    68,
                    68,
                    0.12
                );

            border-radius:
                10px;

            background:
                rgba(
                    239,
                    68,
                    68,
                    0.055
                );

            color:
                #858585;

            font-size:
                12px;

            line-height:
                1.55;

            opacity: 0;

            animation:
                deleteTextIn
                0.4s
                ease
                0.4s
                forwards;
        }


        .delete-warning-message strong {

            color:
                #ef7777;

            font-weight:
                700;
        }


        .delete-confirmation-actions {

            display:
                flex;

            gap:
                12px;

            margin-top:
                26px;

            opacity: 0;

            animation:
                deleteTextIn
                0.4s
                ease
                0.5s
                forwards;
        }


        .delete-cancel-button,
        .delete-confirm-button {

            flex: 1;

            min-height:
                48px;

            padding:
                12px 18px;

            border-radius:
                10px;

            font-size:
                14px;

            font-weight:
                700;

            cursor:
                pointer;

            transition:
                transform 0.2s ease,
                background 0.2s ease,
                border-color 0.2s ease,
                color 0.2s ease,
                box-shadow 0.2s ease,
                opacity 0.2s ease;
        }


        .delete-cancel-button {

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.12
                );

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.045
                );

            color:
                #bdbdbd;
        }


        .delete-cancel-button:hover {

            color:
                #ffffff;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.08
                );

            border-color:
                rgba(
                    255,
                    255,
                    255,
                    0.2
                );

            transform:
                translateY(-2px);
        }


        .delete-cancel-button:active {

            transform:
                translateY(0)
                scale(0.98);
        }


        .delete-confirm-button {

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            gap:
                8px;

            border:
                1px solid
                rgba(
                    239,
                    68,
                    68,
                    0.5
                );

            background:
                linear-gradient(
                    135deg,
                    #dc2626,
                    #991b1b
                );

            color:
                #ffffff;

            box-shadow:
                0 8px 25px
                rgba(
                    220,
                    38,
                    38,
                    0.2
                );
        }


        .delete-confirm-button:hover {

            border-color:
                rgba(
                    248,
                    113,
                    113,
                    0.8
                );

            background:
                linear-gradient(
                    135deg,
                    #ef4444,
                    #b91c1c
                );

            box-shadow:
                0 12px 30px
                rgba(
                    220,
                    38,
                    38,
                    0.35
                );

            transform:
                translateY(-2px);
        }


        .delete-confirm-button:active {

            transform:
                translateY(0)
                scale(0.98);
        }


        .delete-confirm-button:disabled {

            cursor:
                not-allowed;

            opacity:
                0.7;

            transform:
                none;

            box-shadow:
                none;
        }


        .delete-button-icon {

            font-size:
                15px;
        }


        .delete-confirm-button.is-deleting {

            pointer-events:
                none;
        }


        .delete-confirm-button.is-deleting
        .delete-button-icon {

            animation:
                deleteButtonSpin
                0.8s
                linear
                infinite;
        }


        @keyframes deleteOverlayIn {

            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }


        @keyframes deleteCardIn {

            from {

                opacity: 0;

                transform:
                    translateY(25px)
                    scale(0.94);
            }

            to {

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);
            }
        }


        @keyframes deleteIconGlow {

            0%,
            100% {

                transform:
                    scale(0.9);

                opacity:
                    0.55;
            }

            50% {

                transform:
                    scale(1.12);

                opacity:
                    1;
            }
        }


        @keyframes deleteTrashFloat {

            0%,
            100% {

                transform:
                    translateY(0)
                    rotate(0deg);
            }

            50% {

                transform:
                    translateY(-4px)
                    rotate(-3deg);
            }
        }


        @keyframes deleteBikeIn {

            from {

                opacity: 0;

                transform:
                    translateX(-35px)
                    scale(0.8);
            }

            to {

                opacity: 0.9;

                transform:
                    translateX(0)
                    scale(1);
            }
        }


        @keyframes deleteTextIn {

            from {

                opacity: 0;

                transform:
                    translateY(8px);
            }

            to {

                opacity: 1;

                transform:
                    translateY(0);
            }
        }


        @keyframes deleteButtonSpin {

            from {
                transform:
                    rotate(0deg);
            }

            to {
                transform:
                    rotate(360deg);
            }
        }


        @media (
            max-width: 500px
        ) {

            .delete-confirmation-content {

                padding:
                    38px
                    20px
                    24px;
            }


            .delete-confirmation-content h2 {

                font-size:
                    23px;
            }


            .delete-confirmation-actions {

                flex-direction:
                    column;
            }


            .delete-cancel-button,
            .delete-confirm-button {

                width:
                    100%;
            }
        }
    `;


    document.head.appendChild(
        style
    );


    document.body.appendChild(
        overlay
    );


    const cancelButton =
        overlay.querySelector(
            "#deleteCancelButton"
        );


    const confirmButton =
        overlay.querySelector(
            "#deleteConfirmButton"
        );


    const closeButton =
        overlay.querySelector(
            ".delete-confirmation-close"
        );


    let isClosing =
        false;


    function closeDeleteConfirmation() {

        if (isClosing) {

            return;
        }

        isClosing = true;


        overlay.style.transition =
            "opacity 0.2s ease";

        overlay.style.opacity =
            "0";


        setTimeout(
            () => {

                overlay.remove();

                if (style.parentNode) {

                    style.remove();
                }

            },
            220
        );
    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeDeleteConfirmation
        );
    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeDeleteConfirmation
        );
    }


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                overlay
            ) {

                closeDeleteConfirmation();
            }
        }
    );


    const escapeHandler =
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeDeleteConfirmation();

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );
            }
        };


    document.addEventListener(
        "keydown",
        escapeHandler
    );


    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            async () => {

                if (
                    confirmButton.disabled
                ) {

                    return;
                }


                confirmButton.disabled =
                    true;


                confirmButton.classList.add(
                    "is-deleting"
                );


                confirmButton.innerHTML = `

                    <span
                        class="delete-button-icon"
                    >
                        ⟳
                    </span>

                    <span>
                        Deleting...
                    </span>
                `;


                /*
                   Prevent another Escape action
                   while deletion is processing.
                */

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );


                /*
                   Fade out the confirmation
                   modal before performing the
                   actual database deletion.
                */

                overlay.style.transition =
                    "opacity 0.25s ease";

                overlay.style.opacity =
                    "0";


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            250
                        )
                );


                if (overlay.parentNode) {

                    overlay.remove();
                }


                if (style.parentNode) {

                    style.remove();
                }


                await deleteMotorcycle(
                    id,
                    motorcycleName
                );
            }
        );
    }
}


/* =========================================
   DELETE MOTORCYCLE
========================================= */

async function deleteMotorcycle(
    id,
    motorcycleName
) {

    const motorcycleId =
        Number(id);


    const card =
        document.querySelector(
            `.motorcycle-card[data-motorcycle-id="${motorcycleId}"]`
        );


    try {

        const response =
            await fetch(
                `${API_BASE}/api/customer-motorcycles/${motorcycleId}`,
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            user_id:
                                currentUser.id
                        })
                }
            );


        const data =
            await response.json();


        console.log(
            "Delete motorcycle response:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to delete motorcycle."
            );
        }


        /*
           Remove the motorcycle from the
           local array so the state remains
           correct if the page is interacted
           with before redirect.
        */

        motorcycles =
            motorcycles.filter(
                motorcycle =>
                    Number(
                        motorcycle.id
                    ) !== motorcycleId
            );


        /*
           Show the same style of full-screen
           transition used by Add/Edit.
        */

        showDeleteTransition(
            "Motorcycle Deleted!",
            "Your motorcycle has been successfully removed."
        );


    } catch (error) {

        console.error(
            "Delete motorcycle error:",
            error
        );


        /*
           Restore the card if something
           failed before any transition.
        */

        if (card) {

            card.style.height = "";

            card.style.overflow = "";

            card.style.transition = "";

            card.style.opacity = "";

            card.style.transform = "";

            card.style.marginTop = "";

            card.style.marginBottom = "";

            card.style.paddingTop = "";

            card.style.paddingBottom = "";

            card.style.borderColor = "";
        }


        alert(
            error.message ||
            "Unable to delete motorcycle."
        );
    }
}


/* =========================================
   DELETE SUCCESS TRANSITION
========================================= */

function showDeleteTransition(
    title,
    message
) {

    /*
       Remove existing delete transition
       if one exists.
    */

    const existing =
        document.getElementById(
            "motorcycleDeleteTransition"
        );

    if (existing) {

        existing.remove();
    }


    const existingStyle =
        document.getElementById(
            "motorcycleDeleteTransitionStyle"
        );

    if (existingStyle) {

        existingStyle.remove();
    }


    /*
       Create full-screen overlay.
    */

    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "motorcycleDeleteTransition";


    overlay.innerHTML = `

        <div class="delete-success-content">

            <div class="delete-success-bike">
                🏍️
            </div>


            <div class="delete-success-icon">

                <div class="delete-success-trash">

                    <span
                        class="success-trash-lid"
                    >
                    </span>

                    <span
                        class="success-trash-body"
                    >
                    </span>

                    <span
                        class="success-trash-line success-line-one"
                    >
                    </span>

                    <span
                        class="success-trash-line success-line-two"
                    >
                    </span>

                    <span
                        class="success-trash-line success-line-three"
                    >
                    </span>

                </div>

            </div>


            <div class="delete-success-check-circle">

                <div class="delete-success-check">
                    ✓
                </div>

            </div>


            <h1>
                ${escapeHtml(title)}
            </h1>


            <p>
                ${escapeHtml(message)}
            </p>


            <div class="delete-success-loading">

                <span>
                    Returning to My Motorcycles
                </span>


                <div class="delete-success-progress">

                    <div
                        class="delete-success-progress-bar"
                    >
                    </div>

                </div>

            </div>

        </div>
    `;


    /*
       Create styles.
    */

    const style =
        document.createElement(
            "style"
        );


    style.id =
        "motorcycleDeleteTransitionStyle";


    style.textContent = `

        #motorcycleDeleteTransition {

            position: fixed;

            inset: 0;

            z-index: 999999;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                radial-gradient(
                    circle at center,
                    rgba(
                        127,
                        29,
                        29,
                        0.34
                    ),
                    rgba(
                        0,
                        0,
                        0,
                        0.99
                    ) 68%
                );

            backdrop-filter:
                blur(10px);

            -webkit-backdrop-filter:
                blur(10px);

            opacity: 0;

            animation:
                deleteSuccessFadeIn
                0.45s
                ease
                forwards;
        }


        .delete-success-content {

            width: min(
                90%,
                520px
            );

            padding:
                46px
                35px;

            text-align: center;

            border:
                1px solid
                rgba(
                    239,
                    68,
                    68,
                    0.3
                );

            border-radius:
                24px;

            background:
                linear-gradient(
                    145deg,
                    rgba(
                        20,
                        10,
                        10,
                        0.99
                    ),
                    rgba(
                        5,
                        5,
                        5,
                        0.99
                    )
                );

            box-shadow:
                0 30px 100px
                rgba(
                    0,
                    0,
                    0,
                    0.8
                ),
                0 0 70px
                rgba(
                    127,
                    29,
                    29,
                    0.16
                );

            transform:
                translateY(25px)
                scale(0.94);

            animation:
                deleteSuccessCardIn
                0.6s
                cubic-bezier(
                    0.22,
                    1,
                    0.36,
                    1
                )
                0.08s
                forwards;
        }


        .delete-success-bike {

            font-size:
                56px;

            margin-bottom:
                8px;

            opacity:
                0;

            filter:
                drop-shadow(
                    0 0 15px
                    rgba(
                        239,
                        68,
                        68,
                        0.55
                    )
                );

            animation:
                deleteSuccessBikeRide
                0.8s
                ease-out
                0.15s
                forwards;
        }


        .delete-success-icon {

            position:
                relative;

            width:
                76px;

            height:
                76px;

            margin:
                0 auto 14px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                50%;

            background:
                rgba(
                    127,
                    29,
                    29,
                    0.18
                );

            border:
                1px solid
                rgba(
                    239,
                    68,
                    68,
                    0.25
                );

            opacity:
                0;

            transform:
                scale(0.65);

            animation:
                deleteIconAppear
                0.55s
                cubic-bezier(
                    0.34,
                    1.56,
                    0.64,
                    1
                )
                0.45s
                forwards;
        }


        .delete-success-icon::before {

            content:
                "";

            position:
                absolute;

            inset:
                -9px;

            border-radius:
                50%;

            border:
                1px solid
                rgba(
                    239,
                    68,
                    68,
                    0.18
                );

            animation:
                deleteSuccessRing
                1.8s
                ease-out
                1s
                infinite;
        }


        .delete-success-trash {

            position:
                relative;

            width:
                40px;

            height:
                46px;

            filter:
                drop-shadow(
                    0 0 10px
                    rgba(
                        239,
                        68,
                        68,
                        0.65
                    )
                );

            animation:
                deleteTrashSuccessFloat
                2s
                ease-in-out
                1.1s
                infinite;
        }


        .success-trash-lid {

            position:
                absolute;

            top:
                3px;

            left:
                1px;

            width:
                38px;

            height:
                6px;

            border-radius:
                4px;

            background:
                #ef4444;
        }


        .success-trash-lid::before {

            content:
                "";

            position:
                absolute;

            top:
                -5px;

            left:
                11px;

            width:
                16px;

            height:
                5px;

            border-radius:
                4px 4px 0 0;

            background:
                #f87171;
        }


        .success-trash-body {

            position:
                absolute;

            top:
                12px;

            left:
                6px;

            width:
                28px;

            height:
                32px;

            border-radius:
                2px 2px 7px 7px;

            background:
                linear-gradient(
                    180deg,
                    #ef4444,
                    #991b1b
                );

            clip-path:
                polygon(
                    4% 0,
                    96% 0,
                    88% 100%,
                    12% 100%
                );
        }


        .success-trash-line {

            position:
                absolute;

            z-index:
                3;

            top:
                18px;

            width:
                2px;

            height:
                21px;

            border-radius:
                3px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.55
                );
        }


        .success-line-one {
            left:
                13px;
        }


        .success-line-two {
            left:
                19px;
        }


        .success-line-three {
            left:
                25px;
        }


        .delete-success-check-circle {

            width:
                88px;

            height:
                88px;

            margin:
                -3px auto 21px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                50%;

            border:
                2px solid
                rgba(
                    239,
                    68,
                    68,
                    0.7
                );

            background:
                rgba(
                    127,
                    29,
                    29,
                    0.12
                );

            box-shadow:
                0 0 0 0
                rgba(
                    239,
                    68,
                    68,
                    0.35
                );

            transform:
                scale(0);

            opacity:
                0;

            animation:
                deleteCheckCircleIn
                0.65s
                cubic-bezier(
                    0.34,
                    1.56,
                    0.64,
                    1
                )
                0.65s
                forwards,

                deleteCheckGlow
                2s
                ease-in-out
                1.4s
                infinite;
        }


        .delete-success-check {

            color:
                #ffffff;

            font-size:
                46px;

            font-weight:
                800;

            line-height:
                1;

            opacity:
                0;

            transform:
                scale(0.5)
                rotate(-15deg);

            animation:
                deleteCheckIn
                0.45s
                ease-out
                1.05s
                forwards;
        }


        .delete-success-content h1 {

            margin:
                0 0 12px;

            color:
                #ffffff;

            font-size:
                30px;

            font-weight:
                800;

            letter-spacing:
                -0.5px;

            opacity:
                0;

            transform:
                translateY(10px);

            animation:
                deleteSuccessTextIn
                0.45s
                ease
                1.15s
                forwards;
        }


        .delete-success-content p {

            margin:
                0 auto;

            max-width:
                400px;

            color:
                #a3a3a3;

            font-size:
                15px;

            line-height:
                1.6;

            opacity:
                0;

            transform:
                translateY(10px);

            animation:
                deleteSuccessTextIn
                0.45s
                ease
                1.25s
                forwards;
        }


        .delete-success-loading {

            margin-top:
                30px;

            opacity:
                0;

            animation:
                deleteSuccessTextIn
                0.45s
                ease
                1.4s
                forwards;
        }


        .delete-success-loading span {

            display:
                block;

            margin-bottom:
                10px;

            color:
                #737373;

            font-size:
                12px;

            letter-spacing:
                0.4px;
        }


        .delete-success-progress {

            width:
                100%;

            height:
                4px;

            overflow:
                hidden;

            border-radius:
                10px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.08
                );
        }


        .delete-success-progress-bar {

            width:
                0%;

            height:
                100%;

            border-radius:
                10px;

            background:
                #ef4444;

            box-shadow:
                0 0 12px
                rgba(
                    239,
                    68,
                    68,
                    0.8
                );

            animation:
                deleteSuccessProgress
                2.2s
                linear
                0.35s
                forwards;
        }


        @keyframes deleteSuccessFadeIn {

            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }


        @keyframes deleteSuccessCardIn {

            from {

                opacity: 0;

                transform:
                    translateY(25px)
                    scale(0.94);
            }

            to {

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);
            }
        }


        @keyframes deleteSuccessBikeRide {

            0% {

                opacity: 0;

                transform:
                    translateX(-90px)
                    rotate(-5deg);
            }

            70% {

                opacity: 1;

                transform:
                    translateX(10px)
                    rotate(2deg);
            }

            100% {

                opacity: 1;

                transform:
                    translateX(0)
                    rotate(0);
            }
        }


        @keyframes deleteIconAppear {

            from {

                opacity: 0;

                transform:
                    scale(0.65)
                    rotate(-10deg);
            }

            to {

                opacity: 1;

                transform:
                    scale(1)
                    rotate(0);
            }
        }


        @keyframes deleteSuccessRing {

            0% {

                transform:
                    scale(0.8);

                opacity:
                    0.8;
            }

            100% {

                transform:
                    scale(1.35);

                opacity:
                    0;
            }
        }


        @keyframes deleteTrashSuccessFloat {

            0%,
            100% {

                transform:
                    translateY(0)
                    rotate(0deg);
            }

            50% {

                transform:
                    translateY(-4px)
                    rotate(3deg);
            }
        }


        @keyframes deleteCheckCircleIn {

            from {

                opacity: 0;

                transform:
                    scale(0);
            }

            to {

                opacity: 1;

                transform:
                    scale(1);
            }
        }


        @keyframes deleteCheckIn {

            from {

                opacity: 0;

                transform:
                    scale(0.5)
                    rotate(-15deg);
            }

            to {

                opacity: 1;

                transform:
                    scale(1)
                    rotate(0);
            }
        }


        @keyframes deleteCheckGlow {

            0%,
            100% {

                box-shadow:
                    0 0 0 0
                    rgba(
                        239,
                        68,
                        68,
                        0.3
                    );
            }

            50% {

                box-shadow:
                    0 0 0 15px
                    rgba(
                        239,
                        68,
                        68,
                        0
                    );
            }
        }


        @keyframes deleteSuccessTextIn {

            from {

                opacity: 0;

                transform:
                    translateY(10px);
            }

            to {

                opacity: 1;

                transform:
                    translateY(0);
            }
        }


        @keyframes deleteSuccessProgress {

            from {
                width:
                    0%;
            }

            to {
                width:
                    100%;
            }
        }


        @media (
            max-width: 500px
        ) {

            .delete-success-content {

                padding:
                    40px 25px;
            }


            .delete-success-content h1 {

                font-size:
                    26px;
            }


            .delete-success-bike {

                font-size:
                    48px;
            }


            .delete-success-check-circle {

                width:
                    80px;

                height:
                    80px;
            }


            .delete-success-check {

                font-size:
                    42px;
            }
        }
    `;


    document.head.appendChild(
        style
    );


    document.body.appendChild(
        overlay
    );


    /*
       Redirect after the same duration
       as the existing Add/Edit transition.
    */

    setTimeout(
        () => {

            window.location.href =
                "motorcycles.html";

        },
        2700
    );
}


/* =========================================
   SHOW LOADING
========================================= */

function showLoading() {

    loadingState.classList.remove(
        "hidden"
    );


    emptyState.classList.add(
        "hidden"
    );


    motorcyclesGrid.innerHTML =
        "";
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================
   GLOBAL FUNCTIONS
========================================= */

window.openEditModal =
    openEditModal;

window.handleDeleteClick =
    handleDeleteClick;

window.loadMotorcycles =
    loadMotorcycles;

window.openAddModal =
    openAddModal;

window.closeModal =
    closeModal;