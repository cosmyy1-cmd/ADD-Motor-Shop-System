
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "/api/admin/sales";

    // FIX: Inventory products come from the inventory API,
    // not from the sales API.
    const INVENTORY_API = "/api/admin/inventory";

    const $ = (id) => document.getElementById(id);

    const elements = {
        refresh: $("refreshSales"),
        totalSales: $("totalSales"),
        todaySales: $("todaySales"),
        transactionCount: $("transactionCount"),
        itemsSold: $("itemsSold"),

        form: $("saleForm"),
        productSelect: $("productSelect"),
        unitPrice: $("unitPrice"),
        availableStock: $("availableStock"),
        quantity: $("saleQuantity"),
        productHelp: $("productHelp"),
        quantityHelp: $("quantityHelp"),
        calculatedTotal: $("calculatedTotal"),
        totalBreakdown: $("totalBreakdown"),
        submitSale: $("submitSale"),
        resetSale: $("resetSale"),
        formMessage: $("saleFormMessage"),

        search: $("salesSearch"),
        displayedTransactions: $("displayedTransactions"),
        loading: $("salesLoading"),
        error: $("salesError"),
        errorMessage: $("salesErrorMessage"),
        tryAgain: $("tryAgainSales"),
        empty: $("salesEmpty"),
        emptyTitle: $("salesEmptyTitle"),
        emptyMessage: $("salesEmptyMessage"),
        tableWrapper: $("salesTableWrapper"),
        tableBody: $("salesTableBody"),

        modal: $("saleModal"),
        closeModal: $("closeSaleModal"),
        modalReference: $("modalSaleReference"),
        modalDate: $("modalSaleDate"),
        modalBody: $("saleModalBody")
    };

    let products = [];
    let sales = [];
    let isSubmitting = false;


    /* =========================================
       ADMIN AUTHENTICATION HEADERS

       Supports the admin ID stored by the
       admin login/layout.

       The HttpOnly admin_id cookie is also
       automatically sent through credentials.
    ========================================= */

    function getAdminHeaders(extraHeaders = {}) {

        const headers = {
            Accept: "application/json",
            ...extraHeaders
        };

        let adminId = localStorage.getItem("adminId");


        function getStoredAdminId(storageKey) {

            try {

                const storedValue =
                    localStorage.getItem(storageKey);

                if (!storedValue) {
                    return null;
                }

                const parsed =
                    JSON.parse(storedValue);

                if (
                    !parsed ||
                    typeof parsed !== "object"
                ) {
                    return null;
                }

                const role =
                    String(parsed.role || "").toLowerCase();

                if (
                    role &&
                    role !== "admin"
                ) {
                    return null;
                }

                const id =
                    parsed.id ??
                    parsed.admin_id ??
                    parsed.user_id;

                return (
                    id &&
                    Number.isInteger(Number(id)) &&
                    Number(id) > 0
                )
                    ? String(id)
                    : null;

            } catch {

                return null;

            }

        }


        if (!adminId) {

            adminId =
                getStoredAdminId("adminUser") ||
                getStoredAdminId("addMotorUser");

        }


        if (
            adminId &&
            Number.isInteger(Number(adminId)) &&
            Number(adminId) > 0
        ) {

            headers["x-admin-id"] = String(adminId);

        }

        return headers;

    }


    /* =========================================
       API REQUEST
    ========================================= */

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {

            credentials: "include",

            ...options,

            headers: getAdminHeaders(
                options.headers || {}
            )

        });


        let data = {};

        try {

            data = await response.json();

        } catch {

            data = {};

        }


        if (
            !response.ok ||
            data.success === false
        ) {

            throw new Error(
                data.message ||
                `Request failed (${response.status}).`
            );

        }


        return data;

    }


    /* =========================================
       HELPERS
    ========================================= */

    function escapeHtml(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            (character) => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            })[character]
        );

    }


    function money(value) {

        return new Intl.NumberFormat("en-PH", {

            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2

        }).format(Number(value || 0));

    }


    function formatDate(value) {

        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-PH", {

            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"

        });

    }


    function setFormMessage(message, type = "success") {

        elements.formMessage.textContent = message;

        elements.formMessage.className =
            `form-message ${type}`;

        elements.formMessage.classList.remove("hidden");

    }


    function clearFormMessage() {

        elements.formMessage.textContent = "";

        elements.formMessage.className =
            "form-message hidden";

    }


    function showTableState(state) {

        elements.loading.classList.toggle(
            "hidden",
            state !== "loading"
        );

        elements.error.classList.toggle(
            "hidden",
            state !== "error"
        );

        elements.empty.classList.toggle(
            "hidden",
            state !== "empty"
        );

        elements.tableWrapper.classList.toggle(
            "hidden",
            state !== "table"
        );

    }


    /* =========================================
       PRODUCT SELECTION
    ========================================= */

    function getSelectedProduct() {

        const id =
            Number(elements.productSelect.value);

        return products.find(
            (product) => Number(product.id) === id
        ) || null;

    }


    function productCanBeSold(product) {

        return Boolean(

            product &&

            String(product.status).toLowerCase() === "available" &&

            Number(product.stock) > 0

        );

    }


    function renderProductOptions() {

        const previousValue =
            elements.productSelect.value;


        elements.productSelect.innerHTML =
            '<option value="">Select an inventory product</option>';


        if (!products.length) {

            elements.productSelect.innerHTML =
                '<option value="">No inventory products found</option>';

            elements.productHelp.textContent =
                "Add products in Inventory before recording a sale.";

            updateSaleCalculation();

            return;

        }


        products.forEach((product) => {

            const option =
                document.createElement("option");

            option.value =
                String(product.id);


            const unavailable =
                String(product.status).toLowerCase() !== "available";

            const outOfStock =
                Number(product.stock) <= 0;


            option.textContent =
                `${product.name} — ${money(product.price)} — Stock: ${product.stock}` +
                (unavailable ? " (Unavailable)" : "") +
                (outOfStock ? " (Out of stock)" : "");


            option.disabled =
                unavailable || outOfStock;

            elements.productSelect.appendChild(option);

        });


        const previousProduct = products.find(

            (product) =>
                String(product.id) === previousValue

        );


        if (
            previousProduct &&
            productCanBeSold(previousProduct)
        ) {

            elements.productSelect.value =
                String(previousProduct.id);

        }


        updateSaleCalculation();

    }


    function updateSaleCalculation() {

        const product =
            getSelectedProduct();

        const quantity =
            Number(elements.quantity.value);


        if (!product) {

            elements.unitPrice.value = "0.00";

            elements.availableStock.value = "—";

            elements.calculatedTotal.textContent =
                money(0);

            elements.totalBreakdown.textContent =
                "Select a product to calculate the total.";

            elements.productHelp.textContent =
                "Select an available product from Inventory.";

            elements.quantityHelp.textContent =
                "Enter the number of units sold.";

            elements.submitSale.disabled =
                isSubmitting;

            return;

        }


        elements.unitPrice.value =
            Number(product.price).toFixed(2);

        elements.availableStock.value =
            String(product.stock);


        const validQuantity =
            Number.isSafeInteger(quantity) &&
            quantity > 0;


        const total = validQuantity
            ? Number(product.price) * quantity
            : 0;


        elements.calculatedTotal.textContent =
            money(total);

        elements.totalBreakdown.textContent =
            `${validQuantity ? quantity : 0} unit(s) × ${money(product.price)}`;


        if (
            String(product.status).toLowerCase() !== "available"
        ) {

            elements.productHelp.textContent =
                "This product is unavailable and cannot be sold.";

        } else if (
            Number(product.stock) <= 0
        ) {

            elements.productHelp.textContent =
                "This product is out of stock.";

        } else {

            elements.productHelp.textContent =
                `${product.stock} unit(s) currently available.`;

        }


        if (
            validQuantity &&
            quantity > Number(product.stock)
        ) {

            elements.quantityHelp.textContent =
                `Only ${product.stock} unit(s) are available.`;

        } else {

            elements.quantityHelp.textContent =
                "Enter a whole number greater than zero.";

        }


        elements.submitSale.disabled =
            isSubmitting ||
            !productCanBeSold(product);

    }


    /* =========================================
       LOAD INVENTORY PRODUCTS

       FIX:
       Uses /api/admin/inventory.
    ========================================= */

    async function loadProducts() {

        elements.productSelect.disabled = true;

        try {

            const data =
                await apiRequest(INVENTORY_API);


            products = Array.isArray(data.products)

                ? data.products.map((product) => ({

                    ...product,

                    id: Number(product.id),

                    price: Number(product.price),

                    stock: Number(product.stock)

                }))

                : [];


            renderProductOptions();

        } catch (error) {

            products = [];

            elements.productSelect.innerHTML =
                '<option value="">Unable to load inventory products</option>';

            elements.productHelp.textContent =
                error.message;

            updateSaleCalculation();

            throw error;

        } finally {

            elements.productSelect.disabled = false;

        }

    }


    /* =========================================
       LOAD SALES STATISTICS
    ========================================= */

    async function loadStats() {

        const data =
            await apiRequest(`${API_BASE}/stats`);

        const stats =
            data.stats || {};


        elements.totalSales.textContent =
            money(stats.total_sales);

        elements.todaySales.textContent =
            money(stats.today_sales);


        elements.transactionCount.textContent =
            Number(
                stats.total_transactions || 0
            ).toLocaleString("en-PH");


        elements.itemsSold.textContent =
            Number(
                stats.items_sold || 0
            ).toLocaleString("en-PH");

    }


    /* =========================================
       SEARCH SALES
    ========================================= */

    function getFilteredSales() {

        const search =
            elements.search.value.trim().toLowerCase();


        return sales.filter((sale) => {

            if (!search) return true;

            return [

                sale.sale_reference,
                sale.product_name,
                sale.product_id

            ].some((value) =>

                String(value ?? "")
                    .toLowerCase()
                    .includes(search)

            );

        });

    }


    /* =========================================
       RENDER SALES TABLE
    ========================================= */

    function renderSales() {

        const filtered =
            getFilteredSales();


        elements.displayedTransactions.textContent =
            `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;


        if (!filtered.length) {

            elements.emptyTitle.textContent = sales.length
                ? "No Matching Sales"
                : "No Product Sales Yet";


            elements.emptyMessage.textContent = sales.length
                ? "Try a different search term."
                : "Record a product sale to see it listed here.";


            showTableState("empty");

            return;

        }


        elements.tableBody.innerHTML = filtered.map((sale) => `

            <tr>

                <td class="reference">
                    ${escapeHtml(sale.sale_reference)}
                </td>

                <td class="product-name">
                    ${escapeHtml(sale.product_name)}
                </td>

                <td>
                    ${Number(sale.quantity || 0).toLocaleString("en-PH")}
                </td>

                <td>
                    ${money(sale.unit_price)}
                </td>

                <td class="amount">
                    ${money(sale.total_amount)}
                </td>

                <td>
                    ${escapeHtml(formatDate(sale.sale_date))}
                </td>

                <td>

                    <button
                        type="button"
                        class="view-sale-button"
                        data-sale-reference="${escapeHtml(sale.sale_reference)}"
                    >

                        <i class="fa-regular fa-eye"></i>
                        Details

                    </button>

                </td>

            </tr>

        `).join("");


        showTableState("table");

    }


    /* =========================================
       LOAD SALES TRANSACTIONS
    ========================================= */

    async function loadSales() {

        showTableState("loading");

        try {

            const data =
                await apiRequest(API_BASE);

            sales = Array.isArray(data.sales)
                ? data.sales
                : [];

            renderSales();

        } catch (error) {

            elements.errorMessage.textContent =
                error.message;

            showTableState("error");

            throw error;

        }

    }


    /* =========================================
       REFRESH SALES PAGE
    ========================================= */

    async function refreshPage({ showErrors = true } = {}) {

        if (elements.refresh) {
            elements.refresh.disabled = true;
        }

        try {

            const results = await Promise.allSettled([

                loadProducts(),
                loadStats(),
                loadSales()

            ]);


            const failed = results.find(

                (result) =>
                    result.status === "rejected"

            );


            if (failed && showErrors) {

                setFormMessage(

                    `Some information could not be refreshed: ${failed.reason.message}`,

                    "error"

                );

            } else if (!failed) {

                clearFormMessage();

            }

        } finally {

            if (elements.refresh) {
                elements.refresh.disabled = false;
            }

        }

    }


    /* =========================================
       SALE CONFIRMATION MODAL

       The sale is not sent to the backend
       until Confirm Sale is clicked.
    ========================================= */

    function showSaleConfirmation(product, quantity, total) {

        return new Promise((resolve) => {

            const overlay =
                document.createElement("div");

            overlay.className =
                "sale-confirm-overlay";

            overlay.setAttribute(
                "role",
                "presentation"
            );


            overlay.innerHTML = `

                <section
                    class="sale-confirm-card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="saleConfirmTitle"
                    aria-describedby="saleConfirmDescription"
                >

                    <button
                        type="button"
                        class="sale-confirm-close"
                        data-confirm-cancel
                        aria-label="Close confirmation"
                    >

                        <i class="fa-solid fa-xmark"></i>

                    </button>


                    <div class="sale-confirm-icon">

                        <i class="fa-solid fa-receipt"></i>

                    </div>


                    <span class="sale-confirm-eyebrow">
                        SALE REVIEW
                    </span>


                    <h2 id="saleConfirmTitle">
                        Confirm Product Sale
                    </h2>


                    <p
                        id="saleConfirmDescription"
                        class="sale-confirm-intro"
                    >
                        Review the details below before recording this sale.
                    </p>


                    <div class="sale-confirm-product">

                        <span class="sale-confirm-product-label">
                            Product
                        </span>

                        <strong class="sale-confirm-product-name">
                            ${escapeHtml(product.name)}
                        </strong>

                    </div>


                    <div class="sale-confirm-details">

                        <div class="sale-confirm-row">

                            <span>Quantity</span>

                            <strong>
                                ${quantity} unit(s)
                            </strong>

                        </div>


                        <div class="sale-confirm-row">

                            <span>Unit price</span>

                            <strong>
                                ${money(product.price)}
                            </strong>

                        </div>


                        <div class="sale-confirm-row">

                            <span>Available stock before sale</span>

                            <strong>
                                ${Number(product.stock).toLocaleString("en-PH")}
                            </strong>

                        </div>

                    </div>


                    <div class="sale-confirm-total">

                        <div>

                            <span>Total sale amount</span>

                            <small>
                                ${quantity} unit(s) × ${money(product.price)}
                            </small>

                        </div>

                        <strong>
                            ${money(total)}
                        </strong>

                    </div>


                    <div class="sale-confirm-notice">

                        <i class="fa-solid fa-circle-info"></i>

                        <span>
                            Confirming will record this sale and deduct the
                            sold quantity from Inventory.
                        </span>

                    </div>


                    <div class="sale-confirm-actions">

                        <button
                            type="button"
                            class="sale-confirm-cancel"
                            data-confirm-cancel
                        >

                            Cancel

                        </button>


                        <button
                            type="button"
                            class="sale-confirm-submit"
                            data-confirm-submit
                        >

                            <i class="fa-solid fa-check"></i>
                            Confirm Sale

                        </button>

                    </div>

                </section>

            `;


            document.body.appendChild(overlay);


            const confirmButton =
                overlay.querySelector(
                    "[data-confirm-submit]"
                );

            const cancelButtons =
                overlay.querySelectorAll(
                    "[data-confirm-cancel]"
                );


            let settled = false;


            function finish(confirmed) {

                if (settled) return;

                settled = true;

                document.removeEventListener(
                    "keydown",
                    handleKeydown
                );

                overlay.remove();

                resolve(confirmed);

            }


            function handleKeydown(event) {

                if (event.key === "Escape") {
                    finish(false);
                }

            }


            cancelButtons.forEach((button) => {

                button.addEventListener(
                    "click",
                    () => finish(false)
                );

            });


            confirmButton.addEventListener(
                "click",
                () => finish(true)
            );


            overlay.addEventListener("click", (event) => {

                if (event.target === overlay) {
                    finish(false);
                }

            });


            document.addEventListener(
                "keydown",
                handleKeydown
            );


            confirmButton.focus();

        });

    }


    /* =========================================
       SUBMIT PRODUCT SALE
    ========================================= */

    async function submitSale(event) {

        event.preventDefault();

        if (isSubmitting) return;

        clearFormMessage();


        const product =
            getSelectedProduct();

        const quantity =
            Number(elements.quantity.value);


        if (!product) {

            setFormMessage(
                "Please select an inventory product.",
                "error"
            );

            return;

        }


        if (!productCanBeSold(product)) {

            setFormMessage(
                "This product is unavailable or out of stock.",
                "error"
            );

            return;

        }


        if (
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {

            setFormMessage(
                "Quantity must be a whole number greater than zero.",
                "error"
            );

            elements.quantity.focus();

            return;

        }


        if (quantity > Number(product.stock)) {

            setFormMessage(
                `Insufficient stock. Only ${product.stock} unit(s) are available.`,
                "error"
            );

            elements.quantity.focus();

            return;

        }


        const expectedTotal = Number(

            (
                Number(product.price) * quantity
            ).toFixed(2)

        );


        const confirmed =
            await showSaleConfirmation(
                product,
                quantity,
                expectedTotal
            );


        if (!confirmed) return;


        isSubmitting = true;

        elements.submitSale.disabled = true;

        elements.submitSale.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Recording Sale';


        try {

            const data = await apiRequest(API_BASE, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    product_id: product.id,

                    quantity

                })

            });


            const sale =
                data.sale || {};


            setFormMessage(

                `Sale ${sale.sale_reference || ""} recorded successfully. ` +
                `Inventory stock is now ${sale.new_stock ?? "updated"}.`,

                "success"

            );


            elements.form.reset();

            elements.quantity.value = "1";


            await refreshPage({
                showErrors: false
            });

        } catch (error) {

            setFormMessage(
                error.message,
                "error"
            );


            try {

                await loadProducts();

            } catch {

                // Keep the original sale error visible.

            }

        } finally {

            isSubmitting = false;

            elements.submitSale.innerHTML =
                '<i class="fa-solid fa-check"></i> Confirm and Record Sale';

            updateSaleCalculation();

        }

    }


    /* =========================================
       VIEW SALE DETAILS
    ========================================= */

    async function viewSale(reference) {

        elements.modal.classList.remove("hidden");

        elements.modalReference.textContent =
            reference;

        elements.modalDate.textContent =
            "Loading sale details...";

        elements.modalBody.textContent =
            "Loading...";


        try {

            const data = await apiRequest(

                `${API_BASE}/${encodeURIComponent(reference)}`

            );


            const sale =
                data.sale || {};

            const items =
                Array.isArray(sale.items)
                    ? sale.items
                    : [];


            elements.modalReference.textContent =
                sale.sale_reference || reference;

            elements.modalDate.textContent =
                formatDate(sale.sale_date);


            const itemMarkup = items.length

                ? items.map((item) => `

                    <div class="modal-list-item">

                        <div>

                            <strong>
                                ${escapeHtml(item.product_name)}
                            </strong>

                            <span>
                                ${Number(item.quantity)} unit(s) ×
                                ${money(item.unit_price)}
                            </span>

                        </div>

                        <strong>
                            ${money(item.subtotal)}
                        </strong>

                    </div>

                `).join("")

                : "<p>No product details are available for this sale.</p>";


            elements.modalBody.innerHTML = `

                <div class="detail-grid">

                    <div class="detail-box">

                        <span>Sale Reference</span>

                        <strong>
                            ${escapeHtml(sale.sale_reference)}
                        </strong>

                    </div>


                    <div class="detail-box">

                        <span>Total Amount</span>

                        <strong>
                            ${money(sale.total_amount)}
                        </strong>

                    </div>

                </div>


                <section class="modal-section">

                    <h3>Product Details</h3>

                    <div class="modal-list">
                        ${itemMarkup}
                    </div>

                </section>

            `;

        } catch (error) {

            elements.modalDate.textContent = "";

            elements.modalBody.textContent =
                error.message;

        }

    }


    /* =========================================
       CLOSE SALE DETAILS MODAL
    ========================================= */

    function closeSaleModal() {

        elements.modal.classList.add("hidden");

    }


    /* =========================================
       EVENT LISTENERS
    ========================================= */

    elements.form.addEventListener(
        "submit",
        submitSale
    );


    elements.productSelect.addEventListener(
        "change",
        () => {

            clearFormMessage();

            updateSaleCalculation();

        }
    );


    elements.quantity.addEventListener(
        "input",
        updateSaleCalculation
    );


    elements.resetSale.addEventListener(
        "click",
        () => {

            window.setTimeout(() => {

                clearFormMessage();

                elements.quantity.value = "1";

                updateSaleCalculation();

            }, 0);

        }
    );


    elements.search.addEventListener(
        "input",
        renderSales
    );


    elements.refresh.addEventListener(
        "click",
        () => refreshPage()
    );


    elements.tryAgain.addEventListener(
        "click",
        () => refreshPage()
    );


    elements.tableBody.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest("[data-sale-reference]");

            if (button) {

                viewSale(
                    button.dataset.saleReference
                );

            }

        }
    );


    elements.closeModal.addEventListener(
        "click",
        closeSaleModal
    );


    elements.modal.addEventListener(
        "click",
        (event) => {

            if (event.target === elements.modal) {
                closeSaleModal();
            }

        }
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !elements.modal.classList.contains("hidden")
            ) {

                closeSaleModal();

            }

        }
    );


    /* =========================================
       INITIAL LOAD
    ========================================= */

    refreshPage();

});
