
/* =========================================================
   ADD MOTOR SHOP — ADMIN INVENTORY

   Responsibilities:
   - Load and display active inventory
   - Search and filter products
   - Display inventory summary and low-stock alerts
   - Display item details in a structured card
   - Archive eligible products
   - Display recent inventory transactions

   Stock changes:
   - Stock In: handled by the supplier/purchase workflow
   - Stock Out: handled by the sales workflow

   Theme management remains in admin-theme.js.
========================================================= */


/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE =
    window.INVENTORY_API_BASE ||
    "http://localhost:3000";

const API_TIMEOUT = 8000;


/* =========================================================
   STATE
========================================================= */

let inventoryItems = [];
let filteredItems = [];
let currentItem = null;
let categories = [];
let transactions = [];
let inventoryLoadPromise = null;
let toastTimer = null;
let isArchiving = false;


/* =========================================================
   DOM HELPERS
========================================================= */

function getElement(...ids) {
    for (const id of ids) {
        const element = document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = String(value ?? "");
    }
}


function formatMoney(value) {
    const amount = Number(value) || 0;

    return amount.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

function getStoredAdminId() {
    const storages = [
        localStorage,
        sessionStorage
    ];

    const userKeys = [
        "adminUser",
        "addMotorUser",
        "user"
    ];

    for (const storage of storages) {
        for (const key of userKeys) {
            const stored = storage.getItem(key);

            if (!stored) {
                continue;
            }

            try {
                const user = JSON.parse(stored);

                const id = Number(
                    user?.id ||
                    user?.admin_id ||
                    user?.adminId ||
                    user?.user_id ||
                    user?.userId ||
                    0
                );

                if (Number.isInteger(id) && id > 0) {
                    return id;
                }
            } catch (error) {
                console.warn(
                    `[Inventory] Could not parse ${key}.`,
                    error
                );
            }
        }
    }

    for (const storage of storages) {
        const id = Number(
            storage.getItem("adminId") || 0
        );

        if (Number.isInteger(id) && id > 0) {
            return id;
        }
    }

    return 0;
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiFetch(path, options = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        API_TIMEOUT
    );

    try {
        const headers = {
            Accept: "application/json"
        };

        if (options.body) {
            headers["Content-Type"] = "application/json";
        }

        const adminId = getStoredAdminId();

        if (adminId) {
            headers["x-admin-id"] = String(adminId);
        }

        const response = await fetch(
            `${API_BASE}${path}`,
            {
                ...options,
                headers: {
                    ...headers,
                    ...(options.headers || {})
                },
                credentials: "include",
                signal: controller.signal
            }
        );

        let data;

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message ||
                data.error ||
                `Request failed with status ${response.status}.`
            );
        }

        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "The inventory request timed out. Please try again."
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeInventory
);


async function initializeInventory() {
    console.log("[Inventory] Initializing inventory page.");

    setupEventListeners();
    loadAdminProfile();

    // Make sure the Stock Activity section is not hidden.
    restoreStockActivitySection();

    await loadInventory();
}


/* =========================================================
   STOCK ACTIVITY SECTION VISIBILITY
========================================================= */

