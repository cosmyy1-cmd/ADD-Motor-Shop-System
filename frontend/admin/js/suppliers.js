
/* =========================================================
   ADD MOTOR SHOP - SUPPLIERS MANAGEMENT
   Supplier CRUD + Supplier Products

   WORKFLOW:
   1. Save supplier information only.
   2. Show Supplier Added Successfully popup.
   3. Continue opens the separate Add Supplier Product popup.
   4. Existing suppliers can add products from Supplier Details.
   5. New products are created in inventory with stock = 0.
   6. Supplier price is saved in supplier_products only.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "/api/admin/suppliers";
    const SUPPLIER_PRODUCTS_API = "/api/admin/supplier-products";
    const INVENTORY_API = "/api/admin/inventory";

    let suppliers = [];
    let editingSupplierId = null;
    let deletingSupplierId = null;
    let selectedSupplier = null;
    let activeProductSupplierId = null;

    let availableProducts = [];
    let supplierProducts = [];
    let productCategories = [];

    // Retains a created inventory product ID if linking fails.
    let createdProductRetry = null;

    const $ = id => document.getElementById(id);

    const elements = {
        addButton: $("addSupplierButton"),
        emptyAddButton: $("emptyAddSupplierButton"),
        search: $("supplierSearch"),

        supplierModal: $("supplierModal"),
        supplierForm: $("supplierForm"),
        supplierModalTitle: $("supplierModalTitle"),
        supplierModalDescription: $("supplierModalDescription"),
        supplierFormMessage: $("supplierFormMessage"),
        saveSupplier: $("saveSupplier"),
        supplierName: $("supplierName"),
        contact: $("supplierContactPerson"),
        phone: $("supplierPhone"),
        email: $("supplierEmail"),
        address: $("supplierAddress"),

        total: $("totalSuppliers"),
        displayed: $("displayedSuppliers"),
        loading: $("suppliersLoading"),
        error: $("suppliersError"),
        errorMessage: $("suppliersErrorMessage"),
        empty: $("suppliersEmpty"),
        table: $("suppliersTableWrapper"),
        tableBody: $("suppliersTableBody"),
        retry: $("tryAgainSuppliers"),

        deleteModal: $("deleteSupplierModal"),
        deleteName: $("deleteSupplierName"),
        deleteConfirm: $("confirmDeleteSupplier"),

        detailsModal: $("supplierDetailsModal"),
        detailsName: $("detailsSupplierName"),
        detailsStatus: $("detailsSupplierStatus"),
        detailsContact: $("detailsContactPerson"),
        detailsPhone: $("detailsPhone"),
        detailsEmail: $("detailsEmail"),
        detailsAddress: $("detailsAddress"),
        detailsId: $("detailsSupplierId"),
        detailsCreated: $("detailsCreatedAt"),

        successModal: $("supplierSuccessModal"),
        successContinue: $("supplierSuccessContinue"),

        productModal: $("supplierProductModal"),
        productForm: $("supplierAddProductForm"),
        productType: document.querySelectorAll(
            'input[name="supplierProductType"]'
        ),
        registeredField: $("registeredProductField"),
        unregisteredField: $("unregisteredProductField"),
        productSelect: $("supplierProductSelect"),
        newProductName: $("supplierNewProductName"),
        supplierPrice: $("supplierProductPrice"),
        productMessage: $("supplierAddProductMessage"),
        saveProduct: $("saveSupplierProduct"),
        newProductCategory: $("supplierNewProductCategory"),
        newProductPrice: $("supplierNewProductPrice")
    };

    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    function getAdminId() {
        const keys = [
            "adminUser",
            "addMotorUser",
            "user",
            "adminId",
            "userId"
        ];

        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (!value) continue;

            try {
                const parsed = JSON.parse(value);

                if (parsed && typeof parsed === "object") {
                    const id =
                        parsed.id ??
                        parsed.user_id ??
                        parsed.userId ??
                        parsed.admin_id;

                    if (id !== undefined && id !== null) {
                        return id;
                    }
                } else if (parsed) {
                    return parsed;
                }
            } catch {
                return value;
            }
        }

        return null;
    }

    async function apiRequest(url, options = {}) {
        const headers = {
            ...(options.headers || {})
        };

        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        const adminId = getAdminId();
        if (adminId) headers["x-admin-id"] = adminId;

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: "same-origin"
        });

        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.error ||
                `Request failed with status ${response.status}`
            );
        }

        return data;
    }

    /* =====================================================
       DATA HELPERS
    ===================================================== */

    function extractArray(data, keys) {
        if (Array.isArray(data)) return data;

        for (const key of keys) {
            if (Array.isArray(data?.[key])) return data[key];
        }

        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.rows)) return data.rows;

        return [];
    }

    function getSupplierId(supplier) {
        return (
            supplier?.id ??
            supplier?.supplier_id ??
            supplier?.supplierId ??
            null
        );
    }

    function getProductId(product) {
        return (
            product?.id ??
            product?.product_id ??
            product?.productId ??
            null
        );
    }

    function getCategoryId(category) {
        return (
            category?.id ??
            category?.category_id ??
            category?.categoryId ??
            null
        );
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatMoney(value) {
        if (value === null || value === undefined || value === "") {
            return "—";
        }

        const number = Number(value);
        if (!Number.isFinite(number)) return escapeHtml(value);

        return `₱${number.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function supplierNameOf(supplier) {
        return supplier?.name || supplier?.supplier_name || "Unnamed Supplier";
    }

    function productNameOf(product) {
        return product?.name || product?.product_name || "Unnamed Product";
    }

    /* =====================================================
       MODAL HELPERS
    ===================================================== */

    function showModal(modal) {
        if (!modal) return;

        modal.classList.remove("hidden");

        requestAnimationFrame(() => {
            modal.classList.add("show");
        });
    }

    function hideModal(modal) {
        if (!modal) return;

        modal.classList.remove("show");

        setTimeout(() => {
            modal.classList.add("hidden");
        }, 200);
    }

    function isModalOpen(modal) {
        return modal && !modal.classList.contains("hidden");
    }

    /* =====================================================
       SUPPLIER FORM MESSAGES
    ===================================================== */

    function clearSupplierMessage() {
        const message = elements.supplierFormMessage;
        if (!message) return;

        message.textContent = "";
        message.classList.add("hidden");
        message.classList.remove("success", "error");
    }

    function showSupplierMessage(message, type = "error") {
        const element = elements.supplierFormMessage;
        if (!element) return;

        element.textContent = message;
        element.classList.remove("hidden", "success", "error");
        element.classList.add(type);
    }

    /* =====================================================
       PRODUCT FORM MESSAGES
    ===================================================== */

    function clearProductMessage() {
        const message = elements.productMessage;
        if (!message) return;

        message.textContent = "";
        message.classList.add("hidden");
        message.classList.remove("success", "error");
    }

    function showProductMessage(message, type = "error") {
        const element = elements.productMessage;
        if (!element) return;

        element.textContent = message;
        element.classList.remove("hidden", "success", "error");
        element.classList.add(type);
    }

    /* =====================================================
       SUPPLIER LIST STATES
    ===================================================== */

    function showLoading() {
        elements.loading?.classList.remove("hidden");
        elements.error?.classList.add("hidden");
        elements.empty?.classList.add("hidden");
        elements.table?.classList.add("hidden");
    }

    function showError(message) {
        elements.loading?.classList.add("hidden");
        elements.error?.classList.remove("hidden");
        elements.empty?.classList.add("hidden");
        elements.table?.classList.add("hidden");

        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
        }
    }

    function showEmpty() {
        elements.loading?.classList.add("hidden");
        elements.error?.classList.add("hidden");
        elements.empty?.classList.remove("hidden");
        elements.table?.classList.add("hidden");
    }

    function showTable() {
        elements.loading?.classList.add("hidden");
        elements.error?.classList.add("hidden");
        elements.empty?.classList.add("hidden");
        elements.table?.classList.remove("hidden");
    }

    /* =====================================================
       SUPPLIER SEARCH AND RENDERING
    ===================================================== */

    function getFilteredSuppliers() {
        const term = elements.search?.value?.trim().toLowerCase() || "";

        if (!term) return [...suppliers];

        return suppliers.filter(supplier => {
            const searchable = [
                supplier.name,
                supplier.supplier_name,
                supplier.contact_person,
                supplier.contactPerson,
                supplier.phone,
                supplier.email,
                supplier.address
            ].filter(Boolean).join(" ").toLowerCase();

            return searchable.includes(term);
        });
    }

    function renderSuppliers() {
        const body = elements.tableBody;
        if (!body) return;

        const filtered = getFilteredSuppliers();

        if (elements.total) {
            elements.total.textContent = suppliers.length;
        }

        if (elements.displayed) {
            elements.displayed.textContent =
                `${filtered.length} supplier${filtered.length === 1 ? "" : "s"}`;
        }

        body.innerHTML = "";

        if (!filtered.length) {
            showEmpty();
            return;
        }

        filtered.forEach(supplier => {
            const id = getSupplierId(supplier);
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <div class="supplier-name-cell">
                        <div class="supplier-table-icon">
                            <i class="fa-solid fa-truck-field"></i>
                        </div>
                        <div>
                            <strong>${escapeHtml(supplierNameOf(supplier))}</strong>
                            <span>Supplier #${escapeHtml(id ?? "—")}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(supplier.contact_person || supplier.contactPerson || "—")}</td>
                <td>${escapeHtml(supplier.phone || "—")}</td>
                <td>${escapeHtml(supplier.email || "—")}</td>
                <td><span class="address-cell">${escapeHtml(supplier.address || "—")}</span></td>
                <td>
                    <div class="supplier-actions">
                        <button type="button" class="table-action-button view"
                            data-action="view" data-id="${escapeHtml(id)}"
                            title="View Supplier" aria-label="View Supplier">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="table-action-button edit"
                            data-action="edit" data-id="${escapeHtml(id)}"
                            title="Edit Supplier" aria-label="Edit Supplier">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="table-action-button delete"
                            data-action="delete" data-id="${escapeHtml(id)}"
                            title="Delete Supplier" aria-label="Delete Supplier">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            body.appendChild(row);
        });

        showTable();
    }

    async function loadSuppliers() {
        showLoading();

        try {
            const data = await apiRequest(API_BASE);
            suppliers = extractArray(data, ["suppliers", "results", "result"]);
            renderSuppliers();
        } catch (error) {
            console.error("Unable to load suppliers:", error);
            showError(error.message || "Unable to load suppliers.");
        }
    }

    function findSupplierById(id) {
        return suppliers.find(
            supplier => String(getSupplierId(supplier)) === String(id)
        );
    }

    /* =====================================================
       SUPPLIER ADD / EDIT MODALS
    ===================================================== */

    function openAddModal() {
        editingSupplierId = null;
        elements.supplierForm?.reset();
        clearSupplierMessage();

        if (elements.supplierModalTitle) {
            elements.supplierModalTitle.textContent = "Add Supplier";
        }

        if (elements.supplierModalDescription) {
            elements.supplierModalDescription.textContent =
                "Enter the supplier information below.";
        }

        showModal(elements.supplierModal);

        setTimeout(() => elements.supplierName?.focus(), 100);
    }

    function openEditModal(supplier) {
        if (!supplier) return;

        editingSupplierId = getSupplierId(supplier);
        clearSupplierMessage();

        if (elements.supplierModalTitle) {
            elements.supplierModalTitle.textContent = "Edit Supplier";
        }

        if (elements.supplierModalDescription) {
            elements.supplierModalDescription.textContent =
                "Update the supplier information below.";
        }

        if (elements.supplierName) {
            elements.supplierName.value =
                supplier.name || supplier.supplier_name || "";
        }

        if (elements.contact) {
            elements.contact.value =
                supplier.contact_person || supplier.contactPerson || "";
        }

        if (elements.phone) elements.phone.value = supplier.phone || "";
        if (elements.email) elements.email.value = supplier.email || "";
        if (elements.address) elements.address.value = supplier.address || "";

        showModal(elements.supplierModal);
        setTimeout(() => elements.supplierName?.focus(), 100);
    }

    function closeSupplierModal() {
        hideModal(elements.supplierModal);

        setTimeout(() => {
            editingSupplierId = null;
            elements.supplierForm?.reset();
            clearSupplierMessage();
        }, 220);
    }

    function validateSupplierForm() {
        const name = elements.supplierName?.value.trim() || "";
        const contact = elements.contact?.value.trim() || "";
        const phone = elements.phone?.value.trim() || "";

        if (!name) {
            showSupplierMessage("Please enter the supplier name.");
            elements.supplierName?.focus();
            return false;
        }

        if (!contact) {
            showSupplierMessage("Please enter the contact person.");
            elements.contact?.focus();
            return false;
        }

        if (!/^09\d{9}$/.test(phone)) {
            showSupplierMessage(
                "Please enter a valid Philippine mobile number with exactly 11 digits starting with 09 (e.g., 09171234567)."
            );
            elements.phone?.focus();
            return false;
        }

        return true;
    }

    function getSupplierFormData() {
        return {
            name: elements.supplierName?.value.trim() || "",
            contact_person: elements.contact?.value.trim() || "",
            phone: elements.phone?.value.trim() || "",
            email: elements.email?.value.trim() || "",
            address: elements.address?.value.trim() || ""
        };
    }

    function extractCreatedSupplierId(data) {
        return (
            data?.supplier?.id ??
            data?.supplier?.supplier_id ??
            data?.supplier?.supplierId ??
            data?.id ??
            data?.supplier_id ??
            data?.supplierId ??
            data?.data?.id ??
            data?.data?.supplier_id ??
            null
        );
    }

    /* =====================================================
       SUPPLIER SAVE
       IMPORTANT: NO PRODUCT CREATION OR LINKING HERE.
    ===================================================== */

    async function handleSupplierSubmit(event) {
        event.preventDefault();
        clearSupplierMessage();

        if (!validateSupplierForm()) return;

        const isEditing = editingSupplierId !== null &&
            editingSupplierId !== undefined;

        const supplierData = getSupplierFormData();
        const originalHTML = elements.saveSupplier?.innerHTML;

        if (elements.saveSupplier) {
            elements.saveSupplier.disabled = true;
            elements.saveSupplier.innerHTML =
                '<i class="fa-solid fa-rotate fa-spin"></i><span>Saving...</span>';
        }

        try {
            if (isEditing) {
                await apiRequest(
                    `${API_BASE}/${encodeURIComponent(editingSupplierId)}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(supplierData)
                    }
                );

                await loadSuppliers();
                closeSupplierModal();
            } else {
                const data = await apiRequest(API_BASE, {
                    method: "POST",
                    body: JSON.stringify(supplierData)
                });

                const newSupplierId = extractCreatedSupplierId(data);

                if (
                    newSupplierId === null ||
                    newSupplierId === undefined
                ) {
                    throw new Error(
                        "The supplier was saved, but the server did not return its ID. Please refresh the supplier list before adding products."
                    );
                }

                // Store the supplier ID for the Continue button.
                activeProductSupplierId = newSupplierId;

                await loadSuppliers();
                closeSupplierModal();

                showModal(elements.successModal);
            }
        } catch (error) {
            console.error("Unable to save supplier:", error);
            showSupplierMessage(
                error.message || "Unable to save supplier. Please try again."
            );
        } finally {
            if (elements.saveSupplier) {
                elements.saveSupplier.disabled = false;
                elements.saveSupplier.innerHTML = originalHTML ||
                    '<i class="fa-solid fa-floppy-disk"></i><span>Save Supplier</span>';
            }
        }
    }

    /* =====================================================
       SUPPLIER SUCCESS POPUP
    ===================================================== */

    function closeSupplierSuccess() {
        hideModal(elements.successModal);
    }

    function continueToSupplierProducts() {
        if (
            activeProductSupplierId === null ||
            activeProductSupplierId === undefined
        ) {
            closeSupplierSuccess();
            return;
        }

        hideModal(elements.successModal);

        openProductModal(activeProductSupplierId);
    }

    /* =====================================================
       INVENTORY PRODUCTS AND CATEGORIES
    ===================================================== */

    async function loadAvailableProducts() {
        const data = await apiRequest(`${SUPPLIER_PRODUCTS_API}/products`);
        availableProducts = extractArray(data, ["products", "results"]);
        return availableProducts;
    }

    async function loadCategories() {
        const data = await apiRequest(`${INVENTORY_API}/categories`);
        productCategories = extractArray(data, ["categories", "results"]);
        return productCategories;
    }

    async function loadLinkedSupplierProducts(supplierId) {
        if (supplierId === null || supplierId === undefined) {
            supplierProducts = [];
            return [];
        }

        const data = await apiRequest(
            `${SUPPLIER_PRODUCTS_API}/${encodeURIComponent(supplierId)}`
        );

        supplierProducts = extractArray(data, ["products", "supplierProducts"]);
        return supplierProducts;
    }

    /* =====================================================
       PRODUCT FORM CATEGORY FIELD
    ===================================================== */

    function ensureCategoryAndRetailPriceFields() {
        const field = elements.unregisteredField;
        if (!field) return;

        if (!$("supplierNewProductCategory")) {
            const categoryGroup = document.createElement("div");
            categoryGroup.className = "supplier-product-field";
            categoryGroup.id = "supplierNewProductCategoryGroup";
            categoryGroup.innerHTML = `
                <label for="supplierNewProductCategory"
                    class="supplier-add-product-label">Product Category</label>
                <select id="supplierNewProductCategory" class="form-control">
                    <option value="">Select a category</option>
                </select>
            `;

            field.appendChild(categoryGroup);
            elements.newProductCategory = $("supplierNewProductCategory");
        }

        if (!$("supplierNewProductPrice")) {
            const priceGroup = document.createElement("div");
            priceGroup.className = "supplier-product-field";
            priceGroup.id = "supplierNewProductPriceGroup";
            priceGroup.innerHTML = `
                <label for="supplierNewProductPrice"
                    class="supplier-add-product-label">Retail Selling Price</label>
                <div class="supplier-product-price-input">
                    <span>₱</span>
                    <input type="number" id="supplierNewProductPrice"
                        min="0" step="0.01" placeholder="0.00">
                </div>
                <small>This is the customer-facing inventory price.</small>
            `;

            field.appendChild(priceGroup);
            elements.newProductPrice = $("supplierNewProductPrice");
        }
    }

    async function populateCategorySelect() {
        ensureCategoryAndRetailPriceFields();

        const select = $("supplierNewProductCategory");
        if (!select) return;

        select.innerHTML = '<option value="">Loading categories...</option>';

        try {
            const categories = await loadCategories();

            if (!categories.length) {
                select.innerHTML =
                    '<option value="">No categories available</option>';
                return;
            }

            select.innerHTML = `
                <option value="">Select a category</option>
                ${categories.map(category => {
                    const id = getCategoryId(category);
                    const name = category.name ||
                        category.category_name || "Unnamed Category";

                    return `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`;
                }).join("")}
            `;
        } catch (error) {
            console.error("Unable to load categories:", error);
            select.innerHTML =
                '<option value="">Unable to load categories</option>';
            showProductMessage(error.message || "Unable to load categories.");
        }
    }

    /* =====================================================
       PRODUCT TYPE
    ===================================================== */

    function handleProductTypeChange() {
        const selected = document.querySelector(
            'input[name="supplierProductType"]:checked'
        )?.value || "registered";

        elements.productForm?.querySelectorAll(
            ".supplier-product-type-card"
        ).forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            const icon = card.querySelector(".supplier-product-radio i");

            if (radio?.checked) {
                card.classList.add("selected");
                if (icon) icon.className = "fa-solid fa-circle";
            } else {
                card.classList.remove("selected");
                if (icon) icon.className = "fa-regular fa-circle";
            }
        });

        if (selected === "unregistered") {
            ensureCategoryAndRetailPriceFields();
            elements.registeredField?.classList.add("hidden");
            elements.unregisteredField?.classList.remove("hidden");
            populateCategorySelect();

            setTimeout(() => elements.newProductName?.focus(), 50);
        } else {
            elements.registeredField?.classList.remove("hidden");
            elements.unregisteredField?.classList.add("hidden");
        }
    }

    /* =====================================================
       PRODUCT SELECT
    ===================================================== */

    async function populateProductSelect() {
        const select = elements.productSelect;
        if (!select) return;

        select.innerHTML = '<option value="">Loading products...</option>';

        try {
            await loadAvailableProducts();

            const linkedIds = new Set(
                supplierProducts.map(product => String(getProductId(product)))
            );

            const available = availableProducts.filter(product => {
                const id = getProductId(product);
                return id !== null && !linkedIds.has(String(id));
            });

            if (!available.length) {
                select.innerHTML =
                    '<option value="">No available registered products</option>';
                return;
            }

            select.innerHTML = `
                <option value="">Select a registered product</option>
                ${available.map(product => {
                    const id = getProductId(product);
                    const name = productNameOf(product);
                    const category = product.category_name ||
                        product.category || "";

                    return `
                        <option value="${escapeHtml(id)}">
                            ${escapeHtml(name)}${category ? ` — ${escapeHtml(category)}` : ""}
                        </option>
                    `;
                }).join("")}
            `;
        } catch (error) {
            console.error("Unable to load products:", error);
            select.innerHTML =
                '<option value="">Unable to load products</option>';
            showProductMessage(error.message || "Unable to load products.");
        }
    }

    /* =====================================================
       OPEN / CLOSE PRODUCT MODAL
    ===================================================== */

    async function openProductModal(supplierId) {
        if (supplierId === null || supplierId === undefined) {
            alert("Please save the supplier before adding products.");
            return;
        }

        activeProductSupplierId = supplierId;
        clearProductMessage();

        const registeredRadio = document.querySelector(
            'input[name="supplierProductType"][value="registered"]'
        );

        if (registeredRadio) registeredRadio.checked = true;

        if (elements.productSelect) elements.productSelect.value = "";
        if (elements.newProductName) elements.newProductName.value = "";
        if (elements.supplierPrice) elements.supplierPrice.value = "";

        ensureCategoryAndRetailPriceFields();

        if ($("supplierNewProductCategory")) {
            $("supplierNewProductCategory").value = "";
        }

        if ($("supplierNewProductPrice")) {
            $("supplierNewProductPrice").value = "";
        }

        try {
            await loadLinkedSupplierProducts(supplierId);
        } catch (error) {
            supplierProducts = [];
            console.warn("Could not retrieve linked products:", error);
        }

        handleProductTypeChange();
        await populateProductSelect();

        showModal(elements.productModal);
    }

    function closeProductModal() {
        hideModal(elements.productModal);
        clearProductMessage();
    }

    /* =====================================================
       CREATE REAL INVENTORY PRODUCT
    ===================================================== */

    async function createRealProduct(productData) {
        const data = await apiRequest(INVENTORY_API, {
            method: "POST",
            body: JSON.stringify({
                category_id: productData.category_id,
                name: productData.name,
                description: productData.description || null,
                price: Number(productData.retail_price),
                stock: 0,
                image: null,
                status: "available"
            })
        });

        const productId =
            getProductId(data?.product) ??
            data?.id ??
            data?.product_id ??
            data?.productId;

        if (productId === null || productId === undefined) {
            throw new Error(
                "The inventory product may have been created, but the server did not return its ID. Check inventory before retrying."
            );
        }

        return productId;
    }

    /* =====================================================
       SAVE SUPPLIER PRODUCT
    ===================================================== */

    async function handleAddSupplierProduct() {
        const supplierId = activeProductSupplierId;

        if (supplierId === null || supplierId === undefined) {
            showProductMessage("No supplier is selected.");
            return;
        }

        const type = document.querySelector(
            'input[name="supplierProductType"]:checked'
        )?.value || "registered";

        const supplierPriceValue = elements.supplierPrice?.value.trim() || "";

        if (
            supplierPriceValue === "" ||
            !Number.isFinite(Number(supplierPriceValue)) ||
            Number(supplierPriceValue) < 0
        ) {
            showProductMessage("Please enter a valid supplier price.");
            elements.supplierPrice?.focus();
            return;
        }

        const supplierPrice = Number(supplierPriceValue);
        let productId = null;
        let retryKey = null;
        let newProductData = null;

        if (type === "registered") {
            productId = elements.productSelect?.value || "";

            if (!productId) {
                showProductMessage("Please select a registered product.");
                elements.productSelect?.focus();
                return;
            }

            const alreadyLinked = supplierProducts.some(
                product => String(getProductId(product)) === String(productId)
            );

            if (alreadyLinked) {
                showProductMessage("This product is already linked to this supplier.");
                return;
            }
        } else {
            ensureCategoryAndRetailPriceFields();

            const name = elements.newProductName?.value.trim() || "";
            const categoryId = $("supplierNewProductCategory")?.value || "";
            const retailPriceValue =
                $("supplierNewProductPrice")?.value.trim() || "";

            if (!name) {
                showProductMessage("Please enter the product name.");
                elements.newProductName?.focus();
                return;
            }

            if (!categoryId) {
                showProductMessage("Please select a product category.");
                $("supplierNewProductCategory")?.focus();
                return;
            }

            if (
                retailPriceValue === "" ||
                !Number.isFinite(Number(retailPriceValue)) ||
                Number(retailPriceValue) < 0
            ) {
                showProductMessage("Please enter a valid retail selling price.");
                $("supplierNewProductPrice")?.focus();
                return;
            }

            const category = productCategories.find(
                item => String(getCategoryId(item)) === String(categoryId)
            );

            retryKey = [
                supplierId,
                name.toLowerCase(),
                categoryId,
                Number(retailPriceValue)
            ].join("|");

            newProductData = {
                name,
                category_id: categoryId,
                category_name: category?.name ||
                    category?.category_name || "",
                retail_price: Number(retailPriceValue),
                description: null
            };

            // Reuse the product created on a previous failed link attempt.
            if (createdProductRetry?.key === retryKey) {
                productId = createdProductRetry.productId;
            }
        }

        const originalHTML = elements.saveProduct?.innerHTML;

        if (elements.saveProduct) {
            elements.saveProduct.disabled = true;
            elements.saveProduct.innerHTML =
                '<i class="fa-solid fa-rotate fa-spin"></i><span>Saving...</span>';
        }

        try {
            if (type === "unregistered" && !productId) {
                showProductMessage("Creating inventory product...", "success");

                productId = await createRealProduct(newProductData);

                // Save immediately so a failed link can be retried safely.
                createdProductRetry = {
                    key: retryKey,
                    productId
                };
            }

            await apiRequest(SUPPLIER_PRODUCTS_API, {
                method: "POST",
                body: JSON.stringify({
                    supplier_id: supplierId,
                    product_id: productId,
                    supplier_price: supplierPrice
                })
            });

            createdProductRetry = null;

            await loadLinkedSupplierProducts(supplierId);
            await loadAvailableProducts();

            renderDetailsProducts(supplierProducts);

            showProductMessage(
                type === "unregistered"
                    ? "New inventory product created and linked successfully."
                    : "Product linked to supplier successfully.",
                "success"
            );

            setTimeout(() => {
                closeProductModal();

                // If the details popup is open, refresh its product list.
                if (isModalOpen(elements.detailsModal)) {
                    renderDetailsProducts(supplierProducts);
                }
            }, 650);
        } catch (error) {
            console.error("Unable to add supplier product:", error);

            showProductMessage(
                error.message ||
                "Unable to add product. Please try again."
            );
        } finally {
            if (elements.saveProduct) {
                elements.saveProduct.disabled = false;
                elements.saveProduct.innerHTML = originalHTML ||
                    '<i class="fa-solid fa-plus"></i><span>Add Product</span>';
            }
        }
    }

    /* =====================================================
       SUPPLIER DETAILS - PRODUCTS SECTION
    ===================================================== */

    function getSupplierProductsSection() {
        const modalContent = elements.detailsModal?.querySelector(
            ".supplier-details-modal"
        );

        if (!modalContent) return null;

        let section = $("supplierProductsSection");
        if (section) return section;

        section = document.createElement("section");
        section.id = "supplierProductsSection";
        section.className = "supplier-products-section";

        const actions = modalContent.querySelector(".details-actions");

        if (actions) {
            modalContent.insertBefore(section, actions);
        } else {
            modalContent.appendChild(section);
        }

        return section;
    }

    function renderDetailsProducts(products = []) {
        const section = getSupplierProductsSection();
        if (!section) return;

        const rows = products.map(product => {
            const id = getProductId(product);
            const name = productNameOf(product);
            const category = product.category_name ||
                product.category || "—";
            const stock = product.stock ?? 0;
            const price = product.supplier_price ?? product.price;

            return `
                <div class="supplier-product-item">
                    <div class="supplier-product-main">
                        <div class="supplier-product-icon">
                            <i class="fa-solid fa-box"></i>
                        </div>
                        <div class="supplier-product-info">
                            <strong>${escapeHtml(name)}</strong>
                            <span>Product #${escapeHtml(id ?? "—")} · ${escapeHtml(category)}</span>
                        </div>
                    </div>
                    <div class="supplier-product-right">
                        <strong>${formatMoney(price)}</strong>
                        <span>Stock: ${escapeHtml(stock)}</span>
                    </div>
                </div>
            `;
        }).join("");

        section.innerHTML = `
            <div class="supplier-products-header">
                <div class="supplier-products-heading">
                    <span class="modal-eyebrow">PRODUCTS</span>
                    <h3>Products Offered</h3>
                    <p>Products supplied by this supplier.</p>
                </div>

                <button type="button" class="add-product-button"
                    id="detailsAddProductButton">
                    <i class="fa-solid fa-plus"></i>
                    <span>Add Product</span>
                </button>
            </div>

            <div class="supplier-products-list">
                ${rows || `
                    <div class="supplier-products-empty">
                        <i class="fa-solid fa-box-open"></i>
                        <h4>No Products Added</h4>
                        <p>Click "Add Product" to link products supplied by this supplier.</p>
                    </div>
                `}
            </div>
        `;

        $("detailsAddProductButton")?.addEventListener("click", () => {
            const id = getSupplierId(selectedSupplier);
            openProductModal(id);
        });
    }

    async function loadSupplierProducts(supplierId) {
        const section = getSupplierProductsSection();
        if (!section) return;

        section.innerHTML = `
            <div class="supplier-products-loading">
                <i class="fa-solid fa-rotate fa-spin"></i>
                Loading products...
            </div>
        `;

        try {
            await loadLinkedSupplierProducts(supplierId);
            renderDetailsProducts(supplierProducts);
        } catch (error) {
            console.error("Unable to load supplier products:", error);

            section.innerHTML = `
                <div class="supplier-products-error">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span>Unable to load products offered.</span>
                    <button type="button" id="retryDetailsProducts">Try Again</button>
                </div>
            `;

            $("retryDetailsProducts")?.addEventListener(
                "click",
                () => loadSupplierProducts(supplierId)
            );
        }
    }

    /* =====================================================
       OPEN / CLOSE DETAILS
    ===================================================== */

    async function openDetailsModal(supplier) {
        if (!supplier) return;

        selectedSupplier = supplier;

        const id = getSupplierId(supplier);
        const status = supplier.status || "Active";

        if (elements.detailsName) {
            elements.detailsName.textContent = supplierNameOf(supplier);
        }

        if (elements.detailsStatus) {
            elements.detailsStatus.textContent = status;
            elements.detailsStatus.classList.remove("active", "inactive");
            elements.detailsStatus.classList.add(
                String(status).toLowerCase() === "inactive" ? "inactive" : "active"
            );
        }

        if (elements.detailsContact) {
            elements.detailsContact.textContent =
                supplier.contact_person || supplier.contactPerson || "—";
        }

        if (elements.detailsPhone) {
            elements.detailsPhone.textContent = supplier.phone || "—";
        }

        if (elements.detailsEmail) {
            elements.detailsEmail.textContent = supplier.email || "—";
        }

        if (elements.detailsAddress) {
            elements.detailsAddress.textContent = supplier.address || "—";
        }

        if (elements.detailsId) {
            elements.detailsId.textContent = id ?? "—";
        }

        if (elements.detailsCreated) {
            elements.detailsCreated.textContent = formatDate(
                supplier.created_at ||
                supplier.createdAt ||
                supplier.date_created
            );
        }

        showModal(elements.detailsModal);

        if (id !== null && id !== undefined) {
            await loadSupplierProducts(id);
        } else {
            renderDetailsProducts([]);
        }
    }

    function closeDetailsModal() {
        hideModal(elements.detailsModal);
        selectedSupplier = null;
    }

    /* =====================================================
       DELETE SUPPLIER
    ===================================================== */

    function openDeleteModal(supplier) {
        if (!supplier) return;

        deletingSupplierId = getSupplierId(supplier);

        if (elements.deleteName) {
            elements.deleteName.textContent = supplierNameOf(supplier);
        }

        showModal(elements.deleteModal);
    }

    function closeDeleteModal() {
        hideModal(elements.deleteModal);
        deletingSupplierId = null;
    }

    async function handleDeleteSupplier() {
        if (deletingSupplierId === null || deletingSupplierId === undefined) {
            return;
        }

        const originalHTML = elements.deleteConfirm?.innerHTML;

        if (elements.deleteConfirm) {
            elements.deleteConfirm.disabled = true;
            elements.deleteConfirm.innerHTML =
                '<i class="fa-solid fa-rotate fa-spin"></i> Deleting...';
        }

        try {
            await apiRequest(
                `${API_BASE}/${encodeURIComponent(deletingSupplierId)}`,
                { method: "DELETE" }
            );

            closeDeleteModal();
            await loadSuppliers();
        } catch (error) {
            console.error("Unable to delete supplier:", error);
            alert(error.message || "Unable to delete supplier.");
        } finally {
            if (elements.deleteConfirm) {
                elements.deleteConfirm.disabled = false;
                elements.deleteConfirm.innerHTML = originalHTML ||
                    '<i class="fa-solid fa-trash"></i> Delete Supplier';
            }
        }
    }

    /* =====================================================
       TABLE ACTIONS
    ===================================================== */

    elements.tableBody?.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const supplier = findSupplierById(button.dataset.id);
        if (!supplier) return;

        switch (button.dataset.action) {
            case "view":
                openDetailsModal(supplier);
                break;
            case "edit":
                openEditModal(supplier);
                break;
            case "delete":
                openDeleteModal(supplier);
                break;
        }
    });

    /* =====================================================
       PRODUCT FORM EVENTS
    ===================================================== */

    elements.productType.forEach(radio => {
        radio.addEventListener("change", handleProductTypeChange);
    });

    elements.productForm?.querySelectorAll(
        ".supplier-product-type-card"
    ).forEach(card => {
        card.addEventListener("click", event => {
            if (event.target.closest('input[type="radio"]')) return;

            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                handleProductTypeChange();
            }
        });
    });

    elements.saveProduct?.addEventListener(
        "click",
        handleAddSupplierProduct
    );

    $("closeAddSupplierProductForm")?.addEventListener(
        "click",
        closeProductModal
    );

    $("cancelAddSupplierProduct")?.addEventListener(
        "click",
        closeProductModal
    );

    /* =====================================================
       GENERAL EVENT LISTENERS
    ===================================================== */

    elements.addButton?.addEventListener("click", openAddModal);
    elements.emptyAddButton?.addEventListener("click", openAddModal);

    elements.search?.addEventListener("input", renderSuppliers);

    elements.supplierForm?.addEventListener(
        "submit",
        handleSupplierSubmit
    );

    $("closeSupplierModal")?.addEventListener(
        "click",
        closeSupplierModal
    );

    $("cancelSupplier")?.addEventListener(
        "click",
        closeSupplierModal
    );

    $("cancelDeleteSupplier")?.addEventListener(
        "click",
        closeDeleteModal
    );

    elements.deleteConfirm?.addEventListener(
        "click",
        handleDeleteSupplier
    );

    $("closeSupplierDetails")?.addEventListener(
        "click",
        closeDetailsModal
    );

    $("detailsCloseButton")?.addEventListener(
        "click",
        closeDetailsModal
    );

    $("detailsEditButton")?.addEventListener("click", () => {
        if (!selectedSupplier) return;

        const supplier = selectedSupplier;
        closeDetailsModal();

        setTimeout(() => openEditModal(supplier), 220);
    });

    $("supplierSuccessClose")?.addEventListener(
        "click",
        closeSupplierSuccess
    );

    elements.successContinue?.addEventListener(
        "click",
        continueToSupplierProducts
    );

    elements.retry?.addEventListener("click", loadSuppliers);

    /* =====================================================
       BACKDROP CLICKS
    ===================================================== */

    [
        elements.supplierModal,
        elements.deleteModal,
        elements.detailsModal,
        elements.successModal,
        elements.productModal
    ].forEach(modal => {
        modal?.addEventListener("click", event => {
            if (event.target !== modal) return;

            if (modal === elements.supplierModal) closeSupplierModal();
            if (modal === elements.deleteModal) closeDeleteModal();
            if (modal === elements.detailsModal) closeDetailsModal();
            if (modal === elements.successModal) closeSupplierSuccess();
            if (modal === elements.productModal) closeProductModal();
        });
    });

    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        if (isModalOpen(elements.productModal)) {
            closeProductModal();
        } else if (isModalOpen(elements.successModal)) {
            closeSupplierSuccess();
        } else if (isModalOpen(elements.supplierModal)) {
            closeSupplierModal();
        } else if (isModalOpen(elements.deleteModal)) {
            closeDeleteModal();
        } else if (isModalOpen(elements.detailsModal)) {
            closeDetailsModal();
        }
    });

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    loadSuppliers();
});
