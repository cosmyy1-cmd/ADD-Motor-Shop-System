/* =========================================================
   ADD MOTOR SHOP - ADMIN PURCHASES
   Supplier-based purchasing and inventory integration

   FEATURES:
   - Supplier-specific product selection
   - Supplier-specific unit costs
   - Purchase creation
   - Purchase confirmation and success popups
   - Purchase cancellation with confirmation and success popups
   - Purchase details
   - Purchase receiving
   - Inventory stock-in integration
   - Purchase summary cards
   - Search and supplier filtering
   - Toast notifications
   - Dark mode compatibility through shared theme
========================================================= */

const ADMIN_API = "http://localhost:3000";

const PURCHASES_API = "/api/admin/purchases";
const SUPPLIERS_API = "/api/admin/suppliers";
const SUPPLIER_PRODUCTS_API = "/api/admin/supplier-products";


// =========================================================
// DOM ELEMENTS
// =========================================================

const addPurchaseButton =
    document.getElementById("addPurchaseButton");

const emptyAddPurchaseButton =
    document.getElementById("emptyAddPurchaseButton");

const purchaseModal =
    document.getElementById("purchaseModal");

const closePurchaseModal =
    document.getElementById("closePurchaseModal");

const cancelPurchase =
    document.getElementById("cancelPurchase");

const purchaseForm =
    document.getElementById("purchaseForm");

const purchaseSupplier =
    document.getElementById("purchaseSupplier");

const purchaseDate =
    document.getElementById("purchaseDate");

const purchaseNotes =
    document.getElementById("purchaseNotes");

const purchaseItems =
    document.getElementById("purchaseItems");

const addPurchaseItem =
    document.getElementById("addPurchaseItem");

const purchaseFormTotal =
    document.getElementById("purchaseFormTotal");

const purchaseLoading =
    document.getElementById("purchaseLoading");

const purchaseError =
    document.getElementById("purchaseError");

const purchaseErrorMessage =
    document.getElementById("purchaseErrorMessage");

const purchaseEmpty =
    document.getElementById("purchaseEmpty");

const purchaseTableContainer =
    document.getElementById("purchaseTableContainer");

const purchaseTableBody =
    document.getElementById("purchaseTableBody");

const purchaseSearch =
    document.getElementById("purchaseSearch");

const supplierFilter =
    document.getElementById("supplierFilter");

const clearPurchaseFilters =
    document.getElementById("clearPurchaseFilters");

const retryPurchases =
    document.getElementById("retryPurchases");

const purchaseDetailsModal =
    document.getElementById("purchaseDetailsModal");

const closePurchaseDetails =
    document.getElementById("closePurchaseDetails");

const detailsPurchaseTitle =
    document.getElementById("detailsPurchaseTitle");

const purchaseDetailsContent =
    document.getElementById("purchaseDetailsContent");

const purchaseToast =
    document.getElementById("purchaseToast");

const purchaseToastTitle =
    document.getElementById("purchaseToastTitle");

const purchaseToastMessage =
    document.getElementById("purchaseToastMessage");

const closePurchaseToast =
    document.getElementById("closePurchaseToast");


// =========================================================
// SUMMARY ELEMENTS
// =========================================================

const totalProductsPurchased =
    document.getElementById("totalProductsPurchased");

const totalPurchaseQuantity =
    document.getElementById("totalPurchaseQuantity");

const totalPurchaseCost =
    document.getElementById("totalPurchaseCost");


// =========================================================
// APPLICATION DATA
// =========================================================

let purchases = [];
let suppliers = [];

let currentSupplierProducts = [];

let purchaseDetailsCache = new Map();

let toastTimer = null;
let purchaseItemIndex = 0;

let isSavingPurchase = false;
let isCancellingPurchase = false;


// =========================================================
// HELPERS
// =========================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function formatCurrency(value) {

    const amount = Number(value) || 0;

    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP"
    }).format(amount);

}


function formatNumber(value) {

    return new Intl.NumberFormat("en-PH")
        .format(Number(value) || 0);

}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

}


function getAdminHeaders() {

    let adminId = null;

    const storageKeys = [
        "adminUser",
        "addMotorUser",
        "user"
    ];

    for (const key of storageKeys) {

        try {

            const stored =
                localStorage.getItem(key);

            if (!stored) {
                continue;
            }

            const parsed = JSON.parse(stored);

            adminId =
                parsed.id ||
                parsed.user_id ||
                parsed.adminId ||
                parsed.admin_id;

            if (adminId) {
                break;
            }

        } catch (error) {

            console.warn(
                `Unable to read ${key} from localStorage.`,
                error
            );

        }

    }

    const headers = {
        "Content-Type": "application/json"
    };

    if (adminId) {
        headers["x-admin-id"] = String(adminId);
    }

    return headers;

}