function restoreStockActivitySection() {
    const transactionBody = getElement("transactionsTableBody");

    const transactionSection =
        transactionBody?.closest(".transactions-section") ||
        document.querySelector(".transactions-section");

    if (transactionSection) {
        transactionSection.hidden = false;
        transactionSection.style.removeProperty("display");
        transactionSection.setAttribute("aria-hidden", "false");
    }

    const transactionContainer = getElement(
        "transactionsTableContainer",
        "transactionTableContainer"
    );

    if (transactionContainer) {
        transactionContainer.hidden = false;
        transactionContainer.style.removeProperty("display");
    }

    const heading = Array.from(
        document.querySelectorAll("h1, h2, h3, h4")
    ).find(element =>
        /recent inventory transactions|stock activity/i.test(
            element.textContent || ""
        )
    );

    if (heading) {
        const section = heading.closest(
            ".transactions-section, .transactions-card, .section-card"
        );

        if (section) {
            section.hidden = false;
            section.style.removeProperty("display");
            section.setAttribute("aria-hidden", "false");
        }
    }

    const activityButton = getElement("viewTransactionsButton");

    if (activityButton) {
        activityButton.hidden = false;
        activityButton.style.removeProperty("display");
    }
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function bindClick(id, callback) {
    const element = getElement(id);

    if (element) {
        element.addEventListener("click", callback);
    }
}


function setupEventListeners() {
    bindClick("refreshInventoryButton", loadInventory);
    bindClick("retryInventoryButton", loadInventory);
    bindClick("resetFiltersButton", resetInventoryFilters);

    const searchInput = getElement(
        "inventorySearch",
        "searchInventory"
    );

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            applyInventoryFilters
        );
    }

    const categoryFilter = getElement("categoryFilter");

    if (categoryFilter) {
        categoryFilter.addEventListener(
            "change",
            applyInventoryFilters
        );
    }

    const statusFilter = getElement(
        "stockStatusFilter",
        "statusFilter"
    );

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            applyInventoryFilters
        );
    }

    const tableBody = getElement("inventoryTableBody");

    if (tableBody) {
        tableBody.addEventListener(
            "click",
            handleInventoryAction
        );
    }

    bindClick("closeDetailsModal", closeDetailsModal);
    bindClick("closeDetailsButton", closeDetailsModal);

    bindClick("cancelDeleteButton", closeDeleteModal);

    bindClick(
        "confirmDeleteButton",
        handleArchiveConfirmation
    );

    bindClick("viewTransactionsButton", () => {
        restoreStockActivitySection();

        const section =
            document.querySelector(".transactions-section") ||
            getElement("transactionsTableBody");

        if (section) {
            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });

    bindClick("logoutButton", handleLogout);
    bindClick("mobileMenuButton", toggleMobileMenu);
    bindClick("closeToastButton", hideToast);

    document
        .querySelectorAll(".modal-overlay")
        .forEach(overlay => {
            overlay.addEventListener("click", event => {
                if (event.target !== overlay) {
                    return;
                }

                if (overlay.id === "detailsModal") {
                    closeDetailsModal();
                }

                if (overlay.id === "deleteModal") {
                    closeDeleteModal();
                }
            });
        });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }

        closeDetailsModal();
        closeDeleteModal();
    });
}


/* =========================================================
   LOAD INVENTORY
========================================================= */

async function loadInventory() {
    if (inventoryLoadPromise) {
        return inventoryLoadPromise;
    }

    inventoryLoadPromise = performInventoryLoad();

    try {
        return await inventoryLoadPromise;
    } finally {
        inventoryLoadPromise = null;
    }
}


async function performInventoryLoad() {
    showInventoryLoading();
    hideInventoryError();
    restoreStockActivitySection();

    try {
        const data = await fetchInventoryData();

        inventoryItems = data.products.map(normalizeProduct);
        categories = data.categories;

        transactions = data.transactions.map(normalizeTransaction);

        inventoryItems.forEach(item => {
            if (!item.category && item.category_id) {
                const category = categories.find(
                    entry =>
                        Number(entry.id) ===
                        Number(item.category_id)
                );

                if (category) {
                    item.category = category.name;
                }
            }
        });

        buildCategories();
        populateCategorySelects();

        filteredItems = [...inventoryItems];

        updateSummary();
        renderInventory();
        renderLowStock();
        if (typeof window.renderInventoryTransactions === "function") {
    window.renderInventoryTransactions(transactions);
} else {
    renderTransactions();
}
        hideInventoryError();

        console.log(
            `[Inventory] Loaded ${inventoryItems.length} item(s) and ` +
            `${transactions.length} transaction(s).`
        );
    } catch (error) {
        console.error(
            "[Inventory] Failed to load inventory:",
            error
        );

        showInventoryError(getFriendlyApiError(error));

        // Keep the Stock Activity section visible even if the
        // transaction request or another inventory request fails.
        restoreStockActivitySection();
    } finally {
        hideInventoryLoading();
    }
}


