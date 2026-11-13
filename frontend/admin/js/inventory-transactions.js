
/* =========================================================
   ADD MOTOR SHOP - INVENTORY TRANSACTIONS

   Initial display: 10 newest transactions
   Each More click: 50 additional transactions
   Hide Transactions: Return to the initial 10 rows

   Data source: transactions fetched by inventory.js

   The Stock Activity section and heading remain visible
   when the transaction table is collapsed.
========================================================= */

(() => {
    "use strict";

    const INITIAL_TRANSACTION_COUNT = 10;
    const TRANSACTION_BATCH_SIZE = 50;

    let allTransactions = [];
    let visibleTransactionCount = INITIAL_TRANSACTION_COUNT;

    let moreButton = null;
    let hideButton = null;
    let buttonContainer = null;
    let initialized = false;

    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function initializeTransactionControls() {
        const tableBody = document.getElementById(
            "transactionsTableBody"
        );

        if (!tableBody) {
            console.warn(
                "[Inventory Transactions] Transaction table was not found."
            );
            return;
        }

        initialized = true;

        restoreStockActivitySection();
        createTransactionButtons();
        renderVisibleTransactions();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeTransactionControls,
            { once: true }
        );
    } else {
        initializeTransactionControls();
    }

    /* =====================================================
       RESTORE SECTION VISIBILITY
    ===================================================== */

    function restoreStockActivitySection() {
        const tableBody = document.getElementById(
            "transactionsTableBody"
        );

        const section =
            tableBody?.closest(".transactions-section") ||
            document.querySelector(".transactions-section");

        if (section) {
            section.hidden = false;
            section.removeAttribute("aria-hidden");
            section.style.removeProperty("display");
            section.style.removeProperty("visibility");
        }

        const wrapper = tableBody?.closest(
            ".transactions-table-wrapper"
        );

        if (wrapper) {
            wrapper.hidden = false;
            wrapper.style.removeProperty("display");
            wrapper.style.removeProperty("visibility");
        }
    }

    /* =====================================================
       CREATE MORE / HIDE BUTTONS
    ===================================================== */

    function createTransactionButtons() {
        const existingContainer = document.querySelector(
            ".transactions-more-container"
        );

        if (existingContainer) {
            buttonContainer = existingContainer;
        } else {
            const tableBody = document.getElementById(
                "transactionsTableBody"
            );

            const table = tableBody?.closest("table");

            const wrapper = table?.closest(
                ".transactions-table-wrapper"
            );

            if (!wrapper) {
                console.warn(
                    "[Inventory Transactions] Table wrapper was not found."
                );
                return;
            }

            buttonContainer = document.createElement("div");
            buttonContainer.className =
                "transactions-more-container";

            buttonContainer.style.display = "flex";
            buttonContainer.style.flexWrap = "wrap";
            buttonContainer.style.alignItems = "center";
            buttonContainer.style.justifyContent = "center";
            buttonContainer.style.gap = "12px";
            buttonContainer.style.padding = "18px 0";
            buttonContainer.style.width = "100%";

            wrapper.appendChild(buttonContainer);
        }

        moreButton = document.getElementById(
            "inventoryTransactionsMoreButton"
        );

        if (!moreButton) {
            moreButton = document.createElement("button");
            moreButton.type = "button";
            moreButton.id = "inventoryTransactionsMoreButton";
            moreButton.className = "workflow-button";
            moreButton.textContent = "More Transactions";

            buttonContainer.appendChild(moreButton);
        } else if (moreButton.parentElement !== buttonContainer) {
            buttonContainer.appendChild(moreButton);
        }

        hideButton = document.getElementById(
            "inventoryTransactionsHideButton"
        );

        if (!hideButton) {
            hideButton = document.createElement("button");
            hideButton.type = "button";
            hideButton.id = "inventoryTransactionsHideButton";
            hideButton.className = "workflow-button";
            hideButton.textContent = "Hide Transactions";

            buttonContainer.appendChild(hideButton);
        } else if (hideButton.parentElement !== buttonContainer) {
            buttonContainer.appendChild(hideButton);
        }

        // Assign the handlers once, even if initialization is retried.
        moreButton.onclick = showMoreTransactions;
        hideButton.onclick = hideExtraTransactions;

        styleButton(moreButton);
        styleButton(hideButton);

        updateTransactionButtons();
    }

    function styleButton(button) {
        if (!button) {
            return;
        }

        button.style.padding = "14px 28px";
        button.style.minWidth = "200px";
        button.style.minHeight = "48px";
        button.style.fontSize = "15px";
        button.style.fontWeight = "700";
        button.style.borderRadius = "8px";
        button.style.cursor = "pointer";
        button.style.boxShadow =
            "0 3px 8px rgba(0, 0, 0, 0.15)";
    }

    /* =====================================================
       PUBLIC RENDER FUNCTION
       Called by inventory.js after transactions load.
    ===================================================== */

    window.renderInventoryTransactions = function (
        transactionList
    ) {
        allTransactions = Array.isArray(transactionList)
            ? [...transactionList].sort((a, b) => {
                return (
                    getTransactionTimestamp(b) -
                    getTransactionTimestamp(a)
                );
            })
            : [];

        // Every successful reload starts with the newest 10.
        visibleTransactionCount = INITIAL_TRANSACTION_COUNT;

        if (!initialized) {
            initializeTransactionControls();
        }

        restoreStockActivitySection();
        createTransactionButtons();
        renderVisibleTransactions();
    };

    /* =====================================================
       SHOW NEXT 50 TRANSACTIONS
    ===================================================== */

    function showMoreTransactions() {
        if (
            visibleTransactionCount >= allTransactions.length
        ) {
            updateTransactionButtons();
            return;
        }

        visibleTransactionCount = Math.min(
            visibleTransactionCount + TRANSACTION_BATCH_SIZE,
            allTransactions.length
        );

        renderVisibleTransactions();
    }

    /* =====================================================
       HIDE EXTRA TRANSACTIONS
       Returns to the initial 10 rows.
       Does not hide the section or its heading.
    ===================================================== */

    function hideExtraTransactions() {
        visibleTransactionCount = INITIAL_TRANSACTION_COUNT;

        renderVisibleTransactions();

        const tableBody = document.getElementById(
            "transactionsTableBody"
        );

        if (tableBody) {
            tableBody.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }
    }

    /* =====================================================
       RENDER VISIBLE TRANSACTIONS
    ===================================================== */

    function renderVisibleTransactions() {
        const tableBody = document.getElementById(
            "transactionsTableBody"
        );

        const empty = document.getElementById(
            "transactionsEmpty"
        );

        if (!tableBody) {
            return;
        }

        restoreStockActivitySection();

        if (allTransactions.length === 0) {
            tableBody.innerHTML = "";

            if (empty) {
                empty.hidden = false;
                empty.style.display = "";
            }

            updateTransactionButtons();
            return;
        }

        if (empty) {
            empty.hidden = true;
            empty.style.display = "none";
        }

        const visibleTransactions = allTransactions.slice(
            0,
            visibleTransactionCount
        );

        tableBody.innerHTML = visibleTransactions
            .map(renderTransactionRow)
            .join("");

        updateTransactionButtons();
    }

    /* =====================================================
       RENDER ONE TRANSACTION ROW
       Transaction reason is intentionally omitted.
    ===================================================== */

    function renderTransactionRow(transaction) {
        const rawType = String(
            transaction.type ??
            transaction.transaction_type ??
            transaction.transactionType ??
            ""
        ).toLowerCase();

        const isStockOut = [
            "out",
            "stock out",
            "stock_out",
            "sale",
            "sold"
        ].includes(rawType);

        const typeClass = isStockOut ? "out" : "in";

        const typeLabel = isStockOut
            ? "Stock Out"
            : "Stock In";

        const typeIcon = isStockOut
            ? "fa-arrow-up"
            : "fa-arrow-down";

        const quantity = Math.abs(
            Number(
                transaction.quantity ??
                transaction.change_quantity ??
                transaction.changeQuantity ??
                0
            ) || 0
        );

        const itemName =
            transaction.itemName ??
            transaction.item_name ??
            transaction.product_name ??
            transaction.productName ??
            "Inventory Item";

        const reference =
            transaction.reference ??
            transaction.reference_number ??
            transaction.referenceNumber ??
            transaction.reference_no ??
            "";

        const date =
            transaction.date ??
            transaction.created_at ??
            transaction.createdAt ??
            transaction.transaction_date ??
            transaction.transactionDate ??
            null;

        const quantityPrefix = isStockOut ? "-" : "+";

        return `
            <tr>
                <td>
                    ${escapeHtml(formatTransactionDate(date))}
                </td>

                <td>
                    ${escapeHtml(itemName)}
                </td>

                <td>
                    <span class="transaction-type ${typeClass}">
                        <i class="fa-solid ${typeIcon}"></i>
                        ${typeLabel}
                    </span>
                </td>

                <td>
                    <strong>${quantityPrefix}${quantity}</strong>
                </td>

                <td>
                    ${escapeHtml(reference || "—")}
                </td>
            </tr>
        `;
    }

    /* =====================================================
       UPDATE BUTTON VISIBILITY
    ===================================================== */

    function updateTransactionButtons() {
        if (!moreButton) {
            moreButton = document.getElementById(
                "inventoryTransactionsMoreButton"
            );
        }

        if (!hideButton) {
            hideButton = document.getElementById(
                "inventoryTransactionsHideButton"
            );
        }

        const hasMore =
            visibleTransactionCount < allTransactions.length;

        const hasExtraRows =
            visibleTransactionCount > INITIAL_TRANSACTION_COUNT;

        if (moreButton) {
            moreButton.hidden = !hasMore;
            moreButton.style.display = hasMore ? "flex" : "none";
            moreButton.disabled = !hasMore;
            moreButton.textContent = "More Transactions";

            moreButton.setAttribute(
                "aria-label",
                "Show 50 more inventory transactions"
            );
        }

        if (hideButton) {
            hideButton.hidden = !hasExtraRows;
            hideButton.style.display = hasExtraRows ? "flex" : "none";
            hideButton.disabled = !hasExtraRows;
            hideButton.textContent = "Hide Transactions";

            hideButton.setAttribute(
                "aria-label",
                "Hide additional inventory transactions and return to the newest 10"
            );
        }
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function getTransactionTimestamp(transaction) {
        const value =
            transaction?.date ??
            transaction?.created_at ??
            transaction?.createdAt ??
            transaction?.transaction_date ??
            transaction?.transactionDate ??
            0;

        const timestamp = new Date(value).getTime();

        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatTransactionDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }
})();
