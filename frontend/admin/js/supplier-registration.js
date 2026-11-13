
/* =========================================================
   ADD MOTOR SHOP — SUPPLIER REGISTRATION ENHANCEMENTS

   Preserves the existing suppliers.js save handler and
   product-linking workflow.

   Features:
   - Region, province, city/municipality, barangay dropdowns
   - Philippine PSGC API integration
   - Exactly 11 digits for mobile numbers beginning with 09
   - Review-and-confirm card before the existing save handler
   - Composed address stored in the existing supplierAddress field
   - No database migration required
========================================================= */

document.addEventListener("DOMContentLoaded", initializeSupplierRegistration);

function initializeSupplierRegistration() {
    const form = document.getElementById("supplierForm");
    const addressField = document.getElementById("supplierAddress");
    const phoneField = document.getElementById("supplierPhone");
    const modal = document.getElementById("supplierModal");

    if (!form || !addressField || !phoneField) {
        console.warn(
            "[Supplier Registration] Required supplier form fields were not found."
        );
        return;
    }

    const PSGC_API = "https://psgc.gitlab.io/api";

    let allowNextSubmit = false;
    let pendingSubmitter = null;
    let confirmationOverlay = null;
    let addressWasComposed = false;

    const originalAddress = addressField.value || "";

    /* -----------------------------------------------------
       STYLES
    ----------------------------------------------------- */

    const style = document.createElement("style");

    style.textContent = `
        .supplier-registration-address {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin: 0 0 15px;
        }

        .supplier-registration-address .supplier-location-field {
            min-width: 0;
        }

        .supplier-registration-address label {
            display: block;
            margin-bottom: 7px;
            color: var(--text, #202124);
            font-size: 11px;
            font-weight: 700;
        }

        .supplier-registration-address select,
        .supplier-registration-address input {
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
            height: 40px;
            padding: 0 11px;
            border: 1px solid var(--border, #d9dde3);
            border-radius: 7px;
            background: var(--card, #fff);
            color: var(--text, #202124);
            font: inherit;
            font-size: 12px;
        }

        .supplier-registration-address select:focus,
        .supplier-registration-address input:focus {
            outline: none;
            border-color: var(--red, #e63946);
            box-shadow: 0 0 0 3px rgba(230, 57, 70, .09);
        }

        .supplier-registration-address select:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .supplier-registration-address .supplier-location-full {
            grid-column: 1 / -1;
        }

        .supplier-registration-help {
            margin: 6px 0 0;
            color: var(--muted, #6b7280);
            font-size: 10px;
            line-height: 1.5;
        }

        .supplier-phone-help {
            display: block;
            margin-top: 5px;
            color: var(--muted, #6b7280);
            font-size: 10px;
            line-height: 1.5;
        }

        .supplier-registration-confirm-overlay {
            position: fixed;
            inset: 0;
            z-index: 10050;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(0, 0, 0, .58);
            backdrop-filter: blur(3px);
        }

        .supplier-registration-confirm-card {
            width: min(520px, 100%);
            max-height: calc(100vh - 36px);
            overflow-y: auto;
            border: 1px solid var(--border, #e0e0e0);
            border-radius: 14px;
            background: var(--card, #fff);
            color: var(--text, #202124);
            box-shadow: 0 24px 70px rgba(0, 0, 0, .24);
        }

        .supplier-registration-confirm-header {
            display: flex;
            align-items: flex-start;
            gap: 13px;
            padding: 22px 23px;
            border-bottom: 1px solid var(--border, #e5e7eb);
        }

        .supplier-registration-confirm-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 43px;
            width: 43px;
            height: 43px;
            border-radius: 11px;
            background: rgba(230, 57, 70, .11);
            color: var(--red, #e63946);
            font-size: 19px;
            font-weight: 800;
        }

        .supplier-registration-confirm-header h2 {
            margin: 1px 0 6px;
            font-size: 17px;
            font-weight: 800;
        }

        .supplier-registration-confirm-header p {
            margin: 0;
            color: var(--muted, #6b7280);
            font-size: 11px;
            line-height: 1.6;
        }

        .supplier-registration-confirm-body {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 17px;
            padding: 22px 23px;
        }

        .supplier-registration-confirm-item {
            min-width: 0;
        }

        .supplier-registration-confirm-item.full {
            grid-column: 1 / -1;
        }

        .supplier-registration-confirm-label {
            margin-bottom: 6px;
            color: var(--muted, #6b7280);
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .6px;
            text-transform: uppercase;
        }

        .supplier-registration-confirm-value {
            overflow-wrap: anywhere;
            white-space: pre-wrap;
            font-size: 12px;
            font-weight: 650;
            line-height: 1.6;
        }

        .supplier-registration-confirm-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            padding: 17px 23px 22px;
            border-top: 1px solid var(--border, #e5e7eb);
        }

        .supplier-registration-confirm-actions button {
            min-height: 39px;
            padding: 0 15px;
            border: 1px solid var(--border, #d1d5db);
            border-radius: 7px;
            background: var(--card, #fff);
            color: var(--text, #202124);
            font: inherit;
            font-size: 11px;
            font-weight: 750;
            cursor: pointer;
        }

        .supplier-registration-confirm-actions .confirm-save {
            border-color: var(--red, #e63946);
            background: var(--red, #e63946);
            color: #fff;
        }

        .supplier-registration-confirm-actions button:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .supplier-registration-error {
            margin-top: 7px;
            color: #dc2626;
            font-size: 11px;
            line-height: 1.5;
        }

        @media (max-width: 560px) {
            .supplier-registration-address,
            .supplier-registration-confirm-body {
                grid-template-columns: 1fr;
            }

            .supplier-registration-address .supplier-location-full,
            .supplier-registration-confirm-item.full {
                grid-column: auto;
            }

            .supplier-registration-confirm-actions {
                flex-direction: column-reverse;
            }

            .supplier-registration-confirm-actions button {
                width: 100%;
            }
        }

        body.dark-mode .supplier-registration-address select,
        body.dark-mode .supplier-registration-address input {
            background: var(--card, #1f1f1f);
            color: var(--text, #f5f5f5);
        }
    `;

    document.head.appendChild(style);

    /* -----------------------------------------------------
       ADDRESS DROPDOWNS
    ----------------------------------------------------- */

    const addressGroup = document.createElement("div");
    addressGroup.className = "supplier-registration-address";
    addressGroup.innerHTML = `
        <div class="supplier-location-field supplier-location-full">
            <label for="supplierRegion">Region *</label>
            <select id="supplierRegion" required>
                <option value="">Loading regions...</option>
            </select>
        </div>

        <div class="supplier-location-field">
            <label for="supplierProvince">Province *</label>
            <select id="supplierProvince" required disabled>
                <option value="">Select region first</option>
            </select>
        </div>

        <div class="supplier-location-field">
            <label for="supplierCity">City / Municipality *</label>
            <select id="supplierCity" required disabled>
                <option value="">Select province first</option>
            </select>
        </div>

        <div class="supplier-location-field supplier-location-full">
            <label for="supplierBarangay">Barangay *</label>
            <select id="supplierBarangay" required disabled>
                <option value="">Select city or municipality first</option>
            </select>
        </div>

        <div class="supplier-location-field supplier-location-full">
            <label for="supplierStreetAddress">Street / Building / Unit *</label>
            <input
                id="supplierStreetAddress"
                type="text"
                maxlength="250"
                autocomplete="street-address"
                placeholder="House number, street, building, or unit"
                required
            >
            <p class="supplier-registration-help">
                Select the supplier's location, then enter the specific street or building address.
            </p>
            <div id="supplierAddressError" class="supplier-registration-error" hidden></div>
        </div>
    `;

    addressField.parentElement.insertBefore(addressGroup, addressField);
    addressField.type = "hidden";
    addressField.required = false;

    const regionSelect = document.getElementById("supplierRegion");
    const provinceSelect = document.getElementById("supplierProvince");
    const citySelect = document.getElementById("supplierCity");
    const barangaySelect = document.getElementById("supplierBarangay");
    const streetField = document.getElementById("supplierStreetAddress");
    const addressError = document.getElementById("supplierAddressError");

    function setOptions(select, items, placeholder) {
        select.replaceChildren();

        const first = document.createElement("option");
        first.value = "";
        first.textContent = placeholder;
        select.appendChild(first);

        items.forEach(item => {
            const option = document.createElement("option");
            option.value = String(item.code);
            option.textContent = item.name;
            select.appendChild(option);
        });

        select.disabled = items.length === 0;
    }

    async function fetchLocations(path) {
        const response = await fetch(`${PSGC_API}${path}`, {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error("The Philippine location directory is temporarily unavailable.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("The location directory returned an unexpected response.");
        }

        return data.sort((a, b) => a.name.localeCompare(b.name));
    }

    function showAddressError(message) {
        addressError.textContent = message || "";
        addressError.hidden = !message;
    }

    async function loadRegions() {
        try {
            const regions = await fetchLocations("/regions/");
            setOptions(regionSelect, regions, "Select region");
        } catch (error) {
            console.error("[Supplier Registration] Region loading error:", error);
            setOptions(regionSelect, [], "Unable to load regions");
            showAddressError(
                "Could not load Philippine regions. Check your connection and reload this page."
            );
        }
    }

    async function loadProvinces(regionCode) {
        setOptions(provinceSelect, [], "Loading provinces...");
        setOptions(citySelect, [], "Select province first");
        setOptions(barangaySelect, [], "Select city or municipality first");

        if (!regionCode) {
            setOptions(provinceSelect, [], "Select region first");
            return;
        }

        try {
            const provinces = await fetchLocations(
                `/regions/${encodeURIComponent(regionCode)}/provinces/`
            );

            if (provinces.length > 0) {
                setOptions(provinceSelect, provinces, "Select province");
                return;
            }

            // Some regions, including NCR, have no province level.
            setOptions(provinceSelect, [], "Not applicable for this region");

            const cities = await fetchLocations(
                `/regions/${encodeURIComponent(regionCode)}/cities-municipalities/`
            );

            setOptions(citySelect, cities, "Select city or municipality");
            showAddressError("");
        } catch (error) {
            console.error("[Supplier Registration] Province loading error:", error);
            setOptions(provinceSelect, [], "Unable to load provinces");
            showAddressError(
                "Could not load the selected region's provinces or cities. Please try again."
            );
        }
    }

    async function loadCities(provinceCode) {
        setOptions(citySelect, [], "Loading cities and municipalities...");
        setOptions(barangaySelect, [], "Select city or municipality first");

        if (!provinceCode) {
            setOptions(citySelect, [], "Select province first");
            return;
        }

        try {
            const cities = await fetchLocations(
                `/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities/`
            );

            setOptions(citySelect, cities, "Select city or municipality");
            showAddressError("");
        } catch (error) {
            console.error("[Supplier Registration] City loading error:", error);
            setOptions(citySelect, [], "Unable to load cities");
            showAddressError("Could not load cities or municipalities. Please try again.");
        }
    }

    async function loadBarangays(cityCode) {
        setOptions(barangaySelect, [], "Loading barangays...");

        if (!cityCode) {
            setOptions(barangaySelect, [], "Select city or municipality first");
            return;
        }

        try {
            const barangays = await fetchLocations(
                `/cities-municipalities/${encodeURIComponent(cityCode)}/barangays/`
            );

            setOptions(barangaySelect, barangays, "Select barangay");
            showAddressError("");
        } catch (error) {
            console.error("[Supplier Registration] Barangay loading error:", error);
            setOptions(barangaySelect, [], "Unable to load barangays");
            showAddressError("Could not load barangays. Please try again.");
        }
    }

    regionSelect.addEventListener("change", async () => {
        await loadProvinces(regionSelect.value);
        updateComposedAddress();
    });

    provinceSelect.addEventListener("change", async () => {
        await loadCities(provinceSelect.value);
        updateComposedAddress();
    });

    citySelect.addEventListener("change", async () => {
        await loadBarangays(citySelect.value);
        updateComposedAddress();
    });

    barangaySelect.addEventListener("change", updateComposedAddress);
    streetField.addEventListener("input", updateComposedAddress);

    function updateComposedAddress() {
        const region = regionSelect.selectedOptions[0]?.textContent || "";
        const province = provinceSelect.value
            ? provinceSelect.selectedOptions[0]?.textContent || ""
            : "";
        const city = citySelect.value
            ? citySelect.selectedOptions[0]?.textContent || ""
            : "";
        const barangay = barangaySelect.value
            ? barangaySelect.selectedOptions[0]?.textContent || ""
            : "";
        const street = streetField.value.trim();

        const parts = [region, province, city, barangay, street]
            .filter(Boolean)
            .filter(value => ![
                "Select region",
                "Select province",
                "Select city or municipality",
                "Select barangay"
            ].includes(value));

        addressField.value = parts.join(", ");
        addressWasComposed = true;
    }

    function validateAddress() {
        if (!regionSelect.value) {
            showAddressError("Please select a region.");
            regionSelect.focus();
            return false;
        }

        // Province is optional only for regions that do not have provinces.
        if (provinceSelect.options.length > 1 && !provinceSelect.value) {
            showAddressError("Please select a province.");
            provinceSelect.focus();
            return false;
        }

        if (!citySelect.value) {
            showAddressError("Please select a city or municipality.");
            citySelect.focus();
            return false;
        }

        if (!barangaySelect.value) {
            showAddressError("Please select a barangay.");
            barangaySelect.focus();
            return false;
        }

        if (!streetField.value.trim()) {
            showAddressError("Please enter the street or building address.");
            streetField.focus();
            return false;
        }

        updateComposedAddress();
        showAddressError("");
        return true;
    }

    /* -----------------------------------------------------
       PHONE NUMBER VALIDATION
       Philippine mobile format: 09XXXXXXXXX (11 digits)
    ----------------------------------------------------- */

    phoneField.setAttribute("type", "tel");
    phoneField.setAttribute("inputmode", "numeric");
    phoneField.setAttribute("maxlength", "11");
    phoneField.setAttribute("minlength", "11");
    phoneField.setAttribute("pattern", "09[0-9]{9}");
    phoneField.setAttribute("autocomplete", "tel-national");
    phoneField.setAttribute("placeholder", "09XXXXXXXXX");
    phoneField.setAttribute(
        "title",
        "Enter exactly 11 digits, starting with 09."
    );

    let phoneHelp = document.getElementById("supplierPhoneHelp");

    if (!phoneHelp) {
        phoneHelp = document.createElement("small");
        phoneHelp.id = "supplierPhoneHelp";
        phoneHelp.className = "supplier-phone-help";
        phoneField.insertAdjacentElement("afterend", phoneHelp);
    }

    phoneHelp.textContent = "Enter exactly 11 digits, starting with 09.";

    phoneField.addEventListener("input", () => {
        const digits = phoneField.value.replace(/\D/g, "").slice(0, 11);

        if (phoneField.value !== digits) {
            phoneField.value = digits;
        }

        if (digits.length === 0) {
            phoneHelp.textContent = "Enter exactly 11 digits, starting with 09.";
            phoneHelp.style.color = "";
        } else if (/^09\d{9}$/.test(digits)) {
            phoneHelp.textContent = "Mobile number format is valid.";
            phoneHelp.style.color = "#15803d";
        } else {
            phoneHelp.textContent =
                digits.length < 11
                    ? `${11 - digits.length} more digit(s) required.`
                    : "The number must start with 09.";
            phoneHelp.style.color = "#dc2626";
        }
    });

    function validatePhone() {
        const phone = phoneField.value.trim();

        if (!/^09\d{9}$/.test(phone)) {
            phoneHelp.textContent =
                "Enter a valid mobile number with exactly 11 digits, starting with 09.";
            phoneHelp.style.color = "#dc2626";
            phoneField.focus();
            return false;
        }

        return true;
    }

    /* -----------------------------------------------------
       CONFIRMATION CARD
       The existing suppliers.js submit listener is preserved.
    ----------------------------------------------------- */

    function getFieldValue(id) {
        return document.getElementById(id)?.value?.trim() || "";
    }

    function createConfirmationCard() {
        if (confirmationOverlay) {
            return confirmationOverlay;
        }

        confirmationOverlay = document.createElement("div");
        confirmationOverlay.className = "supplier-registration-confirm-overlay";
        confirmationOverlay.hidden = true;
        confirmationOverlay.setAttribute("aria-hidden", "true");

        confirmationOverlay.innerHTML = `
            <section
                class="supplier-registration-confirm-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplierRegistrationConfirmTitle"
            >
                <div class="supplier-registration-confirm-header">
                    <div class="supplier-registration-confirm-icon" aria-hidden="true">✓</div>
                    <div>
                        <h2 id="supplierRegistrationConfirmTitle">Confirm Supplier Details</h2>
                        <p>
                            Review the information below before saving it to ADD Motor Shop.
                        </p>
                    </div>
                </div>

                <div class="supplier-registration-confirm-body">
                    <div class="supplier-registration-confirm-item">
                        <div class="supplier-registration-confirm-label">Supplier Name</div>
                        <div class="supplier-registration-confirm-value" data-confirm="name"></div>
                    </div>

                    <div class="supplier-registration-confirm-item">
                        <div class="supplier-registration-confirm-label">Contact Person</div>
                        <div class="supplier-registration-confirm-value" data-confirm="contact"></div>
                    </div>

                    <div class="supplier-registration-confirm-item">
                        <div class="supplier-registration-confirm-label">Phone Number</div>
                        <div class="supplier-registration-confirm-value" data-confirm="phone"></div>
                    </div>

                    <div class="supplier-registration-confirm-item">
                        <div class="supplier-registration-confirm-label">Email</div>
                        <div class="supplier-registration-confirm-value" data-confirm="email"></div>
                    </div>

                    <div class="supplier-registration-confirm-item full">
                        <div class="supplier-registration-confirm-label">Complete Address</div>
                        <div class="supplier-registration-confirm-value" data-confirm="address"></div>
                    </div>
                </div>

                <div class="supplier-registration-confirm-actions">
                    <button type="button" data-action="back">Back to Edit</button>
                    <button type="button" class="confirm-save" data-action="confirm">
                        Confirm &amp; Save Supplier
                    </button>
                </div>
            </section>
        `;

        document.body.appendChild(confirmationOverlay);

        confirmationOverlay.addEventListener("click", event => {
            if (event.target === confirmationOverlay) {
                closeConfirmation();
            }
        });

        confirmationOverlay.querySelector('[data-action="back"]')
            .addEventListener("click", closeConfirmation);

        confirmationOverlay.querySelector('[data-action="confirm"]')
            .addEventListener("click", confirmAndSave);

        return confirmationOverlay;
    }

    function showConfirmation() {
        const overlay = createConfirmationCard();

        const values = {
            name: getFieldValue("supplierName"),
            contact: getFieldValue("supplierContactPerson"),
            phone: phoneField.value.trim(),
            email: getFieldValue("supplierEmail") || "Not provided",
            address: addressField.value.trim()
        };

        Object.entries(values).forEach(([key, value]) => {
            const target = overlay.querySelector(`[data-confirm="${key}"]`);
            if (target) {
                target.textContent = value || "—";
            }
        });

        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        overlay.querySelector('[data-action="confirm"]').focus();
    }

    function closeConfirmation() {
        if (!confirmationOverlay) {
            return;
        }

        confirmationOverlay.hidden = true;
        confirmationOverlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        const saveButton = document.getElementById("saveSupplier");
        if (saveButton && !saveButton.disabled) {
            saveButton.focus();
        }
    }

    function confirmAndSave() {
        if (!form.isConnected) {
            closeConfirmation();
            return;
        }

        const confirmButton = confirmationOverlay.querySelector(
            '[data-action="confirm"]'
        );

        if (confirmButton.disabled) {
            return;
        }

        confirmButton.disabled = true;
        confirmButton.textContent = "Saving...";

        /*
         * Allow the next submit event through to the original
         * suppliers.js listener. That existing handler continues
         * to manage API calls, supplier products, and UI refresh.
         */
        allowNextSubmit = true;
        closeConfirmation();

        try {
            if (typeof form.requestSubmit === "function") {
                if (pendingSubmitter && pendingSubmitter.form === form) {
                    form.requestSubmit(pendingSubmitter);
                } else {
                    form.requestSubmit();
                }
            } else {
                allowNextSubmit = false;
                showAddressError(
                    "Your browser cannot safely submit this form. Please try a current browser."
                );
            }
        } catch (error) {
            allowNextSubmit = false;
            console.error("[Supplier Registration] Submit error:", error);
            showAddressError("Unable to submit the supplier form. Please try again.");
        } finally {
            window.setTimeout(() => {
                if (confirmButton.isConnected) {
                    confirmButton.disabled = false;
                    confirmButton.textContent = "Confirm & Save Supplier";
                }
            }, 1000);
        }
    }

    /*
     * Capture-phase listener runs before the original form submit
     * listener. The first submit is paused for review. The confirmed
     * submit passes through to the existing supplier save logic.
     */
    form.addEventListener("submit", event => {
        if (allowNextSubmit) {
            allowNextSubmit = false;
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        pendingSubmitter = event.submitter || null;

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!validatePhone()) {
            return;
        }

        if (!validateAddress()) {
            return;
        }

        updateComposedAddress();
        showConfirmation();
    }, true);

    /* -----------------------------------------------------
       RESET ADDRESS FIELDS WHEN ADDING A NEW SUPPLIER
    ----------------------------------------------------- */

    function resetLocationFields() {
        setOptions(regionSelect, [...regionSelect.options]
            .slice(1)
            .map(option => ({
                code: option.value,
                name: option.textContent
            })), "Select region");

        regionSelect.value = "";
        setOptions(provinceSelect, [], "Select region first");
        setOptions(citySelect, [], "Select province first");
        setOptions(barangaySelect, [], "Select city or municipality first");
        streetField.value = "";
        addressField.value = "";
        addressWasComposed = false;
        showAddressError("");
    }

    const addButtons = [
        document.getElementById("addSupplierButton"),
        document.getElementById("openAddSupplier"),
        document.getElementById("emptyAddSupplierButton")
    ].filter(Boolean);

    addButtons.forEach(button => {
        button.addEventListener("click", () => {
            window.setTimeout(() => {
                if (!modal || !modal.hidden) {
                    const supplierId = document.getElementById("supplierId");
                    const editing = supplierId?.value?.trim();

                    if (!editing) {
                        resetLocationFields();
                    }
                }
            }, 0);
        });
    });

    const cancelButtons = [
        document.getElementById("cancelSupplier"),
        document.getElementById("closeSupplierModal")
    ].filter(Boolean);

    cancelButtons.forEach(button => {
        button.addEventListener("click", closeConfirmation);
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            confirmationOverlay &&
            !confirmationOverlay.hidden
        ) {
            closeConfirmation();
        }
    });

    /*
     * For an existing free-text address, retain the original value
     * until the user selects a structured address. The user can then
     * enter the street/building in the new field.
     */
    if (originalAddress && !addressWasComposed) {
        streetField.value = "";
    }

    loadRegions();

    console.log("[Supplier Registration] Address and confirmation enhancements loaded.");
}