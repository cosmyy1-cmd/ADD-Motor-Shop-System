const ADMIN_API_BASE = "http://localhost:3000";

let allTransactions = [];
let allInventoryProducts = [];
let currentReportData = null;

let categorySalesChartInstance = null;
let monthlyPerformanceChartInstance = null;

// =========================================================
// DOM HELPERS
// =========================================================

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}

// =========================================================
// ADMIN AUTHENTICATION
// =========================================================

function getAdminId() {
    const directIds = [
        localStorage.getItem("adminId"),
        localStorage.getItem("admin_id"),
        localStorage.getItem("userId"),
        localStorage.getItem("user_id")
    ];

    for (const id of directIds) {
        if (id && String(id).trim() !== "") {
            return String(id).trim();
        }
    }

    const possibleUsers = [
        localStorage.getItem("adminUser"),
        localStorage.getItem("user")
    ];

    for (const rawUser of possibleUsers) {
        if (!rawUser) continue;

        try {
            const user = JSON.parse(rawUser);

            const id =
                user?.id ??
                user?.user_id ??
                user?.admin_id;

            if (
                id !== undefined &&
                id !== null &&
                String(id).trim() !== ""
            ) {
                return String(id).trim();
            }
        } catch (error) {
            // Ignore invalid localStorage JSON.
        }
    }

    return "";
}

function getAdminHeaders() {
    const adminId = getAdminId();

    const headers = {
        "Content-Type": "application/json"
    };

    if (adminId) {
        headers["x-admin-id"] = adminId;
    }

    return headers;
}