async function apiRequest(endpoint, options = {}) {

    const response = await fetch(
        `${ADMIN_API}${endpoint}`,
        {
            ...options,

            credentials: "include",

            headers: {
                ...getAdminHeaders(),
                ...(options.headers || {})
            }
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok || data.success === false) {

        throw new Error(
            data.message ||
            `Request failed (${response.status}).`
        );

    }

    return data;

}


// =========================================================
// PURCHASE CONFIRMATION AND SUCCESS POPUPS
// =========================================================

function injectPurchaseDialogStyles() {

    if (document.getElementById("purchaseDialogStyles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "purchaseDialogStyles";

    style.textContent = `

        .purchase-dialog-overlay {
            position: fixed;
            inset: 0;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(0, 0, 0, 0.60);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            animation: purchaseOverlayFadeIn 0.2s ease;
        }

        .purchase-dialog {
            width: 100%;
            max-width: 440px;
            padding: 32px 28px;
            border-radius: 18px;
            background: #ffffff;
            color: #222222;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
            animation: purchaseDialogSlideIn 0.25s ease;
        }

        .purchase-dialog-icon {
            width: 76px;
            height: 76px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 32px;
        }

        .purchase-dialog-icon.confirm {
            color: #e63946;
            background: rgba(230, 57, 70, 0.12);
        }

        .purchase-dialog-icon.success {
            color: #16a34a;
            background: rgba(22, 163, 74, 0.12);
        }

        .purchase-dialog-icon.cancel {
            color: #dc2626;
            background: rgba(220, 38, 38, 0.12);
        }

        .purchase-dialog h2 {
            margin: 0 0 10px;
            color: #222222;
            font-size: 23px;
            font-weight: 700;
        }

        .purchase-dialog p {
            margin: 0;
            color: #777777;
            font-size: 14px;
            line-height: 1.6;
        }

        .purchase-dialog-total {
            margin: 22px 0;
            padding: 15px;
            border: 1px solid #eeeeee;
            border-radius: 12px;
            background: #f8f8f8;
        }

        .purchase-dialog-total span {
            display: block;
            margin-bottom: 6px;
            color: #777777;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .purchase-dialog-total strong {
            color: #e63946;
            font-size: 25px;
            font-weight: 800;
        }

        .purchase-dialog-actions {
            display: flex;
            gap: 12px;
            margin-top: 25px;
        }

        .purchase-dialog-button {
            min-height: 46px;
            flex: 1;
            padding: 12px 18px;
            border: none;
            border-radius: 9px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition:
                background 0.2s ease,
                transform 0.2s ease,
                opacity 0.2s ease;
        }

        .purchase-dialog-button:hover {
            transform: translateY(-1px);
        }

        .purchase-dialog-button:disabled {
            cursor: not-allowed;
            opacity: 0.6;
            transform: none;
        }

        .purchase-dialog-button.cancel {
            color: #444444;
            background: #eeeeee;
        }

        .purchase-dialog-button.cancel:hover {
            background: #e2e2e2;
        }

        .purchase-dialog-button.confirm {
            color: #ffffff;
            background: #e63946;
        }

        .purchase-dialog-button.confirm:hover {
            background: #c92e3a;
        }

        .purchase-dialog-button.danger {
            color: #ffffff;
            background: #dc2626;
        }

        .purchase-dialog-button.danger:hover {
            background: #b91c1c;
        }

        .purchase-dialog-button.done {
            color: #ffffff;
            background: #16a34a;
        }

        .purchase-dialog-button.done:hover {
            background: #12823c;
        }

        body.dark-mode .purchase-dialog {
            color: #f5f5f5;
            background: #1e1e1e;
        }

        body.dark-mode .purchase-dialog h2 {
            color: #ffffff;
        }

        body.dark-mode .purchase-dialog p {
            color: #b8b8b8;
        }

        body.dark-mode .purchase-dialog-total {
            border-color: #383838;
            background: #292929;
        }

        body.dark-mode .purchase-dialog-total span {
            color: #b8b8b8;
        }

        body.dark-mode .purchase-dialog-button.cancel {
            color: #eeeeee;
            background: #383838;
        }

        body.dark-mode .purchase-dialog-button.cancel:hover {
            background: #484848;
        }

        @keyframes purchaseOverlayFadeIn {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        @keyframes purchaseDialogSlideIn {
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

            .purchase-dialog {
                padding: 27px 20px;
            }

            .purchase-dialog h2 {
                font-size: 20px;
            }

            .purchase-dialog-actions {
                flex-direction: column-reverse;
            }

            .purchase-dialog-button {
                width: 100%;
            }

        }

    `;

    document.head.appendChild(style);

}


function showPurchaseDialog(type, total = 0, purchaseId = null) {

    injectPurchaseDialogStyles();

    return new Promise(resolve => {

        const isPurchaseConfirmation =
            type === "confirm";

        const isCancellationConfirmation =
            type === "cancel-confirm";

        const isCancellation =
            isCancellationConfirmation ||
            type === "cancel-success";

        const isConfirmation =
            isPurchaseConfirmation ||
            isCancellationConfirmation;

        const overlay =
            document.createElement("div");

        overlay.className =
            "purchase-dialog-overlay";

        overlay.setAttribute("role", "presentation");

        const dialog =
            document.createElement("div");

        dialog.className =
            "purchase-dialog";

        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        if (isPurchaseConfirmation) {

            dialog.innerHTML = `

                <div class="purchase-dialog-icon confirm">
                    <i class="fa-solid fa-cart-shopping"></i>
                </div>

                <h2>Confirm Purchase</h2>

                <p>
                    Are you sure you want to purchase this product?
                    Please review the total amount before continuing.
                </p>

                <div class="purchase-dialog-total">

                    <span>Total Purchase Cost</span>

                    <strong>
                        ${formatCurrency(total)}
                    </strong>

                </div>

                <div class="purchase-dialog-actions">

                    <button
                        type="button"
                        class="purchase-dialog-button cancel"
                        data-dialog-action="cancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="purchase-dialog-button confirm"
                        data-dialog-action="confirm"
                    >
                        <i class="fa-solid fa-check"></i>
                        Confirm Purchase
                    </button>

                </div>

            `;

        } else if (isCancellationConfirmation) {

            dialog.innerHTML = `

                <div class="purchase-dialog-icon cancel">
                    <i class="fa-solid fa-ban"></i>
                </div>

                <h2>Cancel Purchase?</h2>

                <p>
                    Are you sure you want to cancel Purchase
                    #${escapeHTML(purchaseId)}?
                    This action will change the purchase status to Cancelled.
                    The purchase record and its items will be preserved.
                </p>

                <div class="purchase-dialog-actions">

                    <button
                        type="button"
                        class="purchase-dialog-button cancel"
                        data-dialog-action="cancel"
                    >
                        Go Back
                    </button>

                    <button
                        type="button"
                        class="purchase-dialog-button danger"
                        data-dialog-action="confirm-cancel"
                    >
                        <i class="fa-solid fa-ban"></i>
                        Confirm Cancellation
                    </button>

                </div>

            `;

        } else if (type === "cancel-success") {

            dialog.innerHTML = `

                <div class="purchase-dialog-icon success">
                    <i class="fa-solid fa-circle-check"></i>
                </div>

                <h2>Purchase Cancelled!</h2>

                <p>
                    Purchase #${escapeHTML(purchaseId)}
                    has been cancelled successfully.
                    Click Done to refresh the purchase records.
                </p>

                <div class="purchase-dialog-actions">

                    <button
                        type="button"
                        class="purchase-dialog-button done"
                        data-dialog-action="done"
                    >
                        Done
                    </button>

                </div>

            `;

        } else {

            dialog.innerHTML = `

                <div class="purchase-dialog-icon success">
                    <i class="fa-solid fa-circle-check"></i>
                </div>

                <h2>Purchase Successful!</h2>

                <p>
                    Your purchase has been saved successfully.
                    Click Done to refresh the page and view the updated purchase records.
                </p>

                <div class="purchase-dialog-total">

                    <span>Total Purchase Cost</span>

                    <strong>
                        ${formatCurrency(total)}
                    </strong>

                </div>

                <div class="purchase-dialog-actions">

                    <button
                        type="button"
                        class="purchase-dialog-button done"
                        data-dialog-action="done"
                    >
                        Done
                    </button>

                </div>

            `;

        }

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        let resolved = false;

        function finish(value) {

            if (resolved) {
                return;
            }

            resolved = true;

            document.removeEventListener(
                "keydown",
                handleDialogKeydown
            );

            overlay.remove();

            resolve(value);

        }

        function handleDialogKeydown(event) {

            if (event.key === "Escape" && isConfirmation) {
                finish(false);
            }

        }

        document.addEventListener(
            "keydown",
            handleDialogKeydown
        );

        dialog.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-dialog-action]"
                    );

                if (!button) {
                    return;
                }

                const action =
                    button.dataset.dialogAction;

                if (action === "cancel") {
                    finish(false);
                }

                if (action === "confirm") {
                    finish(true);
                }

                if (action === "confirm-cancel") {
                    finish(true);
                }

                if (action === "done") {
                    finish(true);
                }

            }
        );

        if (isConfirmation) {

            overlay.addEventListener(
                "click",
                event => {

                    if (event.target === overlay) {
                        finish(false);
                    }

                }
            );

        }

        const firstButton =
            dialog.querySelector("button");

        if (firstButton) {
            firstButton.focus();
        }

    });

}


