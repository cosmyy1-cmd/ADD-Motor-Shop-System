
 // =========================================================
 // ADD MOTOR SHOP - INVENTORY ARCHIVE
 // File: frontend/admin/js/inventory-archive.js
 //
 // Features:
 // - Load archived products from the backend
 // - Switch between Active and Archived Inventory
 // - Display archived product count
 // - Restore archived products with confirmation
 // - Handle authentication and API errors
 //
 // Existing inventory.js remains responsible for
 // adding, editing, stock transactions, and archiving.
 // =========================================================

(function () {
    "use strict";

    const API_BASE = "/api/admin/inventory";

    const elements = {
        activeTab: document.getElementById("activeInventoryTab"),
        archivedTab: document.getElementById("archivedInventoryTab"),

        activePanel: document.getElementById("activeInventoryPanel"),
        archivedPanel: document.getElementById("archivedInventoryPanel"),

        archiveCount: document.getElementById("archiveCount"),
        refreshButton: document.getElementById("refreshArchiveButton"),

        loading: document.getElementById("archiveLoading"),
        error: document.getElementById("archiveError"),
        errorMessage: document.getElementById("archiveErrorMessage"),
        retryButton: document.getElementById("retryArchiveButton"),

        empty: document.getElementById("archiveEmpty"),
        tableContainer: document.getElementById("archiveTableContainer"),
        tableBody: document.getElementById("archiveTableBody"),

        restoreModal: document.getElementById("restoreModal"),
        restoreModalTitle: document.getElementById("restoreModalTitle"),
        restoreModalMessage: document.getElementById("restoreModalMessage"),
        cancelRestoreButton: document.getElementById("cancelRestoreButton"),
        confirmRestoreButton: document.getElementById("confirmRestoreButton")
    };

    let archivedProducts = [];
    let selectedProduct = null;
    let isLoading = false;
    let isRestoring = false;
    let lastFocusedElement = null;

    // -----------------------------------------------------
    // General helpers
    // -----------------------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return replacements[character];
        });
    }

    function getAdminId() {
        const possibleKeys = [
            "adminUser",
            "addMotorUser",
            "user",
            "loggedInUser",
            "currentUser"
        ];

        for (const key of possibleKeys) {
            try {
                const rawValue =
                    localStorage.getItem(key) ||
                    sessionStorage.getItem(key);

                if (!rawValue) {
                    continue;
                }

                try {
                    const parsed = JSON.parse(rawValue);

                    if (parsed && typeof parsed === "object") {
                        const id =
                            parsed.admin_id ??
                            parsed.user_id ??
                            parsed.id ??
                            parsed.userId;

                        if (id !== undefined && id !== null && id !== "") {
                            return String(id);
                        }
                    } else if (
                        typeof parsed === "number" ||
                        typeof parsed === "string"
                    ) {
                        if (String(parsed).trim() !== "") {
                            return String(parsed);
                        }
                    }
                } catch {
                    // The value may be a plain string rather than JSON.
                    if (rawValue.trim() !== "") {
                        return rawValue.trim();
                    }
                }
            } catch {
                // Storage may be unavailable. Cookie authentication
                // can still be used by the backend.
            }
        }

        return null;
    }

    function buildHeaders(includeJSON) {
        const headers = {};

        if (includeJSON) {
            headers["Content-Type"] = "application/json";
        }

        const adminId = getAdminId();

        if (adminId) {
            headers["x-admin-id"] = adminId;
        }

        return headers;
    }

    async function apiRequest(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...buildHeaders(options.body !== undefined),
                ...(options.headers || {})
            },
            credentials: "same-origin"
        });

        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error(
                    "The server returned an unexpected response. " +
                    "Check that the admin inventory API is running."
                );
            }
        }

        if (!response.ok || data.success === false) {
            if (response.status === 401 || response.status === 403) {
                throw new Error(
                    "Admin authentication failed. Please sign in to the " +
                    "ADD Motor Shop admin portal again."
                );
            }

            throw new Error(
                data.message ||
                data.error ||
                `Request failed with status ${response.status}.`
            );
        }

        return data;
    }

    function formatCurrency(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "₱0.00";
        }

        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
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

    function getProductId(product) {
        return product.product_id ?? product.id;
    }

    function getProductName(product) {
        return product.name || product.product_name || "Unnamed product";
    }

    function getProductDescription(product) {
        return product.description || "";
    }

    function getProductCategory(product) {
        return (
            product.category_name ||
            product.category ||
            product.categoryName ||
            "Uncategorized"
        );
    }

    function getProductPrice(product) {
        return product.price ?? product.selling_price ?? 0;
    }

    function getProductImage(product) {
        return product.image || product.image_url || product.product_image || "";
    }

    // -----------------------------------------------------
    // Toast notifications
    // -----------------------------------------------------

    function showToast(message, type = "success") {
        // Use an existing project toast if inventory.js exposes one.
        if (typeof window.showToast === "function") {
            window.showToast(message, type);
            return;
        }

        if (typeof window.showNotification === "function") {
            window.showNotification(message, type);
            return;
        }

        let toast = document.getElementById("inventoryArchiveToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "inventoryArchiveToast";
            toast.setAttribute("role", "status");

            Object.assign(toast.style, {
                position: "fixed",
                right: "24px",
                bottom: "24px",
                zIndex: "12000",
                maxWidth: "min(420px, calc(100vw - 32px))",
                padding: "14px 18px",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "14px",
                lineHeight: "1.5",
                boxShadow: "0 5px 20px rgba(0,0,0,0.18)",
                overflowWrap: "anywhere"
            });

            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.background =
            type === "error" ? "#b42332" : "#237341";

        toast.hidden = false;
    }

    // -----------------------------------------------------
    // Archive count and view state
    // -----------------------------------------------------

    function updateArchiveCount(count) {
        if (!elements.archiveCount) {
            return;
        }

        elements.archiveCount.textContent = String(count);

        // Also support a count badge inside the tab.
        const tabCount = elements.archivedTab
            ? elements.archivedTab.querySelector(".tab-count")
            : null;

        if (tabCount) {
            tabCount.textContent = String(count);
        }

        elements.archiveCount.setAttribute(
            "aria-label",
            `${count} archived inventory items`
        );
    }

    function switchView(view) {
        const showArchived = view === "archived";

        if (elements.activePanel) {
            elements.activePanel.hidden = showArchived;
        }

        if (elements.archivedPanel) {
            elements.archivedPanel.hidden = !showArchived;
        }

        if (elements.activeTab) {
            elements.activeTab.classList.toggle("active", !showArchived);
            elements.activeTab.setAttribute(
                "aria-selected",
                String(!showArchived)
            );
        }

        if (elements.archivedTab) {
            elements.archivedTab.classList.toggle("active", showArchived);
            elements.archivedTab.setAttribute(
                "aria-selected",
                String(showArchived)
            );
        }

        if (showArchived) {
            loadArchivedProducts();
        }
    }

    // -----------------------------------------------------
    // Loading and error states
    // -----------------------------------------------------

    function setVisible(element, visible) {
        if (element) {
            element.hidden = !visible;
        }
    }

    function showArchiveError(message) {
        setVisible(elements.error, true);

        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
        }

        setVisible(elements.loading, false);
        setVisible(elements.empty, false);
        setVisible(elements.tableContainer, false);
    }

    function hideArchiveError() {
        setVisible(elements.error, false);

        if (elements.errorMessage) {
            elements.errorMessage.textContent = "";
        }
    }

    // -----------------------------------------------------
    // Archived product table
    // -----------------------------------------------------

    function renderArchivedProducts(products) {
        if (!elements.tableBody) {
            return;
        }

        elements.tableBody.replaceChildren();

        if (!products.length) {
            setVisible(elements.tableContainer, false);
            setVisible(elements.empty, true);
            return;
        }

        const rows = products.map(function (product) {
            const productId = getProductId(product);
            const productName = getProductName(product);
            const description = getProductDescription(product);
            const category = getProductCategory(product);
            const price = getProductPrice(product);
            const image = getProductImage(product);

            // Display the stock quantity returned by the backend.
            // This does not create or change any inventory records.
            const stockValue =
                product.stock ??
                product.quantity ??
                product.stock_quantity ??
                0;

            const archivedDate =
                product.archived_at ||
                product.updated_at ||
                product.created_at;

            const safeId = escapeHTML(productId);
            const safeName = escapeHTML(productName);
            const safeDescription = escapeHTML(description);
            const safeCategory = escapeHTML(category);
            const safeDate = escapeHTML(formatDate(archivedDate));
            const safePrice = escapeHTML(formatCurrency(price));
            const safeStock = escapeHTML(stockValue);

            let imageMarkup = `
                <div class="archive-no-image" aria-label="No product image">
                    <span aria-hidden="true">📦</span>
                </div>
            `;

            if (image) {
                // Only allow local relative paths or HTTP(S) image URLs.
                const trimmedImage = String(image).trim();

                const safeProtocol =
                    /^https?:\/\//i.test(trimmedImage) ||
                    /^\/(?!\/)/.test(trimmedImage) ||
                    /^\.{1,2}\//.test(trimmedImage);

                if (safeProtocol) {
                    imageMarkup = `
                        <img
                            class="archive-product-image"
                            src="${escapeHTML(trimmedImage)}"
                            alt="${safeName}"
                            loading="lazy"
                            onerror="this.style.display='none';"
                        >
                    `;
                }
            }

            // IMPORTANT:
            // The ITEM column contains both the image and product details.
            // The row now has exactly seven cells to match the seven headers:
            // ITEM, CATEGORY, PRICE, STOCK, STATUS, DATE ADDED, ACTIONS.
            return `
                <tr data-product-id="${safeId}">
                    <td>
                        <div class="archive-product-item" style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            min-width: 180px;
                        ">
                            ${imageMarkup}

                            <div style="
                                display: flex;
                                flex-direction: column;
                                min-width: 0;
                            ">
                                <span class="archive-product-name">
                                    ${safeName}
                                </span>

                                ${
                                    description
                                        ? `
                                            <span
                                                class="archive-product-description"
                                                title="${safeDescription}"
                                            >${safeDescription}</span>
                                        `
                                        : ""
                                }
                            </div>
                        </div>
                    </td>

                    <td>${safeCategory}</td>

                    <td>${safePrice}</td>

                    <td>${safeStock}</td>

                    <td>
                        <span class="archive-status">Archived</span>
                    </td>

                    <td class="archive-date">${safeDate}</td>

                    <td>
                        <div class="archive-actions">
                            <button
                                type="button"
                                class="archive-restore-button"
                                data-restore-id="${safeId}"
                                aria-label="Restore ${safeName}"
                            >
                                <span aria-hidden="true">↩</span>
                                Restore
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        elements.tableBody.innerHTML = rows;

        setVisible(elements.empty, false);
        setVisible(elements.tableContainer, true);
    }

    // -----------------------------------------------------
    // Fetch archived products
    // -----------------------------------------------------

    async function loadArchivedProducts() {
        if (isLoading) {
            return;
        }

        isLoading = true;

        setVisible(elements.loading, true);
        setVisible(elements.empty, false);
        setVisible(elements.tableContainer, false);
        hideArchiveError();

        if (elements.refreshButton) {
            elements.refreshButton.disabled = true;
        }

        if (elements.retryButton) {
            elements.retryButton.disabled = true;
        }

        try {
            const data = await apiRequest(`${API_BASE}/archive`, {
                method: "GET"
            });

            // The archive API returns an object containing products.
            const products = Array.isArray(data.products)
                ? data.products
                : Array.isArray(data.data)
                    ? data.data
                    : [];

            archivedProducts = products;

            updateArchiveCount(
                Number.isFinite(Number(data.count))
                    ? Number(data.count)
                    : products.length
            );

            renderArchivedProducts(products);
        } catch (error) {
            console.error(
                "[Inventory Archive] Failed to load archived products:",
                error
            );

            showArchiveError(
                error.message ||
                "Unable to load archived inventory. Please try again."
            );
        } finally {
            isLoading = false;

            setVisible(elements.loading, false);

            if (elements.refreshButton) {
                elements.refreshButton.disabled = false;
            }

            if (elements.retryButton) {
                elements.retryButton.disabled = false;
            }
        }
    }

    // -----------------------------------------------------
    // Restore confirmation modal
    // -----------------------------------------------------

    function openRestoreModal(product) {
        if (!elements.restoreModal || !product) {
            return;
        }

        selectedProduct = product;
        lastFocusedElement = document.activeElement;

        const name = getProductName(product);

        if (elements.restoreModalTitle) {
            elements.restoreModalTitle.textContent = "Restore Inventory Item?";
        }

        if (elements.restoreModalMessage) {
            elements.restoreModalMessage.textContent =
                `Restore "${name}" to Active Inventory? ` +
                "The product will become available in the active inventory list again.";
        }

        if (elements.confirmRestoreButton) {
            elements.confirmRestoreButton.disabled = false;
            elements.confirmRestoreButton.textContent = "Restore Item";
        }

        elements.restoreModal.hidden = false;
        elements.restoreModal.setAttribute("aria-hidden", "false");

        if (elements.confirmRestoreButton) {
            elements.confirmRestoreButton.focus();
        }
    }

    function closeRestoreModal() {
        if (!elements.restoreModal || isRestoring) {
            return;
        }

        elements.restoreModal.hidden = true;
        elements.restoreModal.setAttribute("aria-hidden", "true");

        selectedProduct = null;

        if (
            lastFocusedElement &&
            typeof lastFocusedElement.focus === "function"
        ) {
            lastFocusedElement.focus();
        }
    }

    // -----------------------------------------------------
    // Restore archived product
    // -----------------------------------------------------

    async function restoreSelectedProduct() {
        if (!selectedProduct || isRestoring) {
            return;
        }

        const productId = getProductId(selectedProduct);

        if (
            productId === undefined ||
            productId === null ||
            String(productId).trim() === ""
        ) {
            showToast(
                "Cannot restore this product because its ID is missing.",
                "error"
            );
            return;
        }

        isRestoring = true;

        if (elements.confirmRestoreButton) {
            elements.confirmRestoreButton.disabled = true;
            elements.confirmRestoreButton.textContent = "Restoring...";
        }

        if (elements.cancelRestoreButton) {
            elements.cancelRestoreButton.disabled = true;
        }

        try {
            await apiRequest(
                `${API_BASE}/${encodeURIComponent(productId)}/restore`,
                {
                    method: "POST"
                }
            );

            const restoredName = getProductName(selectedProduct);

            // Close the modal before clearing the selection.
            if (elements.restoreModal) {
                elements.restoreModal.hidden = true;
                elements.restoreModal.setAttribute("aria-hidden", "true");
            }

            selectedProduct = null;

            showToast(
                `"${restoredName}" was restored to Active Inventory.`,
                "success"
            );

            // Reload the archive to remove the restored product and
            // update the count from the backend.
            await loadArchivedProducts();

            // Notify other inventory code without requiring it to exist.
            window.dispatchEvent(
                new CustomEvent("inventory:product-restored", {
                    detail: {
                        productId: String(productId)
                    }
                })
            );

            // If inventory.js exposes a reload function, use it so
            // the restored product appears in the active table immediately.
            const possibleReloadFunctions = [
                "loadInventory",
                "loadProducts",
                "fetchInventory",
                "fetchProducts",
                "renderInventory"
            ];

            for (const functionName of possibleReloadFunctions) {
                if (typeof window[functionName] === "function") {
                    try {
                        const result = window[functionName]();

                        if (
                            result &&
                            typeof result.then === "function"
                        ) {
                            await result;
                        }

                        break;
                    } catch (reloadError) {
                        console.warn(
                            `[Inventory Archive] ${functionName} could not refresh the active list:`,
                            reloadError
                        );
                    }
                }
            }
        } catch (error) {
            console.error(
                "[Inventory Archive] Restore failed:",
                error
            );

            showToast(
                error.message || "Failed to restore the inventory item.",
                "error"
            );
        } finally {
            isRestoring = false;

            if (elements.confirmRestoreButton) {
                elements.confirmRestoreButton.disabled = false;
                elements.confirmRestoreButton.textContent = "Restore Item";
            }

            if (elements.cancelRestoreButton) {
                elements.cancelRestoreButton.disabled = false;
            }
        }
    }

    // -----------------------------------------------------
    // Event listeners
    // -----------------------------------------------------

    function initializeTabs() {
        if (elements.activeTab) {
            elements.activeTab.addEventListener("click", function () {
                switchView("active");
            });

            elements.activeTab.setAttribute("role", "tab");
        }

        if (elements.archivedTab) {
            elements.archivedTab.addEventListener("click", function () {
                switchView("archived");
            });

            elements.archivedTab.setAttribute("role", "tab");
        }

        if (elements.activePanel) {
            elements.activePanel.setAttribute("role", "tabpanel");
        }

        if (elements.archivedPanel) {
            elements.archivedPanel.setAttribute("role", "tabpanel");
        }
    }

    function initializeArchiveControls() {
        if (elements.refreshButton) {
            elements.refreshButton.addEventListener(
                "click",
                loadArchivedProducts
            );
        }

        if (elements.retryButton) {
            elements.retryButton.addEventListener(
                "click",
                loadArchivedProducts
            );
        }

        if (elements.tableBody) {
            elements.tableBody.addEventListener("click", function (event) {
                const button = event.target.closest("[data-restore-id]");

                if (!button) {
                    return;
                }

                const requestedId = button.getAttribute("data-restore-id");

                const product = archivedProducts.find(function (item) {
                    return String(getProductId(item)) === String(requestedId);
                });

                if (product) {
                    openRestoreModal(product);
                }
            });
        }

        if (elements.cancelRestoreButton) {
            elements.cancelRestoreButton.addEventListener(
                "click",
                closeRestoreModal
            );
        }

        if (elements.confirmRestoreButton) {
            elements.confirmRestoreButton.addEventListener(
                "click",
                restoreSelectedProduct
            );
        }

        if (elements.restoreModal) {
            elements.restoreModal.addEventListener("click", function (event) {
                if (event.target === elements.restoreModal) {
                    closeRestoreModal();
                }
            });
        }

        document.addEventListener("keydown", function (event) {
            if (
                event.key === "Escape" &&
                elements.restoreModal &&
                !elements.restoreModal.hidden
            ) {
                closeRestoreModal();
            }
        });
    }

    // -----------------------------------------------------
    // Initialize
    // -----------------------------------------------------

    function initialize() {
        if (!elements.activeTab || !elements.archivedTab) {
            console.warn(
                "[Inventory Archive] Archive tabs were not found. " +
                "Check that inventory.html includes the archive markup."
            );
            return;
        }

        initializeTabs();
        initializeArchiveControls();

        updateArchiveCount(0);

        // Start on Active Inventory, preserving the existing page flow.
        if (elements.activePanel) {
            elements.activePanel.hidden = false;
        }

        if (elements.archivedPanel) {
            elements.archivedPanel.hidden = true;
        }

        elements.activeTab.classList.add("active");
        elements.activeTab.setAttribute("aria-selected", "true");
        elements.archivedTab.classList.remove("active");
        elements.archivedTab.setAttribute("aria-selected", "false");

        // Fetch the count without forcing the user into the archive tab.
        loadArchivedProducts().finally(function () {
            // Keep the default view on Active Inventory after loading.
            if (elements.activePanel) {
                elements.activePanel.hidden = false;
            }

            if (elements.archivedPanel) {
                elements.archivedPanel.hidden = true;
            }

            elements.activeTab.classList.add("active");
            elements.activeTab.setAttribute("aria-selected", "true");
            elements.archivedTab.classList.remove("active");
            elements.archivedTab.setAttribute("aria-selected", "false");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