/* =========================================================
   FETCH INVENTORY DATA
========================================================= */

async function fetchInventoryData() {
    const inventoryResponse = await apiFetch(
        "/api/admin/inventory"
    );

    let categoriesResponse = {
        categories: []
    };

    let transactionsResponse = {
        transactions: []
    };

    try {
        categoriesResponse = await apiFetch(
            "/api/admin/inventory/categories"
        );
    } catch (error) {
        console.warn(
            "[Inventory] Categories could not be loaded:",
            error
        );
    }

    try {
        transactionsResponse = await apiFetch(
            "/api/admin/inventory/transactions"
        );
    } catch (error) {
        console.warn(
            "[Inventory] Transactions could not be loaded:",
            error
        );
    }

    return {
        products: Array.isArray(inventoryResponse.products)
            ? inventoryResponse.products
            : [],

        categories: Array.isArray(categoriesResponse.categories)
            ? categoriesResponse.categories.map(category => ({
                id: Number(category.id) || 0,
                name: String(category.name || "").trim()
            })).filter(category => category.id > 0 && category.name)
            : [],

        transactions: Array.isArray(
            transactionsResponse.transactions
        )
            ? transactionsResponse.transactions
            : []
    };
}


/* =========================================================
   NORMALIZE PRODUCT
========================================================= */

function normalizeProduct(product) {
    return {
        id: Number(product.id) || 0,

        category_id: Number(
            product.category_id ??
            product.categoryId ??
            0
        ),

        category: String(
            product.category_name ??
            product.category ??
            ""
        ).trim(),

        name: String(product.name || "").trim(),

        sku: String(
            product.sku ??
            product.SKU ??
            ""
        ).trim(),

        description: String(
            product.description || ""
        ).trim(),

        price: Number(product.price) || 0,

        stock: Number(product.stock) || 0,

        image: product.image || null,

        status: product.status || "available",

        created_at: product.created_at || null,

        updated_at:
            product.updated_at ||
            product.updatedAt ||
            product.created_at ||
            null,

        reorderLevel: Number(
            product.reorder_level ??
            product.reorderLevel ??
            5
        )
    };
}


/* =========================================================
   NORMALIZE TRANSACTION

   Reason is intentionally not used or displayed.
========================================================= */

function normalizeTransaction(transaction) {
    const productId = Number(
        transaction.product_id ??
        transaction.item_id ??
        transaction.productId ??
        0
    );

    const item = inventoryItems.find(
        product => Number(product.id) === productId
    );

    const rawType = String(
        transaction.type ||
        transaction.transaction_type ||
        transaction.transactionType ||
        ""
    ).trim().toLowerCase();

    let type = "in";

    if (
        rawType === "stock out" ||
        rawType === "stock_out" ||
        rawType === "out" ||
        rawType === "sale" ||
        rawType === "sold"
    ) {
        type = "out";
    } else if (
        rawType === "adjustment" ||
        rawType === "adjust"
    ) {
        const previousStock = Number(
            transaction.previous_stock ??
            transaction.previousStock ??
            0
        );

        const newStock = Number(
            transaction.new_stock ??
            transaction.newStock ??
            0
        );

        type = newStock < previousStock ? "out" : "in";
    }

    return {
        id: Number(transaction.id) || 0,

        productId,

        itemName:
            transaction.product_name ||
            transaction.item_name ||
            transaction.itemName ||
            item?.name ||
            "Inventory Item",

        type,

        quantity: Math.abs(
            Number(
                transaction.quantity ??
                transaction.change_quantity ??
                0
            ) || 0
        ),

        reference: String(
            transaction.reference ||
            transaction.reference_no ||
            transaction.reference_number ||
            ""
        ),

        previousStock: Number(
            transaction.previous_stock ??
            transaction.previousStock ??
            0
        ) || 0,

        newStock: Number(
            transaction.new_stock ??
            transaction.newStock ??
            0
        ) || 0,

        date:
            transaction.created_at ||
            transaction.transaction_date ||
            transaction.date ||
            transaction.createdAt ||
            null
    };
}