// =========================================================
// TOAST NOTIFICATIONS
// =========================================================

function showToast(
    message,
    type = "success",
    title = null
) {

    if (!purchaseToast) {
        return;
    }

    clearTimeout(toastTimer);

    purchaseToast.classList.remove(
        "success",
        "error",
        "warning",
        "show"
    );

    purchaseToast.classList.add(type);

    if (purchaseToastTitle) {

        purchaseToastTitle.textContent =
            title ||
            (
                type === "error"
                    ? "Error"
                    : type === "warning"
                        ? "Warning"
                        : "Success"
            );

    }

    if (purchaseToastMessage) {
        purchaseToastMessage.textContent = message;
    }

    purchaseToast.classList.add("show");

    toastTimer = setTimeout(() => {

        purchaseToast.classList.remove("show");

    }, 4000);

}


function hideToast() {

    if (purchaseToast) {
        purchaseToast.classList.remove("show");
    }

    clearTimeout(toastTimer);

}


// =========================================================
// SUPPLIERS
// =========================================================

async function loadSuppliers() {

    const data = await apiRequest(SUPPLIERS_API);

    suppliers = Array.isArray(data.suppliers)
        ? data.suppliers
        : [];

    populateSupplierSelect();

    populateSupplierFilter();

}


function populateSupplierSelect() {

    if (!purchaseSupplier) {
        return;
    }

    const currentValue =
        purchaseSupplier.value;

    purchaseSupplier.innerHTML = `
        <option value="">Select supplier</option>
    `;

    suppliers.forEach(supplier => {

        if (
            supplier.status &&
            supplier.status !== "Active"
        ) {
            return;
        }

        const option =
            document.createElement("option");

        option.value = supplier.id;

        option.textContent =
            supplier.name;

        purchaseSupplier.appendChild(option);

    });

    if (
        currentValue &&
        [...purchaseSupplier.options].some(
            option => option.value === currentValue
        )
    ) {
        purchaseSupplier.value = currentValue;
    }

}


function populateSupplierFilter() {

    if (!supplierFilter) {
        return;
    }

    const currentValue =
        supplierFilter.value;

    supplierFilter.innerHTML = `
        <option value="">All Suppliers</option>
    `;

    suppliers.forEach(supplier => {

        const option =
            document.createElement("option");

        option.value = supplier.id;
        option.textContent = supplier.name;

        supplierFilter.appendChild(option);

    });

    supplierFilter.value = currentValue;

}


// =========================================================
// SUPPLIER-SPECIFIC PRODUCTS
// =========================================================

async function loadSupplierProducts(supplierId) {

    currentSupplierProducts = [];

    if (!supplierId) {

        populateProductSelects();

        return;

    }

    try {

        const data = await apiRequest(
            `${SUPPLIER_PRODUCTS_API}/${encodeURIComponent(supplierId)}`
        );

        currentSupplierProducts =
            Array.isArray(data.products)
                ? data.products
                : [];

        populateProductSelects();

    } catch (error) {

        currentSupplierProducts = [];

        populateProductSelects();

        showToast(
            error.message ||
            "Unable to load this supplier's products.",
            "error"
        );

    }

}


function populateProductSelects() {

    if (!purchaseItems) {
        return;
    }

    const productSelects =
        purchaseItems.querySelectorAll(
            ".purchase-product"
        );

    productSelects.forEach(select => {

        const previousValue = select.value;

        select.innerHTML = `
            <option value="">Select product</option>
        `;

        currentSupplierProducts.forEach(product => {

            const option =
                document.createElement("option");

            option.value = product.product_id;

            option.textContent =
                `${product.name} (Stock: ${product.stock ?? 0})`;

            option.dataset.supplierPrice =
                product.supplier_price ?? "";

            option.dataset.retailPrice =
                product.price ?? "";

            select.appendChild(option);

        });

        if (
            previousValue &&
            [...select.options].some(
                option => option.value === previousValue
            )
        ) {

            select.value = previousValue;

        }

        if (select.value) {

            const selectedOption =
                select.selectedOptions[0];

            const row =
                select.closest(".purchase-item");

            const costInput =
                row?.querySelector(".purchase-unit-cost");

            if (costInput && selectedOption) {

                costInput.value =
                    selectedOption.dataset.supplierPrice ?? "";

            }

        }

    });

}


