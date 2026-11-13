/* =========================================
   ADD MOTOR SHOP - REAL BOOKING SYSTEM
========================================= */

const user =
    JSON.parse(localStorage.getItem("user")) || null;

let motorcycles = [];

let motorcycleData = {
    id: null,
    name: "No motorcycle selected",
    plate: "",
    year: "",
    color: ""
};

let services = [];

let isSubmitting = false;


/* =========================================
   INITIALIZE PAGE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeMotorcycleSelector();

        initializeCalendar();

        initializeSummaryListeners();

        initializeConfirmButton();

        if (!user) {

            alert(
                "Please log in first to book a service appointment."
            );

            window.location.href = "login.html";

            return;
        }


        const userId =
            user.id ||
            user.user_id ||
            user.userId;


        if (!userId) {

            alert(
                "Your account information is incomplete. Please log in again."
            );

            localStorage.removeItem("user");
            localStorage.removeItem("userId");
            localStorage.removeItem("addMotorUser");
            localStorage.removeItem("token");

            window.location.href = "login.html";

            return;
        }


        await Promise.all([
            loadMotorcycles(userId),
            loadServices()
        ]);


        updateSummary();
    }
);


/* =========================================
   SUMMARY LISTENERS
========================================= */

function initializeSummaryListeners() {

    const dateInput =
        document.getElementById(
            "appointmentDate"
        );

    const timeInput =
        document.getElementById(
            "appointmentTime"
        );

    const notesInput =
        document.getElementById(
            "notes"
        );


    if (dateInput) {

        dateInput.addEventListener(
            "input",
            updateSummary
        );

        dateInput.addEventListener(
            "change",
            updateSummary
        );
    }


    if (timeInput) {

        timeInput.addEventListener(
            "input",
            updateSummary
        );

        timeInput.addEventListener(
            "change",
            updateSummary
        );
    }


    if (notesInput) {

        notesInput.addEventListener(
            "input",
            updateSummary
        );

        notesInput.addEventListener(
            "change",
            updateSummary
        );
    }
}


/* =========================================
   CONFIRM BUTTON INITIALIZATION
========================================= */

function initializeConfirmButton() {

    const button =
        document.querySelector(
            '.btn-primary[onclick="confirmBooking()"]'
        );


    if (!button) {
        return;
    }


    window.confirmBooking =
        confirmBooking;


    button.type =
        "button";


    button.disabled =
        false;


    button.style.pointerEvents =
        "auto";


    button.style.cursor =
        "pointer";
}


/* =========================================
   CALENDAR INITIALIZATION
========================================= */