/* =========================================================
   CATEGORY FILTER
========================================================= */

function buildCategories() {
    const names = new Set(
        categories.map(category => category.name)
    );

    inventoryItems.forEach(item => {
        if (item.category) {
            names.add(item.category);
        }
    });

    categories = Array.from(names)
        .sort((a, b) => a.localeCompare(b))
        .map((name, index) => ({
            id: index + 1,
            name
        }));
}


function populateCategorySelects() {
    const categoryFilter = getElement("categoryFilter");

    if (!categoryFilter) {
        return;
    }

    const selectedValue = categoryFilter.value;

    categoryFilter.innerHTML = `
        <option value="">All Categories</option>
        ${categories.map(category => `
            <option value="${escapeHtml(category.name)}">
                ${escapeHtml(category.name)}
            </option>
        `).join("")}
    `;

    if (
        selectedValue &&
        Array.from(categoryFilter.options).some(
            option => option.value === selectedValue
        )
    ) {
        categoryFilter.value = selectedValue;
    }
}


/* =========================================================
   INVENTORY FILTERS
========================================================= */

function applyInventoryFilters() {
    const searchInput = getElement(
        "inventorySearch",
        "searchInventory"
    );

    const categoryFilter = getElement("categoryFilter");

    const statusFilter = getElement(
        "stockStatusFilter",
        "statusFilter"
    );

    const search = String(
        searchInput?.value || ""
    ).trim().toLowerCase();

    const selectedCategory = String(
        categoryFilter?.value || ""
    );

    const selectedStatus = String(
        statusFilter?.value || ""
    ).toLowerCase();

    filteredItems = inventoryItems.filter(item => {
        const matchesSearch =
            !search ||
            item.name.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search) ||
            getItemSku(item).toLowerCase().includes(search) ||
            item.category.toLowerCase().includes(search);

        const matchesCategory =
            !selectedCategory ||
            item.category === selectedCategory;

        const status = getStockStatus(item);

        const matchesStatus =
            !selectedStatus ||
            selectedStatus === "all" ||
            selectedStatus === status ||
            (
                selectedStatus === "low" &&
                status === "low-stock"
            ) ||
            (
                selectedStatus === "out" &&
                status === "out-of-stock"
            );

        return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus
        );
    });

    renderInventory();
}


function resetInventoryFilters() {
    const searchInput = getElement(
        "inventorySearch",
        "searchInventory"
    );

    const categoryFilter = getElement("categoryFilter");

    const statusFilter = getElement(
        "stockStatusFilter",
        "statusFilter"
    );

    if (searchInput) {
        searchInput.value = "";
    }

    if (categoryFilter) {
        categoryFilter.value = "";
    }

    if (statusFilter) {
        statusFilter.value = "";
    }

    filteredItems = [...inventoryItems];

    renderInventory();
}


/* =========================================================
   STOCK STATUS
========================================================= */

function getStockStatus(item) {
    const stock = Number(item.stock) || 0;
    const reorderLevel = Number(item.reorderLevel) || 5;

    if (stock <= 0) {
        return "out-of-stock";
    }

    if (stock <= reorderLevel) {
        return "low-stock";
    }

    return "in-stock";
}


function getStockStatusLabel(item) {
    const status = getStockStatus(item);

    if (status === "out-of-stock") {
        return "Out of Stock";
    }

    if (status === "low-stock") {
        return "Low Stock";
    }

    return "In Stock";
}


function getItemSku(item) {
    return (
        item.sku ||
        item.SKU ||
        `ITEM-${String(item.id).padStart(4, "0")}`
    );
}


/* =========================================================
   SUMMARY CARDS
========================================================= */

function updateSummary() {
    const totalItems = inventoryItems.length;

    const totalStock = inventoryItems.reduce(
        (total, item) => total + (Number(item.stock) || 0),
        0
    );

    const lowStockCount = inventoryItems.filter(
        item => getStockStatus(item) === "low-stock"
    ).length;

    const outOfStockCount = inventoryItems.filter(
        item => getStockStatus(item) === "out-of-stock"
    ).length;

    setText("totalItems", totalItems);
    setText("totalStock", totalStock);
    setText("lowStockCount", lowStockCount);
    setText("outOfStockCount", outOfStockCount);
}