// =========================================================
// PURCHASE DATA
// =========================================================

function getPurchaseItems(purchase) {

    if (Array.isArray(purchase.items)) {
        return purchase.items;
    }

    if (Array.isArray(purchase.purchase_items)) {
        return purchase.purchase_items;
    }

    if (Array.isArray(purchase.details)) {
        return purchase.details;
    }

    return [];

}


function getPurchaseTotal(purchase) {

    if (purchase.total_amount !== undefined) {
        return Number(purchase.total_amount) || 0;
    }

    if (purchase.total_cost !== undefined) {
        return Number(purchase.total_cost) || 0;
    }

    if (purchase.amount !== undefined) {
        return Number(purchase.amount) || 0;
    }

    return getPurchaseItems(purchase)
        .reduce((sum, item) => {

            return sum +
                (
                    Number(item.quantity) *
                    Number(item.unit_cost)
                );

        }, 0);

}


function getSupplierName(purchase) {

    return (
        purchase.supplier_name ||
        purchase.name ||
        purchase.supplier ||
        "Unknown Supplier"
    );

}


function getPurchaseStatus(purchase) {

    return String(
        purchase.status || "Pending"
    );

}


function getItemQuantity(items) {

    return items.reduce((sum, item) => {

        return sum +
            (Number(item.quantity) || 0);

    }, 0);

}


function getProductCount(purchase) {

    const items = getPurchaseItems(purchase);

    if (items.length > 0) {
        return items.length;
    }

    if (purchase.total_products !== undefined) {
        return Number(purchase.total_products) || 0;
    }

    if (purchase.item_count !== undefined) {
        return Number(purchase.item_count) || 0;
    }

    return 0;

}


// =========================================================
// LOAD PURCHASES
// =========================================================

async function loadPurchases() {

    setLoadingState(true);

    try {

        const data =
            await apiRequest(PURCHASES_API);

        purchases =
            Array.isArray(data.purchases)
                ? data.purchases
                : [];

        purchaseDetailsCache.clear();

        await loadPurchaseDetailsForSummary();

        updateSummary();

        renderPurchases();

    } catch (error) {

        console.error(
            "Unable to load purchases:",
            error
        );

        showPurchaseError(error.message);

    } finally {

        setLoadingState(false);

    }

}


// =========================================================
// LOAD PURCHASE DETAILS
// Used for accurate product counts and search
// =========================================================

async function loadPurchaseDetailsForSummary() {

    const requests = purchases.map(async purchase => {

        const id =
            purchase.id ||
            purchase.purchase_id;

        if (!id) {
            return;
        }

        try {

            const data = await apiRequest(
                `${PURCHASES_API}/${encodeURIComponent(id)}`
            );

            const detailedPurchase =
                data.purchase || data;

            purchaseDetailsCache.set(
                String(id),
                detailedPurchase
            );

        } catch (error) {

            console.warn(
                `Unable to load details for purchase ${id}:`,
                error.message
            );

        }

    });

    await Promise.all(requests);

}


// =========================================================
// SUMMARY CARDS
// =========================================================

function updateSummary() {

    const uniqueProducts = new Set();

    let totalQuantity = 0;
    let totalCost = 0;

    purchases.forEach(purchase => {

        const id =
            purchase.id ||
            purchase.purchase_id;

        const detailedPurchase =
            purchaseDetailsCache.get(String(id));

        const items =
            getPurchaseItems(detailedPurchase || purchase);

        items.forEach(item => {

            const productId =
                item.product_id;

            if (productId !== undefined && productId !== null) {
                uniqueProducts.add(String(productId));
            }

        });

        totalQuantity +=
            items.length > 0
                ? getItemQuantity(items)
                : Number(purchase.total_items || 0);

        totalCost += getPurchaseTotal(purchase);

    });

    if (totalProductsPurchased) {

        totalProductsPurchased.textContent =
            formatNumber(uniqueProducts.size);

    }

    if (totalPurchaseQuantity) {

        totalPurchaseQuantity.textContent =
            formatNumber(totalQuantity);

    }

    if (totalPurchaseCost) {

        totalPurchaseCost.textContent =
            formatCurrency(totalCost);

    }

}


// =========================================================
// PURCHASE TABLE
// HTML COLUMNS:
// ID | SUPPLIER | DATE | PRODUCTS | QUANTITY | COST | ACTIONS
// =========================================================

