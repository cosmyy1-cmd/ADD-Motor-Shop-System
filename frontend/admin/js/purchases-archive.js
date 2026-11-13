
document.addEventListener("DOMContentLoaded", () => {

    if (window.purchaseArchiveInitialized) {
        return;
    }

    window.purchaseArchiveInitialized = true;

    const API_BASE =
        window.PURCHASE_API_BASE ||
        "http://localhost:3000";

    const ARCHIVE_API =
        `${API_BASE}/api/admin/purchases/archive`;

    const INITIAL_LIMIT = 10;
    const MORE_LIMIT = 50;

    let archivedPurchases = [];
    let totalArchived = 0;
    let currentOffset = 0;
    let hasMore = false;
    let isLoading = false;
    let isLoadingMore = false;
    let searchTimer = null;

    // --------------------------------------------------
    // FIND THE EXISTING PURCHASE RECORDS CARD
    // --------------------------------------------------

    const purchaseTableBody =
        document.getElementById("purchaseTableBody");

    if (!purchaseTableBody) {
        console.error(
            "[Purchase Archive] Existing purchase table was not found."
        );
        return;
    }

    const activeCard =
        purchaseTableBody.closest(".content-card");

    if (!activeCard) {
        console.error(
            "[Purchase Archive] Purchase Records card was not found."
        );
        return;
    }

    // --------------------------------------------------
    // ADMIN AUTHENTICATION
    // --------------------------------------------------

    function getAdminId() {

        const storageKeys = [
            "adminUser",
            "addMotorUser",
            "user"
        ];

        for (const key of storageKeys) {

            const stored =
                localStorage.getItem(key);

            if (!stored) {
                continue;
            }

            try {

                const parsed =
                    JSON.parse(stored);

                const id =
                    parsed?.id ??
                    parsed?.user_id ??
                    parsed?.admin_id;

                if (id !== undefined && id !== null) {
                    return String(id);
                }

            } catch {

                if (/^\d+$/.test(stored)) {
                    return stored;
                }

            }
        }

        return null;
    }

    function getHeaders() {

        const headers = {
            "Content-Type": "application/json"
        };

        const adminId = getAdminId();

        if (adminId) {
            headers["x-admin-id"] = adminId;
        }

        return headers;
    }

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatMoney(value) {

        const amount = Number(value || 0);

        return `₱${amount.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function formatDate(value) {

        if (!value) {
            return "—";
        }

        // Preserve SQL DATE values without timezone shifting.
        const dateOnly =
            String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

        let date;

        if (dateOnly) {

            date = new Date(
                Number(dateOnly[1]),
                Number(dateOnly[2]) - 1,
                Number(dateOnly[3])
            );

        } else {

            date = new Date(value);

        }

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function showElement(element, visible) {

        if (!element) {
            return;
        }

        element.style.display =
            visible ? "" : "none";

        element.classList.toggle(
            "hidden",
            !visible
        );
    }

    // --------------------------------------------------
    // ADD SCOPED ARCHIVE STYLES
    // --------------------------------------------------

    const archiveStyles = document.createElement("style");

    archiveStyles.id = "purchaseArchiveStyles";

    archiveStyles.textContent = `

        .purchase-archive-tabs {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 18px;
            border-bottom: 1px solid var(--border, #e5e7eb);
            padding-bottom: 12px;
        }

        .purchase-archive-tab {
            border: 1px solid transparent;
            background: transparent;
            color: var(--text-secondary, #777);
            padding: 10px 17px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: .2s ease;
        }

        .purchase-archive-tab:hover {
            background: rgba(220, 38, 38, .07);
            color: #dc2626;
        }

        .purchase-archive-tab.active {
            color: #dc2626;
            background: rgba(220, 38, 38, .09);
            border-color: rgba(220, 38, 38, .18);
        }

        .purchase-archive-card {
            background: var(--card-bg, #fff);
            color: var(--text, #222);
            border: 1px solid var(--border, #e5e7eb);
            border-radius: 12px;
            padding: 22px;
            margin-bottom: 20px;
            width: 100%;
            box-sizing: border-box;
        }

        .purchase-archive-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 20px;
        }

        .purchase-archive-header h3 {
            margin: 0;
            font-size: 17px;
            font-weight: 800;
        }

        .purchase-archive-header p {
            margin: 5px 0 0;
            color: var(--text-secondary, #777);
            font-size: 12px;
        }

        .purchase-archive-filters {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 18px;
        }

        .purchase-archive-filters input,
        .purchase-archive-filters select {
            min-height: 40px;
            padding: 9px 12px;
            border: 1px solid var(--border, #ddd);
            border-radius: 7px;
            background: var(--input-bg, #fff);
            color: var(--text, #222);
            outline: none;
            font: inherit;
        }

        .purchase-archive-filters input {
            flex: 1;
            min-width: 180px;
        }

        .purchase-archive-filters select {
            min-width: 170px;
        }

        .purchase-archive-table-wrapper {
            width: 100%;
            overflow-x: auto;
        }

        .purchase-archive-table {
            width: 100%;
            min-width: 650px;
            border-collapse: collapse;
            text-align: left;
        }

        .purchase-archive-table th {
            padding: 13px 12px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .5px;
            color: var(--text-secondary, #777);
            background: var(--table-header-bg, #f8f8f8);
            border-bottom: 1px solid var(--border, #e5e7eb);
            white-space: nowrap;
        }

        .purchase-archive-table td {
            padding: 14px 12px;
            font-size: 12px;
            border-bottom: 1px solid var(--border, #eee);
            white-space: nowrap;
        }

        .purchase-archive-table tbody tr:hover {
            background: rgba(127, 127, 127, .045);
        }

        .purchase-archive-number {
            font-weight: 800;
            color: var(--text, #222);
        }

        .purchase-archive-status {
            display: inline-flex;
            align-items: center;
            padding: 5px 9px;
            border-radius: 20px;
            background: #fef2f2;
            color: #dc2626;
            font-size: 10px;
            font-weight: 800;
        }

        .purchase-archive-state {
            padding: 42px 15px;
            text-align: center;
            color: var(--text-secondary, #777);
        }

        .purchase-archive-state i {
            font-size: 25px;
            margin-bottom: 12px;
            color: #dc2626;
        }

        .purchase-archive-state h4 {
            margin: 5px 0;
            color: var(--text, #222);
        }

        .purchase-archive-state p {
            margin: 5px 0;
            font-size: 12px;
        }

        .purchase-archive-retry {
            margin-top: 12px;
            padding: 9px 16px;
            border: 0;
            border-radius: 7px;
            background: #dc2626;
            color: white;
            font-weight: 700;
            cursor: pointer;
        }

        .purchase-archive-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            padding-top: 17px;
            font-size: 12px;
            color: var(--text-secondary, #777);
        }

        .purchase-archive-more {
            border: 1px solid #dc2626;
            color: #dc2626;
            background: transparent;
            border-radius: 7px;
            padding: 9px 16px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
        }

        .purchase-archive-more:hover {
            background: #dc2626;
            color: white;
        }

        .purchase-archive-more:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        body.dark-mode .purchase-archive-card {
            background: var(--card-bg, #1b1b1b);
            border-color: var(--border, #333);
        }

        body.dark-mode .purchase-archive-table th {
            background: var(--table-header-bg, #252525);
        }

        body.dark-mode .purchase-archive-filters input,
        body.dark-mode .purchase-archive-filters select {
            background: var(--input-bg, #252525);
            color: var(--text, #fff);
            border-color: var(--border, #444);
        }

        @media (max-width: 650px) {

            .purchase-archive-card {
                padding: 15px;
            }

            .purchase-archive-tabs {
                overflow-x: auto;
            }

            .purchase-archive-tab {
                white-space: nowrap;
            }

            .purchase-archive-footer {
                align-items: flex-start;
            }

        }

    `;

    document.head.appendChild(archiveStyles);

    // --------------------------------------------------
    // CREATE TABS
    // --------------------------------------------------

    const tabs = document.createElement("div");

    tabs.className = "purchase-archive-tabs";

    tabs.innerHTML = `

        <button
            type="button"
            class="purchase-archive-tab active"
            id="purchaseRecordsTab"
        >
            <i class="fa-solid fa-receipt"></i>
            Purchase Records
        </button>

        <button
            type="button"
            class="purchase-archive-tab"
            id="purchaseArchiveTab"
        >
            <i class="fa-solid fa-box-archive"></i>
            Purchase Archive
        </button>

    `;

    // --------------------------------------------------
    // CREATE ARCHIVE PANEL
    // --------------------------------------------------

    const archiveCard = document.createElement("section");

    archiveCard.className = "purchase-archive-card";

    archiveCard.id = "purchaseArchivePanel";

    archiveCard.style.display = "none";

    archiveCard.innerHTML = `

        <div class="purchase-archive-header">

            <div>
                <h3>
                    <i class="fa-solid fa-box-archive"></i>
                    Cancelled Purchases
                </h3>

                <p>
                    Cancelled purchase records are kept here.
                    They are not permanently deleted.
                </p>
            </div>

        </div>

        <div class="purchase-archive-filters">

            <input
                type="search"
                id="purchaseArchiveSearch"
                placeholder="Search purchase number or supplier..."
                autocomplete="off"
            >

            <select id="purchaseArchiveSupplierFilter">
                <option value="all">All Suppliers</option>
            </select>

        </div>

        <div
            class="purchase-archive-state"
            id="purchaseArchiveLoading"
            style="display:none"
        >
            <i class="fa-solid fa-rotate fa-spin"></i>
            <h4>Loading Archived Purchases</h4>
            <p>Please wait while we retrieve cancelled purchases.</p>
        </div>

        <div
            class="purchase-archive-state"
            id="purchaseArchiveEmpty"
            style="display:none"
        >
            <i class="fa-solid fa-box-open"></i>
            <h4>No Archived Purchases</h4>
            <p>There are no cancelled purchases matching your filters.</p>
        </div>

        <div
            class="purchase-archive-state"
            id="purchaseArchiveError"
            style="display:none"
        >
            <i class="fa-solid fa-circle-exclamation"></i>
            <h4>Unable to Load Archive</h4>
            <p id="purchaseArchiveErrorMessage">
                Something went wrong.
            </p>

            <button
                type="button"
                class="purchase-archive-retry"
                id="purchaseArchiveRetry"
            >
                Try Again
            </button>
        </div>

        <div
            id="purchaseArchiveTableContainer"
            style="display:none"
        >

            <div class="purchase-archive-table-wrapper">

                <table class="purchase-archive-table">

                    <thead>
                        <tr>
                            <th>PURCHASE #</th>
                            <th>SUPPLIER</th>
                            <th>PURCHASE DATE</th>
                            <th>ITEMS</th>
                            <th>TOTAL AMOUNT</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>

                    <tbody id="purchaseArchiveTableBody"></tbody>

                </table>

            </div>

            <div class="purchase-archive-footer">

                <span id="purchaseArchiveCount">
                    Showing 0 purchases
                </span>

                <button
                    type="button"
                    class="purchase-archive-more"
                    id="purchaseArchiveSeeMore"
                    style="display:none"
                >
                    See More
                </button>

            </div>

        </div>

    `;

    // Insert everything at the existing Purchase Records position.
    activeCard.parentNode.insertBefore(tabs, activeCard);

    activeCard.parentNode.insertBefore(
        archiveCard,
        activeCard
    );

    // --------------------------------------------------
    // ELEMENTS
    // --------------------------------------------------

    const recordsTab =
        document.getElementById("purchaseRecordsTab");

    const archiveTab =
        document.getElementById("purchaseArchiveTab");

    const searchInput =
        document.getElementById("purchaseArchiveSearch");

    const supplierFilter =
        document.getElementById("purchaseArchiveSupplierFilter");

    const loadingState =
        document.getElementById("purchaseArchiveLoading");

    const emptyState =
        document.getElementById("purchaseArchiveEmpty");

    const errorState =
        document.getElementById("purchaseArchiveError");

    const errorMessage =
        document.getElementById("purchaseArchiveErrorMessage");

    const tableContainer =
        document.getElementById("purchaseArchiveTableContainer");

    const tableBody =
        document.getElementById("purchaseArchiveTableBody");

    const countLabel =
        document.getElementById("purchaseArchiveCount");

    const seeMoreButton =
        document.getElementById("purchaseArchiveSeeMore");

    const retryButton =
        document.getElementById("purchaseArchiveRetry");

    // --------------------------------------------------
    // TAB SWITCHING
    // --------------------------------------------------

    function switchTab(tab) {

        const archiveSelected =
            tab === "archive";

        recordsTab.classList.toggle(
            "active",
            !archiveSelected
        );

        archiveTab.classList.toggle(
            "active",
            archiveSelected
        );

        // Only one content card can be visible.
        activeCard.style.display =
            archiveSelected ? "none" : "";

        archiveCard.style.display =
            archiveSelected ? "" : "none";

        if (archiveSelected && archivedPurchases.length === 0) {
            loadArchivedPurchases(false);
        }
    }

    recordsTab.addEventListener("click", () => {
        switchTab("records");
    });

    archiveTab.addEventListener("click", () => {
        switchTab("archive");
    });

    // --------------------------------------------------
    // STATES
    // --------------------------------------------------

    function renderStates() {

        const hasRecords =
            archivedPurchases.length > 0;

        // Loading state
        showElement(
            loadingState,
            isLoading
        );

        // Error state
        showElement(
            errorState,
            !isLoading && Boolean(errorMessage.textContent.trim())
        );

        // Empty state
        showElement(
            emptyState,
            !isLoading &&
            !errorMessage.textContent.trim() &&
            !hasRecords
        );

        // Table state
        showElement(
            tableContainer,
            !isLoading &&
            !errorMessage.textContent.trim() &&
            hasRecords
        );

        // Pagination
        showElement(
            seeMoreButton,
            hasRecords &&
            hasMore &&
            !isLoading
        );

        if (hasRecords) {

            countLabel.textContent =
                `Showing ${archivedPurchases.length} of ${totalArchived} purchases`;

        } else {

            countLabel.textContent =
                "Showing 0 purchases";

        }

    }

    // --------------------------------------------------
    // RENDER ARCHIVED PURCHASES
    // --------------------------------------------------

    function renderArchivedPurchases() {

        tableBody.innerHTML =
            archivedPurchases.map(purchase => {

                const purchaseId =
                    purchase.id ?? "—";

                const supplier =
                    purchase.supplier_name ||
                    "Unknown Supplier";

                const purchaseDate =
                    formatDate(purchase.purchase_date);

                const itemCount =
                    Number(purchase.total_items || 0);

                const amount =
                    formatMoney(purchase.total_amount);

                return `

                    <tr>

                        <td>
                            <span class="purchase-archive-number">
                                #${escapeHTML(purchaseId)}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(supplier)}
                        </td>

                        <td>
                            ${escapeHTML(purchaseDate)}
                        </td>

                        <td>
                            ${itemCount.toLocaleString("en-PH")}
                        </td>

                        <td>
                            <strong>
                                ${amount}
                            </strong>
                        </td>

                        <td>
                            <span class="purchase-archive-status">
                                Cancelled
                            </span>
                        </td>

                    </tr>

                `;

            }).join("");

        renderStates();
    }

    // --------------------------------------------------
    // SUPPLIER FILTER
    // --------------------------------------------------

    function populateSupplierFilter(records) {

        const selectedValue =
            supplierFilter.value;

        const suppliers = new Map();

        // Reuse supplier options already available
        // in the original Purchase Records filters.
        const existingFilter =
            document.getElementById("supplierFilter");

        if (existingFilter) {

            Array.from(existingFilter.options).forEach(option => {

                if (
                    option.value &&
                    option.value !== "all"
                ) {

                    suppliers.set(
                        String(option.value),
                        option.textContent.trim()
                    );

                }

            });

        }

        // Add suppliers found in archive results.
        records.forEach(purchase => {

            if (purchase.supplier_id) {

                suppliers.set(
                    String(purchase.supplier_id),
                    purchase.supplier_name || "Unknown Supplier"
                );

            }

        });

        supplierFilter.innerHTML = `
            <option value="all">All Suppliers</option>
        `;

        Array.from(suppliers.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .forEach(([id, name]) => {

                const option =
                    document.createElement("option");

                option.value = id;
                option.textContent = name;

                supplierFilter.appendChild(option);

            });

        if (
            Array.from(supplierFilter.options)
                .some(option => option.value === selectedValue)
        ) {

            supplierFilter.value = selectedValue;

        }

    }

    // --------------------------------------------------
    // LOAD ARCHIVED PURCHASES
    // --------------------------------------------------

    async function loadArchivedPurchases(append = false) {

        if (isLoading || isLoadingMore) {
            return;
        }

        if (append) {
            isLoadingMore = true;
        } else {

            isLoading = true;

            archivedPurchases = [];
            totalArchived = 0;
            currentOffset = 0;
            hasMore = false;

            errorMessage.textContent = "";

        }

        renderStates();

        if (append) {

            seeMoreButton.disabled = true;

            seeMoreButton.textContent =
                "Loading...";

        }

        try {

            const params = new URLSearchParams();

            params.set(
                "limit",
                String(append ? MORE_LIMIT : INITIAL_LIMIT)
            );

            params.set(
                "offset",
                String(currentOffset)
            );

            const search =
                searchInput.value.trim();

            if (search) {
                params.set("search", search);
            }

            const supplierId =
                supplierFilter.value;

            if (
                supplierId &&
                supplierId !== "all"
            ) {

                params.set(
                    "supplier_id",
                    supplierId
                );

            }

            const response =
                await fetch(
                    `${ARCHIVE_API}?${params.toString()}`,
                    {
                        method: "GET",
                        headers: getHeaders(),
                        credentials: "include"
                    }
                );

            const result =
                await response.json();

            if (!response.ok || result.success === false) {

                throw new Error(
                    result.message ||
                    "Unable to retrieve archived purchases."
                );

            }

            const purchases =
                Array.isArray(result.purchases)
                    ? result.purchases
                    : [];

            if (append) {

                archivedPurchases =
                    archivedPurchases.concat(purchases);

            } else {

                archivedPurchases = purchases;

            }

            totalArchived =
                Number(
                    result.total ??
                    result.count ??
                    archivedPurchases.length
                );

            currentOffset =
                archivedPurchases.length;

            // Trust the backend's has_more field,
            // with a count-based fallback.
            hasMore =
                result.has_more !== undefined
                    ? Boolean(result.has_more)
                    : currentOffset < totalArchived;

            populateSupplierFilter(archivedPurchases);

            errorMessage.textContent = "";

            renderArchivedPurchases();

        } catch (error) {

            console.error(
                "[Purchase Archive] Loading failed:",
                error
            );

            errorMessage.textContent =
                error.message ||
                "Something went wrong. Please try again.";

            if (!append) {
                archivedPurchases = [];
                totalArchived = 0;
                hasMore = false;
            }

            renderStates();

        } finally {

            isLoading = false;
            isLoadingMore = false;

            seeMoreButton.disabled = false;

            seeMoreButton.textContent =
                "See More";

            renderStates();

        }

    }

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    searchInput.addEventListener("input", () => {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {

            currentOffset = 0;

            loadArchivedPurchases(false);

        }, 350);

    });

    // --------------------------------------------------
    // SUPPLIER FILTER
    // --------------------------------------------------

    supplierFilter.addEventListener("change", () => {

        currentOffset = 0;

        loadArchivedPurchases(false);

    });

    // --------------------------------------------------
    // SEE MORE
    // --------------------------------------------------

    seeMoreButton.addEventListener("click", () => {

        if (!hasMore || isLoadingMore || isLoading) {
            return;
        }

        loadArchivedPurchases(true);

    });

    // --------------------------------------------------
    // RETRY
    // --------------------------------------------------

    retryButton.addEventListener("click", () => {

        loadArchivedPurchases(false);

    });

    // --------------------------------------------------
    // INITIAL STATE
    // --------------------------------------------------

    renderStates();

    console.log(
        "[Purchase Archive] Initialized successfully."
    );

});