/* =========================================================
   INVENTORY TABLE
========================================================= */

function renderInventory() {
    const tableBody = getElement("inventoryTableBody");
    const tableContainer = getElement("inventoryTableContainer");
    const emptyState = getElement("inventoryEmpty");

    if (!tableBody) {
        return;
    }

    if (filteredItems.length === 0) {
        tableBody.innerHTML = "";

        if (emptyState) {
            emptyState.hidden = false;
            emptyState.style.display = "";
        }

        if (tableContainer) {
            tableContainer.hidden = true;
        }

        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
        emptyState.style.display = "none";
    }

    if (tableContainer) {
        tableContainer.hidden = false;
    }

    tableBody.innerHTML = filteredItems
        .map(renderInventoryRow)
        .join("");
}


function renderInventoryRow(item) {
    const status = getStockStatus(item);
    const statusLabel = getStockStatusLabel(item);
    const sku = getItemSku(item);
    const updated = formatDate(item.updated_at);

    return `
        <tr>
            <td>
                <div class="inventory-item-cell">
                    <div class="inventory-item-icon">
                        <i class="fa-solid fa-box"></i>
                    </div>

                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <small>
                            ${escapeHtml(
                                item.description || "No description"
                            )}
                        </small>
                    </div>
                </div>
            </td>

            <td>${escapeHtml(sku)}</td>

            <td>${escapeHtml(item.category || "Uncategorized")}</td>

            <td>₱${formatMoney(item.price)}</td>

            <td>
                <span class="stock-value ${escapeHtml(status)}">
                    ${Number(item.stock) || 0}
                </span>
            </td>

            <td>
                <span class="inventory-status ${escapeHtml(status)}">
                    ${escapeHtml(statusLabel)}
                </span>
            </td>

            <td>${escapeHtml(updated)}</td>

            <td>
                <div class="inventory-actions">
                    <button
                        type="button"
                        class="action-button view"
                        data-action="view"
                        data-id="${Number(item.id)}"
                        title="View Details"
                        aria-label="View details for ${escapeHtml(item.name)}"
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>

                    <button
                        type="button"
                        class="action-button delete"
                        data-action="archive"
                        data-id="${Number(item.id)}"
                        title="Archive"
                        aria-label="Archive ${escapeHtml(item.name)}"
                    >
                        <i class="fa-solid fa-box-archive"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}


/* =========================================================
   INVENTORY ACTIONS
========================================================= */

function handleInventoryAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    const item = inventoryItems.find(
        inventoryItem => Number(inventoryItem.id) === id
    );

    if (!item) {
        return;
    }

    if (action === "view") {
        openDetailsModal(item);
        return;
    }

    if (action === "archive") {
        openDeleteModal(item);
    }
}


/* =========================================================
   LOW-STOCK ALERTS
========================================================= */

function renderLowStock() {
    const list = getElement("lowStockList");
    const empty = getElement("lowStockEmpty");

    if (!list) {
        return;
    }

    const lowStockItems = inventoryItems
        .filter(item => {
            const status = getStockStatus(item);

            return (
                status === "low-stock" ||
                status === "out-of-stock"
            );
        })
        .sort((a, b) => {
            return (
                (Number(a.stock) || 0) -
                (Number(b.stock) || 0)
            );
        });

    if (lowStockItems.length === 0) {
        list.innerHTML = "";

        if (empty) {
            empty.hidden = false;
            empty.style.display = "";
            list.appendChild(empty);
        }

        return;
    }

    if (empty) {
        empty.hidden = true;
        empty.style.display = "none";
    }

    list.innerHTML = lowStockItems.map(item => {
        const status = getStockStatus(item);
        const label = getStockStatusLabel(item);

        return `
            <div class="low-stock-item">
                <div class="low-stock-item-icon ${escapeHtml(status)}">
                    <i class="fa-solid ${
                        status === "out-of-stock"
                            ? "fa-circle-xmark"
                            : "fa-triangle-exclamation"
                    }"></i>
                </div>

                <div class="low-stock-item-info">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>
                        ${Number(item.stock) || 0} in stock
                        · ${escapeHtml(label)}
                    </span>
                </div>
            </div>
        `;
    }).join("");
}


/* =========================================================
   STOCK ACTIVITY — RECENT INVENTORY TRANSACTIONS
========================================================= */

function renderTransactions() {
    // Re-enable the section before rendering the activity.
    restoreStockActivitySection();

    const tableBody = getElement("transactionsTableBody");
    const empty = getElement("transactionsEmpty");

    if (!tableBody) {
        console.warn(
            "[Inventory] transactionsTableBody was not found. " +
            "Check that the Stock Activity table exists in inventory.html."
        );

        return;
    }

    if (transactions.length === 0) {
        tableBody.innerHTML = "";

        if (empty) {
            empty.hidden = false;
            empty.style.display = "";
        }

        // Keep the Stock Activity section visible when there
        // are no transaction records to display.
        restoreStockActivitySection();

        return;
    }

    if (empty) {
        empty.hidden = true;
        empty.style.display = "none";
    }

    const recentTransactions = [...transactions]
        .sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();

            return dateB - dateA;
        })
        .slice(0, 50);

    tableBody.innerHTML = recentTransactions
        .map(renderTransactionRow)
        .join("");

    restoreStockActivitySection();
}


function renderTransactionRow(transaction) {
    const isOut = transaction.type === "out";

    const typeClass = isOut ? "out" : "in";
    const typeLabel = isOut ? "Stock Out" : "Stock In";
    const sign = isOut ? "-" : "+";

    return `
        <tr>
            <td>${escapeHtml(formatDate(transaction.date))}</td>

            <td>${escapeHtml(transaction.itemName)}</td>

            <td>
                <span class="transaction-type ${typeClass}">
                    <i class="fa-solid ${
                        isOut
                            ? "fa-arrow-up"
                            : "fa-arrow-down"
                    }"></i>
                    ${typeLabel}
                </span>
            </td>

            <td>
                <strong>
                    ${sign}${Number(transaction.quantity) || 0}
                </strong>
            </td>

            <td>${escapeHtml(transaction.reference || "—")}</td>
        </tr>
    `;
}


/* =========================================================
   ITEM DETAILS MODAL — PRODUCT CARD
========================================================= */

function openDetailsModal(item) {
    const modal = getElement("detailsModal");
    const content = getElement("inventoryDetailsContent");

    if (!modal || !content) {
        return;
    }

    currentItem = item;

    const status = getStockStatus(item);
    const statusLabel = getStockStatusLabel(item);

    content.innerHTML = `
        <div class="inventory-details-card">

            <div class="inventory-details-header">
                <div class="inventory-details-heading">
                    <p class="inventory-details-eyebrow">
                        INVENTORY DETAILS
                    </p>

                    <h3>
                        ${escapeHtml(item.name || "Unnamed Item")}
                    </h3>

                    <span class="inventory-details-sku">
                        ${escapeHtml(getItemSku(item))}
                    </span>
                </div>

                <span class="inventory-details-status ${escapeHtml(status)}">
                    ${escapeHtml(statusLabel)}
                </span>
            </div>

            <div class="inventory-details-body">

                <div class="inventory-detail-item">
                    <span class="inventory-detail-label">
                        Category
                    </span>

                    <strong class="inventory-detail-value">
                        ${escapeHtml(item.category || "Uncategorized")}
                    </strong>
                </div>

                <div class="inventory-detail-item price-item">
                    <span class="inventory-detail-label">
                        Price
                    </span>

                    <strong class="inventory-detail-value">
                        ₱${formatMoney(item.price)}
                    </strong>
                </div>

                <div class="inventory-detail-item stock-item">
                    <span class="inventory-detail-label">
                        Current Stock
                    </span>

                    <strong class="inventory-detail-value">
                        ${Number(item.stock) || 0} units
                    </strong>
                </div>

                <div class="inventory-detail-item">
                    <span class="inventory-detail-label">
                        Reorder Level
                    </span>

                    <strong class="inventory-detail-value">
                        ${Number(item.reorderLevel) || 5} units
                    </strong>
                </div>

                <div class="inventory-detail-item">
                    <span class="inventory-detail-label">
                        Date Added
                    </span>

                    <strong class="inventory-detail-value">
                        ${escapeHtml(formatDate(item.created_at))}
                    </strong>
                </div>

                <div class="inventory-detail-item">
                    <span class="inventory-detail-label">
                        Last Updated
                    </span>

                    <strong class="inventory-detail-value">
                        ${escapeHtml(formatDate(item.updated_at))}
                    </strong>
                </div>

            </div>

            <div class="inventory-details-description">
                <h4>
                    <i class="fa-solid fa-align-left"></i>
                    Product Description
                </h4>

                <p>
                    ${escapeHtml(
                        item.description || "No description provided."
                    )}
                </p>
            </div>

        </div>
    `;

    const editButton = getElement("editDetailsButton");

    if (editButton) {
        editButton.hidden = true;
        editButton.style.display = "none";
    }

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
}


function closeDetailsModal() {
    const modal = getElement("detailsModal");

    if (!modal) {
        return;
    }

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    currentItem = null;
}


/* =========================================================
   ARCHIVE CONFIRMATION
========================================================= */

function openDeleteModal(item) {
    const modal = getElement("deleteModal");

    if (!modal) {
        showToast(
            "The archive confirmation dialog is unavailable.",
            "error"
        );

        return;
    }

    currentItem = item;

    const title = getElement(
        "deleteModalTitle",
        "deleteTitle"
    );

    const message = getElement(
        "deleteModalMessage",
        "deleteMessage"
    );

    if (title) {
        title.textContent = "Archive Inventory Item?";
    }

    if (message) {
        message.textContent =
            `Archive "${item.name}"? ` +
            "Archived items will be moved out of Active Inventory. " +
            "The backend may require the item to have zero stock first.";
    }

    const confirmButton = getElement("confirmDeleteButton");

    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = "Archive Item";
    }

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
}


function closeDeleteModal() {
    if (isArchiving) {
        return;
    }

    const modal = getElement("deleteModal");

    if (modal) {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
    }

    currentItem = null;
}


async function handleArchiveConfirmation() {
    if (!currentItem || isArchiving) {
        return;
    }

    const item = currentItem;
    const confirmButton = getElement("confirmDeleteButton");
    const cancelButton = getElement("cancelDeleteButton");

    isArchiving = true;

    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.textContent = "Archiving...";
    }

    if (cancelButton) {
        cancelButton.disabled = true;
    }

    try {
        await apiFetch(
            `/api/admin/inventory/${encodeURIComponent(item.id)}`,
            {
                method: "DELETE"
            }
        );

        const modal = getElement("deleteModal");

        if (modal) {
            modal.hidden = true;
            modal.setAttribute("aria-hidden", "true");
        }

        currentItem = null;

        showToast(
            `"${item.name}" was archived successfully.`,
            "success"
        );

        await loadInventory();

        window.dispatchEvent(
            new CustomEvent("inventory:product-archived", {
                detail: {
                    productId: String(item.id)
                }
            })
        );
    } catch (error) {
        console.error(
            "[Inventory] Archive failed:",
            error
        );

        showToast(
            getFriendlyApiError(error),
            "error"
        );
    } finally {
        isArchiving = false;

        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = "Archive Item";
        }

        if (cancelButton) {
            cancelButton.disabled = false;
        }
    }
}


/* =========================================================
   LOADING STATE
========================================================= */

function showInventoryLoading() {
    const loading = getElement("inventoryLoading");
    const tableContainer = getElement("inventoryTableContainer");

    if (loading) {
        loading.hidden = false;
        loading.style.display = "";
    }

    if (tableContainer && inventoryItems.length === 0) {
        tableContainer.hidden = true;
    }
}


function hideInventoryLoading() {
    const loading = getElement("inventoryLoading");

    if (loading) {
        loading.hidden = true;
        loading.style.display = "none";
    }
}


/* =========================================================
   ERROR STATE
========================================================= */

function showInventoryError(message) {
    const errorContainer = getElement("inventoryError");
    const errorMessage = getElement("inventoryErrorMessage");

    if (errorMessage) {
        errorMessage.textContent = message;
    }

    if (errorContainer) {
        errorContainer.hidden = false;
        errorContainer.style.display = "";
    }
}


function hideInventoryError() {
    const errorContainer = getElement("inventoryError");

    if (errorContainer) {
        errorContainer.hidden = true;
        errorContainer.style.display = "none";
    }
}


function getFriendlyApiError(error) {
    const message = String(
        error?.message || ""
    );

    if (
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("network")
    ) {
        return (
            "Unable to connect to the server. " +
            "Make sure the ADD Motor Shop backend is running."
        );
    }

    if (
        message.toLowerCase().includes("authentication") ||
        message.toLowerCase().includes("admin")
    ) {
        return (
            "Admin authentication is missing or expired. " +
            "Please log in again."
        );
    }

    return message || "An unexpected inventory error occurred.";
}


/* =========================================================
   ADMIN PROFILE
========================================================= */

function loadAdminProfile() {
    let admin = null;

    const storages = [
        localStorage,
        sessionStorage
    ];

    const keys = [
        "adminUser",
        "addMotorUser",
        "user"
    ];

    for (const storage of storages) {
        for (const key of keys) {
            const stored = storage.getItem(key);

            if (!stored) {
                continue;
            }

            try {
                const user = JSON.parse(stored);

                const role = String(
                    user?.role || ""
                ).toLowerCase();

                if (
                    role === "admin" ||
                    key === "adminUser"
                ) {
                    admin = user;
                    break;
                }
            } catch (error) {
                console.warn(
                    "[Inventory] Could not read admin profile.",
                    error
                );
            }
        }

        if (admin) {
            break;
        }
    }

    const displayName =
        admin?.username ||
        admin?.name ||
        admin?.full_name ||
        "tasharet";

    setText("adminName", displayName);
    setText("adminRole", "Admin");

    const avatar = getElement("adminAvatarInitial");

    if (avatar) {
        avatar.textContent = displayName
            ? displayName.charAt(0).toUpperCase()
            : "T";
    }
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function toggleMobileMenu() {
    const sidebar = document.querySelector(
        ".sidebar, .admin-sidebar"
    );

    if (sidebar) {
        sidebar.classList.toggle("active");
        sidebar.classList.toggle("open");
    }

    document.body.classList.toggle("sidebar-open");
}


/* =========================================================
   LOGOUT
========================================================= */

async function handleLogout(event) {
    if (event) {
        event.preventDefault();
    }

    try {
        [
            "adminUser",
            "addMotorUser",
            "adminId"
        ].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    } catch (error) {
        console.warn(
            "[Inventory] Could not clear admin session data.",
            error
        );
    }

    window.location.href = "login.html";
}


/* =========================================================
   TOAST NOTIFICATIONS
========================================================= */

function showToast(message, type = "success") {
    const toast = getElement("inventoryToast");

    if (!toast) {
        console.log(`[Inventory ${type}] ${message}`);
        return;
    }

    const title = getElement("toastTitle");
    const messageElement = getElement("toastMessage");
    const icon = getElement("toastIcon");

    if (title) {
        title.textContent =
            type === "error" ? "Error" : "Success";
    }

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (icon) {
        icon.className = type === "error"
            ? "fa-solid fa-circle-exclamation"
            : "fa-solid fa-circle-check";
    }

    toast.classList.remove("error", "success");
    toast.classList.add(type === "error" ? "error" : "success");

    toast.hidden = false;
    toast.style.display = "";

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(hideToast, 4000);
}


function hideToast() {
    const toast = getElement("inventoryToast");

    if (toast) {
        toast.hidden = true;
        toast.style.display = "none";
    }

    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }
}