function initializeCalendar() {

    const dateInput =
        document.getElementById(
            "appointmentDate"
        );


    if (!dateInput) {
        return;
    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    const todayString =
        `${year}-${month}-${day}`;


    dateInput.min =
        todayString;


    dateInput.type =
        "date";


    dateInput.addEventListener(
        "change",
        () => {

            if (!dateInput.value) {

                updateSummary();

                return;
            }


            const selectedDate =
                new Date(
                    dateInput.value +
                    "T00:00:00"
                );


            if (
                selectedDate.getDay() === 0
            ) {

                alert(
                    "The shop is closed on Sundays. Please choose Monday to Saturday."
                );

                dateInput.value = "";
            }


            updateSummary();
        }
    );
}


/* =========================================
   LOAD CUSTOMER MOTORCYCLES
========================================= */

async function loadMotorcycles(userId) {

    try {

        const response =
            await fetch(
                `/api/customer-motorcycles/${userId}`
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            !contentType.includes(
                "application/json"
            )
        ) {

            throw new Error(
                `Motorcycle request failed with status ${response.status}.`
            );
        }


        const data =
            await response.json();


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


        if (
            motorcycles.length === 0
        ) {

            motorcycleData = {
                id: null,
                name: "No motorcycle registered",
                plate: "",
                year: "",
                color: ""
            };


            updateMotorcycleDisplay();

            updateSummary();

            return;
        }


        const primaryMotorcycle =
            motorcycles.find(
                motorcycle =>
                    Number(
                        motorcycle.is_primary
                    ) === 1
            );


        const selectedMotorcycle =
            primaryMotorcycle ||
            motorcycles[0];


        motorcycleData =
            normalizeMotorcycle(
                selectedMotorcycle
            );


        updateMotorcycleDisplay();

        updateSummary();

    } catch (error) {

        console.error(
            "Motorcycle loading error:",
            error
        );


        alert(
            error.message ||
            "Unable to load your motorcycles. Please make sure you have registered a motorcycle."
        );
    }
}


/* =========================================
   NORMALIZE MOTORCYCLE
========================================= */

function normalizeMotorcycle(
    motorcycle
) {

    const brand =
        motorcycle.brand ||
        "";


    const model =
        motorcycle.model ||
        "";


    const name =
        `${brand} ${model}`
            .trim() ||
        "Motorcycle";


    return {

        id:
            motorcycle.id,

        name:
            name,

        plate:
            motorcycle.plate_number ||
            "No plate number",

        year:
            motorcycle.year ||
            "",

        color:
            motorcycle.color ||
            "",

        brand:
            brand,

        model:
            model,

        engine_cc:
            motorcycle.engine_cc ||
            "",

        is_primary:
            Number(
                motorcycle.is_primary
            ) === 1

    };
}


/* =========================================
   UPDATE MOTORCYCLE DISPLAY
========================================= */

function updateMotorcycleDisplay() {

    const selectedBike =
        document.getElementById(
            "selectedBike"
        );


    const selectedBikeDetails =
        document.getElementById(
            "selectedBikeDetails"
        );


    const summaryBike =
        document.getElementById(
            "summaryBike"
        );


    if (selectedBike) {

        selectedBike.textContent =
            motorcycleData.name;
    }


    const details = [

        motorcycleData.plate,

        motorcycleData.year,

        motorcycleData.color

    ]
        .filter(Boolean)
        .join(" • ");


    if (selectedBikeDetails) {

        selectedBikeDetails.textContent =
            details ||
            "No motorcycle details available";
    }


    if (summaryBike) {

        summaryBike.textContent =
            motorcycleData.name;
    }
}


/* =========================================
   MOTORCYCLE SELECTOR UI
========================================= */

function initializeMotorcycleSelector() {

    if (
        document.getElementById(
            "motorcycleSelectorModal"
        )
    ) {
        return;
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "motorcycleSelectorModal";


    modal.className =
        "motorcycle-selector-modal";


    modal.innerHTML = `

        <div class="motorcycle-selector-overlay"></div>

        <div class="motorcycle-selector-dialog">

            <div class="motorcycle-selector-header">

                <div>

                    <div class="motorcycle-selector-eyebrow">
                        YOUR GARAGE
                    </div>

                    <h2>
                        Choose Motorcycle
                    </h2>

                    <p>
                        Select the motorcycle you want to use for this service appointment.
                    </p>

                </div>

                <button
                    type="button"
                    class="motorcycle-selector-close"
                    onclick="closeMotorcycleSelector()"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div
                class="motorcycle-selector-list"
                id="motorcycleSelectorList"
            >
            </div>


            <div class="motorcycle-selector-footer">

                <span>
                    You can manage your motorcycles from the Motorcycles page.
                </span>

                <a
                    href="motorcycles.html"
                    class="manage-motorcycles-link"
                >
                    Manage Motorcycles
                </a>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "motorcycle-selector-styles";


    style.textContent = `

        .change-bike {
            margin-left: auto;
            padding: 9px 15px;
            color: #fecaca;
            background: rgba(220, 38, 38, 0.08);
            border: 1px solid rgba(220, 38, 38, 0.28);
            border-radius: 7px;
            cursor: pointer;
            font-size: 0.75rem;
            font-weight: 600;
            transition:
                background 0.2s ease,
                border-color 0.2s ease,
                color 0.2s ease,
                transform 0.2s ease;
        }

        .change-bike:hover {
            color: white;
            background: rgba(220, 38, 38, 0.18);
            border-color: rgba(239, 68, 68, 0.65);
            transform: translateY(-1px);
        }

        .change-bike:active {
            transform: translateY(0);
        }

        .motorcycle-selector-modal {
            position: fixed;
            inset: 0;
            z-index: 4000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .motorcycle-selector-modal.show {
            display: flex;
        }

        .motorcycle-selector-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.82);
            backdrop-filter: blur(5px);
        }

        .motorcycle-selector-dialog {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 620px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background:
                linear-gradient(
                    145deg,
                    #181818,
                    #0a0a0a
                );
            border: 1px solid #3a2020;
            border-radius: 15px;
            box-shadow:
                0 30px 90px rgba(0, 0, 0, 0.75),
                0 0 35px rgba(220, 38, 38, 0.08);
            animation:
                motorcycleModalIn
                0.2s ease-out;
        }

        @keyframes motorcycleModalIn {

            from {
                opacity: 0;
                transform:
                    translateY(12px)
                    scale(0.98);
            }

            to {
                opacity: 1;
                transform:
                    translateY(0)
                    scale(1);
            }
        }

        .motorcycle-selector-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            padding: 23px 25px;
            border-bottom: 1px solid #292929;
        }

        .motorcycle-selector-eyebrow {
            margin-bottom: 6px;
            color: #ef4444;
            font-size: 0.62rem;
            font-weight: 700;
            letter-spacing: 1.5px;
        }

        .motorcycle-selector-header h2 {
            margin: 0 0 6px;
            color: #f5f5f5;
            font-size: 1.25rem;
        }

        .motorcycle-selector-header p {
            margin: 0;
            max-width: 470px;
            color: #8f8f8f;
            font-size: 0.76rem;
            line-height: 1.5;
        }

        .motorcycle-selector-close {
            flex: 0 0 auto;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8f8f8f;
            background: #101010;
            border: 1px solid #292929;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.35rem;
            line-height: 1;
        }

        .motorcycle-selector-list {
            padding: 18px 20px;
            overflow-y: auto;
        }

        .motorcycle-choice {
            position: relative;
            display: flex;
            align-items: center;
            gap: 15px;
            width: 100%;
            margin-bottom: 10px;
            padding: 15px;
            text-align: left;
            color: white;
            background: #0d0d0d;
            border: 1px solid #292929;
            border-radius: 11px;
            cursor: pointer;
        }

        .motorcycle-choice:last-child {
            margin-bottom: 0;
        }

        .motorcycle-choice:hover {
            background: #141414;
            border-color: #5a2929;
        }

        .motorcycle-choice.selected {
            background:
                linear-gradient(
                    135deg,
                    rgba(220, 38, 38, 0.13),
                    rgba(220, 38, 38, 0.035)
                );
            border-color: rgba(239, 68, 68, 0.75);
        }

        .motorcycle-choice-icon {
            flex: 0 0 auto;
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
                rgba(220, 38, 38, 0.10);
            border:
                1px solid rgba(220, 38, 38, 0.25);
            border-radius: 10px;
            font-size: 1.75rem;
        }

        .motorcycle-choice-info {
            min-width: 0;
            flex: 1;
        }

        .motorcycle-choice-name {
            display: block;
            margin-bottom: 5px;
            color: #f5f5f5;
            font-size: 0.9rem;
            font-weight: 700;
        }

        .motorcycle-choice-details {
            display: flex;
            flex-wrap: wrap;
            gap: 5px 9px;
            color: #929292;
            font-size: 0.7rem;
            line-height: 1.5;
        }

        .motorcycle-detail-item {
            display: inline-flex;
            align-items: center;
        }

        .motorcycle-detail-item + .motorcycle-detail-item::before {
            content: "•";
            margin-right: 9px;
            color: #4d4d4d;
        }

        .motorcycle-choice-action {
            flex: 0 0 auto;
        }

        .motorcycle-select-button {
            padding: 8px 13px;
            color: #a3a3a3;
            background: #151515;
            border: 1px solid #303030;
            border-radius: 7px;
            font-size: 0.7rem;
            font-weight: 600;
            cursor: pointer;
        }

        .motorcycle-select-button:hover {
            color: white;
            background: #202020;
            border-color: #4b3030;
        }

        .motorcycle-choice.selected
        .motorcycle-select-button {
            color: white;
            background: #dc2626;
            border-color: #dc2626;
        }

        .motorcycle-primary-badge {
            display: inline-flex;
            align-items: center;
            margin-left: 7px;
            padding: 3px 7px;
            color: #fecaca;
            background: rgba(220, 38, 38, 0.10);
            border: 1px solid rgba(220, 38, 38, 0.22);
            border-radius: 5px;
            font-size: 0.56rem;
            font-weight: 700;
        }

        .motorcycle-empty-selector {
            padding: 30px 20px;
            text-align: center;
            color: #888;
        }

        .motorcycle-empty-selector-icon {
            margin-bottom: 10px;
            font-size: 2.2rem;
        }

        .motorcycle-empty-selector h3 {
            margin-bottom: 7px;
            color: #ddd;
            font-size: 0.95rem;
        }

        .motorcycle-empty-selector p {
            margin-bottom: 17px;
            color: #777;
            font-size: 0.72rem;
            line-height: 1.5;
        }

        .motorcycle-empty-selector a {
            display: inline-block;
            padding: 9px 14px;
            color: white;
            background: #dc2626;
            border-radius: 7px;
            text-decoration: none;
            font-size: 0.72rem;
            font-weight: 600;
        }

        .motorcycle-selector-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 14px 20px;
            color: #686868;
            background: #0b0b0b;
            border-top: 1px solid #242424;
            font-size: 0.65rem;
        }

        .manage-motorcycles-link {
            color: #fca5a5;
            text-decoration: none;
            font-weight: 600;
        }

        .manage-motorcycles-link:hover {
            color: white;
            text-decoration: underline;
        }

        @media (max-width: 600px) {

            .motorcycle-selector-modal {
                padding: 12px;
            }

            .motorcycle-selector-dialog {
                max-height: 94vh;
            }

            .motorcycle-selector-header {
                padding: 20px;
            }

            .motorcycle-selector-list {
                padding: 15px;
            }

            .motorcycle-choice {
                align-items: flex-start;
                padding: 13px;
            }

            .motorcycle-choice-icon {
                width: 45px;
                height: 45px;
                font-size: 1.5rem;
            }

            .motorcycle-choice-action {
                align-self: center;
            }

            .motorcycle-selector-footer {
                align-items: flex-start;
                flex-direction: column;
            }
        }

        @media (max-width: 430px) {

            .motorcycle-choice-details {
                display: block;
            }

            .motorcycle-detail-item {
                display: block;
                margin-bottom: 2px;
            }

            .motorcycle-detail-item + .motorcycle-detail-item::before {
                display: none;
            }

            .motorcycle-select-button {
                padding: 7px 10px;
            }
        }
    `;


    document.head.appendChild(
        style
    );


    const overlay =
        modal.querySelector(
            ".motorcycle-selector-overlay"
        );


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMotorcycleSelector
        );
    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeMotorcycleSelector();
            }
        }
    );
}


/* =========================================
   OPEN MOTORCYCLE SELECTOR
========================================= */

function changeMotorcycle() {

    if (
        motorcycles.length === 0
    ) {

        alert(
            "You do not have a registered motorcycle. Please add one first from the Motorcycles page."
        );

        return;
    }


    renderMotorcycleSelector();


    const modal =
        document.getElementById(
            "motorcycleSelectorModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

        document.body.style.overflow =
            "hidden";
    }
}


/* =========================================
   RENDER MOTORCYCLE SELECTOR
========================================= */

function renderMotorcycleSelector() {

    const list =
        document.getElementById(
            "motorcycleSelectorList"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        "";


    if (
        motorcycles.length === 0
    ) {

        list.innerHTML = `

            <div class="motorcycle-empty-selector">

                <div class="motorcycle-empty-selector-icon">
                    🏍️
                </div>

                <h3>
                    No Motorcycles Registered
                </h3>

                <p>
                    Add a motorcycle first before booking a service appointment.
                </p>

                <a href="motorcycles.html">
                    Add Motorcycle
                </a>

            </div>
        `;

        return;
    }


    motorcycles.forEach(
        motorcycle => {

            const normalized =
                normalizeMotorcycle(
                    motorcycle
                );


            const isSelected =
                Number(
                    normalized.id
                ) ===
                Number(
                    motorcycleData.id
                );


            const choice =
                document.createElement(
                    "button"
                );


            choice.type =
                "button";


            choice.className =
                "motorcycle-choice" +
                (
                    isSelected
                        ? " selected"
                        : ""
                );


            const primaryBadge =
                normalized.is_primary
                    ? `
                        <span class="motorcycle-primary-badge">
                            Primary
                        </span>
                    `
                    : "";


            const detailItems = [];


            if (
                normalized.plate
            ) {

                detailItems.push(
                    `
                        <span class="motorcycle-detail-item">
                            ${escapeHtml(
                                normalized.plate
                            )}
                        </span>
                    `
                );
            }


            if (
                normalized.year
            ) {

                detailItems.push(
                    `
                        <span class="motorcycle-detail-item">
                            ${escapeHtml(
                                normalized.year
                            )}
                        </span>
                    `
                );
            }


            if (
                normalized.color
            ) {

                detailItems.push(
                    `
                        <span class="motorcycle-detail-item">
                            ${escapeHtml(
                                normalized.color
                            )}
                        </span>
                    `
                );
            }


            if (
                normalized.engine_cc
            ) {

                detailItems.push(
                    `
                        <span class="motorcycle-detail-item">
                            ${escapeHtml(
                                normalized.engine_cc
                            )}cc
                        </span>
                    `
                );
            }


            choice.innerHTML = `

                <span class="motorcycle-choice-icon">
                    🏍️
                </span>

                <span class="motorcycle-choice-info">

                    <span class="motorcycle-choice-name">

                        ${escapeHtml(
                            normalized.name
                        )}

                        ${primaryBadge}

                    </span>

                    <span class="motorcycle-choice-details">

                        ${
                            detailItems.length
                                ? detailItems.join("")
                                : `
                                    <span class="motorcycle-detail-item">
                                        No additional details
                                    </span>
                                `
                        }

                    </span>

                </span>

                <span class="motorcycle-choice-action">

                    <span class="motorcycle-select-button">

                        ${
                            isSelected
                                ? "Selected"
                                : "Select"
                        }

                    </span>

                </span>
            `;


            choice.addEventListener(
                "click",
                () => {

                    selectMotorcycle(
                        motorcycle.id
                    );
                }
            );


            list.appendChild(
                choice
            );
        }
    );
}


/* =========================================
   SELECT MOTORCYCLE
========================================= */

function selectMotorcycle(
    motorcycleId
) {

    const selectedMotorcycle =
        motorcycles.find(
            motorcycle =>
                Number(
                    motorcycle.id
                ) ===
                Number(
                    motorcycleId
                )
        );


    if (
        !selectedMotorcycle
    ) {

        alert(
            "Unable to select this motorcycle."
        );

        return;
    }


    motorcycleData =
        normalizeMotorcycle(
            selectedMotorcycle
        );


    updateMotorcycleDisplay();

    updateSummary();

    closeMotorcycleSelector();
}


/* =========================================
   CLOSE MOTORCYCLE SELECTOR
========================================= */

function closeMotorcycleSelector() {

    const modal =
        document.getElementById(
            "motorcycleSelectorModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );
    }


    document.body.style.overflow =
        "";
}


/* =========================================
   LOAD SERVICES FROM DATABASE
========================================= */

async function loadServices() {

    const serviceGrid =
        document.querySelector(
            ".service-grid"
        );


    if (!serviceGrid) {
        return;
    }


    serviceGrid.innerHTML = `

        <div
            style="
                grid-column: 1 / -1;
                padding: 20px;
                text-align: center;
                color: #a3a3a3;
            "
        >
            Loading available services...
        </div>
    `;


    try {

        const response =
            await fetch(
                "/api/services"
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            !contentType.includes(
                "application/json"
            )
        ) {

            throw new Error(
                `Services request failed with status ${response.status}.`
            );
        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load services."
            );
        }


        services =
            Array.isArray(
                data.services
            )
                ? data.services.filter(
                    service =>
                        String(
                            service.status
                        ).toLowerCase() ===
                        "available"
                )
                : [];


        renderServices();

        updateSummary();

    } catch (error) {

        console.error(
            "Service loading error:",
            error
        );


        serviceGrid.innerHTML = `

            <div
                style="
                    grid-column: 1 / -1;
                    padding: 20px;
                    text-align: center;
                    color: #fca5a5;
                "
            >
                Unable to load services. Please refresh the page.
            </div>
        `;
    }
}


/* =========================================
   RENDER SERVICES
========================================= */

function renderServices() {

    const serviceGrid =
        document.querySelector(
            ".service-grid"
        );


    if (!serviceGrid) {
        return;
    }


    serviceGrid.innerHTML =
        "";


    if (
        services.length === 0
    ) {

        serviceGrid.innerHTML = `

            <div
                style="
                    grid-column: 1 / -1;
                    padding: 20px;
                    text-align: center;
                    color: #a3a3a3;
                "
            >
                No services are currently available.
            </div>
        `;

        return;
    }


    services.forEach(
        service => {

            const option =
                document.createElement(
                    "div"
                );


            option.className =
                "service-option";


            option.innerHTML = `

                <input
                    type="checkbox"
                    id="service-${service.id}"
                    value="${escapeHtml(
                        service.name
                    )}"
                    data-service-id="${service.id}"
                    data-price="${Number(
                        service.price
                    ) || 0}"
                    onchange="updateSummary()"
                >

                <label
                    for="service-${service.id}"
                    class="service-label"
                >

                    <span class="service-name">
                        ${escapeHtml(
                            service.name
                        )}
                    </span>

                    <span class="service-description">
                        ${escapeHtml(
                            service.description ||
                            "Motorcycle service"
                        )}
                    </span>

                    <span class="service-price">
                        ₱${Number(
                            service.price || 0
                        ).toLocaleString()}
                    </span>

                </label>

                <span class="check-mark">
                    ✓
                </span>
            `;


            serviceGrid.appendChild(
                option
            );
        }
    );


    /*
       Make sure dynamically-created
       service checkboxes immediately
       update the summary.
    */

    const checkboxes =
        serviceGrid.querySelectorAll(
            'input[type="checkbox"]'
        );


    checkboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                updateSummary
            );
        }
    );
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
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
   UPDATE SUMMARY
========================================= */

function updateSummary() {

    const selectedServices =
        document.querySelectorAll(
            ".service-option input:checked"
        );


    const summaryServices =
        document.getElementById(
            "summaryServices"
        );


    const summaryTotal =
        document.getElementById(
            "summaryTotal"
        );


    if (
        !summaryServices ||
        !summaryTotal
    ) {
        return;
    }


    summaryServices.innerHTML =
        "";


    let total =
        0;


    if (
        selectedServices.length === 0
    ) {

        summaryServices.innerHTML = `

            <li class="summary-empty">
                No services selected yet.
            </li>
        `;

    } else {

        selectedServices.forEach(
            service => {

                const price =
                    Number(
                        service.dataset.price
                    ) || 0;


                total +=
                    price;


                const li =
                    document.createElement(
                        "li"
                    );


                li.innerHTML = `

                    <span>
                        ${escapeHtml(
                            service.value
                        )}
                    </span>

                    <span>
                        ₱${price.toLocaleString()}
                    </span>
                `;


                summaryServices.appendChild(
                    li
                );
            }
        );
    }


    summaryTotal.textContent =
        "₱" +
        total.toLocaleString();


    updateSchedule();


    updateSummaryMotorcycle();
}


/* =========================================
   UPDATE SUMMARY MOTORCYCLE
========================================= */

function updateSummaryMotorcycle() {

    const summaryBike =
        document.getElementById(
            "summaryBike"
        );


    if (!summaryBike) {
        return;
    }


    summaryBike.textContent =
        motorcycleData.name ||
        "No motorcycle selected";
}


/* =========================================
   UPDATE SCHEDULE
========================================= */

function updateSchedule() {

    const dateInput =
        document.getElementById(
            "appointmentDate"
        );


    const timeInput =
        document.getElementById(
            "appointmentTime"
        );


    const summarySchedule =
        document.getElementById(
            "summarySchedule"
        );


    if (
        !dateInput ||
        !timeInput ||
        !summarySchedule
    ) {
        return;
    }


    const date =
        dateInput.value;


    const time =
        timeInput.value;


    if (
        !date &&
        !time
    ) {

        summarySchedule.textContent =
            "No schedule selected.";

        return;
    }


    let formattedDate =
        "Date not selected";


    if (date) {

        const selectedDate =
            new Date(
                date +
                "T00:00:00"
            );


        if (
            !Number.isNaN(
                selectedDate.getTime()
            )
        ) {

            formattedDate =
                selectedDate.toLocaleDateString(
                    "en-US",
                    {
                        month:
                            "long",

                        day:
                            "numeric",

                        year:
                            "numeric"
                    }
                );
        }
    }


    let formattedTime =
        "";


    if (
        time &&
        /^\d{2}:\d{2}$/.test(
            time
        )
    ) {

        const [
            hourString,
            minute
        ] =
            time.split(
                ":"
            );


        let hour =
            Number(
                hourString
            );


        const period =
            hour >= 12
                ? "PM"
                : "AM";


        hour =
            hour % 12 ||
            12;


        formattedTime =
            `${hour}:${minute} ${period}`;
    }


    if (
        date &&
        formattedTime
    ) {

        summarySchedule.textContent =
            `${formattedDate} • ${formattedTime}`;

    } else if (date) {

        summarySchedule.textContent =
            formattedDate;

    } else if (formattedTime) {

        summarySchedule.textContent =
            formattedTime;

    } else {

        summarySchedule.textContent =
            "No schedule selected.";
    }
}


/* =========================================
   CONFIRM BOOKING
========================================= */

async function confirmBooking() {

    if (
        isSubmitting
    ) {
        return;
    }


    const selectedServices =
        Array.from(
            document.querySelectorAll(
                ".service-option input:checked"
            )
        );


    const dateInput =
        document.getElementById(
            "appointmentDate"
        );


    const timeInput =
        document.getElementById(
            "appointmentTime"
        );


    const notesInput =
        document.getElementById(
            "notes"
        );


    const date =
        dateInput
            ? dateInput.value
            : "";


    const time =
        timeInput
            ? timeInput.value
            : "";


    const notes =
        notesInput
            ? notesInput.value.trim()
            : "";


    const userId =
        user &&
        (
            user.id ||
            user.user_id ||
            user.userId
        );


    if (!userId) {

        alert(
            "Please log in again before booking."
        );

        window.location.href =
            "login.html";

        return;
    }


    if (
        !motorcycleData.id
    ) {

        alert(
            "Please register and select a motorcycle first."
        );

        return;
    }


    if (
        selectedServices.length === 0
    ) {

        alert(
            "Please select at least one service."
        );

        return;
    }


    if (!date) {

        alert(
            "Please select your preferred appointment date."
        );

        return;
    }


    const selectedDate =
        new Date(
            date +
            "T00:00:00"
        );


    if (
        selectedDate.getDay() === 0
    ) {

        alert(
            "The shop is closed on Sundays. Please choose Monday to Saturday."
        );

        return;
    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    if (
        selectedDate <
        today
    ) {

        alert(
            "Please choose today or a future date."
        );

        return;
    }


    if (!time) {

        alert(
            "Please select your preferred appointment time."
        );

        return;
    }


    if (
        !/^\d{2}:\d{2}$/.test(
            time
        )
    ) {

        alert(
            "Please select a valid appointment time."
        );

        return;
    }


    const [
        hour,
        minute
    ] =
        time
            .split(":")
            .map(
                Number
            );


    if (
        hour < 8 ||
        hour > 16 ||
        (
            hour === 16 &&
            minute > 0
        )
    ) {

        alert(
            "Please select a service time between 8:00 AM and 4:00 PM."
        );

        return;
    }


    const serviceIds =
        selectedServices
            .map(
                service =>
                    Number(
                        service.dataset.serviceId
                    )
            )
            .filter(
                id =>
                    Number.isInteger(
                        id
                    ) &&
                    id > 0
            );


    if (
        serviceIds.length !==
        selectedServices.length
    ) {

        alert(
            "One or more selected services are invalid. Please refresh the page and try again."
        );

        return;
    }


    const total =
        selectedServices.reduce(
            (
                sum,
                service
            ) =>
                sum +
                (
                    Number(
                        service.dataset.price
                    ) || 0
                ),
            0
        );


    const appointmentInformation = {

        user_id:
            Number(
                userId
            ),

        services:
            serviceIds,

        motorcycle_id:
            Number(
                motorcycleData.id
            ),

        reservation_date:
            date,

        reservation_time:
            time,

        notes:
            notes ||
            null
    };


    console.log(
        "Submitting appointment:",
        appointmentInformation
    );


    isSubmitting =
        true;


    const button =
        document.querySelector(
            '.btn-primary[onclick="confirmBooking()"]'
        );


    const originalButtonText =
        button
            ? button.textContent
            : "Confirm Service Appointment";


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Submitting...";

        button.style.opacity =
            "0.7";

        button.style.cursor =
            "not-allowed";
    }


    try {

        const response =
            await fetch(
                "/api/reservations",
                {
                    method:
                        "POST",

                    headers:
                        {
                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"
                        },

                    body:
                        JSON.stringify(
                            appointmentInformation
                        )
                }
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let data;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const serverText =
                await response.text();


            console.error(
                "Server returned non-JSON response:",
                serverText
            );


            throw new Error(
                `Server error (${response.status}). Please check the reservation API.`
            );
        }


        console.log(
            "Reservation response:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                data.error ||
                `Unable to submit the appointment. Server returned ${response.status}.`
            );
        }


        const reservation =
            data.reservation ||
            data;


        const appointmentNumber =
            reservation.appointment_number ||
            data.appointment_number ||
            (
                reservation.id
                    ? `APP-${selectedDate.getFullYear()}-${String(
                        reservation.id
                    ).padStart(
                        3,
                        "0"
                    )}`
                    : "APP-PENDING"
            );


        const numberElement =
            document.querySelector(
                ".appointment-number"
            );


        if (
            numberElement
        ) {

            numberElement.textContent =
                appointmentNumber;
        }


        const successText =
            document.querySelector(
                ".success-modal p"
            );


        if (
            successText
        ) {

            const finalTotal =
                Number(
                    reservation.total ??
                    data.total ??
                    total
                );


            successText.innerHTML =

                `
                    Your service appointment has been submitted successfully.
                    <br><br>
                    <strong>
                        Estimated Total: ₱${finalTotal.toLocaleString()}
                    </strong>
                    <br>
                    Please wait for ADD Motor Shop to confirm your schedule.
                `;
        }


        const successModal =
            document.getElementById(
                "successModal"
            );


        if (
            successModal
        ) {

            successModal.classList.add(
                "show"
            );
        }


    } catch (error) {

        console.error(
            "Booking submission error:",
            error
        );


        alert(
            error.message ||
            "Unable to submit appointment. Please try again."
        );

    } finally {

        isSubmitting =
            false;


        if (button) {

            button.disabled =
                false;

            button.textContent =
                originalButtonText;

            button.style.opacity =
                "1";

            button.style.cursor =
                "pointer";
        }
    }
}


/* =========================================
   GO TO APPOINTMENTS
========================================= */

function goToAppointments() {

    window.location.href =
        "appointments.html";
}


/* =========================================
   LOGOUT
========================================= */

document.addEventListener(
    "click",
    event => {

        const logoutLink =
            event.target.closest(
                'a[href="login.html"].logout'
            );


        if (!logoutLink) {
            return;
        }


        event.preventDefault();


        localStorage.removeItem(
            "user"
        );

        localStorage.removeItem(
            "userId"
        );

        localStorage.removeItem(
            "addMotorUser"
        );

        localStorage.removeItem(
            "token"
        );


        window.location.href =
            "login.html";
    }
);


/* =========================================
   GLOBAL FUNCTIONS
========================================= */

window.changeMotorcycle =
    changeMotorcycle;


window.closeMotorcycleSelector =
    closeMotorcycleSelector;


window.confirmBooking =
    confirmBooking;


window.goToAppointments =
    goToAppointments;


window.updateSummary =
    updateSummary;