function renderPurchases() {

    if (!purchaseTableBody) {
        return;
    }

    const filtered =
        getFilteredPurchases();

    purchaseTableBody.innerHTML = "";

    if (filtered.length === 0) {

        if (purchases.length === 0) {

            showEmptyState(true);

        } else {

            showEmptyState(false);

            purchaseTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-results">
                        No matching purchase records found.
                    </td>
                </tr>
            `;

        }

        return;

    }

    showEmptyState(false);

    filtered.forEach(purchase => {

        const id =
            purchase.id ||
            purchase.purchase_id;

        const details =
            purchaseDetailsCache.get(String(id));

        const items =
            getPurchaseItems(details || purchase);

        const productCount =
            items.length > 0
                ? items.length
                : getProductCount(purchase);

        const quantity =
            items.length > 0
                ? getItemQuantity(items)
                : Number(purchase.total_items || 0);

        const status =
            getPurchaseStatus(purchase);

        const canReceive =
            status === "Pending" ||
            status === "Ordered";

        const canCancel =
            status === "Pending" ||
            status === "Ordered";

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>
                <strong>
                    #${escapeHTML(id)}
                </strong>
            </td>

            <td>
                ${escapeHTML(getSupplierName(purchase))}
            </td>

            <td>
                ${formatDate(purchase.purchase_date)}
            </td>

            <td>
                ${formatNumber(productCount)}
            </td>

            <td>
                ${formatNumber(quantity)}
            </td>

            <td>
                <strong>
                    ${formatCurrency(getPurchaseTotal(purchase))}
                </strong>
            </td>

            <td>

                <div class="supplier-actions">

                    <span class="purchase-status status-${escapeHTML(status.toLowerCase().replace(/\s+/g, "-"))}">
                        ${escapeHTML(status)}
                    </span>

                    <button
                        type="button"
                        class="supplier-action-btn view"
                        data-action="view"
                        data-id="${escapeHTML(id)}"
                        title="View purchase details"
                    >
                        <i class="fas fa-eye"></i>
                    </button>

                    ${
                        canReceive
                            ? `
                                <button
                                    type="button"
                                    class="supplier-action-btn receive"
                                    data-action="receive"
                                    data-id="${escapeHTML(id)}"
                                    title="Mark as received"
                                >
                                    <i class="fas fa-box-open"></i>
                                </button>
                            `
                            : ""
                    }

                    ${
                        canCancel
                            ? `
                                <button
                                    type="button"
                                    class="supplier-action-btn cancel"
                                    data-action="cancel"
                                    data-id="${escapeHTML(id)}"
                                    title="Cancel purchase"
                                >
                                    <i class="fas fa-ban"></i>
                                </button>
                            `
                            : ""
                    }

                </div>

            </td>

        `;

        purchaseTableBody.appendChild(row);

    });

}


// =========================================================
// SEARCH AND FILTERING
// =========================================================

function getFilteredPurchases() {

    const search =
        (purchaseSearch?.value || "")
            .trim()
            .toLowerCase();

    const selectedSupplier =
        supplierFilter?.value || "";

    return purchases.filter(purchase => {

        const id =
            String(
                purchase.id ||
                purchase.purchase_id ||
                ""
            ).toLowerCase();

        const supplier =
            getSupplierName(purchase).toLowerCase();

        const details =
            purchaseDetailsCache.get(
                String(purchase.id || purchase.purchase_id)
            );

        const items =
            getPurchaseItems(details || purchase);

        const productNames =
            items.map(item => item.name || item.product_name || "")
                .join(" ")
                .toLowerCase();

        const matchesSearch =
            !search ||
            id.includes(search) ||
            supplier.includes(search) ||
            productNames.includes(search);

        const matchesSupplier =
            !selectedSupplier ||
            String(purchase.supplier_id) === selectedSupplier;

        return matchesSearch && matchesSupplier;

    });

}


function filterPurchases() {

    renderPurchases();

}


// =========================================================
// LOADING / ERROR / EMPTY STATES
// =========================================================

function setLoadingState(loading) {

    if (purchaseLoading) {
        purchaseLoading.style.display =
            loading ? "flex" : "none";
    }

    if (purchaseError && loading) {
        purchaseError.style.display = "none";
    }

    if (purchaseTableContainer) {
        purchaseTableContainer.style.display =
            loading ? "none" : "block";
    }

}


function showPurchaseError(message) {

    if (purchaseError) {
        purchaseError.style.display = "block";
    }

    if (purchaseErrorMessage) {
        purchaseErrorMessage.textContent =
            message ||
            "There was a problem loading purchase records.";
    }

    if (purchaseTableContainer) {
        purchaseTableContainer.style.display = "none";
    }

    if (purchaseEmpty) {
        purchaseEmpty.style.display = "none";
    }

}


function showEmptyState(show) {

    const noPurchases =
        purchases.length === 0;

    if (purchaseEmpty) {
        purchaseEmpty.style.display =
            show && noPurchases ? "flex" : "none";
    }

    if (purchaseTableContainer) {
        purchaseTableContainer.style.display =
            show && noPurchases ? "none" : "block";
    }

}


// =========================================================
// MODAL OPEN / CLOSE
// =========================================================

function openPurchaseModal() {

    if (!purchaseModal || !purchaseForm) {
        return;
    }

    purchaseForm.reset();

    purchaseDate.value =
        new Date().toISOString().split("T")[0];

    currentSupplierProducts = [];

    purchaseItemIndex = 0;

    purchaseSupplier.value = "";

    purchaseItems.innerHTML = "";

    addPurchaseItemRow();

    calculatePurchaseFormTotal();

    purchaseModal.style.display = "flex";

    document.body.classList.add("modal-open");

    populateProductSelects();

}


function closePurchaseModalWindow() {

    if (!purchaseModal) {
        return;
    }

    purchaseModal.style.display = "none";

    document.body.classList.remove("modal-open");

}


function closePurchaseDetailsWindow() {

    if (!purchaseDetailsModal) {
        return;
    }

    purchaseDetailsModal.style.display = "none";

    document.body.classList.remove("modal-open");

}


// =========================================================
// PURCHASE ITEM ROWS
// =========================================================

function addPurchaseItemRow() {

    if (!purchaseItems) {
        return;
    }

    const index = purchaseItemIndex++;

    const row =
        document.createElement("div");

    row.className = "purchase-item";

    row.dataset.itemIndex = index;

    row.innerHTML = `

        <div class="item-field product-field">

            <label>Product</label>

            <select
                name="product_id[]"
                class="purchase-product"
                required
            >

                <option value="">
                    Select product
                </option>

            </select>

        </div>


        <div class="item-field quantity-field">

            <label>Quantity</label>

            <input
                type="number"
                name="quantity[]"
                class="purchase-quantity"
                min="1"
                step="1"
                value="1"
                required
            >

        </div>


        <div class="item-field cost-field">

            <label>Unit Cost</label>

            <div class="currency-input">

                <span>₱</span>

                <input
                    type="number"
                    name="unit_cost[]"
                    class="purchase-unit-cost"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                >

            </div>

        </div>


        <div class="item-field total-field">

            <label>Total</label>

            <div class="item-total">
                ₱0.00
            </div>

        </div>


        <button
            type="button"
            class="remove-item-button"
            aria-label="Remove product"
        >

            <i class="fa-solid fa-trash"></i>

        </button>

    `;

    purchaseItems.appendChild(row);

    populateProductSelects();

    updateRemoveButtons();

    calculatePurchaseFormTotal();

}