// =========================================================
// API HELPERS
// =========================================================

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAdminHeaders(),
            ...(options.headers || {})
        }
    });

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`
        );
    }

    if (data && data.success === false) {
        throw new Error(
            data.message ||
            data.error ||
            "The server could not generate the report."
        );
    }

    return data;
}

function extractArray(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    const possibleKeys = [
        "data",
        "sales",
        "transactions",
        "results",
        "items",
        "products",
        "inventory"
    ];

    for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    return [];
}

// =========================================================
// NUMBER / CURRENCY HELPERS
// =========================================================

function toNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value)
        .replace(/₱/g, "")
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(toNumber(value));
}

function formatInteger(value) {
    return new Intl.NumberFormat("en-PH").format(
        Math.max(0, Math.round(toNumber(value)))
    );
}

// =========================================================
// DATE HELPERS
// =========================================================

function getTransactionDate(transaction) {
    const possibleDates = [
        transaction?.paid_at,
        transaction?.payment_date,
        transaction?.paid_date,
        transaction?.completed_at,
        transaction?.completion_date,
        transaction?.sale_date,
        transaction?.transaction_date,
        transaction?.created_at,
        transaction?.date
    ];

    for (const value of possibleDates) {
        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return null;
}

function formatDatePaid(transaction) {
    const rawDate = getTransactionDate(transaction);

    if (!rawDate) {
        return "—";
    }

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
        return String(rawDate).trim() || "—";
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}

// =========================================================
// TRANSACTION FIELD HELPERS
// =========================================================

function getReference(transaction) {
    const reference =
        transaction?.sale_reference ??
        transaction?.reference ??
        transaction?.transaction_reference ??
        transaction?.order_reference ??
        transaction?.order_number ??
        transaction?.reference_number;

    if (
        reference !== null &&
        reference !== undefined &&
        String(reference).trim() !== ""
    ) {
        return String(reference).trim();
    }

    const sourceType = getTransactionType(transaction);

    const sourceId =
        transaction?.source_id ??
        transaction?.reservation_id ??
        transaction?.order_id ??
        transaction?.id;

    if (
        sourceId !== null &&
        sourceId !== undefined &&
        String(sourceId).trim() !== ""
    ) {
        const prefix =
            sourceType === "Service" ? "SRV" : "ORD";

        return `${prefix}-${String(sourceId).padStart(6, "0")}`;
    }

    return "—";
}

function getCustomerName(transaction) {
    const customer =
        transaction?.customer_name ??
        transaction?.customer ??
        transaction?.name ??
        transaction?.username ??
        transaction?.user_name ??
        transaction?.full_name;

    if (
        customer !== null &&
        customer !== undefined &&
        String(customer).trim() !== ""
    ) {
        return String(customer).trim();
    }

    return "—";
}

function getTransactionType(transaction) {
    const rawType =
        transaction?.sale_type ??
        transaction?.transaction_type ??
        transaction?.type ??
        transaction?.source_type;

    if (rawType) {
        const normalized = String(rawType)
            .trim()
            .toLowerCase();

        if (
            normalized.includes("service") ||
            normalized === "srv" ||
            normalized === "reservation"
        ) {
            return "Service";
        }

        if (
            normalized.includes("product") ||
            normalized.includes("order") ||
            normalized === "ord"
        ) {
            return "Product";
        }
    }

    const reference =
        transaction?.sale_reference ??
        transaction?.reference ??
        "";

    if (String(reference).toUpperCase().startsWith("SRV-")) {
        return "Service";
    }

    if (String(reference).toUpperCase().startsWith("ORD-")) {
        return "Product";
    }

    return "Product";
}

function getTransactionStatus(transaction) {
    const status =
        transaction?.sale_status ??
        transaction?.status ??
        transaction?.order_status ??
        transaction?.reservation_status ??
        transaction?.payment_status;

    if (
        status !== null &&
        status !== undefined &&
        String(status).trim() !== ""
    ) {
        return String(status).trim();
    }

    return "—";
}

function getTransactionAmount(transaction) {
    return toNumber(
        transaction?.total_amount ??
        transaction?.amount ??
        transaction?.total ??
        transaction?.sale_amount ??
        transaction?.price
    );
}

// =========================================================
// NORMALIZE TRANSACTIONS
// =========================================================

function normalizeTransaction(transaction) {
    return {
        original: transaction,
        reference: getReference(transaction),
        customer: getCustomerName(transaction),
        type: getTransactionType(transaction),
        status: getTransactionStatus(transaction),
        dateValue: getTransactionDate(transaction),
        datePaid: formatDatePaid(transaction),
        amount: getTransactionAmount(transaction)
    };
}

// =========================================================
// LOAD SALES
// =========================================================

async function loadTransactions() {
    const data = await fetchJson(
        `${ADMIN_API_BASE}/api/admin/sales`
    );

    const transactions = extractArray(data);

    allTransactions = transactions
        .map(normalizeTransaction)
        .sort((a, b) => {
            const dateA = a.dateValue
                ? new Date(a.dateValue).getTime()
                : 0;

            const dateB = b.dateValue
                ? new Date(b.dateValue).getTime()
                : 0;

            return dateB - dateA;
        });

    return allTransactions;
}

// =========================================================
// LOAD INVENTORY
// =========================================================

async function loadInventory() {
    let data;

    try {
        data = await fetchJson(
            `${ADMIN_API_BASE}/api/admin/inventory`
        );
    } catch (firstError) {
        data = await fetchJson(
            `${ADMIN_API_BASE}/api/admin/inventory/products`
        );
    }

    allInventoryProducts = extractArray(data);

    return allInventoryProducts;
}

// =========================================================
// LOAD REPORT DATA FROM THE REPORTS API
// =========================================================

async function loadReportData(startDate = "", endDate = "") {
    const params = new URLSearchParams();

    if (startDate) {
        params.set("startDate", startDate);
    }

    if (endDate) {
        params.set("endDate", endDate);
    }

    const query = params.toString();

    const url =
        `${ADMIN_API_BASE}/api/admin/reports` +
        (query ? `?${query}` : "");

    const data = await fetchJson(url);

    if (!data || !data.summary) {
        throw new Error(
            "The Reports API returned an invalid report response."
        );
    }

    currentReportData = data;

    return data;
}

// =========================================================
// INVENTORY HELPERS
// =========================================================

function getInventoryQuantity(product) {
    return toNumber(
        product?.stock_quantity ??
        product?.quantity ??
        product?.stock ??
        product?.current_stock ??
        product?.inventory_quantity
    );
}

function getInventoryLowStockLimit(product) {
    const value =
        product?.low_stock_threshold ??
        product?.low_stock_limit ??
        product?.reorder_level ??
        product?.minimum_stock ??
        5;

    return toNumber(value);
}

function calculateInventoryReport(products) {
    let totalProducts = products.length;
    let productsInStock = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;

    products.forEach(product => {
        const quantity = getInventoryQuantity(product);
        const lowStockLimit = getInventoryLowStockLimit(product);

        if (quantity <= 0) {
            outOfStockProducts++;
        } else {
            productsInStock++;

            if (quantity <= lowStockLimit) {
                lowStockProducts++;
            }
        }
    });

    return {
        totalProducts,
        productsInStock,
        lowStockProducts,
        outOfStockProducts
    };
}

// =========================================================
// RENDER SALES SUMMARY
// Uses the Reports API, not duplicated sales item rows.
// =========================================================

function renderSalesSummary(reportData) {
    const summary = reportData?.summary || {};

    const productSales = toNumber(summary.product_sales);
    const serviceSales = toNumber(summary.service_revenue);

    const totalRevenue =
        toNumber(summary.total_revenue) ||
        (productSales + serviceSales);

    const totalTransactions =
        toNumber(summary.transaction_count) +
        toNumber(summary.completed_services);

    setText("totalSales", formatCurrency(totalRevenue));
    setText("productSales", formatCurrency(productSales));
    setText("serviceSales", formatCurrency(serviceSales));
    setText("totalTransactions", formatInteger(totalTransactions));

    setText(
        "breakdownProductSales",
        formatCurrency(productSales)
    );

    setText(
        "breakdownServiceSales",
        formatCurrency(serviceSales)
    );

    const productPercentage =
        totalRevenue > 0
            ? (productSales / totalRevenue) * 100
            : 0;

    const servicePercentage =
        totalRevenue > 0
            ? (serviceSales / totalRevenue) * 100
            : 0;

    const productProgress = getElement("productSalesProgress");
    const serviceProgress = getElement("serviceSalesProgress");

    if (productProgress) {
        productProgress.style.width =
            `${productPercentage.toFixed(1)}%`;
    }

    if (serviceProgress) {
        serviceProgress.style.width =
            `${servicePercentage.toFixed(1)}%`;
    }

    setText(
        "productSalesPercentage",
        `${productPercentage.toFixed(1)}%`
    );

    setText(
        "serviceSalesPercentage",
        `${servicePercentage.toFixed(1)}%`
    );
}

// =========================================================
// RENDER INVENTORY REPORT
// =========================================================

function renderInventoryReport(products) {
    const report = calculateInventoryReport(products);

    setText("totalProducts", formatInteger(report.totalProducts));
    setText("productsInStock", formatInteger(report.productsInStock));
    setText("lowStockProducts", formatInteger(report.lowStockProducts));
    setText("outOfStockProducts", formatInteger(report.outOfStockProducts));
}

// =========================================================
// COST REPORT
// Uses actual received purchase costs from the Reports API.
// =========================================================

function renderCostReport(reportData) {
    const summary = reportData?.summary || {};

    const supplierPurchaseCost =
        toNumber(summary.supplier_purchase_cost);

    const totalRevenue =
        toNumber(summary.total_revenue);

    const totalProfit =
        totalRevenue - supplierPurchaseCost;

    setText(
        "supplierPurchaseCost",
        formatCurrency(supplierPurchaseCost)
    );

    setText(
        "totalProfit",
        formatCurrency(totalProfit)
    );
}

// =========================================================
// CHART EMPTY STATES
// =========================================================

function setChartEmptyState(canvasId, emptyId, isEmpty, message) {
    const canvas = getElement(canvasId);
    const emptyState = getElement(emptyId);

    if (canvas) {
        canvas.hidden = isEmpty;
    }

    if (emptyState) {
        emptyState.hidden = !isEmpty;

        if (isEmpty && message) {
            const messageElement =
                emptyState.querySelector("p") ||
                emptyState.querySelector("span");

            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }
}

// =========================================================
// DESTROY CHARTS
// =========================================================

function destroyReportCharts() {
    if (categorySalesChartInstance) {
        categorySalesChartInstance.destroy();
        categorySalesChartInstance = null;
    }

    if (monthlyPerformanceChartInstance) {
        monthlyPerformanceChartInstance.destroy();
        monthlyPerformanceChartInstance = null;
    }
}

// =========================================================
// CATEGORY SALES PIE CHART
// =========================================================

function renderCategorySalesChart(reportData) {
    const canvas = getElement("categorySalesChart");

    const categories = Array.isArray(reportData?.category_sales)
        ? reportData.category_sales
        : [];

    const validCategories = categories.filter(item =>
        toNumber(item.total_sales) > 0
    );

    if (!canvas) {
        console.warn(
            "Reports: categorySalesChart canvas was not found."
        );
        return;
    }

    if (!validCategories.length) {
        if (categorySalesChartInstance) {
            categorySalesChartInstance.destroy();
            categorySalesChartInstance = null;
        }

        setChartEmptyState(
            "categorySalesChart",
            "categoryChartEmpty",
            true,
            "No product sales are available for this date range."
        );

        return;
    }

    if (typeof Chart === "undefined") {
        setChartEmptyState(
            "categorySalesChart",
            "categoryChartEmpty",
            true,
            "Chart.js could not be loaded. Please refresh the page."
        );

        console.error("Reports: Chart.js is not available.");
        return;
    }

    setChartEmptyState(
        "categorySalesChart",
        "categoryChartEmpty",
        false
    );

    if (categorySalesChartInstance) {
        categorySalesChartInstance.destroy();
    }

    categorySalesChartInstance = new Chart(
        canvas.getContext("2d"),
        {
            type: "pie",

            data: {
                labels: validCategories.map(item => item.category),

                datasets: [{
                    data: validCategories.map(item =>
                        toNumber(item.total_sales)
                    ),

                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        position: "bottom"
                    },

                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return (
                                    `${context.label}: ` +
                                    formatCurrency(context.raw)
                                );
                            }
                        }
                    }
                }
            }
        }
    );
}

// =========================================================
// MONTHLY SALES VS PURCHASE COST CHART
// =========================================================

function renderMonthlyPerformanceChart(reportData) {
    const canvas = getElement("monthlyPerformanceChart");

    const monthlyData = Array.isArray(
        reportData?.monthly_performance
    )
        ? reportData.monthly_performance
        : [];

    if (!canvas) {
        console.warn(
            "Reports: monthlyPerformanceChart canvas was not found."
        );
        return;
    }

    if (!monthlyData.length) {
        if (monthlyPerformanceChartInstance) {
            monthlyPerformanceChartInstance.destroy();
            monthlyPerformanceChartInstance = null;
        }

        setChartEmptyState(
            "monthlyPerformanceChart",
            "monthlyChartEmpty",
            true,
            "No monthly sales or purchase data is available for this date range."
        );

        return;
    }

    if (typeof Chart === "undefined") {
        setChartEmptyState(
            "monthlyPerformanceChart",
            "monthlyChartEmpty",
            true,
            "Chart.js could not be loaded. Please refresh the page."
        );

        console.error("Reports: Chart.js is not available.");
        return;
    }

    setChartEmptyState(
        "monthlyPerformanceChart",
        "monthlyChartEmpty",
        false
    );

    if (monthlyPerformanceChartInstance) {
        monthlyPerformanceChartInstance.destroy();
    }

    const labels = monthlyData.map(item => {
        const parts = String(item.month).split("-");

        if (parts.length !== 2) {
            return item.month;
        }

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            1
        );

        return date.toLocaleDateString("en-PH", {
            month: "short",
            year: "numeric"
        });
    });

    monthlyPerformanceChartInstance = new Chart(
        canvas.getContext("2d"),
        {
            type: "bar",

            data: {
                labels,

                datasets: [
                    {
                        label: "Sales Revenue",
                        data: monthlyData.map(item =>
                            toNumber(item.sales)
                        ),
                        borderWidth: 1
                    },
                    {
                        label: "Purchase Cost",
                        data: monthlyData.map(item =>
                            toNumber(item.purchase_cost)
                        ),
                        borderWidth: 1
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                scales: {
                    y: {
                        beginAtZero: true,

                        ticks: {
                            callback: function (value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                },

                plugins: {
                    legend: {
                        position: "bottom"
                    },

                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return (
                                    `${context.dataset.label}: ` +
                                    formatCurrency(context.raw)
                                );
                            }
                        }
                    }
                }
            }
        }
    );
}

// =========================================================
// RENDER BOTH CHARTS
// =========================================================

function renderReportCharts(reportData) {
    renderCategorySalesChart(reportData);
    renderMonthlyPerformanceChart(reportData);
}

// =========================================================
// DATE FILTERING FOR LEGACY TRANSACTION TABLE
// =========================================================

function getDateOnly(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
}

function filterTransactionsByDate(
    transactions,
    startDateValue,
    endDateValue
) {
    if (!startDateValue && !endDateValue) {
        return transactions;
    }

    const startDate = startDateValue
        ? new Date(`${startDateValue}T00:00:00`)
        : null;

    const endDate = endDateValue
        ? new Date(`${endDateValue}T23:59:59`)
        : null;

    return transactions.filter(transaction => {
        const transactionDate = getDateOnly(
            transaction.dateValue
        );

        if (!transactionDate) {
            return false;
        }

        if (startDate && transactionDate < startDate) {
            return false;
        }

        if (endDate && transactionDate > endDate) {
            return false;
        }

        return true;
    });
}

// =========================================================
// LEGACY TRANSACTION TABLE HELPERS
// Kept to preserve existing functionality if the table
// is present in the HTML.
// =========================================================

function createTransactionTypeBadge(type) {
    const badge = document.createElement("span");

    badge.className =
        `transaction-type-badge ${
            type === "Service" ? "service" : "product"
        }`;

    const icon = document.createElement("i");

    icon.className =
        type === "Service"
            ? "fa-solid fa-screwdriver-wrench"
            : "fa-solid fa-box";

    const text = document.createElement("span");
    text.textContent = type;

    badge.appendChild(icon);
    badge.appendChild(text);

    return badge;
}

function createTransactionStatusBadge(status) {
    const badge = document.createElement("span");

    const normalizedStatus = String(status)
        .toLowerCase()
        .replace(/\s+/g, "-");

    let statusClass = "neutral";
    let iconClass = "fa-solid fa-circle-info";

    if (
        normalizedStatus === "completed" ||
        normalizedStatus === "paid" ||
        normalizedStatus === "delivered"
    ) {
        statusClass = "success";
        iconClass = "fa-solid fa-circle-check";
    } else if (normalizedStatus === "pending") {
        statusClass = "pending";
        iconClass = "fa-solid fa-clock";
    } else if (
        normalizedStatus === "confirmed" ||
        normalizedStatus === "processing" ||
        normalizedStatus === "in-service"
    ) {
        statusClass = "processing";
        iconClass = "fa-solid fa-spinner";
    } else if (
        normalizedStatus === "cancelled" ||
        normalizedStatus === "failed"
    ) {
        statusClass = "cancelled";
        iconClass = "fa-solid fa-circle-xmark";
    }

    badge.className =
        `transaction-status-badge ${statusClass}`;

    const icon = document.createElement("i");
    icon.className = iconClass;

    const text = document.createElement("span");
    text.textContent = status;

    badge.appendChild(icon);
    badge.appendChild(text);

    return badge;
}

function updateTransactionCount(count) {
    const element = getElement("transactionCountLabel");

    if (!element) {
        return;
    }

    element.textContent =
        `${formatInteger(count)} ${
            count === 1 ? "transaction" : "transactions"
        }`;
}

function renderTransactions(transactions) {
    const tableBody = getElement("transactionsTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!transactions.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.className = "empty-table-message";

        const wrapper = document.createElement("div");
        wrapper.className = "empty-transactions-state";

        const iconWrapper = document.createElement("div");
        iconWrapper.className = "empty-transactions-icon";

        const icon = document.createElement("i");
        icon.className = "fa-solid fa-receipt";

        iconWrapper.appendChild(icon);

        const title = document.createElement("strong");
        title.textContent = "No transactions available";

        const description = document.createElement("span");
        description.textContent =
            "Completed services and product orders will appear here.";

        wrapper.appendChild(iconWrapper);
        wrapper.appendChild(title);
        wrapper.appendChild(description);

        cell.appendChild(wrapper);
        row.appendChild(cell);
        tableBody.appendChild(row);

        updateTransactionCount(0);
        return;
    }

    transactions.forEach(transaction => {
        const row = document.createElement("tr");

        const referenceCell = document.createElement("td");
        referenceCell.className = "transaction-reference-cell";

        const reference = document.createElement("span");
        reference.className = "transaction-reference";
        reference.textContent = transaction.reference;

        referenceCell.appendChild(reference);

        const customerCell = document.createElement("td");
        customerCell.className = "transaction-customer-cell";

        const customer = document.createElement("strong");
        customer.className = "transaction-customer";
        customer.textContent = transaction.customer;

        customerCell.appendChild(customer);

        const typeCell = document.createElement("td");
        typeCell.className = "transaction-type-cell";
        typeCell.appendChild(
            createTransactionTypeBadge(transaction.type)
        );

        const statusCell = document.createElement("td");
        statusCell.className = "transaction-status-cell";
        statusCell.appendChild(
            createTransactionStatusBadge(transaction.status)
        );

        const dateCell = document.createElement("td");
        dateCell.className = "transaction-date-cell";

        const dateWrapper = document.createElement("div");
        dateWrapper.className = "transaction-date";

        const dateIcon = document.createElement("i");
        dateIcon.className = "fa-regular fa-calendar";

        const dateText = document.createElement("span");
        dateText.textContent = transaction.datePaid;

        dateWrapper.appendChild(dateIcon);
        dateWrapper.appendChild(dateText);
        dateCell.appendChild(dateWrapper);

        const amountCell = document.createElement("td");
        amountCell.className = "transaction-amount-cell";

        const amount = document.createElement("strong");
        amount.className = "transaction-amount";
        amount.textContent = formatCurrency(transaction.amount);

        amountCell.appendChild(amount);

        row.appendChild(referenceCell);
        row.appendChild(customerCell);
        row.appendChild(typeCell);
        row.appendChild(statusCell);
        row.appendChild(dateCell);
        row.appendChild(amountCell);

        tableBody.appendChild(row);
    });

    updateTransactionCount(transactions.length);
}

// =========================================================
// REPORT FILTER MESSAGE
// =========================================================

function showFilterMessage(message, type = "") {
    const element = getElement("reportFilterMessage");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "report-filter-message";

    if (type) {
        element.classList.add(type);
    }
}

function clearFilterMessage() {
    const element = getElement("reportFilterMessage");

    if (!element) {
        return;
    }

    element.textContent = "";
    element.className = "report-filter-message";
}

// =========================================================
// LOADING / ERROR
// =========================================================

function showLoading(show) {
    const loading = getElement("reportLoading");

    if (loading) {
        loading.hidden = !show;
    }
}

function showError(message) {
    const error = getElement("reportError");
    const errorMessage = getElement("reportErrorMessage");

    if (errorMessage) {
        errorMessage.textContent = message;
    }

    if (error) {
        error.hidden = false;
    }
}

function hideError() {
    const error = getElement("reportError");

    if (error) {
        error.hidden = true;
    }
}

// =========================================================
// RENDER COMPLETE REPORT
// =========================================================

function renderReport(transactions, inventory, reportData) {
    renderSalesSummary(reportData);
    renderInventoryReport(inventory);
    renderCostReport(reportData);
    renderReportCharts(reportData);

    const startDate = getElement("reportStartDate")?.value || "";
    const endDate = getElement("reportEndDate")?.value || "";

    const filteredTransactions = filterTransactionsByDate(
        transactions,
        startDate,
        endDate
    );

    renderTransactions(filteredTransactions);
}

// =========================================================
// LOAD COMPLETE REPORT
// =========================================================

async function loadReport() {
    showLoading(true);
    hideError();

    try {
        const startDate =
            getElement("reportStartDate")?.value || "";

        const endDate =
            getElement("reportEndDate")?.value || "";

        const results = await Promise.all([
            loadTransactions(),
            loadInventory(),
            loadReportData(startDate, endDate)
        ]);

        const transactions = results[0];
        const inventory = results[1];
        const reportData = results[2];

        renderReport(
            transactions,
            inventory,
            reportData
        );

    } catch (error) {
        console.error("Reports loading error:", error);

        showError(
            error?.message ||
            "An error occurred while loading the report."
        );

    } finally {
        showLoading(false);
    }
}

// =========================================================
// APPLY DATE FILTER
// =========================================================

async function applyReportFilter() {
    const startDate =
        getElement("reportStartDate")?.value || "";

    const endDate =
        getElement("reportEndDate")?.value || "";

    if (
        startDate &&
        endDate &&
        startDate > endDate
    ) {
        showFilterMessage(
            "Start date cannot be later than end date.",
            "error"
        );

        return;
    }

    clearFilterMessage();
    showLoading(true);
    hideError();

    try {
        /*
         * Ask the backend to apply the date range.
         *
         * This is important because purchase costs,
         * completed service revenue, and chart data
         * must all use the same date range.
         */

        const reportData = await loadReportData(
            startDate,
            endDate
        );

        const filteredTransactions =
            filterTransactionsByDate(
                allTransactions,
                startDate,
                endDate
            );

        renderSalesSummary(reportData);
        renderCostReport(reportData);
        renderReportCharts(reportData);
        renderTransactions(filteredTransactions);

        if (startDate || endDate) {
            let message = "Showing report data";

            if (startDate) {
                message += ` from ${startDate}`;
            }

            if (endDate) {
                message += ` to ${endDate}`;
            }

            showFilterMessage(message);
        }

    } catch (error) {
        console.error("Report filter error:", error);

        showError(
            error?.message ||
            "Unable to apply the selected date filter."
        );

    } finally {
        showLoading(false);
    }
}

// =========================================================
// CLEAR REPORT FILTER
// =========================================================

async function clearReportFilter() {
    const startDate = getElement("reportStartDate");
    const endDate = getElement("reportEndDate");

    if (startDate) {
        startDate.value = "";
    }

    if (endDate) {
        endDate.value = "";
    }

    clearFilterMessage();

    await loadReport();
}

// =========================================================
// EVENT LISTENERS
// =========================================================

function setupReportEvents() {
    const generateButton =
        getElement("generateReportButton");

    const clearButton =
        getElement("clearReportFilter");

    const retryButton =
        getElement("retryReportButton");

    if (generateButton) {
        generateButton.addEventListener(
            "click",
            applyReportFilter
        );
    }

    if (clearButton) {
        clearButton.addEventListener(
            "click",
            clearReportFilter
        );
    }

    if (retryButton) {
        retryButton.addEventListener(
            "click",
            loadReport
        );
    }
}

// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    setupReportEvents();
    loadReport();
});