function updateRemoveButtons() {

    if (!purchaseItems) {
        return;
    }

    const rows =
        purchaseItems.querySelectorAll(".purchase-item");

    rows.forEach(row => {

        const button =
            row.querySelector(".remove-item-button");

        if (button) {
            button.disabled = rows.length <= 1;
        }

    });

}


// =========================================================
// PURCHASE TOTAL CALCULATION
// =========================================================

function calculatePurchaseFormTotal() {

    if (!purchaseItems) {
        return;
    }

    let grandTotal = 0;

    const rows =
        purchaseItems.querySelectorAll(".purchase-item");

    rows.forEach(row => {

        const quantity =
            Number(
                row.querySelector(".purchase-quantity")?.value
            ) || 0;

        const unitCost =
            Number(
                row.querySelector(".purchase-unit-cost")?.value
            ) || 0;

        const subtotal =
            quantity * unitCost;

        grandTotal += subtotal;

        const totalElement =
            row.querySelector(".item-total");

        if (totalElement) {
            totalElement.textContent =
                formatCurrency(subtotal);
        }

    });

    if (purchaseFormTotal) {

        purchaseFormTotal.textContent =
            formatCurrency(grandTotal);

    }

}


// =========================================================
// PRODUCT SELECTION
// Automatically uses supplier_price
// =========================================================

function handleProductSelection(select) {

    const selectedOption =
        select.selectedOptions[0];

    const row =
        select.closest(".purchase-item");

    if (!row || !selectedOption) {
        return;
    }

    const costInput =
        row.querySelector(".purchase-unit-cost");

    if (!costInput) {
        return;
    }

    const supplierPrice =
        selectedOption.dataset.supplierPrice;

    costInput.value =
        supplierPrice !== "" &&
        supplierPrice !== undefined
            ? supplierPrice
            : "";

    calculatePurchaseFormTotal();

}


// =========================================================
// COLLECT PURCHASE FORM DATA
// =========================================================

function collectPurchaseFormData() {

    const items = [];

    const rows =
        purchaseItems.querySelectorAll(".purchase-item");

    rows.forEach(row => {

        const productId =
            Number(
                row.querySelector(".purchase-product")?.value
            );

        const quantity =
            Number(
                row.querySelector(".purchase-quantity")?.value
            );

        const unitCost =
            Number(
                row.querySelector(".purchase-unit-cost")?.value
            );

        items.push({
            product_id: productId,
            quantity,
            unit_cost: unitCost
        });

    });

    return {

        supplier_id:
            Number(purchaseSupplier.value),

        purchase_date:
            purchaseDate.value,

        notes:
            purchaseNotes.value.trim(),

        items

    };

}


// =========================================================
// VALIDATE PURCHASE
// =========================================================

function validatePurchase(data) {

    if (!data.supplier_id) {

        showToast(
            "Please select a supplier.",
            "warning"
        );

        return false;

    }

    if (!data.purchase_date) {

        showToast(
            "Please select a purchase date.",
            "warning"
        );

        return false;

    }

    if (!data.items.length) {

        showToast(
            "Please add at least one product.",
            "warning"
        );

        return false;

    }

    const selectedIds = new Set();

    for (const item of data.items) {

        if (
            !Number.isInteger(item.product_id) ||
            item.product_id <= 0
        ) {

            showToast(
                "Please select a valid product for every row.",
                "warning"
            );

            return false;

        }

        if (selectedIds.has(item.product_id)) {

            showToast(
                "A product can only appear once in a purchase. Please combine its quantities.",
                "warning"
            );

            return false;

        }

        selectedIds.add(item.product_id);

        if (
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        ) {

            showToast(
                "Product quantities must be whole numbers greater than zero.",
                "warning"
            );

            return false;

        }

        if (
            !Number.isFinite(item.unit_cost) ||
            item.unit_cost < 0
        ) {

            showToast(
                "Please enter a valid supplier unit cost.",
                "warning"
            );

            return false;

        }

        const linkedProduct =
            currentSupplierProducts.find(
                product =>
                    Number(product.product_id) === item.product_id
            );

        if (!linkedProduct) {

            showToast(
                "One or more products do not belong to the selected supplier.",
                "warning"
            );

            return false;

        }

    }

    return true;

}


// =========================================================
// SAVE PURCHASE
// Confirmation -> Save -> Success -> Done -> Refresh
// =========================================================

async function savePurchase(event) {

    event.preventDefault();

    if (isSavingPurchase) {
        return;
    }

    const data =
        collectPurchaseFormData();

    if (!validatePurchase(data)) {
        return;
    }

    const total =
        data.items.reduce((sum, item) => {
            return sum + (
                Number(item.quantity) *
                Number(item.unit_cost)
            );
        }, 0);

    const confirmed =
        await showPurchaseDialog("confirm", total);

    if (!confirmed) {
        return;
    }

    const saveButton =
        document.getElementById("savePurchase");

    isSavingPurchase = true;

    if (saveButton) {

        saveButton.disabled = true;

        saveButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;

    }

    try {

        await apiRequest(PURCHASES_API, {
            method: "POST",
            body: JSON.stringify(data)
        });

        closePurchaseModalWindow();

        const done =
            await showPurchaseDialog("success", total);

        if (done) {
            window.location.reload();
        }

    } catch (error) {

        console.error(
            "Error saving purchase:",
            error
        );

        showToast(
            error.message ||
            "Unable to save purchase.",
            "error"
        );

    } finally {

        isSavingPurchase = false;

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.innerHTML = `
                <i class="fa-solid fa-cart-shopping"></i>
                Purchase Product
            `;

        }

    }

}


// =========================================================
// VIEW PURCHASE DETAILS
// =========================================================

async function viewPurchase(purchaseId) {

    if (!purchaseDetailsModal) {
        return;
    }

    try {

        purchaseDetailsContent.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading purchase details...
            </div>
        `;

        purchaseDetailsModal.style.display = "flex";

        document.body.classList.add("modal-open");

        const data = await apiRequest(
            `${PURCHASES_API}/${encodeURIComponent(purchaseId)}`
        );

        const purchase =
            data.purchase || data;

        purchaseDetailsCache.set(
            String(purchaseId),
            purchase
        );

        if (detailsPurchaseTitle) {

            detailsPurchaseTitle.textContent =
                `Purchase #${purchase.id || purchaseId}`;

        }

        renderPurchaseDetails(purchase);

    } catch (error) {

        console.error(
            "Unable to load purchase details:",
            error
        );

        purchaseDetailsContent.innerHTML = `
            <div class="error-state">
                ${escapeHTML(error.message)}
            </div>
        `;

        showToast(
            error.message ||
            "Unable to load purchase details.",
            "error"
        );

    }

}


// =========================================================
// RENDER PURCHASE DETAILS
// =========================================================

function renderPurchaseDetails(purchase) {

    const items =
        getPurchaseItems(purchase);

    const status =
        getPurchaseStatus(purchase);

    const itemRows = items.map(item => {

        const name =
            item.name ||
            item.product_name ||
            "Unknown Product";

        const quantity =
            Number(item.quantity) || 0;

        const unitCost =
            Number(item.unit_cost) || 0;

        const subtotal =
            item.subtotal !== undefined
                ? Number(item.subtotal)
                : quantity * unitCost;

        return `

            <tr>

                <td>
                    ${escapeHTML(name)}
                </td>

                <td>
                    ${formatNumber(quantity)}
                </td>

                <td>
                    ${formatCurrency(unitCost)}
                </td>

                <td>
                    <strong>
                        ${formatCurrency(subtotal)}
                    </strong>
                </td>

            </tr>

        `;

    }).join("");

    const total =
        purchase.total !== undefined
            ? Number(purchase.total)
            : getPurchaseTotal(purchase);

    purchaseDetailsContent.innerHTML = `

        <div class="purchase-detail-summary">

            <div class="detail-item">

                <span>Supplier</span>

                <strong>
                    ${escapeHTML(getSupplierName(purchase))}
                </strong>

            </div>


            <div class="detail-item">

                <span>Purchase Date</span>

                <strong>
                    ${formatDate(purchase.purchase_date)}
                </strong>

            </div>


            <div class="detail-item">

                <span>Status</span>

                <strong class="purchase-status status-${escapeHTML(status.toLowerCase().replace(/\s+/g, "-"))}">
                    ${escapeHTML(status)}
                </strong>

            </div>


            <div class="detail-item">

                <span>Contact Person</span>

                <strong>
                    ${escapeHTML(purchase.contact_person || "—")}
                </strong>

            </div>


            <div class="detail-item">

                <span>Phone</span>

                <strong>
                    ${escapeHTML(purchase.phone || "—")}
                </strong>

            </div>

        </div>


        <div class="purchase-detail-items">

            <h3>Purchased Products</h3>

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Unit Cost</th>
                            <th>Subtotal</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            itemRows ||
                            `
                                <tr>
                                    <td colspan="4">
                                        No purchase items available.
                                    </td>
                                </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>


        <div class="purchase-detail-total">

            <span>Total Purchase Cost</span>

            <strong>
                ${formatCurrency(total)}
            </strong>

        </div>


        ${
            purchase.notes
                ? `
                    <div class="purchase-detail-notes">

                        <h3>Notes</h3>

                        <p>
                            ${escapeHTML(purchase.notes)}
                        </p>

                    </div>
                `
                : ""
        }

    `;

}


// =========================================================
// MARK PURCHASE AS RECEIVED
// Backend handles stock updates and Stock In transactions.
// Do not manually update stock here.
// =========================================================

async function markPurchaseReceived(purchaseId) {

    const purchase =
        purchases.find(item =>
            String(item.id || item.purchase_id) ===
            String(purchaseId)
        );

    if (!purchase) {

        showToast(
            "Purchase record not found.",
            "error"
        );

        return;

    }

    const status =
        getPurchaseStatus(purchase);

    if (status === "Received") {

        showToast(
            "This purchase has already been received.",
            "warning"
        );

        return;

    }

    if (status === "Cancelled") {

        showToast(
            "Cancelled purchases cannot be received.",
            "warning"
        );

        return;

    }

    const confirmed =
        window.confirm(
            `Mark Purchase #${purchaseId} as received?\n\nThis will update the inventory stock and record Stock In transactions.`
        );

    if (!confirmed) {
        return;
    }

    try {

        await apiRequest(
            `${PURCHASES_API}/${encodeURIComponent(purchaseId)}/receive`,
            {
                method: "PUT",
                body: JSON.stringify({})
            }
        );

        showToast(
            "Purchase received. Inventory stock has been updated."
        );

        await loadPurchases();

    } catch (error) {

        console.error(
            "Unable to receive purchase:",
            error
        );

        showToast(
            error.message ||
            "Unable to receive purchase.",
            "error"
        );

    }

}


// =========================================================
// CANCEL PURCHASE
// Confirmation -> Backend cancellation -> Success -> Done
// =========================================================

async function cancelPurchaseRecord(purchaseId) {

    if (isCancellingPurchase) {
        return;
    }

    const purchase =
        purchases.find(item =>
            String(item.id || item.purchase_id) ===
            String(purchaseId)
        );

    if (!purchase) {

        showToast(
            "Purchase record not found.",
            "error"
        );

        return;

    }

    const status =
        getPurchaseStatus(purchase);

    if (status === "Received") {

        showToast(
            "Received purchases cannot be cancelled because their stock has already been added to inventory.",
            "warning"
        );

        return;

    }

    if (status === "Cancelled") {

        showToast(
            "This purchase has already been cancelled.",
            "warning"
        );

        return;

    }

    if (!["Pending", "Ordered"].includes(status)) {

        showToast(
            "This purchase cannot be cancelled.",
            "warning"
        );

        return;

    }

    const confirmed =
        await showPurchaseDialog(
            "cancel-confirm",
            0,
            purchaseId
        );

    if (!confirmed) {
        return;
    }

    isCancellingPurchase = true;

    try {

        await apiRequest(
            `${PURCHASES_API}/${encodeURIComponent(purchaseId)}/cancel`,
            {
                method: "PUT",
                body: JSON.stringify({})
            }
        );

        const done =
            await showPurchaseDialog(
                "cancel-success",
                0,
                purchaseId
            );

        if (done) {

            await loadPurchases();

        }

    } catch (error) {

        console.error(
            "Unable to cancel purchase:",
            error
        );

        showToast(
            error.message ||
            "Unable to cancel purchase.",
            "error"
        );

    } finally {

        isCancellingPurchase = false;

    }

}


// =========================================================
// EVENT LISTENERS
// =========================================================

if (addPurchaseButton) {

    addPurchaseButton.addEventListener(
        "click",
        openPurchaseModal
    );

}


if (emptyAddPurchaseButton) {

    emptyAddPurchaseButton.addEventListener(
        "click",
        openPurchaseModal
    );

}


if (closePurchaseModal) {

    closePurchaseModal.addEventListener(
        "click",
        closePurchaseModalWindow
    );

}


if (cancelPurchase) {

    cancelPurchase.addEventListener(
        "click",
        closePurchaseModalWindow
    );

}


if (closePurchaseDetails) {

    closePurchaseDetails.addEventListener(
        "click",
        closePurchaseDetailsWindow
    );

}


if (closePurchaseToast) {

    closePurchaseToast.addEventListener(
        "click",
        hideToast
    );

}


if (purchaseSupplier) {

    purchaseSupplier.addEventListener(
        "change",
        async () => {

            await loadSupplierProducts(
                purchaseSupplier.value
            );

        }
    );

}


if (addPurchaseItem) {

    addPurchaseItem.addEventListener(
        "click",
        () => {

            if (!purchaseSupplier.value) {

                showToast(
                    "Please select a supplier first.",
                    "warning"
                );

                return;

            }

            addPurchaseItemRow();

        }
    );

}


if (purchaseForm) {

    purchaseForm.addEventListener(
        "submit",
        savePurchase
    );

}


if (purchaseItems) {

    purchaseItems.addEventListener(
        "change",
        event => {

            if (
                event.target.classList.contains(
                    "purchase-product"
                )
            ) {

                handleProductSelection(
                    event.target
                );

            }

        }
    );


    purchaseItems.addEventListener(
        "input",
        event => {

            if (
                event.target.classList.contains(
                    "purchase-quantity"
                ) ||
                event.target.classList.contains(
                    "purchase-unit-cost"
                )
            ) {

                calculatePurchaseFormTotal();

            }

        }
    );


    purchaseItems.addEventListener(
        "click",
        event => {

            const removeButton =
                event.target.closest(
                    ".remove-item-button"
                );

            if (!removeButton) {
                return;
            }

            const rows =
                purchaseItems.querySelectorAll(
                    ".purchase-item"
                );

            if (rows.length <= 1) {
                return;
            }

            removeButton.closest(
                ".purchase-item"
            ).remove();

            updateRemoveButtons();

            calculatePurchaseFormTotal();

        }
    );

}


if (purchaseSearch) {

    purchaseSearch.addEventListener(
        "input",
        filterPurchases
    );

}


if (supplierFilter) {

    supplierFilter.addEventListener(
        "change",
        filterPurchases
    );

}


if (clearPurchaseFilters) {

    clearPurchaseFilters.addEventListener(
        "click",
        () => {

            if (purchaseSearch) {
                purchaseSearch.value = "";
            }

            if (supplierFilter) {
                supplierFilter.value = "";
            }

            renderPurchases();

        }
    );

}


if (retryPurchases) {

    retryPurchases.addEventListener(
        "click",
        async () => {

            await loadPurchases();

        }
    );

}


// =========================================================
// PURCHASE TABLE ACTIONS
// =========================================================

if (purchaseTableBody) {

    purchaseTableBody.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) {
                return;
            }

            const purchaseId =
                button.dataset.id;

            const action =
                button.dataset.action;

            if (action === "view") {

                viewPurchase(purchaseId);

            }

            if (action === "receive") {

                markPurchaseReceived(purchaseId);

            }

            if (action === "cancel") {

                cancelPurchaseRecord(purchaseId);

            }

        }
    );

}


// =========================================================
// MODAL BACKDROP
// =========================================================

if (purchaseModal) {

    purchaseModal.addEventListener(
        "click",
        event => {

            if (event.target === purchaseModal) {
                closePurchaseModalWindow();
            }

        }
    );

}


if (purchaseDetailsModal) {

    purchaseDetailsModal.addEventListener(
        "click",
        event => {

            if (event.target === purchaseDetailsModal) {
                closePurchaseDetailsWindow();
            }

        }
    );

}


// =========================================================
// ESCAPE KEY
// =========================================================

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }

        if (
            purchaseDetailsModal &&
            purchaseDetailsModal.style.display !== "none"
        ) {

            closePurchaseDetailsWindow();

            return;

        }

        if (
            purchaseModal &&
            purchaseModal.style.display !== "none"
        ) {

            closePurchaseModalWindow();

        }

    }
);


// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.viewPurchase =
    viewPurchase;

window.markPurchaseReceived =
    markPurchaseReceived;

window.cancelPurchaseRecord =
    cancelPurchaseRecord;


// =========================================================
// INITIALIZATION
// =========================================================

async function initializePurchases() {

    setLoadingState(true);

    const results =
        await Promise.allSettled([
            loadSuppliers(),
            loadPurchases()
        ]);

    const supplierResult =
        results[0];

    if (supplierResult.status === "rejected") {

        console.error(
            "Supplier loading failed:",
            supplierResult.reason
        );

        showToast(
            supplierResult.reason?.message ||
            "Unable to load suppliers.",
            "error"
        );

    }

    if (purchaseItems && purchaseItems.children.length === 0) {
        addPurchaseItemRow();
    }

    calculatePurchaseFormTotal();

    setLoadingState(false);

}


initializePurchases();